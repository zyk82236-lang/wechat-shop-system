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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const order_service_1 = require("../order/order.service");
const payment_service_1 = require("./payment.service");
let PaymentController = class PaymentController {
    authService;
    paymentService;
    orderService;
    constructor(authService, paymentService, orderService) {
        this.authService = authService;
        this.paymentService = paymentService;
        this.orderService = orderService;
    }
    async createPayParams(authorization, body) {
        const user = await this.authService.parseUserToken(authorization);
        return this.paymentService.createWechatPayParams(user.id, body.orderId);
    }
    notify(signature, timestamp, nonce, body) {
        return this.paymentService.handleWechatNotify({ ...body, signature, timestamp, nonce });
    }
    expireUnpaid() {
        return this.orderService.expireUnpaidOrders();
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)("/payments/wechat/params"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createPayParams", null);
__decorate([
    (0, common_1.Post)("/payments/wechat/notify"),
    __param(0, (0, common_1.Headers)("wechatpay-signature")),
    __param(1, (0, common_1.Headers)("wechatpay-timestamp")),
    __param(2, (0, common_1.Headers)("wechatpay-nonce")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "notify", null);
__decorate([
    (0, common_1.Post)("/internal/orders/expire-unpaid"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "expireUnpaid", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        payment_service_1.PaymentService,
        order_service_1.OrderService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map