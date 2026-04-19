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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const admin_service_1 = require("./admin.service");
let AdminController = class AdminController {
    authService;
    adminService;
    constructor(authService, adminService) {
        this.authService = authService;
        this.adminService = adminService;
    }
    async stats(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.dashboardStats();
    }
    async listProducts(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.listProducts();
    }
    async upsertProduct(authorization, body) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.upsertProduct(body);
    }
    async removeProduct(authorization, id) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.removeProduct(id);
    }
    async listCategories(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.listCategories();
    }
    async upsertCategory(authorization, body) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.upsertCategory(body);
    }
    async removeCategory(authorization, id) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.removeCategory(id);
    }
    async listOrders(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.listOrders();
    }
    async ship(authorization, body) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.markShipped(body);
    }
    async appendTrack(authorization, id, body) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.appendShipmentTrack({
            orderId: id,
            content: body.content,
            location: body.location,
            status: body.status,
        });
    }
    async listBanners(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.listBanners();
    }
    async upsertBanner(authorization, body) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.upsertBanner(body);
    }
    async removeBanner(authorization, id) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.removeBanner(id);
    }
    async listUsers(authorization) {
        const admin = await this.authService.parseAdminToken(authorization);
        this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
        return this.adminService.listUsers();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)("/dashboard/stats"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)("/products"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Post)("/products/upsert"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertProduct", null);
__decorate([
    (0, common_1.Delete)("/products/:id"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeProduct", null);
__decorate([
    (0, common_1.Get)("/categories"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Post)("/categories/upsert"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertCategory", null);
__decorate([
    (0, common_1.Delete)("/categories/:id"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeCategory", null);
__decorate([
    (0, common_1.Get)("/orders"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listOrders", null);
__decorate([
    (0, common_1.Post)("/orders/ship"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "ship", null);
__decorate([
    (0, common_1.Post)("/orders/:id/tracks"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "appendTrack", null);
__decorate([
    (0, common_1.Get)("/banners"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listBanners", null);
__decorate([
    (0, common_1.Post)("/banners/upsert"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertBanner", null);
__decorate([
    (0, common_1.Delete)("/banners/:id"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeBanner", null);
__decorate([
    (0, common_1.Get)("/users"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)("/admin"),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map