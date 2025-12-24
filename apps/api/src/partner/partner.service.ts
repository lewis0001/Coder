import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPartnerStore(userId: string) {
    const link = await this.prisma.partnerStore.findFirst({
      where: { userId },
      include: { store: true },
    });
    if (!link) {
      throw new NotFoundException('Store not linked to partner user');
    }
    return link.store;
  }

  async getCatalog(userId: string) {
    const store = await this.getPartnerStore(userId);
    const categories = await this.prisma.productCategory.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
          include: {
            variants: true,
            inventory: true,
          },
        },
      },
    });

    return { store, categories };
  }

  async updateProduct(userId: string, productId: string, data: UpdateProductDto) {
    const product = await this.ensureProductOwnership(userId, productId);
    const payload: Prisma.ProductUpdateInput = {};
    if (data.price !== undefined) {
      payload.basePrice = new Prisma.Decimal(data.price);
    }
    if (data.isActive !== undefined) {
      payload.isActive = data.isActive;
    }

    return this.prisma.product.update({ where: { id: product.id }, data: payload });
  }

  async updateVariant(userId: string, variantId: string, data: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ include: { product: true }, where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.ensureProductOwnership(userId, variant.productId);

    const payload: Prisma.ProductVariantUpdateInput = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.price !== undefined) payload.price = new Prisma.Decimal(data.price);

    return this.prisma.productVariant.update({ where: { id: variantId }, data: payload });
  }

  async updateInventory(userId: string, productId: string, data: UpdateInventoryDto) {
    await this.ensureProductOwnership(userId, productId);
    return this.prisma.inventory.upsert({
      where: { productId },
      update: { quantity: data.quantity },
      create: { productId, quantity: data.quantity },
    });
  }

  private async ensureProductOwnership(userId: string, productId: string): Promise<Product> {
    const store = await this.getPartnerStore(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== store.id) {
      throw new BadRequestException('Product not found for this store');
    }
    return product;
  }
}
