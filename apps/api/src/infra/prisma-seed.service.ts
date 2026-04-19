import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { StoreService } from "../data/store.service";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaSeedService implements OnModuleInit {
  private readonly logger = new Logger(PrismaSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: StoreService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.prisma.enabled) return;

    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      this.logger.log("Prisma data exists, skip seed.");
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.createMany({
        data: this.store.users.map((u) => ({
          id: u.id,
          openId: u.openId,
          nickname: u.nickname,
          phone: u.phone ?? null,
          createdAt: new Date(u.createdAt),
        })),
      });
      await tx.adminUser.createMany({
        data: this.store.adminUsers.map((u) => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
        })),
      });
      await tx.address.createMany({
        data: this.store.addresses.map((a) => ({
          id: a.id,
          userId: a.userId,
          name: a.name,
          phone: a.phone,
          province: a.province,
          city: a.city,
          district: a.district,
          detail: a.detail,
          isDefault: a.isDefault,
        })),
      });
      await tx.category.createMany({
        data: this.store.categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId ?? null,
          sort: c.sort,
          enabled: c.enabled,
        })),
      });
      await tx.product.createMany({
        data: this.store.products.map((p) => ({
          id: p.id,
          categoryId: p.categoryId,
          title: p.title,
          subtitle: p.subtitle,
          cover: p.cover,
          imagesJson: JSON.stringify(p.images),
          detail: p.detail,
          enabled: p.enabled,
          recommended: p.recommended,
          sales: p.sales,
        })),
      });
      await tx.productSku.createMany({
        data: this.store.skus.map((s) => ({
          id: s.id,
          productId: s.productId,
          name: s.name,
          priceCents: s.priceCents,
          stock: s.stock,
          code: s.code,
        })),
      });
      await tx.banner.createMany({
        data: this.store.banners.map((b) => ({
          id: b.id,
          image: b.image,
          title: b.title,
          targetType: b.targetType,
          targetId: b.targetId,
          sort: b.sort,
          enabled: b.enabled,
        })),
      });
    });

    this.logger.log("Prisma seed completed.");
  }
}
