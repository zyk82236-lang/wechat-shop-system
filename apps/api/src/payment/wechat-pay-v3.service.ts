import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createPrivateKey, createSign, createVerify, randomUUID } from "crypto";

export interface WechatNativePayInput {
  outTradeNo: string;
  description: string;
  notifyUrl: string;
  amountCents: number;
  payerOpenId: string;
}

@Injectable()
export class WechatPayV3Service {
  private readonly logger = new Logger(WechatPayV3Service.name);

  private readonly appId = process.env.WECHAT_APP_ID ?? "wx_demo_appid";
  private readonly mchId = process.env.WECHAT_MCH_ID ?? "";
  private readonly serialNo = process.env.WECHAT_MCH_SERIAL_NO ?? "";
  private readonly privateKeyPem = process.env.WECHAT_MCH_PRIVATE_KEY ?? "";
  private readonly notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL ?? "https://example.com/pay/notify";
  private readonly platformPublicKey = process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY ?? "";

  getNotifyUrl(): string {
    return this.notifyUrl;
  }

  async createMiniProgramPay(input: WechatNativePayInput) {
    if (!this.mchId || !this.serialNo || !this.privateKeyPem) {
      this.logger.warn("WeChat pay merchant config missing; returning mock pay payload.");
      return {
        appId: this.appId,
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: randomUUID().replace(/-/g, ""),
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
    const json = (await response.json()) as { prepay_id?: string; code?: string; message?: string };
    if (!response.ok || !json.prepay_id) {
      throw new BadRequestException(`Create prepay failed: ${json.code ?? "unknown"} ${json.message ?? ""}`.trim());
    }

    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomUUID().replace(/-/g, "");
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

  verifyNotifySignature(params: {
    timestamp?: string;
    nonce?: string;
    signature?: string;
    body: string;
  }): boolean {
    if (!this.platformPublicKey.trim()) {
      // In local development we allow callbacks without platform cert.
      return true;
    }
    if (!params.timestamp || !params.nonce || !params.signature) {
      return false;
    }
    const message = `${params.timestamp}\n${params.nonce}\n${params.body}\n`;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    verifier.end();
    return verifier.verify(this.platformPublicKey, params.signature, "base64");
  }

  private buildAuthorization(method: string, path: string, body: string): string {
    const nonce = randomUUID().replace(/-/g, "");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.signMessage(message);
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
  }

  private signMessage(message: string): string {
    const privateKey = createPrivateKey(this.privateKeyPem);
    const signer = createSign("RSA-SHA256");
    signer.update(message);
    signer.end();
    return signer.sign(privateKey, "base64");
  }
}
