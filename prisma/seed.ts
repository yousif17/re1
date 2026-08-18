import { PrismaClient, UserRole, RestaurantStatus, SubscriptionPlan, SubscriptionStatus, OrderStatus, TableStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // 1. Create Super Admin
  // ============================================
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@restaurantos.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@restaurantos.com',
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Super Admin created:', superAdmin.email);

  // ============================================
  // 2. Create Demo Restaurant
  // ============================================
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'burger-house' },
    update: {},
    create: {
      name: 'Burger House',
      slug: 'burger-house',
      logo: '🍔',
      coverImage: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add',
      description: 'Delicious gourmet burgers made fresh daily',
      phone: '+201234567890',
      email: 'info@burgerhouse.com',
      address: '123 Main Street',
      city: 'Cairo',
      country: 'Egypt',
      currency: 'EGP',
      timeZone: 'Africa/Cairo',
      status: RestaurantStatus.ACTIVE,
      tax: 14,
      serviceCharge: 10,
      openingHours: '10:00',
      closingHours: '23:00',
      socialMedia: {
        facebook: 'https://facebook.com/burgerhouse',
        instagram: 'https://instagram.com/burgerhouse',
      },
      settings: {
        create: {
          autoConfirmOrders: false,
          allowOnlineOrders: true,
          allowQROrders: true,
          allowDelivery: false,
          allowPickup: true,
          allowDineIn: true,
          kitchenDisplayMode: 'grid',
          kitchenSoundEnabled: true,
          emailNotifications: true,
          pushNotifications: true,
          lowStockAlerts: true,
          orderAlerts: true,
          subscriptionAlerts: true,
          showLogoOnReceipt: true,
          showTaxOnReceipt: true,
          showServiceCharge: true,
        },
      },
    },
  });

  console.log('✅ Restaurant created:', restaurant.name);

  // ============================================
  // 3. Create Restaurant Owner
  // ============================================
  const ownerPassword = await bcrypt.hash('Owner@123', 10);
  
  const owner = await prisma.user.upsert({
    where: { email: 'owner@burgerhouse.com' },
    update: {},
    create: {
      name: 'Ahmed Hassan',
      email: 'owner@burgerhouse.com',
      password: ownerPassword,
      phone: '+201098765432',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: restaurant.id,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Owner created:', owner.email);

  // ============================================
  // 4. Create Subscription
  // ============================================
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 12); // 1 year subscription

  const subscription = await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: SubscriptionPlan.PRO,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      price: 299,
      autoRenew: true,
    },
  });

  console.log('✅ Subscription created:', subscription.plan);

  // ============================================
  // 5. Create Categories
  // ============================================
  const categories = [
    { name: 'Burgers', nameAr: 'برجر', sortOrder: 1 },
    { name: 'Pizza', nameAr: 'بيتزا', sortOrder: 2 },
    { name: 'Meals', nameAr: 'وجبات', sortOrder: 3 },
    { name: 'Drinks', nameAr: 'مشروبات', sortOrder: 4 },
    { name: 'Desserts', nameAr: 'حلويات', sortOrder: 5 },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: cat.name,
        nameAr: cat.nameAr,
        sortOrder: cat.sortOrder,
      },
    });
    createdCategories.push(category);
  }

  console.log('✅ Categories created:', createdCategories.length);

  // ============================================
  // 6. Create Products
  // ============================================
  const products = [
    {
      name: 'Classic Burger',
      nameAr: 'برجر كلاسيك',
      description: 'Juicy beef patty with lettuce, tomato, and special sauce',
      descriptionAr: 'لحم بقري طازج مع خس وطماطم وصلصة خاصة',
      price: 120,
      costPrice: 60,
      categoryId: createdCategories[0].id,
      sku: 'BUR-001',
      stock: 50,
      minStock: 10,
      prepTime: 15,
      isFeatured: true,
    },
    {
      name: 'Cheese Burger',
      nameAr: 'برجر جبن',
      description: 'Classic burger with melted cheddar cheese',
      descriptionAr: 'برجر كلاسيك مع جبن شيدر ذائب',
      price: 140,
      costPrice: 70,
      categoryId: createdCategories[0].id,
      sku: 'BUR-002',
      stock: 45,
      minStock: 10,
      prepTime: 15,
      isFeatured: true,
    },
    {
      name: 'Chicken Burger',
      nameAr: 'برجر دجاج',
      description: 'Crispy chicken fillet with coleslaw',
      descriptionAr: 'فيليه دجاج مقرمش مع كول سلو',
      price: 130,
      costPrice: 65,
      categoryId: createdCategories[0].id,
      sku: 'BUR-003',
      stock: 40,
      minStock: 10,
      prepTime: 18,
      isFeatured: false,
    },
    {
      name: 'Margherita Pizza',
      nameAr: 'بيتزا مارجريتا',
      description: 'Classic pizza with tomato sauce and mozzarella',
      descriptionAr: 'بيتزا كلاسيك مع صلصة طماطم وموتزاريلا',
      price: 150,
      costPrice: 75,
      categoryId: createdCategories[1].id,
      sku: 'PIZ-001',
      stock: 30,
      minStock: 8,
      prepTime: 20,
      isFeatured: true,
    },
    {
      name: 'Pepperoni Pizza',
      nameAr: 'بيتزا بيبروني',
      description: 'Pizza topped with pepperoni slices',
      descriptionAr: 'بيتزا مغطاة بشرائح البيبروني',
      price: 180,
      costPrice: 90,
      categoryId: createdCategories[1].id,
      sku: 'PIZ-002',
      stock: 25,
      minStock: 8,
      prepTime: 22,
      isFeatured: false,
    },
    {
      name: 'Grilled Chicken Meal',
      nameAr: 'وجبة دجاج مشوي',
      description: 'Grilled chicken with rice and vegetables',
      descriptionAr: 'دجاج مشوي مع أرز وخضروات',
      price: 160,
      costPrice: 80,
      categoryId: createdCategories[2].id,
      sku: 'MEA-001',
      stock: 35,
      minStock: 10,
      prepTime: 25,
      isFeatured: false,
    },
    {
      name: 'Cola',
      nameAr: 'كولا',
      description: 'Chilled cola drink',
      descriptionAr: 'مشروب كولا بارد',
      price: 25,
      costPrice: 10,
      categoryId: createdCategories[3].id,
      sku: 'DRK-001',
      stock: 100,
      minStock: 20,
      prepTime: 2,
      isFeatured: false,
    },
    {
      name: 'Fresh Orange Juice',
      nameAr: 'عصير برتقال طازج',
      description: 'Freshly squeezed orange juice',
      descriptionAr: 'عصير برتقال طازج',
      price: 45,
      costPrice: 20,
      categoryId: createdCategories[3].id,
      sku: 'DRK-002',
      stock: 60,
      minStock: 15,
      prepTime: 5,
      isFeatured: false,
    },
    {
      name: 'Chocolate Cake',
      nameAr: 'كيك شوكولاتة',
      description: 'Rich chocolate cake slice',
      descriptionAr: 'قطعة كيك شوكولاتة غنية',
      price: 80,
      costPrice: 40,
      categoryId: createdCategories[4].id,
      sku: 'DES-001',
      stock: 20,
      minStock: 5,
      prepTime: 5,
      isFeatured: true,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        ...product,
      },
    });
  }

  console.log('✅ Products created:', products.length);

  // ============================================
  // 7. Create Product Options
  // ============================================
  const classicBurger = await prisma.product.findFirst({
    where: { restaurantId: restaurant.id, sku: 'BUR-001' },
  });

  if (classicBurger) {
    const options = [
      { name: 'Extra Cheese', nameAr: 'جبن إضافي', price: 20 },
      { name: 'Extra Sauce', nameAr: 'صلصة إضافية', price: 10 },
      { name: 'Extra Beef', nameAr: 'لحم إضافي', price: 50 },
      { name: 'Bacon', nameAr: 'بيكون', price: 30 },
    ];

    for (const option of options) {
      await prisma.productOption.create({
        data: {
          productId: classicBurger.id,
          ...option,
        },
      });
    }
  }

  console.log('✅ Product options created');

  // ============================================
  // 8. Create Employees
  // ============================================
  const employees = [
    {
      name: 'Mohamed Ali',
      email: 'cashier@burgerhouse.com',
      phone: '+201112345678',
      role: UserRole.CASHIER,
      password: 'Cashier@123',
    },
    {
      name: 'Omar Khaled',
      email: 'kitchen@burgerhouse.com',
      phone: '+201123456789',
      role: UserRole.KITCHEN,
      password: 'Kitchen@123',
    },
    {
      name: 'Sara Ahmed',
      email: 'waiter@burgerhouse.com',
      phone: '+201134567890',
      role: UserRole.WAITER,
      password: 'Waiter@123',
    },
    {
      name: 'Khaled Mahmoud',
      email: 'manager@burgerhouse.com',
      phone: '+201145678901',
      role: UserRole.MANAGER,
      password: 'Manager@123',
    },
  ];

  for (const emp of employees) {
    const hashedPassword = await bcrypt.hash(emp.password, 10);
    
    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        password: hashedPassword,
        phone: emp.phone,
        role: emp.role,
        restaurantId: restaurant.id,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    await prisma.employee.create({
      data: {
        restaurantId: restaurant.id,
        userId: user.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        status: 'ACTIVE',
      },
    });
  }

  console.log('✅ Employees created:', employees.length);

  // ============================================
  // 9. Create Tables with QR Codes
  // ============================================
  const tables = [
    { name: 'Table 1', capacity: 2, location: 'Indoor' },
    { name: 'Table 2', capacity: 4, location: 'Indoor' },
    { name: 'Table 3', capacity: 4, location: 'Indoor' },
    { name: 'Table 4', capacity: 6, location: 'Indoor' },
    { name: 'Table 5', capacity: 2, location: 'Outdoor' },
    { name: 'Table 6', capacity: 4, location: 'Outdoor' },
    { name: 'Table 7', capacity: 8, location: 'Terrace' },
    { name: 'Table 8', capacity: 4, location: 'Terrace' },
  ];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const qrCode = `QR-${restaurant.slug}-${i + 1}-${Date.now()}`;
    
    await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: i + 1,
        name: table.name,
        capacity: table.capacity,
        location: table.location,
        status: TableStatus.AVAILABLE,
        qrCode,
        qrEnabled: true,
        qrRegeneratedAt: new Date(),
      },
    });
  }

  console.log('✅ Tables created:', tables.length);

  // ============================================
  // 10. Create Sample Orders
  // ============================================
  const sampleProducts = await prisma.product.findMany({
    where: { restaurantId: restaurant.id },
    take: 5,
  });

  const sampleTable = await prisma.table.findFirst({
    where: { restaurantId: restaurant.id },
  });

  // Create a few sample orders
  for (let i = 1; i <= 5; i++) {
    const orderItems = sampleProducts.slice(0, 3).map((product, idx) => ({
      productId: product.id,
      productName: product.name,
      productNameAr: product.nameAr,
      price: product.price,
      costPrice: product.costPrice,
      quantity: idx + 1,
      total: product.price * (idx + 1),
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.14;
    const serviceCharge = subtotal * 0.10;
    const total = subtotal + tax + serviceCharge;

    const statuses = [OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.NEW];
    const createdDate = new Date();
    createdDate.setHours(createdDate.getHours() - i);

    const order = await prisma.order.create({
      data: {
        orderNumber: 1000 + i,
        restaurantId: restaurant.id,
        tableId: sampleTable?.id,
        customerName: `Customer ${i}`,
        customerPhone: `+20120000000${i}`,
        status: statuses[i - 1],
        source: 'POS',
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        subtotal,
        tax,
        serviceCharge,
        total,
        createdById: owner.id,
        items: {
          create: orderItems,
        },
        statusHistory: {
          create: {
            status: statuses[i - 1],
            changedById: owner.id,
          },
        },
        createdAt: createdDate,
      },
    });

    // Update product stock
    for (const item of orderItems) {
      if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              stock: Math.max(0, product.stock - item.quantity),
            },
          });

          await prisma.inventoryTransaction.create({
            data: {
              restaurantId: restaurant.id,
              productId: product.id,
              type: 'ORDER_DEDUCTION',
              quantity: -item.quantity,
              previousStock: product.stock,
              newStock: Math.max(0, product.stock - item.quantity),
              referenceType: 'ORDER',
              referenceId: order.id,
              reason: `Order #${order.orderNumber}`,
              createdById: owner.id,
            },
          });
        }
      }
    }
  }

  console.log('✅ Sample orders created');

  // ============================================
  // 11. Create Activity Logs
  // ============================================
  const activities = [
    {
      action: 'RESTAURANT_CREATED',
      details: 'Restaurant Burger House created',
      userId: superAdmin.id,
      restaurantId: restaurant.id,
    },
    {
      action: 'SUBSCRIPTION_CREATED',
      details: 'PRO subscription created for 12 months',
      userId: superAdmin.id,
      restaurantId: restaurant.id,
    },
    {
      action: 'PRODUCT_CREATED',
      details: 'Multiple products created for menu',
      userId: owner.id,
      restaurantId: restaurant.id,
    },
    {
      action: 'EMPLOYEE_CREATED',
      details: '4 employees created (cashier, kitchen, waiter, manager)',
      userId: owner.id,
      restaurantId: restaurant.id,
    },
    {
      action: 'TABLE_CREATED',
      details: '8 tables created with QR codes',
      userId: owner.id,
      restaurantId: restaurant.id,
    },
  ];

  for (const activity of activities) {
    await prisma.activityLog.create({
      data: activity,
    });
  }

  console.log('✅ Activity logs created');

  // ============================================
  // 12. Create Notifications
  // ============================================
  await prisma.notification.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        userId: owner.id,
        title: 'Welcome to RestaurantOS!',
        message: 'Your restaurant has been set up successfully. Start adding products and managing your menu.',
        type: 'SYSTEM',
      },
      {
        restaurantId: restaurant.id,
        userId: owner.id,
        title: 'Subscription Active',
        message: 'Your PRO subscription is active until ' + endDate.toLocaleDateString(),
        type: 'SUBSCRIPTION',
      },
    ],
  });

  console.log('✅ Notifications created');

  console.log('🌱 Seed completed successfully!');
  console.log('====================================');
  console.log('Login Credentials:');
  console.log('====================================');
  console.log('Super Admin: admin@restaurantos.com / Admin@123');
  console.log('Owner: owner@burgerhouse.com / Owner@123');
  console.log('Manager: manager@burgerhouse.com / Manager@123');
  console.log('Cashier: cashier@burgerhouse.com / Cashier@123');
  console.log('Kitchen: kitchen@burgerhouse.com / Kitchen@123');
  console.log('Waiter: waiter@burgerhouse.com / Waiter@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });