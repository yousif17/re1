// Database layer using Firebase Firestore
// Multi-tenant architecture with restaurantId isolation

import { firestore } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export interface Restaurant {
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

export interface User {
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

export interface Subscription {
  id: string;
  restaurantId: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
}

export interface Product {
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
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
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

export interface Employee {
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

export interface Table {
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

export interface ActivityLog {
  id: string;
  restaurantId: string | null;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  restaurantId: string;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

type Entity =
  | Restaurant
  | User
  | Subscription
  | Category
  | Product
  | Order
  | Employee
  | Table
  | ActivityLog
  | Notification;

const COLLECTIONS = {
  restaurants: "restaurants",
  users: "users",
  subscriptions: "subscriptions",
  categories: "categories",
  products: "products",
  orders: "orders",
  employees: "employees",
  tables: "tables",
  activityLogs: "activityLogs",
  notifications: "notifications",
};

const cache = {
  restaurants: [] as Restaurant[],
  users: [] as User[],
  subscriptions: [] as Subscription[],
  categories: [] as Category[],
  products: [] as Product[],
  orders: [] as Order[],
  employees: [] as Employee[],
  tables: [] as Table[],
  activityLogs: [] as ActivityLog[],
  notifications: [] as Notification[],
};

let firebaseInitialized = false;
let firebaseInitializing: Promise<void> | null = null;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

async function loadCollection<T extends Entity>(
  collectionName: string
): Promise<T[]> {
  const snapshot = await getDocs(collection(firestore, collectionName));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as T[];
}

async function saveDocument(
  collectionName: string,
  id: string,
  data: Entity
): Promise<void> {
  await setDoc(doc(firestore, collectionName, id), data);
}

async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<Entity>
): Promise<void> {
  await updateDoc(doc(firestore, collectionName, id), data);
}

async function removeDocument(
  collectionName: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(firestore, collectionName, id));
}

function persist(
  collectionName: string,
  id: string,
  data: Entity
): void {
  saveDocument(collectionName, id, data).catch((error) => {
    console.error(
      `Firestore save error [${collectionName}/${id}]`,
      error
    );
  });
}

function persistUpdate(
  collectionName: string,
  id: string,
  data: Partial<Entity>
): void {
  updateDocument(collectionName, id, data).catch((error) => {
    console.error(
      `Firestore update error [${collectionName}/${id}]`,
      error
    );
  });
}

function persistDelete(
  collectionName: string,
  id: string
): void {
  removeDocument(collectionName, id).catch((error) => {
    console.error(
      `Firestore delete error [${collectionName}/${id}]`,
      error
    );
  });
}

export const db = {
  syncRestaurantData(
    restaurantId: string,
    callback?: () => void
  ): () => void {
    console.log(
      "🔄 Starting real-time sync for restaurant:",
      restaurantId
    );

    const unsubscribers: (() => void)[] = [];

    const subscribe = <T extends Entity>(
      collectionName: string,
      updateCache: (data: T[]) => void
    ) => {
      const unsubscribe = onSnapshot(
        collection(firestore, collectionName),
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as T[];

          updateCache(data);

          if (callback) {
            callback();
          }
        },
        (error) => {
          console.error(
            `❌ Firebase realtime error [${collectionName}]`,
            error
          );
        }
      );

      unsubscribers.push(unsubscribe);
    };

    subscribe<Restaurant>(
      COLLECTIONS.restaurants,
      (data) => {
        cache.restaurants = data;
      }
    );

    subscribe<User>(
      COLLECTIONS.users,
      (data) => {
        cache.users = data;
      }
    );

    subscribe<Subscription>(
      COLLECTIONS.subscriptions,
      (data) => {
        cache.subscriptions = data;
      }
    );

    subscribe<Category>(
      COLLECTIONS.categories,
      (data) => {
        cache.categories = data;
      }
    );

    subscribe<Product>(
      COLLECTIONS.products,
      (data) => {
        cache.products = data;
      }
    );

    subscribe<Order>(
      COLLECTIONS.orders,
      (data) => {
        cache.orders = data;
      }
    );

    subscribe<Employee>(
      COLLECTIONS.employees,
      (data) => {
        cache.employees = data;
      }
    );

    subscribe<Table>(
      COLLECTIONS.tables,
      (data) => {
        cache.tables = data;
      }
    );

    subscribe<ActivityLog>(
      COLLECTIONS.activityLogs,
      (data) => {
        cache.activityLogs = data;
      }
    );

    subscribe<Notification>(
      COLLECTIONS.notifications,
      (data) => {
        cache.notifications = data;
      }
    );

    return () => {
      console.log("🛑 Stopping Firebase realtime sync");

      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  },

  // ============================================================
  // FIREBASE INITIALIZATION
  // ============================================================

  async initializeFromFirebase(): Promise<boolean> {
    if (firebaseInitialized) {
      return cache.restaurants.length > 0;
    }

    if (firebaseInitializing) {
      await firebaseInitializing;
      return cache.restaurants.length > 0;
    }

    firebaseInitializing = (async () => {
      try {
        const [
          restaurants,
          users,
          subscriptions,
          categories,
          products,
          orders,
          employees,
          tables,
          activityLogs,
          notifications,
        ] = await Promise.all([
          loadCollection<Restaurant>(COLLECTIONS.restaurants),
          loadCollection<User>(COLLECTIONS.users),
          loadCollection<Subscription>(COLLECTIONS.subscriptions),
          loadCollection<Category>(COLLECTIONS.categories),
          loadCollection<Product>(COLLECTIONS.products),
          loadCollection<Order>(COLLECTIONS.orders),
          loadCollection<Employee>(COLLECTIONS.employees),
          loadCollection<Table>(COLLECTIONS.tables),
          loadCollection<ActivityLog>(COLLECTIONS.activityLogs),
          loadCollection<Notification>(COLLECTIONS.notifications),
        ]);

        cache.restaurants = restaurants;
        cache.users = users;
        cache.subscriptions = subscriptions;
        cache.categories = categories;
        cache.products = products;
        cache.orders = orders;
        cache.employees = employees;
        cache.tables = tables;
        cache.activityLogs = activityLogs;
        cache.notifications = notifications;

        firebaseInitialized = true;

        console.log(
          "✅ Firebase database initialized successfully"
        );
      } catch (error) {
        console.error(
          "❌ Failed to initialize Firebase database:",
          error
        );

        throw error;
      } finally {
        firebaseInitializing = null;
      }
    })();

    await firebaseInitializing;

    return cache.restaurants.length > 0;
  },

  isFirebaseInitialized(): boolean {
    return firebaseInitialized;
  },
  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================

  getSubscriptions(): Subscription[] {
    return [...cache.subscriptions];
  },

  getSubscription(
    id: string
  ): Subscription | null {
    return (
      cache.subscriptions.find(
        (s) => s.id === id
      ) || null
    );
  },

  getSubscriptionByRestaurant(
    restaurantId: string
  ): Subscription | null {
    return (
      cache.subscriptions.find(
        (s) => s.restaurantId === restaurantId
      ) || null
    );
  },

  createSubscription(
    data: Partial<Subscription>
  ): Subscription {
    const now = nowIso();

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

    cache.subscriptions.push(subscription);

    persist(
      COLLECTIONS.subscriptions,
      subscription.id,
      subscription
    );

    return subscription;
  },

  updateSubscription(
    id: string,
    data: Partial<Subscription>
  ): void {
    const index =
      cache.subscriptions.findIndex(
        (s) => s.id === id
      );

    if (index === -1) return;

    const updated = {
      ...cache.subscriptions[index],
      ...data,
      updatedAt: nowIso(),
    };

    cache.subscriptions[index] = updated;

    persistUpdate(
      COLLECTIONS.subscriptions,
      id,
      {
        ...data,
        updatedAt: updated.updatedAt,
      }
    );
  },

  // ============================================================
  // CATEGORIES
  // ============================================================

  getCategories(
    restaurantId: string
  ): Category[] {
    return cache.categories.filter(
      (c) => c.restaurantId === restaurantId
    );
  },

  getCategory(id: string): Category | null {
    return (
      cache.categories.find(
        (c) => c.id === id
      ) || null
    );
  },

  createCategory(
    data: Partial<Category>
  ): Category {
    const category: Category = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      name: data.name || "",
      nameAr: data.nameAr || "",
      sortOrder: data.sortOrder ?? 0,
      isHidden: data.isHidden ?? false,
      createdAt: nowIso(),
    };

    cache.categories.push(category);

    persist(
      COLLECTIONS.categories,
      category.id,
      category
    );

    return category;
  },

  updateCategory(
    id: string,
    data: Partial<Category>
  ): void {
    const index =
      cache.categories.findIndex(
        (c) => c.id === id
      );

    if (index === -1) return;

    const updated = {
      ...cache.categories[index],
      ...data,
    };

    cache.categories[index] = updated;

    persistUpdate(
      COLLECTIONS.categories,
      id,
      data
    );
  },

  deleteCategory(id: string): void {
    cache.categories = cache.categories.filter(
      (c) => c.id !== id
    );

    persistDelete(
      COLLECTIONS.categories,
      id
    );
  },

  // ============================================================
  // PRODUCTS
  // ============================================================

  getProducts(
    restaurantId: string
  ): Product[] {
    return cache.products.filter(
      (p) => p.restaurantId === restaurantId
    );
  },

  getProduct(id: string): Product | null {
    return (
      cache.products.find(
        (p) => p.id === id
      ) || null
    );
  },

  createProduct(
    data: Partial<Product>
  ): Product {
    const now = nowIso();

    const product: Product = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      categoryId: data.categoryId || "",
      name: data.name || "",
      nameAr: data.nameAr || "",
      description: data.description || "",
      descriptionAr: data.descriptionAr || "",
      price: data.price ?? 0,
      costPrice: data.costPrice ?? 0,
      sku: data.sku || "",
      stock: data.stock ?? 0,
      minStock: data.minStock ?? 0,
      prepTime: data.prepTime ?? 15,
      isAvailable:
        data.isAvailable !== undefined
          ? data.isAvailable
          : true,
      isFeatured: data.isFeatured ?? false,
      image: data.image || "",
      createdAt: now,
      updatedAt: now,
    };

    cache.products.push(product);

    persist(
      COLLECTIONS.products,
      product.id,
      product
    );

    return product;
  },

  updateProduct(
    id: string,
    data: Partial<Product>
  ): void {
    const index = cache.products.findIndex(
      (p) => p.id === id
    );

    if (index === -1) return;

    const updated = {
      ...cache.products[index],
      ...data,
      updatedAt: nowIso(),
    };

    cache.products[index] = updated;

    persistUpdate(
      COLLECTIONS.products,
      id,
      {
        ...data,
        updatedAt: updated.updatedAt,
      }
    );
  },

  deleteProduct(id: string): void {
    cache.products = cache.products.filter(
      (p) => p.id !== id
    );

    persistDelete(
      COLLECTIONS.products,
      id
    );
  },

  // ============================================================
  // ORDERS
  // ============================================================

  getOrders(
    restaurantId: string
  ): Order[] {
    return cache.orders.filter(
      (o) => o.restaurantId === restaurantId
    );
  },

  getOrder(id: string): Order | null {
    return (
      cache.orders.find(
        (o) => o.id === id
      ) || null
    );
  },

  getOrdersByTable(
    tableId: string
  ): Order[] {
    return cache.orders.filter(
      (o) => o.tableId === tableId
    );
  },

  createOrder(
    data: Partial<Order>
  ): Order {
    const restaurantOrders =
      cache.orders.filter(
        (o) =>
          o.restaurantId === data.restaurantId
      );

    const nextNumber =
      restaurantOrders.length > 0
        ? Math.max(
            ...restaurantOrders.map(
              (o) => o.orderNumber
            )
          ) + 1
        : 1001;

    const now = nowIso();

    const order: Order = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      orderNumber: nextNumber,
      tableId: data.tableId || null,
      customerName:
        data.customerName || "Guest",
      customerPhone:
        data.customerPhone || "",
      items: data.items || [],
      subtotal: data.subtotal ?? 0,
      discount: data.discount ?? 0,
      tax: data.tax ?? 0,
      serviceCharge:
        data.serviceCharge ?? 0,
      total: data.total ?? 0,
      paymentMethod:
        data.paymentMethod || "CASH",
      status: data.status || "NEW",
      source: data.source || "CASHIER",
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    cache.orders.push(order);

    persist(
      COLLECTIONS.orders,
      order.id,
      order
    );

    return order;
  },

  updateOrder(
    id: string,
    data: Partial<Order>
  ): void {
    const index = cache.orders.findIndex(
      (o) => o.id === id
    );

    if (index === -1) return;

    const updated = {
      ...cache.orders[index],
      ...data,
      updatedAt: nowIso(),
    };

    cache.orders[index] = updated;

    persistUpdate(
      COLLECTIONS.orders,
      id,
      {
        ...data,
        updatedAt: updated.updatedAt,
      }
    );
  },

  updateOrderStatus(
    id: string,
    status: string
  ): void {
    this.updateOrder(id, { status });
  },

  // ============================================================
  // TABLES
  // ============================================================

  getTables(
    restaurantId: string
  ): Table[] {
    return cache.tables.filter(
      (t) => t.restaurantId === restaurantId
    );
  },

  getTable(id: string): Table | null {
    return (
      cache.tables.find(
        (t) => t.id === id
      ) || null
    );
  },

  getTableByNumber(
    restaurantId: string,
    tableNumber: number
  ): Table | null {
    return (
      cache.tables.find(
        (t) =>
          t.restaurantId === restaurantId &&
          t.tableNumber === tableNumber
      ) || null
    );
  },

  createTable(
    data: Partial<Table>
  ): Table {
    const restaurantTables =
      cache.tables.filter(
        (t) =>
          t.restaurantId === data.restaurantId
      );

    const nextNumber =
      restaurantTables.length > 0
        ? Math.max(
            ...restaurantTables.map(
              (t) => t.tableNumber
            )
          ) + 1
        : 1;

    const now = nowIso();

    const table: Table = {
      id: generateId(),
      restaurantId: data.restaurantId || "",
      tableNumber: nextNumber,
      name:
        data.name ||
        `Table ${nextNumber}`,
      status:
        data.status || "AVAILABLE",
      qrCode:
        generateId() + generateId(),
      qrEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    cache.tables.push(table);

    persist(
      COLLECTIONS.tables,
      table.id,
      table
    );

    return table;
  },

  updateTable(
    id: string,
    data: Partial<Table>
  ): void {
    const index = cache.tables.findIndex(
      (t) => t.id === id
    );

    if (index === -1) return;

    const updated = {
      ...cache.tables[index],
      ...data,
      updatedAt: nowIso(),
    };

    cache.tables[index] = updated;

    persistUpdate(
      COLLECTIONS.tables,
      id,
      {
        ...data,
        updatedAt: updated.updatedAt,
      }
    );
  },

  deleteTable(id: string): void {
    cache.tables = cache.tables.filter(
      (t) => t.id !== id
    );

    persistDelete(
      COLLECTIONS.tables,
      id
    );
  },

  regenerateTableQR(id: string): void {
    this.updateTable(id, {
      qrCode:
        generateId() + generateId(),
    });
  },

  getTableByQRCode(
    qrCode: string
  ): Table | null {
    return (
      cache.tables.find(
        (t) =>
          t.qrCode === qrCode &&
          t.qrEnabled
      ) || null
    );
  },

  // ============================================================
  // EMPLOYEES
  // ============================================================

  getEmployees(
    restaurantId: string
  ): Employee[] {
    return cache.employees.filter(
      (e) => e.restaurantId === restaurantId
    );
  },

  getEmployee(id: string): Employee | null {
    return (
      cache.employees.find(
        (e) => e.id === id
      ) || null
    );
  },

  getEmployeeByEmail(
    email: string
  ): Employee | null {
    return (
      cache.employees.find(
        (e) =>
          e.email.toLowerCase() ===
          email.toLowerCase()
      ) || null
    );
  },

  createEmployee(
    data: Partial<Employee>
  ): Employee {
    const now = nowIso();

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

    cache.employees.push(employee);

    persist(
      COLLECTIONS.employees,
      employee.id,
      employee
    );

    return employee;
  },

  updateEmployee(
    id: string,
    data: Partial<Employee>
  ): void {
    const index =
      cache.employees.findIndex(
        (e) => e.id === id
      );

    if (index === -1) return;

    const updated = {
      ...cache.employees[index],
      ...data,
      updatedAt: nowIso(),
    };

    cache.employees[index] = updated;

    persistUpdate(
      COLLECTIONS.employees,
      id,
      {
        ...data,
        updatedAt: updated.updatedAt,
      }
    );
  },

  deleteEmployee(id: string): void {
    cache.employees =
      cache.employees.filter(
        (e) => e.id !== id
      );

    persistDelete(
      COLLECTIONS.employees,
      id
    );
  },

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================

  getActivityLogs(): ActivityLog[] {
    return [...cache.activityLogs];
  },

  addActivityLog(
    data: Partial<ActivityLog>
  ): ActivityLog {
    const log: ActivityLog = {
      id: generateId(),
      restaurantId:
        data.restaurantId || null,
      userId: data.userId || "",
      userName:
        data.userName || "System",
      action: data.action || "",
      details: data.details || "",
      createdAt: nowIso(),
    };

    cache.activityLogs.push(log);

    persist(
      COLLECTIONS.activityLogs,
      log.id,
      log
    );

    return log;
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  getNotifications(
    restaurantId: string
  ): Notification[] {
    return cache.notifications.filter(
      (n) =>
        n.restaurantId === restaurantId
    );
  },

  getNotificationsByUser(
    userId: string
  ): Notification[] {
    return cache.notifications.filter(
      (n) => n.userId === userId
    );
  },

  createNotification(
    data: Partial<Notification>
  ): Notification {
    const notification: Notification = {
      id: generateId(),
      restaurantId:
        data.restaurantId || "",
      userId:
        data.userId !== undefined
          ? data.userId
          : null,
      title: data.title || "",
      message: data.message || "",
      type: data.type || "SYSTEM",
      read: false,
      createdAt: nowIso(),
    };

    cache.notifications.push(notification);

    persist(
      COLLECTIONS.notifications,
      notification.id,
      notification
    );

    return notification;
  },

  markNotificationRead(id: string): void {
    const index =
      cache.notifications.findIndex(
        (n) => n.id === id
      );

    if (index === -1) return;

    cache.notifications[index] = {
      ...cache.notifications[index],
      read: true,
    };

    persistUpdate(
      COLLECTIONS.notifications,
      id,
      { read: true }
    );
  },

  // ============================================================
  // SEED DATA
  // ============================================================

  async seed(): Promise<void> {
    // Remove existing Firestore data from all collections
    const collectionNames = Object.values(
      COLLECTIONS
    );

    for (const collectionName of collectionNames) {
      const snapshot = await getDocs(
        collection(firestore, collectionName)
      );

      await Promise.all(
        snapshot.docs.map((item) =>
          deleteDoc(item.ref)
        )
      );
    }

    // Clear local cache
    cache.restaurants = [];
    cache.users = [];
    cache.subscriptions = [];
    cache.categories = [];
    cache.products = [];
    cache.orders = [];
    cache.employees = [];
    cache.tables = [];
    cache.activityLogs = [];
    cache.notifications = [];

    // Super Admin
    this.createUser({
      name: "Super Admin",
      email: "yuiusf604@gmail.com",
      password: "Y01012896067y@",
      phone: "+201012896067",
      role: "SUPER_ADMIN",
      restaurantId: null,
      status: "ACTIVE",
    });

    // Restaurant
    const restaurant = this.createRestaurant({
      name: "Burger House",
      slug: "burger-house",
      logo: "🍔",
      cover: "",
      description:
        "Delicious burgers and more",
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

    // Owner
    this.createUser({
      name: "Ahmed Hassan",
      email: "owner@burgerhouse.com",
      password: "owner123",
      phone: "+201098765432",
      role: "RESTAURANT_OWNER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Cashier
    this.createUser({
      name: "Sara Ali",
      email: "cashier@burgerhouse.com",
      password: "cashier123",
      phone: "+201011122233",
      role: "CASHIER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Kitchen
    this.createUser({
      name: "Mohamed Kamal",
      email: "kitchen@burgerhouse.com",
      password: "kitchen123",
      phone: "+201022233344",
      role: "KITCHEN",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Waiter
    this.createUser({
      name: "Omar Farouk",
      email: "waiter@burgerhouse.com",
      password: "waiter123",
      phone: "+201033344455",
      role: "WAITER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    // Subscription
    const startDate = new Date();
    const endDate = new Date();

    endDate.setMonth(
      endDate.getMonth() + 12
    );

    this.createSubscription({
      restaurantId: restaurant.id,
      plan: "PREMIUM",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "ACTIVE",
    });

    // Categories
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

    // Products
    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: burgers.id,
      name: "Classic Burger",
      nameAr: "برجر كلاسيك",
      description:
        "Beef patty with lettuce, tomato, and special sauce",
      descriptionAr:
        "لحم بقري مع خس وطماطم وصوص خاص",
      price: 120,
      costPrice: 60,
      sku: "BUR-001",
      stock: 50,
      minStock: 10,
      prepTime: 15,
      isAvailable: true,
      isFeatured: true,
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: burgers.id,
      name: "Cheese Burger",
      nameAr: "برجر جبنة",
      description:
        "Beef patty with cheddar cheese",
      descriptionAr:
        "لحم بقري مع جبنة شيدر",
      price: 140,
      costPrice: 70,
      sku: "BUR-002",
      stock: 40,
      minStock: 8,
      prepTime: 15,
      isAvailable: true,
      isFeatured: true,
      image:
        "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Cola",
      nameAr: "كولا",
      description:
        "Refreshing cola drink",
      descriptionAr:
        "مشروب كولا منعش",
      price: 30,
      costPrice: 10,
      sku: "DRK-001",
      stock: 100,
      minStock: 20,
      prepTime: 2,
      isAvailable: true,
      isFeatured: false,
      image:
        "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    });

    this.createProduct({
      restaurantId: restaurant.id,
      categoryId: desserts.id,
      name: "Chocolate Cake",
      nameAr: "كيك شوكولاتة",
      description:
        "Rich chocolate cake slice",
      descriptionAr:
        "قطعة كيك شوكولاتة غنية",
      price: 80,
      costPrice: 35,
      sku: "DES-001",
      stock: 20,
      minStock: 5,
      prepTime: 5,
      isAvailable: true,
      isFeatured: false,
      image:
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    });

    // Employees
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

    // Tables
    for (let i = 1; i <= 6; i++) {
      this.createTable({
        restaurantId: restaurant.id,
        name: `Table ${i}`,
        status: "AVAILABLE",
      });
    }

    // Activity Log
    this.addActivityLog({
      restaurantId: restaurant.id,
      userId: "system",
      userName: "System",
      action: "SYSTEM_INITIALIZED",
      details:
        "Demo data has been initialized",
    });

    // Give all pending Firestore writes some time to finish
    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    console.log("✅ Firebase seed completed");
  },
};