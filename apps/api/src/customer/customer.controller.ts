import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CustomerService } from "./customer.service";

@Controller()
export class CustomerController {
  constructor(
    private readonly authService: AuthService,
    private readonly customerService: CustomerService,
  ) {}

  @Get("/users/me")
  async me(@Headers("authorization") authorization?: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.customerService.getProfile(user);
  }

  @Get("/addresses")
  async listAddresses(@Headers("authorization") authorization?: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.customerService.listAddresses(user);
  }

  @Post("/addresses")
  async createAddress(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      name: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      detail: string;
      isDefault: boolean;
    },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.customerService.createAddress(user, body);
  }

  @Patch("/addresses/:id")
  async updateAddress(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      province?: string;
      city?: string;
      district?: string;
      detail?: string;
      isDefault?: boolean;
    },
  ) {
    const user = await this.authService.parseUserToken(authorization);
    return this.customerService.updateAddress(user, id, body);
  }

  @Delete("/addresses/:id")
  async deleteAddress(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.parseUserToken(authorization);
    return this.customerService.removeAddress(user, id);
  }
}
