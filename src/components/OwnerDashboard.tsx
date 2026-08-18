import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { TablesQR } from "./TablesQR";
import {
  LayoutDashboard, Store, Users, CreditCard, Activity, LogOut,
  Plus, Search, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  XCircle, Building2, DollarSign, ShoppingBag, CalendarDays,
  MoreHorizontal, Pencil, Trash2, Eye, Ban, RefreshCcw,
  Menu, Package, Table2, QrCode, Settings, BarChart3, Bell
} from "lucide-react";

interface OwnerDashboardProps {
  user: any;
  onLogout: () => void;
}

export function OwnerDashboard({ user, onLogout }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    name: "", nameAr: "", description: "", descriptionAr: "",
    price: "", costPrice: "", categoryId: "", sku: "",
    stock: "", minStock: "", prepTime: "15", isAvailable: true, isFeatured: false
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "", nameAr: ""
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: "", email: "", phone: "", role: "CASHIER", password: ""
  });

  const [tableForm, setTableForm] = useState({
    name: ""
  });

  useEffect(() => {
    if (user.restaurantId) {
      const rest = db.getRestaurant(user.restaurantId);
      setRestaurant(rest);
      setProducts(db.getProducts(user.restaurantId));
      setCategories(db.getCategories(user.restaurantId));
      setOrders(db.getOrders(user.restaurantId));
      setEmployees(db.getEmployees(user.restaurantId));
      setTables(db.getTables(user.restaurantId));
      setNotifications(db.getNotifications(user.restaurantId));
    }
  }, [user]);

  const refreshData = () => {
    if (user.restaurantId) {
      setRestaurant(db.getRestaurant(user.restaurantId));
      setProducts(db.getProducts(user.restaurantId));
      setCategories(db.getCategories(user.restaurantId));
      setOrders(db.getOrders(user.restaurantId));
      setEmployees(db.getEmployees(user.restaurantId));
      setTables(db.getTables(user.restaurantId));
      setNotifications(db.getNotifications(user.restaurantId));
    }
  };

  const handleAddProduct = () => {
    if (!user.restaurantId) return;
    
    db.createProduct({
      restaurantId: user.restaurantId,
      categoryId: productForm.categoryId,
      name: productForm.name,
      nameAr: productForm.nameAr,
      description: productForm.description,
      descriptionAr: productForm.descriptionAr,
      price: parseFloat(productForm.price) || 0,
      costPrice: parseFloat(productForm.costPrice) || 0,
      sku: productForm.sku,
      stock: parseInt(productForm.stock) || 0,
      minStock: parseInt(productForm.minStock) || 0,
      prepTime: parseInt(productForm.prepTime) || 15,
      isAvailable: productForm.isAvailable,
      isFeatured: productForm.isFeatured,
    });

    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "PRODUCT_CREATED",
      details: `Product ${productForm.name} created`,
    });

    setShowAddProduct(false);
    setProductForm({
      name: "", nameAr: "", description: "", descriptionAr: "",
      price: "", costPrice: "", categoryId: "", sku: "",
      stock: "", minStock: "", prepTime: "15", isAvailable: true, isFeatured: false
    });
    refreshData();
  };

  const handleAddCategory = () => {
    if (!user.restaurantId) return;
    
    db.createCategory({
      restaurantId: user.restaurantId,
      name: categoryForm.name,
      nameAr: categoryForm.nameAr,
      sortOrder: categories.length + 1,
      isHidden: false,
    });

    setShowAddCategory(false);
    setCategoryForm({ name: "", nameAr: "" });
    refreshData();
  };

  const handleAddEmployee = () => {
    if (!user.restaurantId) return;
    
    // Create user account
    db.createUser({
      name: employeeForm.name,
      email: employeeForm.email,
      password: employeeForm.password || "password123",
      phone: employeeForm.phone,
      role: employeeForm.role,
      restaurantId: user.restaurantId,
      status: "ACTIVE",
    });

    // Create employee record
    db.createEmployee({
      restaurantId: user.restaurantId,
      name: employeeForm.name,
      email: employeeForm.email,
      phone: employeeForm.phone,
      role: employeeForm.role,
      status: "ACTIVE",
    });

    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "EMPLOYEE_CREATED",
      details: `Employee ${employeeForm.name} created with role ${employeeForm.role}`,
    });

    setShowAddEmployee(false);
    setEmployeeForm({
      name: "", email: "", phone: "", role: "CASHIER", password: ""
    });
    refreshData();
  };

  const handleAddTable = () => {
    if (!user.restaurantId) return;
    
    db.createTable({
      restaurantId: user.restaurantId,
      name: tableForm.name || `Table ${tables.length + 1}`,
      status: "AVAILABLE",
    });

    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "TABLE_CREATED",
      details: `Table ${tableForm.name || tables.length + 1} created`,
    });

    setShowAddTable(false);
    setTableForm({ name: "" });
    refreshData();
  };

  const handleUpdateProductStatus = (product: any) => {
    db.updateProduct(product.id, { isAvailable: !product.isAvailable });
    refreshData();
  };

  const handleDeleteProduct = (product: any) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      db.deleteProduct(product.id);
      db.addActivityLog({
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: "PRODUCT_DELETED",
        details: `Product ${product.name} deleted`,
      });
      refreshData();
    }
  };

  const handleDeleteEmployee = (employee: any) => {
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      db.deleteEmployee(employee.id);
      const userToDelete = db.getUserByEmail(employee.email);
      if (userToDelete) {
        db.deleteUser(userToDelete.id);
      }
      refreshData();
    }
  };

  const handleToggleEmployeeStatus = (employee: any) => {
    const newStatus = employee.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    db.updateEmployee(employee.id, { status: newStatus });
    const userToUpdate = db.getUserByEmail(employee.email);
    if (userToUpdate) {
      db.updateUser(userToUpdate.id, { status: newStatus });
    }
    refreshData();
  };

  const handleOrderStatus = (order: any, status: string) => {
    db.updateOrderStatus(order.id, status);
    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "ORDER_STATUS_CHANGED",
      details: `Order #${order.orderNumber} status changed to ${status}`,
    });
    refreshData();
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-blue-100 text-blue-700";
      case "CONFIRMED": return "bg-purple-100 text-purple-700";
      case "PREPARING": return "bg-amber-100 text-amber-700";
      case "READY": return "bg-emerald-100 text-emerald-700";
      case "DELIVERED": return "bg-teal-100 text-teal-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  });

  const todayRevenue = todayOrders
    .filter(o => o.status === "COMPLETED" || o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.total, 0);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const stats = {
    todaySales: todayRevenue,
    todayOrders: todayOrders.length,
    pendingOrders: orders.filter(o => o.status === "NEW" || o.status === "CONFIRMED").length,
    completedOrders: orders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").length,
    cancelledOrders: orders.filter(o => o.status === "CANCELLED").length,
    totalProducts: products.length,
    lowStock: lowStockProducts.length,
    outOfStock: outOfStockProducts.length,
    employees: employees.length,
    tables: tables.length,
    daysRemaining: db.getDaysRemaining(user.restaurantId),
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nameAr.includes(searchTerm)
  );

  const sidebarItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "menu", label: "Menu", icon: Menu },
    { id: "tables", label: "Tables & QR", icon: QrCode },
    { id: "employees", label: "Employees", icon: Users },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl">
              {restaurant?.logo || "🍽️"}
            </div>
            <div>
              <h1 className="font-bold text-lg">{restaurant?.name || "Restaurant"}</h1>
              <p className="text-xs text-slate-400">Owner Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {sidebarItems.find(i => i.id === activeTab)?.label || "Dashboard"}
              </h2>
              <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No notifications</p>
                      ) : (
                        notifications.map((n, i) => (
                          <div key={i} className="p-4 border-b border-slate-50 hover:bg-slate-50">
                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                {stats.daysRemaining} days left
              </Badge>
            </div>
          </div>
        </header>

        <main className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-100">Today's Sales</p>
                        <p className="text-3xl font-bold mt-1">{restaurant?.currency} {stats.todaySales.toFixed(2)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Today's Orders</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.todayOrders}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Pending Orders</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.pendingOrders}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Low Stock</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.lowStock}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {lowStockProducts.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">Low Stock Alert</p>
                        <p className="text-sm text-amber-700">
                          {lowStockProducts.length} products are running low: {lowStockProducts.map(p => p.name).join(", ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="pb-3 font-medium">Order #</th>
                          <th className="pb-3 font-medium">Table</th>
                          <th className="pb-3 font-medium">Items</th>
                          <th className="pb-3 font-medium">Total</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(-5).reverse().map(order => (
                          <tr key={order.id} className="border-b border-slate-100">
                            <td className="py-3 font-medium text-slate-900">#{order.orderNumber}</td>
                            <td className="py-3">
                              {order.tableId ? (
                                <Badge variant="secondary">
                                  {db.getTable(order.tableId)?.name || "Table"}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 text-slate-600">
                              {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items
                            </td>
                            <td className="py-3 font-medium text-slate-900">
                              {restaurant?.currency} {order.total.toFixed(2)}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">All Orders</h3>
                <div className="flex items-center gap-3">
                  <Select defaultValue="ALL">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="PREPARING">Preparing</SelectItem>
                      <SelectItem value="READY">Ready</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                          <th className="p-4 font-medium">Order #</th>
                          <th className="p-4 font-medium">Table</th>
                          <th className="p-4 font-medium">Customer</th>
                          <th className="p-4 font-medium">Items</th>
                          <th className="p-4 font-medium">Total</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Source</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice().reverse().map(order => (
                          <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-900">#{order.orderNumber}</td>
                            <td className="p-4">
                              {order.tableId ? (
                                <Badge variant="secondary">
                                  {db.getTable(order.tableId)?.name || "Table"}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-4 text-slate-600">{order.customerName}</td>
                            <td className="p-4 text-slate-600">
                              {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items
                            </td>
                            <td className="p-4 font-medium text-slate-900">
                              {restaurant?.currency} {order.total.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{order.source}</Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {order.status === "NEW" && (
                                  <Button size="sm" variant="outline" onClick={() => handleOrderStatus(order, "CONFIRMED")}>
                                    Confirm
                                  </Button>
                                )}
                                {order.status === "CONFIRMED" && (
                                  <Button size="sm" variant="outline" onClick={() => handleOrderStatus(order, "PREPARING")}>
                                    Start Preparing
                                  </Button>
                                )}
                                {order.status === "PREPARING" && (
                                  <Button size="sm" variant="outline" onClick={() => handleOrderStatus(order, "READY")}>
                                    Mark Ready
                                  </Button>
                                )}
                                {order.status === "READY" && (
                                  <Button size="sm" variant="outline" onClick={() => handleOrderStatus(order, "DELIVERED")}>
                                    Deliver
                                  </Button>
                                )}
                                {order.status === "DELIVERED" && (
                                  <Button size="sm" variant="outline" onClick={() => handleOrderStatus(order, "COMPLETED")}>
                                    Complete
                                  </Button>
                                )}
                                {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleOrderStatus(order, "CANCELLED")}>
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={() => setShowAddCategory(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>
                <Button onClick={() => setShowAddProduct(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Badge key={cat.id} variant="secondary" className="px-3 py-1">
                    {cat.name}
                  </Badge>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const category = db.getCategory(product.categoryId);
                  return (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-900">{product.name}</h3>
                              <p className="text-sm text-slate-500">{product.nameAr}</p>
                            </div>
                            <Badge variant={product.isAvailable ? "default" : "destructive"}>
                              {product.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{product.description}</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-slate-900">
                                {restaurant?.currency} {product.price.toFixed(2)}
                              </p>
                              <p className="text-xs text-slate-500">
                                Cost: {restaurant?.currency} {product.costPrice.toFixed(2)}
                              </p>
                            </div>
                            <Badge variant="outline">{category?.name || "Uncategorized"}</Badge>
                          </div>
                          <div className="flex items-center justify-between mt-3 text-sm">
                            <span className={`font-medium ${product.stock <= product.minStock ? "text-red-600" : "text-slate-600"}`}>
                              Stock: {product.stock}
                            </span>
                            <span className="text-slate-500">Min: {product.minStock}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateProductStatus(product)}
                              className={product.isAvailable ? "text-red-600" : "text-emerald-600"}
                            >
                              {product.isAvailable ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowEditProduct(true);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "tables" && (
            <TablesQR restaurantId={user.restaurantId} userRole={user.role} />
          )}

          {activeTab === "employees" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Employees</h3>
                <Button onClick={() => setShowAddEmployee(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                          <th className="p-4 font-medium">Employee</th>
                          <th className="p-4 font-medium">Role</th>
                          <th className="p-4 font-medium">Phone</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Created</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                                  {emp.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{emp.name}</p>
                                  <p className="text-xs text-slate-500">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary">{emp.role}</Badge>
                            </td>
                            <td className="p-4 text-slate-600">{emp.phone}</td>
                            <td className="p-4">
                              <Badge variant={emp.status === "ACTIVE" ? "default" : "destructive"}>
                                {emp.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-500">{new Date(emp.createdAt).toLocaleDateString()}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleEmployeeStatus(emp)}
                                  className={emp.status === "ACTIVE" ? "text-amber-600" : "text-emerald-600"}
                                >
                                  {emp.status === "ACTIVE" ? "Disable" : "Enable"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteEmployee(emp)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Products</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.totalProducts}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Low Stock</p>
                        <p className="text-3xl font-bold mt-1 text-amber-600">{stats.lowStock}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Out of Stock</p>
                        <p className="text-3xl font-bold mt-1 text-red-600">{stats.outOfStock}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="pb-3 font-medium">Product</th>
                          <th className="pb-3 font-medium">Category</th>
                          <th className="pb-3 font-medium">Stock</th>
                          <th className="pb-3 font-medium">Min Stock</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(product => (
                          <tr key={product.id} className="border-b border-slate-100">
                            <td className="py-3 font-medium text-slate-900">{product.name}</td>
                            <td className="py-3 text-slate-600">
                              {db.getCategory(product.categoryId)?.name || "Uncategorized"}
                            </td>
                            <td className="py-3">
                              <span className={`font-medium ${product.stock === 0 ? "text-red-600" : product.stock <= product.minStock ? "text-amber-600" : "text-slate-900"}`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600">{product.minStock}</td>
                            <td className="py-3">
                              <Badge variant={product.stock === 0 ? "destructive" : product.stock <= product.minStock ? "secondary" : "default"}>
                                {product.stock === 0 ? "OUT OF STOCK" : product.stock <= product.minStock ? "LOW STOCK" : "IN STOCK"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">
                      {restaurant?.currency} {orders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Total Orders</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">{orders.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">
                      {orders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Cancelled</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {orders.filter(o => o.status === "CANCELLED").length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Best Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products.map(product => {
                      const productOrders = orders.filter(o => 
                        o.items.some((item: any) => item.productId === product.id)
                      );
                      const totalSold = productOrders.reduce((sum, o) => 
                        sum + o.items.filter((item: any) => item.productId === product.id).reduce((s: number, i: any) => s + i.quantity, 0)
                      , 0);
                      const revenue = productOrders.reduce((sum, o) => 
                        sum + o.items.filter((item: any) => item.productId === product.id).reduce((s: number, i: any) => s + (i.price * i.quantity), 0)
                      , 0);
                      
                      return (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-500">{totalSold} sold</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{restaurant?.currency} {revenue.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">Revenue</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Restaurant Settings</CardTitle>
                  <CardDescription>Manage your restaurant information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Restaurant Name</Label>
                      <Input defaultValue={restaurant?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input defaultValue={restaurant?.phone} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue={restaurant?.email} />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input defaultValue={restaurant?.address} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax (%)</Label>
                      <Input type="number" defaultValue={restaurant?.tax} />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Charge (%)</Label>
                      <Input type="number" defaultValue={restaurant?.serviceCharge} />
                    </div>
                    <div className="space-y-2">
                      <Label>Opening Hours</Label>
                      <Input type="time" defaultValue={restaurant?.openingHours} />
                    </div>
                    <div className="space-y-2">
                      <Label>Closing Hours</Label>
                      <Input type="time" defaultValue={restaurant?.closingHours} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product for your menu
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Classic Burger"
              />
            </div>
            <div className="space-y-2">
              <Label>Arabic Name</Label>
              <Input
                value={productForm.nameAr}
                onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })}
                placeholder="برجر كلاسيك"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
              />
            </div>
            <div className="space-y-2">
              <Label>Arabic Description</Label>
              <Input
                value={productForm.descriptionAr}
                onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })}
                placeholder="وصف المنتج"
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                placeholder="120"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input
                type="number"
                value={productForm.costPrice}
                onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="BUR-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Stock</Label>
              <Input
                type="number"
                value={productForm.minStock}
                onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Preparation Time (minutes)</Label>
              <Input
                type="number"
                value={productForm.prepTime}
                onChange={(e) => setProductForm({ ...productForm, prepTime: e.target.value })}
                placeholder="15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} className="bg-emerald-600 hover:bg-emerald-700">
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for your menu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Burgers"
              />
            </div>
            <div className="space-y-2">
              <Label>Arabic Name</Label>
              <Input
                value={categoryForm.nameAr}
                onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                placeholder="برجر"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-700">
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="employee@restaurant.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="+201234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                  <SelectItem value="KITCHEN">Kitchen Staff</SelectItem>
                  <SelectItem value="WAITER">Waiter</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={employeeForm.password}
                onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                placeholder="Default: password123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} className="bg-emerald-600 hover:bg-emerald-700">
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}