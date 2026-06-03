import { injectable } from "tsyringe";
import type { Queue, MessageBatch } from "@cloudflare/workers-types";
import { getBindings } from "@/lib/cloudflare/bindings";
import { QUEUE_NAME_MAP } from "@/lib/cloudflare/bindings";
import type {
  IQueueProvider,
  QueueMessage,
  QueuePublishOptions,
} from "@/application/ports/services";

type QueueHandler<T> = (message: QueueMessage<T>) => Promise<void>;

@injectable()
export class CloudflareQueueService implements IQueueProvider {
  private static handlers = new Map<string, QueueHandler<unknown>>();

  private async getBinding(queueName: string): Promise<Queue> {
    const bindingKey = QUEUE_NAME_MAP[queueName];
    if (!bindingKey) {
      throw new Error(`Unknown queue: ${queueName}`);
    }
    const bindings = await getBindings();
    return bindings[bindingKey] as unknown as Queue;
  }

  async publish<T>(
    queue: string,
    message: T,
    options?: QueuePublishOptions,
  ): Promise<void> {
    const binding = await this.getBinding(queue);
    await binding.send(message, {
      delaySeconds: options?.delaySeconds,
    });
  }

  async subscribe<T>(
    queue: string,
    handler: (message: QueueMessage<T>) => Promise<void>,
  ): Promise<void> {
    CloudflareQueueService.handlers.set(
      queue,
      handler as QueueHandler<unknown>,
    );
  }

  static async dispatch<T>(
    batch: MessageBatch<T>,
    queueName: string,
  ): Promise<void> {
    const handler = CloudflareQueueService.handlers.get(queueName);
    if (!handler) return;

    for (const msg of batch.messages) {
      const queueMessage: QueueMessage<T> = {
        id: msg.id,
        type: queueName,
        payload: msg.body,
        timestamp: new Date(msg.timestamp),
      };
      await handler(queueMessage);
    }
  }

  static clearHandlers(): void {
    CloudflareQueueService.handlers.clear();
  }
}
