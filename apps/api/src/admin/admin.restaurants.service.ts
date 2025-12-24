import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListRestaurantsDto } from './dto/list-restaurants.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class AdminRestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListRestaurantsDto) {
    const { search, page = 1, limit = 20 } = params;
    const where: Prisma.RestaurantWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { cuisines: { include: { cuisine: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return { items, total, page, limit }; 
  }

  async getById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        cuisines: { include: { cuisine: true } },
        menuCategories: { include: { items: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async create(data: CreateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        regionId: data.regionId,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        cuisines: {
          create: data.cuisines.map((name) => ({ cuisine: { connectOrCreate: { where: { name }, create: { name } } } })),
        },
      },
    });
    return restaurant;
  }

  async update(id: string, data: UpdateRestaurantDto) {
    await this.ensureRestaurant(id);
    const restaurant = await this.prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        regionId: data.regionId,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    if (data.cuisines) {
      await this.prisma.restaurantCuisine.deleteMany({ where: { restaurantId: id } });
      await Promise.all(
        data.cuisines.map((name) =>
          this.prisma.restaurantCuisine.create({
            data: {
              restaurantId: id,
              cuisine: { connectOrCreate: { where: { name }, create: { name } } },
            },
          }),
        ),
      );
    }

    return restaurant;
  }

  async createCategory(restaurantId: string, data: CreateMenuCategoryDto) {
    await this.ensureRestaurant(restaurantId);
    return this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(categoryId: string, data: UpdateMenuCategoryDto) {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundException('Menu category not found');
    return this.prisma.menuCategory.update({ where: { id: categoryId }, data });
  }

  async createMenuItem(categoryId: string, data: CreateMenuItemDto) {
    const category = await this.prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Menu category not found');

    return this.prisma.menuItem.create({
      data: {
        categoryId,
        name: data.name,
        description: data.description,
        price: new Prisma.Decimal(data.price),
        isAvailable: data.isAvailable ?? true,
      },
    });
  }

  async updateMenuItem(itemId: string, data: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        isAvailable: data.isAvailable,
      },
    });
  }

  private async ensureRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }
}
