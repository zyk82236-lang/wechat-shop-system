import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [DataModule, AuthModule, PrismaModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
