import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class AdminStoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListStoresDto) {
    const { search, page = 1, limit = 20 } = params;
    const where: Prisma.StoreWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { categories: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.store.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              include: {
                variants: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async create(data: CreateStoreDto) {
    const store = await this.prisma.store.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        regionId: data.regionId,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
      },
    });
    return store;
  }

  async update(id: string, data: UpdateStoreDto) {
    await this.ensureStore(id);
    return this.prisma.store.update({
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
  }

  async createCategory(storeId: string, data: CreateStoreCategoryDto) {
    await this.ensureStore(storeId);
    return this.prisma.productCategory.create({
      data: {
        storeId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(categoryId: string, data: UpdateStoreCategoryDto) {
    const category = await this.prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Store category not found');
    return this.prisma.productCategory.update({ where: { id: categoryId }, data });
  }

  async createProduct(categoryId: string, data: CreateProductDto) {
    const category = await this.prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Store category not found');

    const product = await this.prisma.product.create({
      data: {
        storeId: category.storeId,
        categoryId,
        name: data.name,
        description: data.description,
        basePrice: new Prisma.Decimal(data.basePrice),
        isActive: data.isActive ?? true,
      },
    });

    const variant = await this.prisma.productVariant.create({
      data: {
        productId: product.id,
        name: data.variantName ?? 'Default',
        price: new Prisma.Decimal(data.basePrice),
        sku: data.sku ?? undefined,
      },
    });

    await this.prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity: data.initialQuantity ?? 0 },
      create: { productId: product.id, quantity: data.initialQuantity ?? 0 },
    });

    return { ...product, variants: [variant] };
  }

  async updateProduct(productId: string, data: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice !== undefined ? new Prisma.Decimal(data.basePrice) : undefined,
        categoryId: data.categoryId,
        isActive: data.isActive,
      },
    });
  }

  async createVariant(productId: string, data: CreateVariantDto) {
    await this.ensureProduct(productId);
    return this.prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        price: new Prisma.Decimal(data.price),
        sku: data.sku,
      },
    });
  }

  async updateVariant(variantId: string, data: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: data.name,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        sku: data.sku,
      },
    });
  }

  async updateInventory(productId: string, data: UpdateInventoryDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    try {
      return await this.prisma.inventory.update({
        where: { productId },
        data: { quantity: data.quantity },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        return this.prisma.inventory.create({ data: { productId, quantity: data.quantity } });
      }
      throw err;
    }
  }

  private async ensureStore(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
