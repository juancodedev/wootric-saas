import { container } from "tsyringe";
import type {
  ICacheProvider,
  IStorageProvider,
  IQueueProvider,
  IRateLimiter,
} from "@/application/ports/services";
import { KVStorageService } from "@/infrastructure/cache/KVStorageService";
import { R2StorageService } from "@/infrastructure/storage/R2StorageService";
import { CloudflareQueueService } from "@/infrastructure/queue/CloudflareQueueService";
import { KVRateLimiter } from "@/infrastructure/rate-limiter/KVRateLimiter";

export { container };

export function registerDependencies(): void {
  // Infrastructure — Cloudflare bindings
  container.registerSingleton<ICacheProvider>("ICacheProvider", KVStorageService);
  container.registerSingleton<IStorageProvider>("IStorageProvider", R2StorageService);
  container.registerSingleton<IQueueProvider>("IQueueProvider", CloudflareQueueService);
  container.registerSingleton<IRateLimiter>("IRateLimiter", KVRateLimiter);
}
