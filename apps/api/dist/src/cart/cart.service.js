"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
const store_service_1 = require("../data/store.service");
const prisma_service_1 = require("../infra/prisma.service");
let CartService = class CartService {
    store;
    prisma;
    constructor(store, prisma) {
        this.store = store;
        this.prisma = prisma;
    }
    async list(user) {
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
    async add(user, input) {
        if (input.quantity <= 0) {
            throw new common_1.BadRequestException("Quantity must be positive");
        }
        if (this.prisma.enabled) {
            const sku = await this.prisma.productSku.findFirst({
                where: { id: input.skuId, productId: input.productId },
            });
            if (!sku)
                throw new common_1.BadRequestException("SKU invalid");
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
                    id: (0, id_1.genId)("cart"),
                    userId: user.id,
                    productId: input.productId,
                    skuId: input.skuId,
                    quantity: input.quantity,
                    checked: true,
                    createdAt: new Date((0, id_1.nowIso)()),
                },
            });
        }
        const sku = this.store.skus.find((candidate) => candidate.id === input.skuId && candidate.productId === input.productId);
        if (!sku) {
            throw new common_1.BadRequestException("SKU invalid");
        }
        const existing = this.store.cartItems.find((candidate) => candidate.userId === user.id && candidate.skuId === input.skuId && candidate.productId === input.productId);
        if (existing) {
            existing.quantity += input.quantity;
            return existing;
        }
        const item = {
            id: (0, id_1.genId)("cart"),
            userId: user.id,
            productId: input.productId,
            skuId: input.skuId,
            quantity: input.quantity,
            checked: true,
            createdAt: (0, id_1.nowIso)(),
        };
        this.store.cartItems.push(item);
        return item;
    }
    async update(user, itemId, input) {
        if (this.prisma.enabled) {
            const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
            if (!item)
                throw new common_1.NotFoundException("Cart item not found");
            if (typeof input.quantity === "number" && input.quantity <= 0) {
                throw new common_1.BadRequestException("Quantity must be positive");
            }
            return this.prisma.cartItem.update({
                where: { id: itemId },
                data: { ...input },
            });
        }
        const item = this.store.cartItems.find((candidate) => candidate.id === itemId && candidate.userId === user.id);
        if (!item) {
            throw new common_1.NotFoundException("Cart item not found");
        }
        if (typeof input.quantity === "number") {
            if (input.quantity <= 0) {
                throw new common_1.BadRequestException("Quantity must be positive");
            }
            item.quantity = input.quantity;
        }
        if (typeof input.checked === "boolean") {
            item.checked = input.checked;
        }
        return item;
    }
    async remove(user, itemId) {
        if (this.prisma.enabled) {
            const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
            if (!item)
                throw new common_1.NotFoundException("Cart item not found");
            await this.prisma.cartItem.delete({ where: { id: itemId } });
            return { success: true };
        }
        const index = this.store.cartItems.findIndex((candidate) => candidate.id === itemId && candidate.userId === user.id);
        if (index < 0) {
            throw new common_1.NotFoundException("Cart item not found");
        }
        this.store.cartItems.splice(index, 1);
        return { success: true };
    }
    async clearChecked(user) {
        if (this.prisma.enabled) {
            await this.prisma.cartItem.deleteMany({ where: { userId: user.id, checked: true } });
            return;
        }
        this.store.cartItems = this.store.cartItems.filter((item) => !(item.userId === user.id && item.checked));
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map