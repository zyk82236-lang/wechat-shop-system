import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OrderService } from "./order.service";

@Controller("/orders")
export class OrderController {
  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.orderService.listOrders(user);
  }

  @Get(":id")
  async detail(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.orderService.getOrder(user, id);
  }

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      source: "cart" | "buy_now";
      addressId: string;
      note?: string;
      buyNowSkuId?: string;
      buyNowProductId?: string;
      buyNowQuantity?: number;
    },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.orderService.createOrder(user, body);
  }

  @Post(":id/cancel")
  async cancel(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.orderService.cancelOrder(user, id);
  }

  @Post(":id/confirm-received")
  async confirm(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.orderService.confirmReceived(user, id);
  }
}
