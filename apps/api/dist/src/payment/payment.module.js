"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const data_module_1 = require("../data/data.module");
const prisma_module_1 = require("../infra/prisma.module");
const redis_module_1 = require("../infra/redis.module");
const order_module_1 = require("../order/order.module");
const payment_controller_1 = require("./payment.controller");
const payment_service_1 = require("./payment.service");
const wechat_pay_v3_service_1 = require("./wechat-pay-v3.service");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [data_module_1.DataModule, order_module_1.OrderModule, auth_module_1.AuthModule, redis_module_1.RedisModule, prisma_module_1.PrismaModule],
        providers: [payment_service_1.PaymentService, wechat_pay_v3_service_1.WechatPayV3Service],
        controllers: [payment_controller_1.PaymentController],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map