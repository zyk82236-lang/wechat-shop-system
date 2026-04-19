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
var PrismaSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSeedService = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("../data/store.service");
const prisma_service_1 = require("./prisma.service");
let PrismaSeedService = PrismaSeedService_1 = class PrismaSeedService {
    prisma;
    store;
    logger = new common_1.Logger(PrismaSeedService_1.name);
    constructor(prisma, store) {
        this.prisma = prisma;
        this.store = store;
    }
    async onModuleInit() {
        if (!this.prisma.enabled)
            return;
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
};
exports.PrismaSeedService = PrismaSeedService;
exports.PrismaSeedService = PrismaSeedService = PrismaSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        store_service_1.StoreService])
], PrismaSeedService);
//# sourceMappingURL=prisma-seed.service.js.map