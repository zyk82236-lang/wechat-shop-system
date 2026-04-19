import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { RedisModule } from "../infra/redis.module";
import { OrderModule } from "../order/order.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { WechatPayV3Service } from "./wechat-pay-v3.service";

@Module({
  imports: [DataModule, OrderModule, AuthModule, RedisModule, PrismaModule],
  providers: [PaymentService, WechatPayV3Service],
  controllers: [PaymentController],
})
export class PaymentModule {}
