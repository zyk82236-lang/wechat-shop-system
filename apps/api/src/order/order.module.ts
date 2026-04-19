import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { RedisModule } from "../infra/redis.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [DataModule, AuthModule, RedisModule, PrismaModule],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
