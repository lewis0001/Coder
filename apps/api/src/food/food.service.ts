import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListRestaurantsDto } from './dto/list-restaurants.dto';

@Injectable()
export class FoodService {
  constructor(private readonly prisma: PrismaService) {}

  async listRestaurants(params: ListRestaurantsDto) {
    const { limit, page, cuisine, search } = params;
    const where: Prisma.RestaurantWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(cuisine
        ? {
            cuisines: {
              some: {
                cuisine: {
                  name: { equals: cuisine, mode: 'insensitive' },
                },
              },
            },
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        include: {
          cuisines: { include: { cuisine: true } },
          hours: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: items.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        cuisines: r.cuisines.map((c) => c.cuisine.name),
        hours: r.hours,
      })),
    };
  }

  async getRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id, deletedAt: null },
      include: {
        cuisines: { include: { cuisine: true } },
        hours: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      cuisines: restaurant.cuisines.map((c) => c.cuisine.name),
      hours: restaurant.hours,
    };
  }

  async getMenu(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id, deletedAt: null } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId: id },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            optionGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    return {
      restaurantId: id,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items: cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isAvailable: item.isAvailable,
          optionGroups: item.optionGroups.map((group) => ({
            id: group.id,
            name: group.name,
            type: group.type,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            sortOrder: group.sortOrder,
            options: group.options.map((opt) => ({
              id: opt.id,
              name: opt.name,
              priceDelta: opt.priceDelta,
              sortOrder: opt.sortOrder,
            })),
          })),
        })),
      })),
    };
  }
}
