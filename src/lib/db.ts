// Database layer using localStorage & Firebase Firestore (Hybrid Sync)
import { collection, doc, setDoc, deleteDoc, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { firestore } from "./firebase";

// === Interfaces ===
interface Restaurant { id: string; name: string; slug: string; logo: string; cover: string; description: string; phone: string; email: string; address: string; city: string; country: string; currency: string; timeZone: string; status: string; tax: number; serviceCharge: number; openingHours: string; closingHours: string; createdAt: string; updatedAt: string; }
interface User { id: string; name: string; email: string; password: string; phone: string; role: string; restaurantId: string | null; status: string; createdAt: string; updatedAt: string; }
interface Subscription { id: string; restaurantId: string; plan: string; startDate: string; endDate: string; status: string; createdAt: string; updatedAt: string; }
interface Category { id: string; restaurantId: string; name: string; nameAr: string; sortOrder: number; isHidden: boolean; createdAt: string; }
interface Product { id: string; restaurantId: string; categoryId: string; name: string; nameAr: string; description: string; descriptionAr: string; price: number; costPrice: number; sku: string; stock: number; minStock: number; prepTime: number; isAvailable: boolean; isFeatured: boolean; image?: string; createdAt: string; updatedAt: string; }
interface Order { id: string; restaurantId: string; orderNumber: number; tableId: string | null; customerName: string; customerPhone: string; items: any[]; subtotal: number; discount: number; tax: number; serviceCharge: number; total: number; paymentMethod: string; status: string; source: string; notes: string; createdAt: string; updatedAt: string; }
interface Employee { id: string; restaurantId: string; name: string; email: string; phone: string; role: string; status: string; createdAt: string; updatedAt: string; }
interface Table { id: string; restaurantId: string; tableNumber: number; name: string; status: string; qrCode: string; qrEnabled: boolean; createdAt: string; updatedAt: string; }
interface ActivityLog { id: string; restaurantId: string | null; userId: string; userName: string; action: string; details: string; createdAt: string; }
interface Notification { id: string; restaurantId: string; userId: string | null; title: string; message: string; type: string; read: boolean; createdAt: string; }

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

// === Firebase Helpers ===
const pushToFirebase = async (col: string, id: string, data: any) => {
  try { await setDoc(doc(firestore, col, id), data); } catch (error) { console.error(`Error syncing ${col}:`, error); }
};

const deleteFromFirebase = async (col: string, id: string) => {
  try { await deleteDoc(doc(firestore, col, id)); } catch (error) { console.error(`Error deleting ${col}:`, error); }
};

export const db = {
  // === FIREBASE INITIALIZATION & SYNC ===
  async initializeFromFirebase() {
    try {
      const restSnap = await getDocs(collection(firestore, "restaurants"));
      if (!restSnap.empty) {
        for (const key of Object.keys(STORAGE_KEYS)) {
          const colName = key === "activityLogs" ? "activityLogs" : key;
          const snap = await getDocs(collection(firestore, colName));
          writeData(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS], snap.docs.map(d => d.data()));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Firebase Init Error:", e);
      return false;
    }
  },

  syncRestaurantData(restaurantId: string, onUpdate: () => void) {
    if (!restaurantId) return () => {};
    const unsubscribes: any[] = [];
    const collections = ["orders", "products", "categories", "tables", "employees", "notifications"];
    
    collections.forEach(col => {
      const q = query(collection(firestore, col), where("restaurantId", "==", restaurantId));
      unsubscribes.push(onSnapshot(q, (snap) => {
        writeData(STORAGE_KEYS[col as keyof typeof STORAGE_KEYS], snap.docs.map(d => d.data()));
        onUpdate(); 
      }));
    });

    return () => unsubscribes.forEach(u => u());
  },

  // ===== RESTAURANTS =====
  getRestaurants(): Restaurant[] { return readData<Restaurant>(STORAGE_KEYS.restaurants); },
  getRestaurant(id: string): Restaurant | null { return this.getRestaurants().find(r => r.id === id) || null; },
  getRestaurantBySlug(slug: string): Restaurant | null { return this.getRestaurants().find(r => r.slug === slug) || null; },
  createRestaurant(data: Partial<Restaurant>): Restaurant {
    const restaurants = this.getRestaurants();
    const now = new Date().toISOString();
    const restaurant: Restaurant = {
      id: generateId(), name: data.name || "", slug: data.slug || "", logo: data.logo || "🍽️", cover: data.cover || "", description: data.description || "", phone: data.phone || "", email: data.email || "", address: data.address || "", city: data.city || "", country: data.country || "", currency: data.currency || "EGP", timeZone: data.timeZone || "Africa/Cairo", status: data.status || "ACTIVE", tax: data.tax || 14, serviceCharge: data.serviceCharge || 10, openingHours: data.openingHours || "10:00", closingHours: data.closingHours || "23:00", createdAt: now, updatedAt: now,
    };
    restaurants.push(restaurant);
    writeData(STORAGE_KEYS.restaurants, restaurants);
    pushToFirebase("restaurants", restaurant.id, restaurant);
    return restaurant;
  },
  updateRestaurant(id: string, data: Partial<Restaurant>): void {
    const restaurants = this.getRestaurants();
    const index = restaurants.findIndex(r => r.id === id);
    if (index !== -1) {
      restaurants[index] = { ...restaurants[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.restaurants, restaurants);
      pushToFirebase("restaurants", id, restaurants[index]);
    }
  },
  deleteRestaurant(id: string): void {
    writeData(STORAGE_KEYS.restaurants, this.getRestaurants().filter(r => r.id !== id));
    deleteFromFirebase("restaurants", id);
  },
  getRestaurantRevenue(restaurantId: string): number {
    return this.getOrders(restaurantId).filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").reduce((sum, o) => sum + o.total, 0);
  },
  getDaysRemaining(restaurantId: string): number {
    const sub = this.getSubscriptionByRestaurant(restaurantId);
    if (!sub) return 0;
    return Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  },

  // ===== USERS =====
  getUsers(): User[] { return readData<User>(STORAGE_KEYS.users); },
  getUser(id: string): User | null { return this.getUsers().find(u => u.id === id) || null; },
  getUserByEmail(email: string): User | null { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null; },
  getUsersByRestaurant(restaurantId: string): User[] { return this.getUsers().filter(u => u.restaurantId === restaurantId); },
  createUser(data: Partial<User>): User {
    const users = this.getUsers();
    const user: User = { id: generateId(), name: data.name || "", email: data.email || "", password: data.password || "password123", phone: data.phone || "", role: data.role || "CASHIER", restaurantId: data.restaurantId || null, status: data.status || "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    users.push(user);
    writeData(STORAGE_KEYS.users, users);
    pushToFirebase("users", user.id, user);
    return user;
  },
  updateUser(id: string, data: Partial<User>): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.users, users);
      pushToFirebase("users", id, users[index]);
    }
  },
  deleteUser(id: string): void {
    writeData(STORAGE_KEYS.users, this.getUsers().filter(u => u.id !== id));
    deleteFromFirebase("users", id);
  },
  authenticate(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    return (user && user.password === password && user.status === "ACTIVE") ? user : null;
  },

  // ===== SUBSCRIPTIONS =====
  getSubscriptions(): Subscription[] { return readData<Subscription>(STORAGE_KEYS.subscriptions); },
  getSubscription(id: string): Subscription | null { return this.getSubscriptions().find(s => s.id === id) || null; },
  getSubscriptionByRestaurant(restaurantId: string): Subscription | null { return this.getSubscriptions().find(s => s.restaurantId === restaurantId) || null; },
  createSubscription(data: Partial<Subscription>): Subscription {
    const subscriptions = this.getSubscriptions();
    const sub: Subscription = { id: generateId(), restaurantId: data.restaurantId || "", plan: data.plan || "PRO", startDate: data.startDate || new Date().toISOString(), endDate: data.endDate || new Date().toISOString(), status: data.status || "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    subscriptions.push(sub);
    writeData(STORAGE_KEYS.subscriptions, subscriptions);
    pushToFirebase("subscriptions", sub.id, sub);
    return sub;
  },
  updateSubscription(id: string, data: Partial<Subscription>): void {
    const subs = this.getSubscriptions();
    const index = subs.findIndex(s => s.id === id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.subscriptions, subs);
      pushToFirebase("subscriptions", id, subs[index]);
    }
  },

  // ===== CATEGORIES =====
  getCategories(restaurantId: string): Category[] { return readData<Category>(STORAGE_KEYS.categories).filter(c => c.restaurantId === restaurantId); },
  getCategory(id: string): Category | null { return readData<Category>(STORAGE_KEYS.categories).find(c => c.id === id) || null; },
  createCategory(data: Partial<Category>): Category {
    const cats = readData<Category>(STORAGE_KEYS.categories);
    const cat: Category = { id: generateId(), restaurantId: data.restaurantId || "", name: data.name || "", nameAr: data.nameAr || "", sortOrder: data.sortOrder || 0, isHidden: data.isHidden || false, createdAt: new Date().toISOString() };
    cats.push(cat);
    writeData(STORAGE_KEYS.categories, cats);
    pushToFirebase("categories", cat.id, cat);
    return cat;
  },
  updateCategory(id: string, data: Partial<Category>): void {
    const cats = readData<Category>(STORAGE_KEYS.categories);
    const index = cats.findIndex(c => c.id === id);
    if (index !== -1) {
      cats[index] = { ...cats[index], ...data };
      writeData(STORAGE_KEYS.categories, cats);
      pushToFirebase("categories", id, cats[index]);
    }
  },
  deleteCategory(id: string): void {
    writeData(STORAGE_KEYS.categories, readData<Category>(STORAGE_KEYS.categories).filter(c => c.id !== id));
    deleteFromFirebase("categories", id);
  },

  // ===== PRODUCTS =====
  getProducts(restaurantId: string): Product[] { return readData<Product>(STORAGE_KEYS.products).filter(p => p.restaurantId === restaurantId); },
  getProduct(id: string): Product | null { return readData<Product>(STORAGE_KEYS.products).find(p => p.id === id) || null; },
  createProduct(data: Partial<Product>): Product {
    const prods = readData<Product>(STORAGE_KEYS.products);
    const prod: Product = { id: generateId(), restaurantId: data.restaurantId || "", categoryId: data.categoryId || "", name: data.name || "", nameAr: data.nameAr || "", description: data.description || "", descriptionAr: data.descriptionAr || "", price: data.price || 0, costPrice: data.costPrice || 0, sku: data.sku || "", stock: data.stock || 0, minStock: data.minStock || 0, prepTime: data.prepTime || 15, isAvailable: data.isAvailable !== undefined ? data.isAvailable : true, isFeatured: data.isFeatured || false, image: data.image || "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    prods.push(prod);
    writeData(STORAGE_KEYS.products, prods);
    pushToFirebase("products", prod.id, prod);
    return prod;
  },
  updateProduct(id: string, data: Partial<Product>): void {
    const prods = readData<Product>(STORAGE_KEYS.products);
    const index = prods.findIndex(p => p.id === id);
    if (index !== -1) {
      prods[index] = { ...prods[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.products, prods);
      pushToFirebase("products", id, prods[index]);
    }
  },
  deleteProduct(id: string): void {
    writeData(STORAGE_KEYS.products, readData<Product>(STORAGE_KEYS.products).filter(p => p.id !== id));
    deleteFromFirebase("products", id);
  },

  // ===== ORDERS =====
  getOrders(restaurantId: string): Order[] { return readData<Order>(STORAGE_KEYS.orders).filter(o => o.restaurantId === restaurantId); },
  getOrder(id: string): Order | null { return readData<Order>(STORAGE_KEYS.orders).find(o => o.id === id) || null; },
  getOrdersByTable(tableId: string): Order[] { return readData<Order>(STORAGE_KEYS.orders).filter(o => o.tableId === tableId); },
  createOrder(data: Partial<Order>): Order {
    const orders = readData<Order>(STORAGE_KEYS.orders);
    const restaurantOrders = orders.filter(o => o.restaurantId === data.restaurantId);
    const order: Order = { id: generateId(), restaurantId: data.restaurantId || "", orderNumber: restaurantOrders.length > 0 ? Math.max(...restaurantOrders.map(o => o.orderNumber)) + 1 : 1001, tableId: data.tableId || null, customerName: data.customerName || "Guest", customerPhone: data.customerPhone || "", items: data.items || [], subtotal: data.subtotal || 0, discount: data.discount || 0, tax: data.tax || 0, serviceCharge: data.serviceCharge || 0, total: data.total || 0, paymentMethod: data.paymentMethod || "CASH", status: data.status || "NEW", source: data.source || "CASHIER", notes: data.notes || "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    orders.push(order);
    writeData(STORAGE_KEYS.orders, orders);
    pushToFirebase("orders", order.id, order);
    return order;
  },
  updateOrder(id: string, data: Partial<Order>): void {
    const orders = readData<Order>(STORAGE_KEYS.orders);
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.orders, orders);
      pushToFirebase("orders", id, orders[index]);
    }
  },
  updateOrderStatus(id: string, status: string): void { this.updateOrder(id, { status }); },

  // ===== TABLES =====
  getTables(restaurantId: string): Table[] { return readData<Table>(STORAGE_KEYS.tables).filter(t => t.restaurantId === restaurantId); },
  getTable(id: string): Table | null { return readData<Table>(STORAGE_KEYS.tables).find(t => t.id === id) || null; },
  getTableByNumber(restaurantId: string, tableNumber: number): Table | null {
    return readData<Table>(STORAGE_KEYS.tables).find(t => t.restaurantId === restaurantId && t.tableNumber === tableNumber) || null;
  },
  createTable(data: Partial<Table>): Table {
    const tables = readData<Table>(STORAGE_KEYS.tables);
    const restaurantTables = tables.filter(t => t.restaurantId === data.restaurantId);
    const table: Table = { id: generateId(), restaurantId: data.restaurantId || "", tableNumber: restaurantTables.length > 0 ? Math.max(...restaurantTables.map(t => t.tableNumber)) + 1 : 1, name: data.name || `Table`, status: data.status || "AVAILABLE", qrCode: generateId() + generateId(), qrEnabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    tables.push(table);
    writeData(STORAGE_KEYS.tables, tables);
    pushToFirebase("tables", table.id, table);
    return table;
  },
  updateTable(id: string, data: Partial<Table>): void {
    const tables = readData<Table>(STORAGE_KEYS.tables);
    const index = tables.findIndex(t => t.id === id);
    if (index !== -1) {
      tables[index] = { ...tables[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.tables, tables);
      pushToFirebase("tables", id, tables[index]);
    }
  },
  deleteTable(id: string): void {
    writeData(STORAGE_KEYS.tables, readData<Table>(STORAGE_KEYS.tables).filter(t => t.id !== id));
    deleteFromFirebase("tables", id);
  },
  regenerateTableQR(id: string): void {
    this.updateTable(id, { qrCode: generateId() + generateId() });
  },
  getTableByQRCode(qrCode: string): Table | null {
    return readData<Table>(STORAGE_KEYS.tables).find(t => t.qrCode === qrCode && t.qrEnabled) || null;
  },

  // ===== EMPLOYEES =====
  getEmployees(restaurantId: string): Employee[] { return readData<Employee>(STORAGE_KEYS.employees).filter(e => e.restaurantId === restaurantId); },
  getEmployee(id: string): Employee | null { return readData<Employee>(STORAGE_KEYS.employees).find(e => e.id === id) || null; },
  getEmployeeByEmail(email: string): Employee | null {
    return readData<Employee>(STORAGE_KEYS.employees).find(e => e.email.toLowerCase() === email.toLowerCase()) || null;
  },
  createEmployee(data: Partial<Employee>): Employee {
    const emps = readData<Employee>(STORAGE_KEYS.employees);
    const emp: Employee = { id: generateId(), restaurantId: data.restaurantId || "", name: data.name || "", email: data.email || "", phone: data.phone || "", role: data.role || "CASHIER", status: data.status || "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    emps.push(emp);
    writeData(STORAGE_KEYS.employees, emps);
    pushToFirebase("employees", emp.id, emp);
    return emp;
  },
  updateEmployee(id: string, data: Partial<Employee>): void {
    const emps = readData<Employee>(STORAGE_KEYS.employees);
    const index = emps.findIndex(e => e.id === id);
    if (index !== -1) {
      emps[index] = { ...emps[index], ...data, updatedAt: new Date().toISOString() };
      writeData(STORAGE_KEYS.employees, emps);
      pushToFirebase("employees", id, emps[index]);
    }
  },
  deleteEmployee(id: string): void {
    writeData(STORAGE_KEYS.employees, readData<Employee>(STORAGE_KEYS.employees).filter(e => e.id !== id));
    deleteFromFirebase("employees", id);
  },

  // ===== LOGS & NOTIFICATIONS =====
  getActivityLogs(): ActivityLog[] { return readData<ActivityLog>(STORAGE_KEYS.activityLogs); },
  addActivityLog(data: Partial<ActivityLog>): ActivityLog {
    const logs = readData<ActivityLog>(STORAGE_KEYS.activityLogs);
    const log: ActivityLog = { id: generateId(), restaurantId: data.restaurantId || null, userId: data.userId || "", userName: data.userName || "System", action: data.action || "", details: data.details || "", createdAt: new Date().toISOString() };
    logs.push(log);
    writeData(STORAGE_KEYS.activityLogs, logs);
    pushToFirebase("activityLogs", log.id, log);
    return log;
  },
  getNotifications(restaurantId: string): Notification[] { return readData<Notification>(STORAGE_KEYS.notifications).filter(n => n.restaurantId === restaurantId); },
  getNotificationsByUser(userId: string): Notification[] {
    return readData<Notification>(STORAGE_KEYS.notifications).filter(n => n.userId === userId);
  },
  createNotification(data: Partial<Notification>): Notification {
    const notifs = readData<Notification>(STORAGE_KEYS.notifications);
    const notif: Notification = { id: generateId(), restaurantId: data.restaurantId || "", userId: data.userId || null, title: data.title || "", message: data.message || "", type: data.type || "SYSTEM", read: false, createdAt: new Date().toISOString() };
    notifs.push(notif);
    writeData(STORAGE_KEYS.notifications, notifs);
    pushToFirebase("notifications", notif.id, notif);
    return notif;
  },
  markNotificationRead(id: string): void {
    const notifs = readData<Notification>(STORAGE_KEYS.notifications);
    const index = notifs.findIndex(n => n.id === id);
    if (index !== -1) {
      notifs[index].read = true;
      writeData(STORAGE_KEYS.notifications, notifs);
      pushToFirebase("notifications", id, notifs[index]);
    }
  },

  // ===== SEED DATA =====
  seed(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    this.createUser({ name: "Super Admin", email: "yuiusf604@gmail.com", password: "Y01012896067y@", phone: "+201012896067", role: "SUPER_ADMIN", restaurantId: null, status: "ACTIVE" });
    const restaurant = this.createRestaurant({ name: "Burger House", slug: "burger-house", logo: "🍔", description: "Delicious burgers and more", phone: "+201234567890", email: "info@burgerhouse.com", address: "123 Main Street", city: "Cairo", country: "Egypt", currency: "EGP", status: "ACTIVE", tax: 14, serviceCharge: 10, openingHours: "10:00", closingHours: "23:00" });
    this.createUser({ name: "Ahmed Hassan", email: "owner@burgerhouse.com", password: "owner123", phone: "+201098765432", role: "RESTAURANT_OWNER", restaurantId: restaurant.id, status: "ACTIVE" });
    this.createUser({ name: "Sara Ali", email: "cashier@burgerhouse.com", password: "cashier123", phone: "+201011122233", role: "CASHIER", restaurantId: restaurant.id, status: "ACTIVE" });
    this.createUser({ name: "Mohamed Kamal", email: "kitchen@burgerhouse.com", password: "kitchen123", phone: "+201022233344", role: "KITCHEN", restaurantId: restaurant.id, status: "ACTIVE" });
    this.createUser({ name: "Omar Farouk", email: "waiter@burgerhouse.com", password: "waiter123", phone: "+201033344455", role: "WAITER", restaurantId: restaurant.id, status: "ACTIVE" });
    const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 12);
    this.createSubscription({ restaurantId: restaurant.id, plan: "PREMIUM", startDate: new Date().toISOString(), endDate: endDate.toISOString(), status: "ACTIVE" });
    const burgers = this.createCategory({ restaurantId: restaurant.id, name: "Burgers", nameAr: "برجر", sortOrder: 1 });
    const drinks = this.createCategory({ restaurantId: restaurant.id, name: "Drinks", nameAr: "مشروبات", sortOrder: 2 });
    const desserts = this.createCategory({ restaurantId: restaurant.id, name: "Desserts", nameAr: "حلويات", sortOrder: 3 });
    this.createProduct({ restaurantId: restaurant.id, categoryId: burgers.id, name: "Classic Burger", nameAr: "برجر كلاسيك", description: "Beef patty with lettuce, tomato, and special sauce", descriptionAr: "لحم بقري مع خس وطماطم وصوص خاص", price: 120, costPrice: 60, sku: "BUR-001", stock: 50, minStock: 10, prepTime: 15, isAvailable: true, isFeatured: true, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" });
    this.createProduct({ restaurantId: restaurant.id, categoryId: burgers.id, name: "Cheese Burger", nameAr: "برجر جبنة", description: "Beef patty with cheddar cheese", descriptionAr: "لحم بقري مع جبنة شيدر", price: 140, costPrice: 70, sku: "BUR-002", stock: 40, minStock: 8, prepTime: 15, isAvailable: true, isFeatured: true, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80" });
    this.createProduct({ restaurantId: restaurant.id, categoryId: drinks.id, name: "Cola", nameAr: "كولا", description: "Refreshing cola drink", descriptionAr: "مشروب كولا منعش", price: 30, costPrice: 10, sku: "DRK-001", stock: 100, minStock: 20, prepTime: 2, isAvailable: true, isFeatured: false, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80" });
    this.createProduct({ restaurantId: restaurant.id, categoryId: desserts.id, name: "Chocolate Cake", nameAr: "كيك شوكولاتة", description: "Rich chocolate cake slice", descriptionAr: "قطعة كيك شوكولاتة غنية", price: 80, costPrice: 35, sku: "DES-001", stock: 20, minStock: 5, prepTime: 5, isAvailable: true, isFeatured: false, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80" });
    this.createEmployee({ restaurantId: restaurant.id, name: "Sara Ali", email: "cashier@burgerhouse.com", phone: "+201011122233", role: "CASHIER", status: "ACTIVE" });
    this.createEmployee({ restaurantId: restaurant.id, name: "Mohamed Kamal", email: "kitchen@burgerhouse.com", phone: "+201022233344", role: "KITCHEN", status: "ACTIVE" });
    this.createEmployee({ restaurantId: restaurant.id, name: "Omar Farouk", email: "waiter@burgerhouse.com", phone: "+201033344455", role: "WAITER", status: "ACTIVE" });
    for (let i = 1; i <= 6; i++) { this.createTable({ restaurantId: restaurant.id, name: `Table ${i}`, status: "AVAILABLE" }); }
    this.addActivityLog({ restaurantId: restaurant.id, userId: "system", userName: "System", action: "SYSTEM_INITIALIZED", details: "Demo data has been initialized" });
  }
};