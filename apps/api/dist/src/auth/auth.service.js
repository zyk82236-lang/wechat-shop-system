"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("../data/store.service");
const prisma_service_1 = require("../infra/prisma.service");
let AuthService = class AuthService {
    store;
    prisma;
    constructor(store, prisma) {
        this.store = store;
        this.prisma = prisma;
    }
    async loginByWxCode(input) {
        const openId = input.code.trim() ? `wx_${input.code.trim()}` : "";
        if (!openId) {
            throw new common_1.UnauthorizedException("Invalid code");
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
            const mapped = {
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
    async parseUserToken(token) {
        const id = token?.replace(/^Bearer /i, "").replace("user:", "");
        let user;
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
        }
        else {
            user = this.store.users.find((candidate) => candidate.id === id);
        }
        if (!id || !user) {
            throw new common_1.UnauthorizedException("User token invalid");
        }
        return user;
    }
    async adminLogin(username, password) {
        if (this.prisma.enabled) {
            const user = await this.prisma.adminUser.findFirst({ where: { username, password } });
            if (!user) {
                throw new common_1.UnauthorizedException("Admin credentials invalid");
            }
            return { token: `admin:${user.id}:${user.role}`, role: user.role };
        }
        const user = this.store.adminUsers.find((candidate) => candidate.username === username && candidate.password === password);
        if (!user) {
            throw new common_1.UnauthorizedException("Admin credentials invalid");
        }
        return { token: `admin:${user.id}:${user.role}`, role: user.role };
    }
    async parseAdminToken(token) {
        const cleaned = token?.replace(/^Bearer /i, "");
        const [prefix, id, role] = cleaned?.split(":") ?? [];
        if (prefix !== "admin" || !id || !role) {
            throw new common_1.UnauthorizedException("Admin token invalid");
        }
        let admin;
        if (this.prisma.enabled) {
            const found = await this.prisma.adminUser.findUnique({ where: { id } });
            if (found) {
                admin = { id: found.id, username: found.username, password: found.password, role: found.role };
            }
        }
        else {
            admin = this.store.adminUsers.find((candidate) => candidate.id === id);
        }
        if (!admin) {
            throw new common_1.UnauthorizedException("Admin token invalid");
        }
        return admin;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map