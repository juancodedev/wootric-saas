import type { StripeEvent } from "./types";

async function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<StripeEvent | null> {
  if (!signatureHeader || !secret) return null;

  const parts = signatureHeader.split(",");
  let timestamp = "";
  let signature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value ?? "";
    if (key === "v1") signature = value ?? "";
  }

  if (!timestamp || !signature) return null;

  const encoder = new TextEncoder();
  const signedPayload = `${timestamp}.${payload}`;
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const expectedSigBytes = hexToBytes(signature);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    expectedSigBytes,
    messageData,
  );

  if (!isValid) return null;

  const eventTimestamp = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - eventTimestamp) > 300) {
    return null;
  }

  try {
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function parseStripeEvent(
  request: Request,
  webhookSecret: string,
): Promise<StripeEvent | null> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return null;

  const payload = await request.text();
  return verifySignature(payload, signature, webhookSecret);
}

export { parseStripeEvent };
export type { StripeEvent };
