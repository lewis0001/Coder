import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminStoresService } from './admin.stores.service';
import { ListStoresDto } from './dto/list-stores.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateStoreCategoryDto } from './dto/create-store-category.dto';
import { UpdateStoreCategoryDto } from './dto/update-store-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Controller('admin/stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OPS')
export class AdminStoresController {
  constructor(private readonly service: AdminStoresService) {}

  @Get()
  list(@Query() query: ListStoresDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() body: CreateStoreDto) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateStoreDto) {
    return this.service.update(id, body);
  }

  @Post(':id/categories')
  createCategory(@Param('id') storeId: string, @Body() body: CreateStoreCategoryDto) {
    return this.service.createCategory(storeId, body);
  }

  @Put('categories/:categoryId')
  updateCategory(@Param('categoryId') categoryId: string, @Body() body: UpdateStoreCategoryDto) {
    return this.service.updateCategory(categoryId, body);
  }

  @Post('categories/:categoryId/products')
  createProduct(@Param('categoryId') categoryId: string, @Body() body: CreateProductDto) {
    return this.service.createProduct(categoryId, body);
  }

  @Put('products/:productId')
  updateProduct(@Param('productId') productId: string, @Body() body: UpdateProductDto) {
    return this.service.updateProduct(productId, body);
  }

  @Post('products/:productId/variants')
  createVariant(@Param('productId') productId: string, @Body() body: CreateVariantDto) {
    return this.service.createVariant(productId, body);
  }

  @Put('variants/:variantId')
  updateVariant(@Param('variantId') variantId: string, @Body() body: UpdateVariantDto) {
    return this.service.updateVariant(variantId, body);
  }

  @Put('inventory/:productId')
  updateInventory(@Param('productId') productId: string, @Body() body: UpdateInventoryDto) {
    return this.service.updateInventory(productId, body);
  }
}
