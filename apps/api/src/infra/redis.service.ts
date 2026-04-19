import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

type LocalCacheItem = { value: string; expireAt?: number };

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly localMap = new Map<string, LocalCacheItem>();
  private client?: Redis;
  readonly enabled: boolean;

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    this.enabled = Boolean(redisUrl);
    if (redisUrl) {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
      this.client.connect().catch((err) => {
        this.logger.error(`Redis connect failed, fallback to local map: ${String(err)}`);
        this.client?.disconnect();
        this.client = undefined;
      });
    } else {
      this.logger.warn("REDIS_URL is empty, using local in-memory cache.");
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.client) {
      const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    }
    const now = Date.now();
    this.gcLocal(now);
    if (this.localMap.has(key)) return false;
    this.localMap.set(key, { value, expireAt: now + ttlSeconds * 1000 });
    return true;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client) {
      if (ttlSeconds) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    const now = Date.now();
    this.localMap.set(key, { value, expireAt: ttlSeconds ? now + ttlSeconds * 1000 : undefined });
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      return this.client.get(key);
    }
    this.gcLocal(Date.now());
    return this.localMap.get(key)?.value ?? null;
  }

  private gcLocal(now: number): void {
    for (const [key, value] of this.localMap.entries()) {
      if (value.expireAt && value.expireAt <= now) {
        this.localMap.delete(key);
      }
    }
  }
}
