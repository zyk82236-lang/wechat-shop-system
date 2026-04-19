import { Module } from "@nestjs/common";
import { DataModule } from "../data/data.module";
import { PrismaPersistenceService } from "./prisma-persistence.service";
import { PrismaSeedService } from "./prisma-seed.service";
import { PrismaService } from "./prisma.service";

@Module({
  imports: [DataModule],
  providers: [PrismaService, PrismaPersistenceService, PrismaSeedService],
  exports: [PrismaService, PrismaPersistenceService],
})
export class PrismaModule {}
