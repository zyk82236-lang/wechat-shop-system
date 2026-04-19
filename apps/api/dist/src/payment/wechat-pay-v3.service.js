"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WechatPayV3Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPayV3Service = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let WechatPayV3Service = WechatPayV3Service_1 = class WechatPayV3Service {
    logger = new common_1.Logger(WechatPayV3Service_1.name);
    appId = process.env.WECHAT_APP_ID ?? "wx_demo_appid";
    mchId = process.env.WECHAT_MCH_ID ?? "";
    serialNo = process.env.WECHAT_MCH_SERIAL_NO ?? "";
    privateKeyPem = process.env.WECHAT_MCH_PRIVATE_KEY ?? "";
    notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL ?? "https://example.com/pay/notify";
    platformPublicKey = process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY ?? "";
    getNotifyUrl() {
        return this.notifyUrl;
    }
    async createMiniProgramPay(input) {
        if (!this.mchId || !this.serialNo || !this.privateKeyPem) {
            this.logger.warn("WeChat pay merchant config missing; returning mock pay payload.");
            return {
                appId: this.appId,
                timeStamp: String(Math.floor(Date.now() / 1000)),
                nonceStr: (0, crypto_1.randomUUID)().replace(/-/g, ""),
                package: `prepay_id=mock_${input.outTradeNo}`,
                signType: "RSA",
                paySign: "mock-pay-signature",
                mode: "mock",
            };
        }
        const body = JSON.stringify({
            appid: this.appId,
            mchid: this.mchId,
            description: input.description,
            out_trade_no: input.outTradeNo,
            notify_url: input.notifyUrl,
            amount: { total: input.amountCents, currency: "CNY" },
            payer: { openid: input.payerOpenId },
        });
        const path = "/v3/pay/transactions/jsapi";
        const authorization = this.buildAuthorization("POST", path, body);
        const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authorization,
            },
            body,
        });
        const json = (await response.json());
        if (!response.ok || !json.prepay_id) {
            throw new common_1.BadRequestException(`Create prepay failed: ${json.code ?? "unknown"} ${json.message ?? ""}`.trim());
        }
        const timeStamp = String(Math.floor(Date.now() / 1000));
        const nonceStr = (0, crypto_1.randomUUID)().replace(/-/g, "");
        const pkg = `prepay_id=${json.prepay_id}`;
        const paySign = this.signMessage(`${this.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`);
        return {
            appId: this.appId,
            timeStamp,
            nonceStr,
            package: pkg,
            signType: "RSA",
            paySign,
            mode: "live",
        };
    }
    verifyNotifySignature(params) {
        if (!this.platformPublicKey.trim()) {
            // In local development we allow callbacks without platform cert.
            return true;
        }
        if (!params.timestamp || !params.nonce || !params.signature) {
            return false;
        }
        const message = `${params.timestamp}\n${params.nonce}\n${params.body}\n`;
        const verifier = (0, crypto_1.createVerify)("RSA-SHA256");
        verifier.update(message);
        verifier.end();
        return verifier.verify(this.platformPublicKey, params.signature, "base64");
    }
    buildAuthorization(method, path, body) {
        const nonce = (0, crypto_1.randomUUID)().replace(/-/g, "");
        const timestamp = String(Math.floor(Date.now() / 1000));
        const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
        const signature = this.signMessage(message);
        return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
    }
    signMessage(message) {
        const privateKey = (0, crypto_1.createPrivateKey)(this.privateKeyPem);
        const signer = (0, crypto_1.createSign)("RSA-SHA256");
        signer.update(message);
        signer.end();
        return signer.sign(privateKey, "base64");
    }
};
exports.WechatPayV3Service = WechatPayV3Service;
exports.WechatPayV3Service = WechatPayV3Service = WechatPayV3Service_1 = __decorate([
    (0, common_1.Injectable)()
], WechatPayV3Service);
//# sourceMappingURL=wechat-pay-v3.service.js.map