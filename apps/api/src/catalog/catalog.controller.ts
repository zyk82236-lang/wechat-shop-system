import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("/categories")
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get("/banners")
  listBanners() {
    return this.catalogService.listBanners();
  }

  @Get("/products")
  listProducts(@Query("categoryId") categoryId?: string, @Query("recommended") recommended?: string) {
    return this.catalogService.listProducts({ categoryId, recommended: recommended === "true" });
  }

  @Get("/products/:id")
  getProduct(@Param("id") id: string) {
    return this.catalogService.getProductById(id);
  }
}
