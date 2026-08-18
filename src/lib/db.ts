// Database layer using localStorage
// Multi-tenant architecture with restaurantId isolation

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  cover: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timeZone: string;
  status: string;
  tax: number;
  serviceCharge: number;
  openingHours: string;
  closingHours: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  restaurantId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  restaurantId: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  restaurantId: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  costPrice: number;
  sku: string;
  stock: number;
  minStock: number;
  prepTime: number;
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  restaurantId: string;
  orderNumber: number;
  tableId: string | null;
  customerName: string;
  customerPhone: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentMethod: string;
  status: string;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  name: string;
  status: string;
  qrCode: string;
  qrEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: string;
  restaurantId: string | null;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

interface Notification {
  id: string;
  restaurantId: string;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const STORAGE_KEYS = {
  restaurants: "restaurantos_restaurants",
  users: "restaurantos_users",
  subscriptions: "restaurantos_subscriptions",
  categories: "restaurantos_categories",
  products: "restaurantos_products",
  orders: "restaurantos_orders",
  employees: "restaurantos_employees",
  tables: "restaurantos_tables",
  activityLogs: "restaurantos_activity_logs",
  notifications: "restaurantos_notifications",
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function readData<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function writeData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const db = {
  // ===== RESTAURANTS =====
  getRestaurants(): Restaurant[] {
    return readData<Restaurant>(STORAGE_KEYS.restaurants);
  },

  getRestaurant(id: string): Restaurant | null {
    return this.getRestaurants().find(r => r.id === id) || null;
  },

  getRestaurantBySlug(slug: string): Restaurant | null {
    return this.getRestaurants().find(r => r.slug === slug) || null;
  },

  createRestaurant(data: Partial<Restaurant>): Restaurant {
    const restaurants = this.getRestaurants();
    const now = new Date().toISOString();
    const restaurant: Restaurant = {
      id: generateId(),
      name: data.name || "",
      slug: data.slug || "",
      logo: data.logo || "🍽️",
      cover: data.cover || "",
      description: data.description || "",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      city: data.city || "",
      country: data.country || "",
      currency: data.currency || "EGP",
      timeZone: data.timeZone || "Africa/Cairo",
      status: data.status || "ACTIVE",
      tax: data.tax || 14,
      serviceCharge: data.serviceCharge || 10,
      openingHours: data.openingHours || "10:00",
      closingHours: data.closingHours || "23:00",
      createdAt: now,
      updatedAt: now,
    };
    restaurants.push(restaurant);
    writeData(STORAGE_KEYS.restaurants, restaurants);
    return restaurant;
  },

  updateRestaurant(id: string, data: Partial<Restaurant>): void {
    const restaurants = this.getRestaurants();
    const index = restaurants.findIndex(r => r.id === id);
    if (index !== -1) {
      restaurants[index] = { ...restaurants[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.restaurants, restaurants);
    }
  },

  deleteRestaurant(id: string): void {
    const restaurants = this.getRestaurants().filter(r => r.id !== id);
    writeData(STORAGE_KEYS.restaurants, restaurants);
  },

  getRestaurantRevenue(restaurantId: string): number {
    const orders = this.getOrders(restaurantId);
    return orders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").reduce((sum, o) => sum + o.total, 0);
  },

  getDaysRemaining(restaurantId: string): number {
    const sub = this.getSubscriptionByRestaurant(restaurantId);
    if (!sub) return 0;
    const endDate = new Date(sub.endDate);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  // ===== USERS =====
  getUsers(): User[] {
    return readData<User>(STORAGE_KEYS.users);
  },

  getUser(id: string): User | null {
    return this.getUsers().find(u => u.id === id) || null;
  },

  getUserByEmail(email: string): User | null {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUsersByRestaurant(restaurantId: string): User[] {
    return this.getUsers().filter(u => u.restaurantId === restaurantId);
  },

  createUser(data: Partial<User>): User {
    const users = this.getUsers();
    const now = new Date().toISOString();
    const user: User = {
      id: generateId(),
      name: data.name || "",
      email: data.email || "",
      password: data.password || "password123",
      phone: data.phone || "",
      role: data.role || "CASHIER",
      restaurantId: data.restaurantId || null,
      status: data.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    writeData(STORAGE_KEYS.users, users);
    return user;
  },

  updateUser(id: string, data: Partial<User>): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.users, users);
    }
  },

  deleteUser(id: string): void {
    const users = this.getUsers().filter(u => u.id !== id);
    writeData(STORAGE_KEYS.users, users);
  },

  authenticate(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password && user.status === "ACTIVE") {
      return user;
    }
    return null;
  },

  // ===== SUBSCRIPTIONS =====
  getSubscriptions(): Subscription[] {
    return readData<Subscription>(STORAGE_KEYS.subscriptions);
  },

  getSubscription(id: string): Subscription | null {
    return this.getSubscriptions().find(s => s.id === id) || null;
  },

  getSubscriptionByRestaurant(restaurantId: string): Subscription | null {
    return this.getSubscriptions().find(s => s.restaurantId === restaurantId) || null;
  },

  createSubscription(data: Partial<Subscription>): Subscription {
    const subscriptions = this.getSubscriptions();
    const now = new Date().toISOString();
    const subscription: Subscription = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      plan: data.plan || "PRO",
      startDate: data.startDate || now,
      endDate: data.endDate || now,
      status: data.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    subscriptions.push(subscription);
    writeData(STORAGE_KEYS.subscriptions, subscriptions);
    return subscription;
  },

  updateSubscription(id: string, data: Partial<Subscription>): void {
    const subscriptions = this.getSubscriptions();
    const index = subscriptions.findIndex(s => s.id === id);
    if (index !== -1) {
      subscriptions[index] = { ...subscriptions[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.subscriptions, subscriptions);
    }
  },

  // ===== CATEGORIES =====
  getCategories(restaurantId: string): Category[] {
    return readData<Category>(STORAGE_KEYS.categories).filter(c => c.restaurantId === restaurantId);
  },

  getCategory(id: string): Category | null {
    return readData<Category>(STORAGE_KEYS.categories).find(c => c.id === id) || null;
  },

  createCategory(data: Partial<Category>): Category {
    const categories = readData<Category>(STORAGE_KEYS.categories);
    const category: Category = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      name: data.name || "",
      nameAr: data.nameAr || "",
      sortOrder: data.sortOrder || 0,
      isHidden: data.isHidden || false,
      createdAt: new Date().toISOString(),
    };
    categories.push(category);
    writeData(STORAGE_KEYS.categories, categories);
    return category;
  },

  updateCategory(id: string, data: Partial<Category>): void {
    const categories = readData<Category>(STORAGE_KEYS.categories);
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...data };
      writeData(STORAGE_KEYS.categories, categories);
    }
  },

  deleteCategory(id: string): void {
    const categories = readData<Category>(STORAGE_KEYS.categories).filter(c => c.id !== id);
    writeData(STORAGE_KEYS.categories, categories);
  },

  // ===== PRODUCTS =====
  getProducts(restaurantId: string): Product[] {
    return readData<Product>(STORAGE_KEYS.products).filter(p => p.restaurantId === restaurantId);
  },

  getProduct(id: string): Product | null {
    return readData<Product>(STORAGE_KEYS.products).find(p => p.id === id) || null;
  },

  createProduct(data: Partial<Product>): Product {
    const products = readData<Product>(STORAGE_KEYS.products);
    const now = new Date().toISOString();
    const product: Product = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      categoryId: data.categoryId || "",
      name: data.name || "",
      nameAr: data.nameAr || "",
      description: data.description || "",
      descriptionAr: data.descriptionAr || "",
      price: data.price || 0,
      costPrice: data.costPrice || 0,
      sku: data.sku || "",
      stock: data.stock || 0,
      minStock: data.minStock || 0,
      prepTime: data.prepTime || 15,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      isFeatured: data.isFeatured || false,
      createdAt: now,
      updatedAt: now,
    };
    products.push(product);
    writeData(STORAGE_KEYS.products, products);
    return product;
  },

  updateProduct(id: string, data: Partial<Product>): void {
    const products = readData<Product>(STORAGE_KEYS.products);
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.products, products);
    }
  },

  deleteProduct(id: string): void {
    const products = readData<Product>(STORAGE_KEYS.products).filter(p => p.id !== id);
    writeData(STORAGE_KEYS.products, products);
  },

  // ===== ORDERS =====
  getOrders(restaurantId: string): Order[] {
    return readData<Order>(STORAGE_KEYS.orders).filter(o => o.restaurantId === restaurantId);
  },

  getOrder(id: string): Order | null {
    return readData<Order>(STORAGE_KEYS.orders).find(o => o.id === id) || null;
  },

  getOrdersByTable(tableId: string): Order[] {
    return readData<Order>(STORAGE_KEYS.orders).filter(o => o.tableId === tableId);
  },

  createOrder(data: Partial<Order>): Order {
    const orders = readData<Order>(STORAGE_KEYS.orders);
    const restaurantOrders = orders.filter(o => o.restaurantId === data.restaurantId);
    const nextNumber = restaurantOrders.length > 0 ? Math.max(...restaurantOrders.map(o => o.orderNumber)) + 1 : 1001;
    const now = new Date().toISOString();
    const order: Order = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      orderNumber: nextNumber,
      tableId: data.tableId || null,
      customerName: data.customerName || "Guest",
      customerPhone: data.customerPhone || "",
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      serviceCharge: data.serviceCharge || 0,
      total: data.total || 0,
      paymentMethod: data.paymentMethod || "CASH",
      status: data.status || "NEW",
      source: data.source || "CASHIER",
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    orders.push(order);
    writeData(STORAGE_KEYS.orders, orders);
    return order;
  },

  updateOrder(id: string, data: Partial<Order>): void {
    const orders = readData<Order>(STORAGE_KEYS.orders);
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.orders, orders);
    }
  },

  updateOrderStatus(id: string, status: string): void {
    this.updateOrder(id, { status });
  },

  // ===== TABLES =====
  getTables(restaurantId: string): Table[] {
    return readData<Table>(STORAGE_KEYS.tables).filter(t => t.restaurantId === restaurantId);
  },

  getTable(id: string): Table | null {
    return readData<Table>(STORAGE_KEYS.tables).find(t => t.id === id) || null;
  },

  getTableByNumber(restaurantId: string, tableNumber: number): Table | null {
    return readData<Table>(STORAGE_KEYS.tables).find(t => t.restaurantId === restaurantId && t.tableNumber === tableNumber) || null;
  },

  createTable(data: Partial<Table>): Table {
    const tables = readData<Table>(STORAGE_KEYS.tables);
    const restaurantTables = tables.filter(t => t.restaurantId === data.restaurantId);
    const nextNumber = restaurantTables.length > 0 ? Math.max(...restaurantTables.map(t => t.tableNumber)) + 1 : 1;
    const now = new Date().toISOString();
    const table: Table = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      tableNumber: nextNumber,
      name: data.name || `Table ${nextNumber}`,
      status: data.status || "AVAILABLE",
      qrCode: generateId() + generateId(),
      qrEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    tables.push(table);
    writeData(STORAGE_KEYS.tables, tables);
    return table;
  },

  updateTable(id: string, data: Partial<Table>): void {
    const tables = readData<Table>(STORAGE_KEYS.tables);
    const index = tables.findIndex(t => t.id === id);
    if (index !== -1) {
      tables[index] = { ...tables[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.tables, tables);
    }
  },

  deleteTable(id: string): void {
    const tables = readData<Table>(STORAGE_KEYS.tables).filter(t => t.id !== id);
    writeData(STORAGE_KEYS.tables, tables);
  },

  regenerateTableQR(id: string): void {
    this.updateTable(id, { qrCode: generateId() + generateId() });
  },

  getTableByQRCode(qrCode: string): Table | null {
    return readData<Table>(STORAGE_KEYS.tables).find(t => t.qrCode === qrCode && t.qrEnabled) || null;
  },

  // ===== EMPLOYEES =====
  getEmployees(restaurantId: string): Employee[] {
    return readData<Employee>(STORAGE_KEYS.employees).filter(e => e.restaurantId === restaurantId);
  },

  getEmployee(id: string): Employee | null {
    return readData<Employee>(STORAGE_KEYS.employees).find(e => e.id === id) || null;
  },

  getEmployeeByEmail(email: string): Employee | null {
    return readData<Employee>(STORAGE_KEYS.employees).find(e => e.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createEmployee(data: Partial<Employee>): Employee {
    const employees = readData<Employee>(STORAGE_KEYS.employees);
    const now = new Date().toISOString();
    const employee: Employee = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      role: data.role || "CASHIER",
      status: data.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    employees.push(employee);
    writeData(STORAGE_KEYS.employees, employees);
    return employee;
  },

  updateEmployee(id: string, data: Partial<Employee>): void {
    const employees = readData<Employee>(STORAGE_KEYS.employees);
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.employees, employees);
    }
  },

  deleteEmployee(id: string): void {
    const employees = readData<Employee>(STORAGE_KEYS.employees).filter(e => e.id !== id);
    writeData(STORAGE_KEYS.employees, employees);
  },

  // ===== ACTIVITY LOGS =====
  getActivityLogs(): ActivityLog[] {
    return readData<ActivityLog>(STORAGE_KEYS.activityLogs);
  },

  addActivityLog(data: Partial<ActivityLog>): ActivityLog {
    const logs = this.getActivityLogs();
    const log: ActivityLog = {
      id: generateId(),
      restaurantId: data.restaurantId || null,
      userId: data.userId || "",
      userName: data.userName || "System",
      action: data.action || "",
      details: data.details || "",
      createdAt: new Date().toISOString(),
    };
    logs.push(log);
    writeData(STORAGE_KEYS.activityLogs, logs);
    return log;
  },

  // ===== NOTIFICATIONS =====
  getNotifications(restaurantId: string): Notification[] {
    return readData<Notification>(STORAGE_KEYS.notifications).filter(n => n.restaurantId === restaurantId);
  },

  getNotificationsByUser(userId: string): Notification[] {
    return readData<Notification>(STORAGE_KEYS.notifications).filter(n => n.userId === userId);
  },

  createNotification(data: Partial<Notification>): Notification {
    const notifications = readData<Notification>(STORAGE_KEYS.notifications);
    const notification: Notification = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      userId: data.userId || null,
      title: data.title || "",
      message: data.message || "",
      type: data.type || "SYSTEM",
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
    writeData(STORAGE_KEYS.notifications, notifications);
    return notification;
  },

  markNotificationRead(id: string): void {
    const notifications = readData<Notification>(STORAGE_KEYS.notifications);
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      writeData(STORAGE_KEYS.notifications, notifications);
    }
  },

  // ===== SEED DATA =====
  seed(): void {
    // Clear all data
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    // Create Super Admin
    this.createUser({
      name: "Super Admin",
      email: "yuiusf604@gmail.com",
      password: "Y01012896067y@",
      phone: "+201012896067",
      role: "SUPER_ADMIN",
      restaurantId: null,
      status: "ACTIVE",
    });

    // Create Demo Restaurant
    const restaurant = this.createRestaurant({
      name: "Burger House",
      slug: "burger-house",
      logo: "🍔",
      cover: "",
      description: "Delicious burgers and more",
      phone: "+201234567890",
      email: "info@burgerhouse.com",
      address: "123 Main Street",
      city: "Cairo",
      country: "Egypt",
      currency: "EGP",
      timeZone: "Africa/Cairo",
      status: "ACTIVE",
      tax: 14,
      serviceCharge: 10,
      openingHours: "10:00",
      closingHours: "23:00",
    });

    // Create Demo Owner
    this.createUser({
      name: "Ahmed Hassan",
      email: "owner@burgerhouse.com",
      password: "owner123",
      phone: "+201098765432",
      role: "RESTAURANT_OWNER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Create Demo Cashier
    this.createUser({
      name: "Sara Ali",
      email: "cashier@burgerhouse.com",
      password: "cashier123",
      phone: "+201011122233",
      role: "CASHIER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Create Demo Kitchen Staff
    this.createUser({
      name: "Mohamed Kamal",
      email: "kitchen@burgerhouse.com",
      password: "kitchen123",
      phone: "+201022233344",
      role: "KITCHEN",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Create Demo Waiter
    this.createUser({
      name: "Omar Farouk",
      email: "waiter@burgerhouse.com",
      password: "waiter123",
      phone: "+201033344455",
      role: "WAITER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Create Subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);
    this.createSubscription({
      restaurantId: restaurant.id,
      plan: "PREMIUM",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "ACTIVE",
    });

    // Create Categories
    const burgers = this.createCategory({
      restaurantId: restaurant.id,
      name: "Burgers",
      nameAr: "برجر",
      sortOrder: 1,
      isHidden: false,
    });

    const drinks = this.createCategory({
      restaurantId: restaurant.id,
      name: "Drinks",
      nameAr: "مشروبات",
      sortOrder: 2,
      isHidden: false,
    });

    const desserts = this.createCategory({
      restaurantId: restaurant.id,
      name: "Desserts",
      nameAr: "حلويات",
      sortOrder: 3,
      isHidden: false,
    });

    // Create Products
    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: burgers.id,
      name: "Classic Burger",
      nameAr: "برجر كلاسيك",
      description: "Beef patty with lettuce, tomato, and special sauce",
      descriptionAr: "لحم بقري مع خس وطماطم وصوص خاص",
      price: 120,
      costPrice: 60,
      sku: "BUR-001",
      stock: 50,
      minStock: 10,
      prepTime: 15,
      isAvailable: true,
      isFeatured: true,
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: burgers.id,
      name: "Cheese Burger",
      nameAr: "برجر جبنة",
      description: "Beef patty with cheddar cheese",
      descriptionAr: "لحم بقري مع جبنة شيدر",
      price: 140,
      costPrice: 70,
      sku: "BUR-002",
      stock: 40,
      minStock: 8,
      prepTime: 15,
      isAvailable: true,
      isFeatured: true,
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Cola",
      nameAr: "كولا",
      description: "Refreshing cola drink",
      descriptionAr: "مشروب كولا منعش",
      price: 30,
      costPrice: 10,
      sku: "DRK-001",
      stock: 100,
      minStock: 20,
      prepTime: 2,
      isAvailable: true,
      isFeatured: false,
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: desserts.id,
      name: "Chocolate Cake",
      nameAr: "كيك شوكولاتة",
      description: "Rich chocolate cake slice",
      descriptionAr: "قطعة كيك شوكولاتة غنية",
      price: 80,
      costPrice: 35,
      sku: "DES-001",
      stock: 20,
      minStock: 5,
      prepTime: 5,
      isAvailable: true,
      isFeatured: false,
    });

    // Create Employees
    this.createEmployee({
      restaurantId: restaurant.id,
      name: "Sara Ali",
      email: "cashier@burgerhouse.com",
      phone: "+201011122233",
      role: "CASHIER",
      status: "ACTIVE",
    });

    this.createEmployee({
      restaurantId: restaurant.id,
      name: "Mohamed Kamal",
      email: "kitchen@burgerhouse.com",
      phone: "+201022233344",
      role: "KITCHEN",
      status: "ACTIVE",
    });

    this.createEmployee({
      restaurantId: restaurant.id,
      name: "Omar Farouk",
      email: "waiter@burgerhouse.com",
      phone: "+201033344455",
      role: "WAITER",
      status: "ACTIVE",
    });

    // Create Tables
    for (let i = 1; i <= 6; i++) {
      this.createTable({
        restaurantId: restaurant.id,
        name: `Table ${i}`,
        status: "AVAILABLE",
      });
    }

    // Create Activity Log
    this.addActivityLog({
      restaurantId: restaurant.id,
      userId: "system",
      userName: "System",
      action: "SYSTEM_INITIALIZED",
      details: "Demo data has been initialized",
    });
  },
};