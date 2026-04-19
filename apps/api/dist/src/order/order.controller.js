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
exports.OrderController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const order_service_1 = require("./order.service");
let OrderController = class OrderController {
    authService;
    orderService;
    constructor(authService, orderService) {
        this.authService = authService;
        this.orderService = orderService;
    }
    async list(authorization) {
        const user = await this.authService.parseUserToken(authorization);
        return this.orderService.listOrders(user);
    }
    async detail(authorization, id) {
        const user = await this.authService.parseUserToken(authorization);
        return this.orderService.getOrder(user, id);
    }
    async create(authorization, body) {
        const user = await this.authService.parseUserToken(authorization);
        return this.orderService.createOrder(user, body);
    }
    async cancel(authorization, id) {
        const user = await this.authService.parseUserToken(authorization);
        return this.orderService.cancelOrder(user, id);
    }
    async confirm(authorization, id) {
        const user = await this.authService.parseUserToken(authorization);
        return this.orderService.confirmReceived(user, id);
    }
};
exports.OrderController = OrderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(":id/cancel"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(":id/confirm-received"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "confirm", null);
exports.OrderController = OrderController = __decorate([
    (0, common_1.Controller)("/orders"),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        order_service_1.OrderService])
], OrderController);
//# sourceMappingURL=order.controller.js.map