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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("../data/store.service");
const prisma_service_1 = require("../infra/prisma.service");
let CatalogService = class CatalogService {
    store;
    prisma;
    constructor(store, prisma) {
        this.store = store;
        this.prisma = prisma;
    }
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
    async listProducts(query) {
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
    async getProductById(productId) {
        if (this.prisma.enabled) {
            const product = await this.prisma.product.findFirst({
                where: { id: productId, enabled: true },
            });
            if (!product) {
                throw new common_1.NotFoundException("Product not found");
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
            throw new common_1.NotFoundException("Product not found");
        }
        const skus = this.store.skus.filter((sku) => sku.productId === product.id);
        return { ...product, skus };
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        prisma_service_1.PrismaService])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map