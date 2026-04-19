import { Module } from "@nestjs/common";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [DataModule, PrismaModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
