import { Body, Controller, Headers, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OrderService } from "../order/order.service";
import { PaymentService } from "./payment.service";

@Controller()
export class PaymentController {
  constructor(
    private readonly authService: AuthService,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
  ) {}

  @Post("/payments/wechat/params")
  async createPayParams(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { orderId: string },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.paymentService.createWechatPayParams(user.id, body.orderId);
  }

  @Post("/payments/wechat/notify")
  notify(
    @Headers("wechatpay-signature") signature: string | undefined,
    @Headers("wechatpay-timestamp") timestamp: string | undefined,
    @Headers("wechatpay-nonce") nonce: string | undefined,
    @Body() body: { orderNo: string; transactionId: string; raw?: string },
  ) {
    return this.paymentService.handleWechatNotify({ ...body, signature, timestamp, nonce });
  }

  @Post("/internal/orders/expire-unpaid")
  expireUnpaid() {
    return this.orderService.expireUnpaidOrders();
  }
}
