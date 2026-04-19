"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaModule = void 0;
const common_1 = require("@nestjs/common");
const data_module_1 = require("../data/data.module");
const prisma_persistence_service_1 = require("./prisma-persistence.service");
const prisma_seed_service_1 = require("./prisma-seed.service");
const prisma_service_1 = require("./prisma.service");
let PrismaModule = class PrismaModule {
};
exports.PrismaModule = PrismaModule;
exports.PrismaModule = PrismaModule = __decorate([
    (0, common_1.Module)({
        imports: [data_module_1.DataModule],
        providers: [prisma_service_1.PrismaService, prisma_persistence_service_1.PrismaPersistenceService, prisma_seed_service_1.PrismaSeedService],
        exports: [prisma_service_1.PrismaService, prisma_persistence_service_1.PrismaPersistenceService],
    })
], PrismaModule);
//# sourceMappingURL=prisma.module.js.map