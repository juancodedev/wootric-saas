import type { BillingEventMessage, Env } from "./types";
import { createSupabaseClient } from "./supabase";
import { parseStripeEvent } from "./webhook";
import {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionUpdated,
  handleCustomerSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "./events";

function log(level: string, message: string, ...args: unknown[]): void {
  console.log(JSON.stringify({ level, message, args, timestamp: new Date().toISOString() }));
}

async function handleWebhookEvent(
  event: import("./types").StripeEvent,
  env: Env,
): Promise<Response> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  log("info", `Processing Stripe event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event, supabase);
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event, supabase);
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event, supabase);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event, supabase);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event, supabase);
        break;

      default:
        log("info", `Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    log("error", `Error processing event ${event.id} (${event.type}): ${error}`);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleBillingQueueMessage(
  msg: BillingEventMessage,
  env: Env,
): Promise<void> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  log("info", `Processing billing queue message: ${msg.type} for tenant ${msg.tenantId}`);

  switch (msg.type) {
    case "subscription.updated":
      if (msg.data.status) {
        const existingSub = await supabase.findActiveSubscription(msg.tenantId);
        if (existingSub) {
          const update: Record<string, unknown> = { status: msg.data.status as string };
          if (msg.data.current_period_end) {
            update.current_period_end = msg.data.current_period_end;
          }
          await supabase.updateSubscription(existingSub.id, update);
          log("info", `Updated subscription ${existingSub.id} from queue message`);
        }
      }
      break;

    case "invoice.paid":
    case "invoice.failed":
      log("info", `Invoice event for tenant ${msg.tenantId}: ${msg.type}`);
      break;
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/webhooks/stripe" && request.method === "POST") {
      const event = await parseStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);
      if (!event) {
        log("warn", "Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
      return handleWebhookEvent(event, env);
    }

    return new Response("Not Found", { status: 404 });
  },

  async queue(
    batch: MessageBatch<BillingEventMessage>,
    env: Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleBillingQueueMessage(msg.body, env);
        msg.ack();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log("error", `Billing queue message failed (attempt ${msg.attempts}): ${message}`);

        if (msg.attempts < 3) {
          msg.retry({ delaySeconds: Math.pow(10, msg.attempts) });
        } else {
          log("error", `Billing queue message permanently failed: ${message}`);
          msg.ack();
        }
      }
    }
  },
};

export default worker;
