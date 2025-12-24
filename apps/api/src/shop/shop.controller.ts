import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('categories')
  async listCategories(@Query() query: ListCategoriesDto) {
    return this.shopService.listCategories(query);
  }

  @Get('products')
  async listProducts(@Query() query: ListProductsDto) {
    return this.shopService.listProducts(query);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.shopService.getProduct(id);
  }

  @Get('search')
  async search(@Query() query: SearchProductsDto) {
    return this.shopService.searchProducts(query);
  }
}
