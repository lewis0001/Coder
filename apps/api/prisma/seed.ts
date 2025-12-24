import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_USERS = {
  admin: {
    id: 'seed-user-admin',
    email: 'admin@orbit.local',
    phone: '+10000000001',
    fullName: 'Orbit Admin',
    password: 'AdminPass123!',
  },
  partner: {
    id: 'seed-user-partner',
    email: 'partner@orbit.local',
    phone: '+10000000002',
    fullName: 'Orbit Partner',
    password: 'PartnerPass123!',
  },
  courier: {
    id: 'seed-user-courier',
    email: 'courier@orbit.local',
    phone: '+10000000003',
    fullName: 'Orbit Courier',
    password: 'CourierPass123!',
  },
  user: {
    id: 'seed-user-customer',
    email: 'user@orbit.local',
    phone: '+10000000004',
    fullName: 'Orbit User',
    password: 'UserPass123!',
  },
};

const ROLE_NAMES = ['USER', 'COURIER', 'PARTNER', 'OPS', 'ADMIN'] as const;
const CUISINES = ['Burgers', 'Pizza', 'Sushi', 'Healthy', 'Desserts', 'BBQ'];
const STORE_CATEGORY_NAMES = ['Produce', 'Dairy', 'Bakery', 'Pantry', 'Beverages', 'Snacks'];

async function seedRoles() {
  const roles: Role[] = [];
  for (const name of ROLE_NAMES) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    roles.push(role);
  }
  return roles;
}

async function seedRegion() {
  return prisma.region.upsert({
    where: { id: 'seed-region-orbit' },
    update: { name: 'Orbit City', currency: 'USD', timezone: 'UTC' },
    create: {
      id: 'seed-region-orbit',
      name: 'Orbit City',
      currency: 'USD',
      timezone: 'UTC',
    },
  });
}

async function seedPricingRules(regionId: string) {
  await prisma.pricingRule.upsert({
    where: { id: 'seed-pricing-default' },
    update: {},
    create: {
      id: 'seed-pricing-default',
      regionId,
      baseFee: new Prisma.Decimal('5.00'),
      distanceRate: new Prisma.Decimal('1.50'),
      surgeMultiplier: new Prisma.Decimal('1.0'),
      commissionPct: new Prisma.Decimal('10.00'),
      fixedCommission: new Prisma.Decimal('1.00'),
      taxRate: new Prisma.Decimal('5.00'),
    },
  });
}

async function attachRole(userId: string, roleName: (typeof ROLE_NAMES)[number]) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

async function seedUserWithRole(key: keyof typeof DEFAULT_USERS, role: (typeof ROLE_NAMES)[number]) {
  const data = DEFAULT_USERS[key];
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      id: data.id,
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
      passwordHash,
      locale: 'en',
    },
  });
  await attachRole(user.id, role);
  return user;
}

async function seedCuisines() {
  const cuisineRecords = [];
  for (const name of CUISINES) {
    const cuisine = await prisma.cuisine.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    cuisineRecords.push(cuisine);
  }
  return cuisineRecords;
}

async function seedRestaurants(regionId: string) {
  const restaurants = [
    {
      id: 'seed-restaurant-sunset',
      name: 'Sunset Grill',
      description: 'Neighborhood burgers and BBQ classics.',
      cuisines: ['Burgers', 'BBQ'],
      categories: [
        {
          name: 'Burgers',
          items: [
            { name: 'Classic Burger', price: 10.99, description: 'Beef patty, lettuce, tomato, onion.' },
            { name: 'Smoky BBQ Burger', price: 12.5, description: 'BBQ sauce, crispy onions, cheddar.' },
          ],
        },
        {
          name: 'Sides',
          items: [
            { name: 'Fries', price: 3.99, description: 'Crispy fries with sea salt.' },
            { name: 'Onion Rings', price: 4.5, description: 'Beer-battered rings with dip.' },
          ],
        },
      ],
    },
    {
      id: 'seed-restaurant-bella',
      name: 'Bella Pasta',
      description: 'Cozy Italian pastas and pizzas.',
      cuisines: ['Pizza'],
      categories: [
        {
          name: 'Pasta',
          items: [
            { name: 'Spaghetti Pomodoro', price: 11.25, description: 'Fresh tomato sauce and basil.' },
            { name: 'Fettuccine Alfredo', price: 12.75, description: 'Creamy parmesan sauce.' },
          ],
        },
        {
          name: 'Pizza',
          items: [
            { name: 'Margherita Pizza', price: 13.0, description: 'Tomato, mozzarella, basil.' },
            { name: 'Pepperoni Pizza', price: 14.5, description: 'Loaded pepperoni and cheese.' },
          ],
        },
      ],
    },
    {
      id: 'seed-restaurant-sakura',
      name: 'Sakura Sushi',
      description: 'Fresh rolls and bowls.',
      cuisines: ['Sushi'],
      categories: [
        {
          name: 'Rolls',
          items: [
            { name: 'California Roll', price: 8.99, description: 'Crab, avocado, cucumber.' },
            { name: 'Spicy Tuna Roll', price: 9.5, description: 'Tuna, spicy mayo.' },
          ],
        },
        {
          name: 'Bowls',
          items: [
            { name: 'Salmon Poke Bowl', price: 12.9, description: 'Salmon, rice, veggies, sauces.' },
            { name: 'Tofu Teriyaki Bowl', price: 10.75, description: 'Glazed tofu with greens.' },
          ],
        },
      ],
    },
    {
      id: 'seed-restaurant-greenleaf',
      name: 'GreenLeaf Kitchen',
      description: 'Healthy bowls and salads.',
      cuisines: ['Healthy'],
      categories: [
        {
          name: 'Bowls',
          items: [
            { name: 'Mediterranean Bowl', price: 11.9, description: 'Falafel, hummus, grains.' },
            { name: 'Protein Power Bowl', price: 12.9, description: 'Chicken, quinoa, veggies.' },
          ],
        },
        {
          name: 'Salads',
          items: [
            { name: 'Kale Caesar', price: 9.75, description: 'Kale, parmesan, crispy chickpeas.' },
            { name: 'Citrus Crunch', price: 10.25, description: 'Citrus, avocado, seeds.' },
          ],
        },
      ],
    },
    {
      id: 'seed-restaurant-sugarbar',
      name: 'Sugar Bar',
      description: 'Desserts and coffee.',
      cuisines: ['Desserts'],
      categories: [
        {
          name: 'Desserts',
          items: [
            { name: 'Chocolate Lava Cake', price: 6.5, description: 'Warm cake with molten center.' },
            { name: 'Berry Cheesecake', price: 6.9, description: 'Creamy cheesecake, berry compote.' },
          ],
        },
        {
          name: 'Coffee',
          items: [
            { name: 'Latte', price: 4.25, description: 'Velvety espresso and milk.' },
            { name: 'Cold Brew', price: 4.5, description: 'Slow-steeped coffee, smooth finish.' },
          ],
        },
      ],
    },
  ];

  for (const restaurant of restaurants) {
    const createdRestaurant = await prisma.restaurant.upsert({
      where: { id: restaurant.id },
      update: {},
      create: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        regionId,
        address: `${restaurant.name} Address`,
        latitude: 0,
        longitude: 0,
      },
    });

    for (const cuisineName of restaurant.cuisines) {
      const cuisine = await prisma.cuisine.findUnique({ where: { name: cuisineName } });
      if (cuisine) {
        await prisma.restaurantCuisine.upsert({
          where: { restaurantId_cuisineId: { restaurantId: createdRestaurant.id, cuisineId: cuisine.id } },
          update: {},
          create: { restaurantId: createdRestaurant.id, cuisineId: cuisine.id },
        });
      }
    }

    for (let day = 0; day < 7; day++) {
      await prisma.restaurantHours.upsert({
        where: { id: `${createdRestaurant.id}-hours-${day}` },
        update: {},
        create: {
          id: `${createdRestaurant.id}-hours-${day}`,
          restaurantId: createdRestaurant.id,
          dayOfWeek: day,
          opensAt: '08:00',
          closesAt: '22:00',
        },
      });
    }

    for (let idx = 0; idx < restaurant.categories.length; idx++) {
      const category = restaurant.categories[idx];
      const createdCategory = await prisma.menuCategory.upsert({
        where: { id: `${createdRestaurant.id}-cat-${idx}` },
        update: {},
        create: {
          id: `${createdRestaurant.id}-cat-${idx}`,
          restaurantId: createdRestaurant.id,
          name: category.name,
          sortOrder: idx,
        },
      });

      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex];
        const menuItem = await prisma.menuItem.upsert({
          where: { id: `${createdCategory.id}-item-${itemIndex}` },
          update: {},
          create: {
            id: `${createdCategory.id}-item-${itemIndex}`,
            categoryId: createdCategory.id,
            name: item.name,
            description: item.description,
            price: new Prisma.Decimal(item.price.toFixed(2)),
            isAvailable: true,
          },
        });

        if (item.name.toLowerCase().includes('burger') || item.name.toLowerCase().includes('pizza')) {
          const groupId = `${menuItem.id}-size`;
          await prisma.menuItemOptionGroup.upsert({
            where: { id: groupId },
            update: {},
            create: {
              id: groupId,
              menuItemId: menuItem.id,
              name: 'Size',
              type: 'SINGLE',
              minSelect: 1,
              maxSelect: 1,
              sortOrder: 0,
              options: {
                create: [
                  { id: `${groupId}-regular`, name: 'Regular', priceDelta: new Prisma.Decimal('0.00'), sortOrder: 0 },
                  { id: `${groupId}-large`, name: 'Large', priceDelta: new Prisma.Decimal('2.00'), sortOrder: 1 },
                ],
              },
            },
          });
        }
      }
    }
  }
}

async function seedStore(regionId: string) {
  const store = await prisma.store.upsert({
    where: { id: 'seed-store-orbitmart' },
    update: {},
    create: {
      id: 'seed-store-orbitmart',
      name: 'Orbit Mart',
      description: 'Daily essentials and groceries.',
      regionId,
      address: '789 Market Street',
      latitude: 0,
      longitude: 0,
    },
  });

  const categories = [] as { id: string; name: string }[];
  STORE_CATEGORY_NAMES.forEach((name, idx) => {
    categories.push({ id: `seed-store-cat-${idx}`, name });
  });

  for (const [idx, cat] of categories.entries()) {
    await prisma.productCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        storeId: store.id,
        name: cat.name,
        sortOrder: idx,
      },
    });
  }

  for (let day = 0; day < 7; day++) {
    await prisma.storeHours.upsert({
      where: { id: `${store.id}-hours-${day}` },
      update: {},
      create: {
        id: `${store.id}-hours-${day}`,
        storeId: store.id,
        dayOfWeek: day,
        opensAt: '08:00',
        closesAt: '23:00',
      },
    });
  }

  const categoryIds = categories.map((c) => c.id);
  for (let i = 1; i <= 100; i++) {
    const categoryId = categoryIds[i % categoryIds.length];
    const productId = `seed-product-${i}`;
    const variantId = `seed-variant-${i}`;
    const basePrice = new Prisma.Decimal((5 + (i % 20) + (i % 3) * 0.5).toFixed(2));

    await prisma.product.upsert({
      where: { id: productId },
      update: {},
      create: {
        id: productId,
        storeId: store.id,
        categoryId,
        name: `Grocery Item ${i}`,
        description: `Everyday item number ${i} from Orbit Mart`,
        basePrice,
        isActive: true,
      },
    });

    await prisma.productVariant.upsert({
      where: { id: variantId },
      update: {},
      create: {
        id: variantId,
        productId,
        name: 'Standard',
        price: basePrice,
        sku: `SKU-${i.toString().padStart(4, '0')}`,
      },
    });

    await prisma.inventory.upsert({
      where: { productId },
      update: { quantity: 250 },
      create: {
        productId,
        quantity: 250,
      },
    });
  }

  return store;
}

async function seedPartnerStore(partnerUserId: string, storeId: string) {
  await prisma.partnerStore.upsert({
    where: { userId_storeId: { userId: partnerUserId, storeId } },
    update: {},
    create: { userId: partnerUserId, storeId },
  });
}

async function seedPromotionsAndLoyalty(regionId: string) {
  const welcomePromotion = await prisma.promotion.upsert({
    where: { id: 'seed-promo-welcome' },
    update: {},
    create: {
      id: 'seed-promo-welcome',
      name: 'Welcome 10% Off',
      type: 'PERCENT',
      value: new Prisma.Decimal('10'),
      maxRedemptions: 5000,
      startsAt: new Date(),
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: { isActive: true, promotionId: welcomePromotion.id },
    create: { code: 'WELCOME10', promotionId: welcomePromotion.id },
  });

  await prisma.loyaltyRule.upsert({
    where: { id: 'seed-loyalty-default' },
    update: {
      regionId,
      earnRate: new Prisma.Decimal('1.0'),
      redeemRate: new Prisma.Decimal('0.01'),
    },
    create: {
      id: 'seed-loyalty-default',
      regionId,
      earnRate: new Prisma.Decimal('1.0'),
      redeemRate: new Prisma.Decimal('0.01'),
    },
  });
}

async function main() {
  await seedRoles();
  const region = await seedRegion();
  await seedPricingRules(region.id);
  const cuisines = await seedCuisines();

  const admin = await seedUserWithRole('admin', 'ADMIN');
  await attachRole(admin.id, 'OPS');

  const partner = await seedUserWithRole('partner', 'PARTNER');
  const courierUser = await seedUserWithRole('courier', 'COURIER');
  const customer = await seedUserWithRole('user', 'USER');

  await prisma.courier.upsert({
    where: { userId: courierUser.id },
    update: { online: false },
    create: { userId: courierUser.id, online: false },
  });

  await prisma.address.upsert({
    where: { id: 'seed-address-user' },
    update: {},
    create: {
      id: 'seed-address-user',
      userId: customer.id,
      label: 'Home',
      line1: '123 Orbit Street',
      city: 'Orbit City',
      regionId: region.id,
      latitude: 0,
      longitude: 0,
      isDefault: true,
    },
  });

  await prisma.address.upsert({
    where: { id: 'seed-address-partner' },
    update: {},
    create: {
      id: 'seed-address-partner',
      userId: partner.id,
      label: 'Kitchen',
      line1: '456 Flavor Ave',
      city: 'Orbit City',
      regionId: region.id,
      latitude: 0,
      longitude: 0,
      isDefault: true,
    },
  });

  await seedRestaurants(region.id);
  const store = await seedStore(region.id);
  await seedPartnerStore(partner.id, store.id);
  await seedPromotionsAndLoyalty(region.id);

  console.log(
    'Seed completed: users, roles, region, pricing rules, addresses, cuisines, restaurants, store with 100 products, promotions, loyalty rule',
  );
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
