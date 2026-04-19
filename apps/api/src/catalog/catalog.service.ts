import { Injectable, NotFoundException } from "@nestjs/common";
import { StoreService } from "../data/store.service";
import { PrismaService } from "../infra/prisma.service";

@Injectable()
export class CatalogService {
  constructor(
    private readonly store: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  async listCategories() {
    if (this.prisma.enabled) {
      return this.prisma.category.findMany({
        where: { enabled: true },
        orderBy: { sort: "asc" },
      });
    }
    return this.store.categories.filter((category) => category.enabled).sort((a, b) => a.sort - b.sort);
  }

  async listBanners() {
    if (this.prisma.enabled) {
      return this.prisma.banner.findMany({
        where: { enabled: true },
        orderBy: { sort: "asc" },
      });
    }
    return this.store.banners.filter((banner) => banner.enabled).sort((a, b) => a.sort - b.sort);
  }

  async listProducts(query?: { categoryId?: string; recommended?: boolean }) {
    if (this.prisma.enabled) {
      const products = await this.prisma.product.findMany({
        where: {
          enabled: true,
          ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query?.recommended ? { recommended: true } : {}),
        },
      });
      const skus = await this.prisma.productSku.findMany({
        where: { productId: { in: products.map((p) => p.id) } },
      });
      return products.map((product) => {
        const rel = skus.filter((sku) => sku.productId === product.id);
        const minPriceCents = rel.length ? Math.min(...rel.map((s) => s.priceCents)) : 0;
        const stock = rel.reduce((sum, sku) => sum + sku.stock, 0);
        return {
          ...product,
          images: JSON.parse(product.imagesJson),
          minPriceCents,
          stock,
        };
      });
    }

    return this.store.products
      .filter((product) => product.enabled)
      .filter((product) => (query?.categoryId ? product.categoryId === query.categoryId : true))
      .filter((product) => (query?.recommended ? product.recommended : true))
      .map((product) => {
        const skus = this.store.skus.filter((sku) => sku.productId === product.id);
        const minPriceCents = Math.min(...skus.map((sku) => sku.priceCents));
        return { ...product, minPriceCents, stock: skus.reduce((sum, sku) => sum + sku.stock, 0) };
      });
  }

  async getProductById(productId: string) {
    if (this.prisma.enabled) {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, enabled: true },
      });
      if (!product) {
        throw new NotFoundException("Product not found");
      }
      const skus = await this.prisma.productSku.findMany({ where: { productId } });
      return {
        ...product,
        images: JSON.parse(product.imagesJson),
        skus,
      };
    }

    const product = this.store.products.find((candidate) => candidate.id === productId && candidate.enabled);
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    const skus = this.store.skus.filter((sku) => sku.productId === product.id);
    return { ...product, skus };
  }
}
