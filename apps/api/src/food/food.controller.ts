import { Controller, Get, Param, Query } from '@nestjs/common';
import { FoodService } from './food.service';
import { ListRestaurantsDto } from './dto/list-restaurants.dto';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get('restaurants')
  async listRestaurants(@Query() query: ListRestaurantsDto) {
    return this.foodService.listRestaurants(query);
  }

  @Get('restaurants/:id')
  async getRestaurant(@Param('id') id: string) {
    return this.foodService.getRestaurant(id);
  }

  @Get('restaurants/:id/menu')
  async getMenu(@Param('id') id: string) {
    return this.foodService.getMenu(id);
  }
}
