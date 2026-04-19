import { Body, Controller, Headers, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/auth/wx-login")
  async wxLogin(@Body() body: { code: string; nickname?: string }) {
    return this.authService.loginByWxCode(body);
  }

  @Post("/admin/auth/login")
  async adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  @Post("/auth/validate")
  async validate(@Headers("authorization") authorization?: string) {
    const user = await this.authService.parseUserToken(authorization);
    return { user };
  }
}
