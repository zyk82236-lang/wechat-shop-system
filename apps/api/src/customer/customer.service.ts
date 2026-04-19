import { Injectable, NotFoundException } from "@nestjs/common";
import { genId } from "../common/id";
import { StoreService } from "../data/store.service";
import type { Address, User } from "../domain/types";
import { PrismaService } from "../infra/prisma.service";

@Injectable()
export class CustomerService {
  constructor(
    private readonly store: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  getProfile(user: User) {
    return user;
  }

  async listAddresses(user: User): Promise<Address[]> {
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

  async createAddress(user: User, input: Omit<Address, "id" | "userId">): Promise<Address> {
    if (this.prisma.enabled) {
      if (input.isDefault) {
        await this.prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      const created = await this.prisma.address.create({
        data: { id: genId("addr"), userId: user.id, ...input },
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
    const address: Address = { id: genId("addr"), userId: user.id, ...input };
    this.store.addresses.push(address);
    return address;
  }

  async updateAddress(
    user: User,
    addressId: string,
    input: Partial<Omit<Address, "id" | "userId">>,
  ): Promise<Address> {
    if (this.prisma.enabled) {
      const exists = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
      if (!exists) throw new NotFoundException("Address not found");
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
      throw new NotFoundException("Address not found");
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

  async removeAddress(user: User, addressId: string): Promise<{ success: true }> {
    if (this.prisma.enabled) {
      const exists = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
      if (!exists) {
        throw new NotFoundException("Address not found");
      }
      await this.prisma.address.delete({ where: { id: addressId } });
      return { success: true };
    }

    const index = this.store.addresses.findIndex((candidate) => candidate.id === addressId && candidate.userId === user.id);
    if (index < 0) {
      throw new NotFoundException("Address not found");
    }
    this.store.addresses.splice(index, 1);
    return { success: true };
  }
}
