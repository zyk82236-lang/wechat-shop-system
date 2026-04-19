import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [DataModule, AuthModule, PrismaModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
