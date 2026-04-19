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
exports.StoreService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
let StoreService = class StoreService {
    users = [];
    addresses = [];
    categories = [];
    products = [];
    skus = [];
    cartItems = [];
    orders = [];
    orderItems = [];
    payments = [];
    shipments = [];
    banners = [];
    adminUsers = [];
    constructor() {
        this.seed();
    }
    seed() {
        const now = (0, id_1.nowIso)();
        this.users.push({
            id: "u_demo",
            openId: "wx_demo_openid",
            nickname: "演示用户",
            phone: "13800001111",
            createdAt: now,
        });
        this.addresses.push({
            id: "addr_demo",
            userId: "u_demo",
            name: "张三",
            phone: "13800001111",
            province: "上海市",
            city: "上海市",
            district: "浦东新区",
            detail: "世纪大道 100 号",
            isDefault: true,
        });
        this.categories.push({ id: "cat_food", name: "休闲零食", sort: 1, enabled: true }, { id: "cat_drink", name: "饮品冲调", sort: 2, enabled: true });
        this.products.push({
            id: "prod_tea",
            categoryId: "cat_drink",
            title: "东方乌龙茶礼盒",
            subtitle: "花香回甘，商务送礼",
            cover: "https://example.com/tea-cover.jpg",
            images: ["https://example.com/tea-1.jpg", "https://example.com/tea-2.jpg"],
            detail: "精选乌龙茶，独立小袋包装。",
            enabled: true,
            recommended: true,
            sales: 88,
        }, {
            id: "prod_nuts",
            categoryId: "cat_food",
            title: "每日坚果组合装",
            subtitle: "7 日装，均衡营养",
            cover: "https://example.com/nuts-cover.jpg",
            images: ["https://example.com/nuts-1.jpg"],
            detail: "混合坚果，轻烘焙不油腻。",
            enabled: true,
            recommended: true,
            sales: 132,
        });
        this.skus.push({
            id: "sku_tea_m",
            productId: "prod_tea",
            name: "中盒 12 袋",
            priceCents: 9900,
            stock: 120,
            code: "TEA-M",
        }, {
            id: "sku_tea_l",
            productId: "prod_tea",
            name: "大盒 24 袋",
            priceCents: 16900,
            stock: 80,
            code: "TEA-L",
        }, {
            id: "sku_nuts_7",
            productId: "prod_nuts",
            name: "7 日装",
            priceCents: 5900,
            stock: 200,
            code: "NUTS-7",
        });
        this.banners.push({
            id: "banner_1",
            image: "https://example.com/banner-1.jpg",
            title: "春季上新",
            targetType: "category",
            targetId: "cat_drink",
            sort: 1,
            enabled: true,
        });
        this.adminUsers.push({ id: "admin_root", username: "admin", password: "admin123", role: "SUPER_ADMIN" }, { id: "admin_ops", username: "ops", password: "ops123", role: "OPERATOR" });
    }
};
exports.StoreService = StoreService;
exports.StoreService = StoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StoreService);
//# sourceMappingURL=store.service.js.map