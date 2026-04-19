import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CustomerModule } from "./customer/customer.module";
import { DataModule } from "./data/data.module";
import { PrismaModule } from "./infra/prisma.module";
import { RedisModule } from "./infra/redis.module";
import { OrderModule } from "./order/order.module";
import { PaymentModule } from "./payment/payment.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    DataModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    CatalogModule,
    CustomerModule,
    CartModule,
    OrderModule,
    PaymentModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
