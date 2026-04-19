import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly enabled: boolean;

  constructor() {
    const hasUrl = Boolean(process.env.DATABASE_URL?.trim());
    super();
    this.enabled = hasUrl;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn("DATABASE_URL is empty, Prisma persistence disabled.");
      return;
    }
    await this.$connect();
    this.logger.log("Prisma connected.");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.enabled) {
      await this.$disconnect();
    }
  }
}
