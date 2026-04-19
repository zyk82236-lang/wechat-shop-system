import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CartService } from "./cart.service";

@Controller("/cart")
export class CartController {
  constructor(
    private readonly authService: AuthService,
    private readonly cartService: CartService,
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.cartService.list(user);
  }

  @Post()
  async add(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { productId: string; skuId: string; quantity: number },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.cartService.add(user, body);
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { quantity?: number; checked?: boolean },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.cartService.update(user, id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.cartService.remove(user, id);
  }
}
