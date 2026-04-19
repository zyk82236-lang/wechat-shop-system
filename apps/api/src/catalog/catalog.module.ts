import { Module } from "@nestjs/common";
import { DataModule } from "../data/data.module";
import { PrismaModule } from "../infra/prisma.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [DataModule, PrismaModule],
  providers: [CatalogService],
  controllers: [CatalogController],
  exports: [CatalogService],
})
export class CatalogModule {}
