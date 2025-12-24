import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRestaurantsService } from './admin.restaurants.service';
import { ListRestaurantsDto } from './dto/list-restaurants.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('admin/restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OPS')
export class AdminRestaurantsController {
  constructor(private readonly service: AdminRestaurantsService) {}

  @Get()
  list(@Query() query: ListRestaurantsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() body: CreateRestaurantDto) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateRestaurantDto) {
    return this.service.update(id, body);
  }

  @Post(':id/categories')
  createCategory(@Param('id') restaurantId: string, @Body() body: CreateMenuCategoryDto) {
    return this.service.createCategory(restaurantId, body);
  }

  @Put('/categories/:categoryId')
  updateCategory(@Param('categoryId') categoryId: string, @Body() body: UpdateMenuCategoryDto) {
    return this.service.updateCategory(categoryId, body);
  }

  @Post('/categories/:categoryId/items')
  createMenuItem(@Param('categoryId') categoryId: string, @Body() body: CreateMenuItemDto) {
    return this.service.createMenuItem(categoryId, body);
  }

  @Put('/items/:itemId')
  updateMenuItem(@Param('itemId') itemId: string, @Body() body: UpdateMenuItemDto) {
    return this.service.updateMenuItem(itemId, body);
  }
}
