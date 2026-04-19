import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { genId, nowIso } from "../common/id";
import { StoreService } from "../data/store.service";
import type { CartItem, User } from "../domain/types";
import { PrismaService } from "../infra/prisma.service";

@Injectable()
export class CartService {
  constructor(
    private readonly store: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  async list(user: User) {
    if (this.prisma.enabled) {
      const items = await this.prisma.cartItem.findMany({ where: { userId: user.id } });
      const productIds = [...new Set(items.map((i) => i.productId))];
      const skuIds = [...new Set(items.map((i) => i.skuId))];
      const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
      const skus = await this.prisma.productSku.findMany({ where: { id: { in: skuIds } } });
      return items.map((item) => ({
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        skuId: item.skuId,
        quantity: item.quantity,
        checked: item.checked,
        createdAt: item.createdAt.toISOString(),
        product: products.find((p) => p.id === item.productId),
        sku: skus.find((s) => s.id === item.skuId),
      }));
    }

    return this.store.cartItems
      .filter((item) => item.userId === user.id)
      .map((item) => {
        const product = this.store.products.find((candidate) => candidate.id === item.productId);
        const sku = this.store.skus.find((candidate) => candidate.id === item.skuId);
        return { ...item, product, sku };
      });
  }

  async add(user: User, input: { productId: string; skuId: string; quantity: number }) {
    if (input.quantity <= 0) {
      throw new BadRequestException("Quantity must be positive");
    }

    if (this.prisma.enabled) {
      const sku = await this.prisma.productSku.findFirst({
        where: { id: input.skuId, productId: input.productId },
      });
      if (!sku) throw new BadRequestException("SKU invalid");
      const existing = await this.prisma.cartItem.findFirst({
        where: { userId: user.id, skuId: input.skuId, productId: input.productId },
      });
      if (existing) {
        return this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + input.quantity },
        });
      }
      return this.prisma.cartItem.create({
        data: {
          id: genId("cart"),
          userId: user.id,
          productId: input.productId,
          skuId: input.skuId,
          quantity: input.quantity,
          checked: true,
          createdAt: new Date(nowIso()),
        },
      });
    }

    const sku = this.store.skus.find((candidate) => candidate.id === input.skuId && candidate.productId === input.productId);
    if (!sku) {
      throw new BadRequestException("SKU invalid");
    }
    const existing = this.store.cartItems.find(
      (candidate) => candidate.userId === user.id && candidate.skuId === input.skuId && candidate.productId === input.productId,
    );
    if (existing) {
      existing.quantity += input.quantity;
      return existing;
    }
    const item: CartItem = {
      id: genId("cart"),
      userId: user.id,
      productId: input.productId,
      skuId: input.skuId,
      quantity: input.quantity,
      checked: true,
      createdAt: nowIso(),
    };
    this.store.cartItems.push(item);
    return item;
  }

  async update(user: User, itemId: string, input: { quantity?: number; checked?: boolean }) {
    if (this.prisma.enabled) {
      const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
      if (!item) throw new NotFoundException("Cart item not found");
      if (typeof input.quantity === "number" && input.quantity <= 0) {
        throw new BadRequestException("Quantity must be positive");
      }
      return this.prisma.cartItem.update({
        where: { id: itemId },
        data: { ...input },
      });
    }

    const item = this.store.cartItems.find((candidate) => candidate.id === itemId && candidate.userId === user.id);
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }
    if (typeof input.quantity === "number") {
      if (input.quantity <= 0) {
        throw new BadRequestException("Quantity must be positive");
      }
      item.quantity = input.quantity;
    }
    if (typeof input.checked === "boolean") {
      item.checked = input.checked;
    }
    return item;
  }

  async remove(user: User, itemId: string) {
    if (this.prisma.enabled) {
      const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
      if (!item) throw new NotFoundException("Cart item not found");
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { success: true };
    }

    const index = this.store.cartItems.findIndex((candidate) => candidate.id === itemId && candidate.userId === user.id);
    if (index < 0) {
      throw new NotFoundException("Cart item not found");
    }
    this.store.cartItems.splice(index, 1);
    return { success: true };
  }

  async clearChecked(user: User) {
    if (this.prisma.enabled) {
      await this.prisma.cartItem.deleteMany({ where: { userId: user.id, checked: true } });
      return;
    }
    this.store.cartItems = this.store.cartItems.filter((item) => !(item.userId === user.id && item.checked));
  }
}
