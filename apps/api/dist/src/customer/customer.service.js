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
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
const store_service_1 = require("../data/store.service");
const prisma_service_1 = require("../infra/prisma.service");
let CustomerService = class CustomerService {
    store;
    prisma;
    constructor(store, prisma) {
        this.store = store;
        this.prisma = prisma;
    }
    getProfile(user) {
        return user;
    }
    async listAddresses(user) {
        if (this.prisma.enabled) {
            const rows = await this.prisma.address.findMany({ where: { userId: user.id } });
            return rows.map((a) => ({
                id: a.id,
                userId: a.userId,
                name: a.name,
                phone: a.phone,
                province: a.province,
                city: a.city,
                district: a.district,
                detail: a.detail,
                isDefault: a.isDefault,
            }));
        }
        return this.store.addresses.filter((address) => address.userId === user.id);
    }
    async createAddress(user, input) {
        if (this.prisma.enabled) {
            if (input.isDefault) {
                await this.prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
            }
            const created = await this.prisma.address.create({
                data: { id: (0, id_1.genId)("addr"), userId: user.id, ...input },
            });
            return {
                id: created.id,
                userId: created.userId,
                name: created.name,
                phone: created.phone,
                province: created.province,
                city: created.city,
                district: created.district,
                detail: created.detail,
                isDefault: created.isDefault,
            };
        }
        if (input.isDefault) {
            this.store.addresses
                .filter((address) => address.userId === user.id)
                .forEach((address) => {
                address.isDefault = false;
            });
        }
        const address = { id: (0, id_1.genId)("addr"), userId: user.id, ...input };
        this.store.addresses.push(address);
        return address;
    }
    async updateAddress(user, addressId, input) {
        if (this.prisma.enabled) {
            const exists = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
            if (!exists)
                throw new common_1.NotFoundException("Address not found");
            if (input.isDefault) {
                await this.prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
            }
            const updated = await this.prisma.address.update({
                where: { id: addressId },
                data: input,
            });
            return {
                id: updated.id,
                userId: updated.userId,
                name: updated.name,
                phone: updated.phone,
                province: updated.province,
                city: updated.city,
                district: updated.district,
                detail: updated.detail,
                isDefault: updated.isDefault,
            };
        }
        const address = this.store.addresses.find((candidate) => candidate.id === addressId && candidate.userId === user.id);
        if (!address) {
            throw new common_1.NotFoundException("Address not found");
        }
        if (input.isDefault) {
            this.store.addresses
                .filter((candidate) => candidate.userId === user.id)
                .forEach((candidate) => {
                candidate.isDefault = false;
            });
        }
        Object.assign(address, input);
        return address;
    }
    async removeAddress(user, addressId) {
        if (this.prisma.enabled) {
            const exists = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
            if (!exists) {
                throw new common_1.NotFoundException("Address not found");
            }
            await this.prisma.address.delete({ where: { id: addressId } });
            return { success: true };
        }
        const index = this.store.addresses.findIndex((candidate) => candidate.id === addressId && candidate.userId === user.id);
        if (index < 0) {
            throw new common_1.NotFoundException("Address not found");
        }
        this.store.addresses.splice(index, 1);
        return { success: true };
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        prisma_service_1.PrismaService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map