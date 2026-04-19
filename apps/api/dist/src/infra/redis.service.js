"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    logger = new common_1.Logger(RedisService_1.name);
    localMap = new Map();
    client;
    enabled;
    constructor() {
        const redisUrl = process.env.REDIS_URL?.trim();
        this.enabled = Boolean(redisUrl);
        if (redisUrl) {
            this.client = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
            this.client.connect().catch((err) => {
                this.logger.error(`Redis connect failed, fallback to local map: ${String(err)}`);
                this.client?.disconnect();
                this.client = undefined;
            });
        }
        else {
            this.logger.warn("REDIS_URL is empty, using local in-memory cache.");
        }
    }
    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }
    async setIfAbsent(key, value, ttlSeconds) {
        if (this.client) {
            const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
            return result === "OK";
        }
        const now = Date.now();
        this.gcLocal(now);
        if (this.localMap.has(key))
            return false;
        this.localMap.set(key, { value, expireAt: now + ttlSeconds * 1000 });
        return true;
    }
    async set(key, value, ttlSeconds) {
        if (this.client) {
            if (ttlSeconds) {
                await this.client.set(key, value, "EX", ttlSeconds);
            }
            else {
                await this.client.set(key, value);
            }
            return;
        }
        const now = Date.now();
        this.localMap.set(key, { value, expireAt: ttlSeconds ? now + ttlSeconds * 1000 : undefined });
    }
    async get(key) {
        if (this.client) {
            return this.client.get(key);
        }
        this.gcLocal(Date.now());
        return this.localMap.get(key)?.value ?? null;
    }
    gcLocal(now) {
        for (const [key, value] of this.localMap.entries()) {
            if (value.expireAt && value.expireAt <= now) {
                this.localMap.delete(key);
            }
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisService);
//# sourceMappingURL=redis.service.js.map