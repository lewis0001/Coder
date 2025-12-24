import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(params: ListCategoriesDto) {
    const where: Prisma.ProductCategoryWhereInput = {
      ...(params.storeId ? { storeId: params.storeId } : {}),
    };

    const categories = await this.prisma.productCategory.findMany({
      where,
      include: { store: true },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      storeId: cat.storeId,
      storeName: cat.store.name,
    }));
  }

  async listProducts(params: ListProductsDto) {
    const { storeId, categoryId, search, limit, page, sort } = params;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(storeId ? { storeId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'price_asc'
        ? { basePrice: 'asc' }
        : sort === 'price_desc'
        ? { basePrice: 'desc' }
        : { createdAt: 'desc' };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { category: true, store: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        storeId: p.storeId,
        storeName: p.store.name,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        isActive: p.isActive,
      })),
    };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        store: true,
        variants: true,
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      storeId: product.storeId,
      storeName: product.store.name,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      isActive: product.isActive,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        sku: variant.sku,
      })),
      inventory: product.inventory?.quantity ?? 0,
    };
  }

  async searchProducts(params: SearchProductsDto) {
    const { search, storeId, limit } = params;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(storeId ? { storeId } : {}),
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    };

    const results = await this.prisma.product.findMany({
      where,
      include: { store: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return results.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice,
      storeId: p.storeId,
      storeName: p.store.name,
      categoryId: p.categoryId,
      categoryName: p.category.name,
    }));
  }
}
