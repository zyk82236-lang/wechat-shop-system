import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { AdminService } from "./admin.service";

@Controller("/admin")
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Get("/dashboard/stats")
  async stats(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.dashboardStats();
  }

  @Get("/products")
  async listProducts(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.listProducts();
  }

  @Post("/products/upsert")
  async upsertProduct(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.upsertProduct(body);
  }

  @Delete("/products/:id")
  async removeProduct(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.removeProduct(id);
  }

  @Get("/categories")
  async listCategories(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.listCategories();
  }

  @Post("/categories/upsert")
  async upsertCategory(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.upsertCategory(body);
  }

  @Delete("/categories/:id")
  async removeCategory(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.removeCategory(id);
  }

  @Get("/orders")
  async listOrders(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.listOrders();
  }

  @Post("/orders/ship")
  async ship(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      orderId: string;
      company: string;
      companyCode?: string;
      trackingNo: string;
      expectedDeliveryAt?: string;
    },
  ) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.markShipped(body);
  }

  @Post("/orders/:id/tracks")
  async appendTrack(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body()
    body: {
      content: string;
      location?: string;
      status?: "pending_pickup" | "in_transit" | "signed" | "exception";
    },
  ) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.appendShipmentTrack({
      orderId: id,
      content: body.content,
      location: body.location,
      status: body.status,
    });
  }

  @Get("/banners")
  async listBanners(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.listBanners();
  }

  @Post("/banners/upsert")
  async upsertBanner(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.upsertBanner(body);
  }

  @Delete("/banners/:id")
  async removeBanner(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.removeBanner(id);
  }

  @Get("/users")
  async listUsers(@Headers("authorization") authorization?: string) {
    const admin = await this.authService.parseAdminToken(authorization);
    this.adminService.assertRole(admin, ["SUPER_ADMIN", "OPERATOR"]);
    return this.adminService.listUsers();
  }
}
