import { Injectable, UnauthorizedException } from "@nestjs/common";
import { StoreService } from "../data/store.service";
import type { AdminUser, Role, User } from "../domain/types";
import { PrismaService } from "../infra/prisma.service";

export interface LoginByCodeDto {
  code: string;
  nickname?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly store: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  async loginByWxCode(input: LoginByCodeDto): Promise<{ token: string; user: User }> {
    const openId = input.code.trim() ? `wx_${input.code.trim()}` : "";
    if (!openId) {
      throw new UnauthorizedException("Invalid code");
    }

    if (this.prisma.enabled) {
      let user = await this.prisma.user.findUnique({ where: { openId } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: `u_${Date.now()}`,
            openId,
            nickname: input.nickname?.trim() || "微信用户",
            createdAt: new Date(),
          },
        });
      }
      const mapped: User = {
        id: user.id,
        openId: user.openId,
        nickname: user.nickname,
        phone: user.phone ?? undefined,
        createdAt: user.createdAt.toISOString(),
      };
      return { token: `user:${mapped.id}`, user: mapped };
    }

    let user = this.store.users.find((candidate) => candidate.openId === openId);
    if (!user) {
      user = {
        id: `u_${Date.now()}`,
        openId,
        nickname: input.nickname?.trim() || "微信用户",
        createdAt: new Date().toISOString(),
      };
      this.store.users.push(user);
    }
    return { token: `user:${user.id}`, user };
  }

  async parseUserToken(token?: string): Promise<User> {
    const id = token?.replace(/^Bearer /i, "").replace("user:", "");
    let user: User | undefined;
    if (this.prisma.enabled && id) {
      const found = await this.prisma.user.findUnique({ where: { id } });
      if (found) {
        user = {
          id: found.id,
          openId: found.openId,
          nickname: found.nickname,
          phone: found.phone ?? undefined,
          createdAt: found.createdAt.toISOString(),
        };
      }
    } else {
      user = this.store.users.find((candidate) => candidate.id === id);
    }
    if (!id || !user) {
      throw new UnauthorizedException("User token invalid");
    }
    return user;
  }

  async adminLogin(username: string, password: string): Promise<{ token: string; role: Role }> {
    if (this.prisma.enabled) {
      const user = await this.prisma.adminUser.findFirst({ where: { username, password } });
      if (!user) {
        throw new UnauthorizedException("Admin credentials invalid");
      }
      return { token: `admin:${user.id}:${user.role}`, role: user.role as Role };
    }
    const user = this.store.adminUsers.find(
      (candidate) => candidate.username === username && candidate.password === password,
    );
    if (!user) {
      throw new UnauthorizedException("Admin credentials invalid");
    }
    return { token: `admin:${user.id}:${user.role}`, role: user.role };
  }

  async parseAdminToken(token?: string): Promise<AdminUser> {
    const cleaned = token?.replace(/^Bearer /i, "");
    const [prefix, id, role] = cleaned?.split(":") ?? [];
    if (prefix !== "admin" || !id || !role) {
      throw new UnauthorizedException("Admin token invalid");
    }
    let admin: AdminUser | undefined;
    if (this.prisma.enabled) {
      const found = await this.prisma.adminUser.findUnique({ where: { id } });
      if (found) {
        admin = { id: found.id, username: found.username, password: found.password, role: found.role as Role };
      }
    } else {
      admin = this.store.adminUsers.find((candidate) => candidate.id === id);
    }
    if (!admin) {
      throw new UnauthorizedException("Admin token invalid");
    }
    return admin;
  }
}
