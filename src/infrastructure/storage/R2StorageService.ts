import { injectable } from "tsyringe";
import type { R2Bucket } from "@cloudflare/workers-types";
import { getBindings } from "@/lib/cloudflare/bindings";
import type { IStorageProvider } from "@/application/ports/services";

interface R2BucketWithSignedUrl extends R2Bucket {
  createSignedUrl(
    path: string,
    options: { expirySeconds?: number; signedURL: boolean },
  ): Promise<URL>;
}

@injectable()
export class R2StorageService implements IStorageProvider {
  async upload(
    path: string,
    buffer: ArrayBuffer,
    contentType: string,
  ): Promise<string> {
    const { R2_EXPORTS } = await getBindings();
    await R2_EXPORTS.put(path, buffer, {
      httpMetadata: { contentType },
    });
    return path;
  }

  async download(path: string): Promise<ArrayBuffer | null> {
    const { R2_EXPORTS } = await getBindings();
    const object = await R2_EXPORTS.get(path);
    if (!object) return null;
    return object.arrayBuffer();
  }

  async delete(path: string): Promise<void> {
    const { R2_EXPORTS } = await getBindings();
    await R2_EXPORTS.delete(path);
  }

  async getSignedUrl(
    path: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const { R2_EXPORTS } = await getBindings();
    const bucket = R2_EXPORTS as unknown as R2BucketWithSignedUrl;
    const url = await bucket.createSignedUrl(path, {
      expirySeconds: expiresInSeconds,
      signedURL: true,
    });
    return url.toString();
  }

  async list(prefix: string): Promise<string[]> {
    const { R2_EXPORTS } = await getBindings();
    const objects = await R2_EXPORTS.list({ prefix });
    return objects.objects.map((o) => o.key);
  }
}
