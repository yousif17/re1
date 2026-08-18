import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { translate, Language } from "@/lib/i18n";
import {
  LayoutDashboard, Users, LogOut, Plus, Search, AlertTriangle, Clock,
  DollarSign, ShoppingBag, Globe, Menu, Package, BarChart3, Trash2, Pencil, ShieldCheck
} from "lucide-react";

interface ManagerDashboardProps {
  user: any;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function ManagerDashboard({ user, onLogout, lang, setLang }: ManagerDashboardProps) {
  const t = (key: string) => translate(lang, key);
  const restaurant = db.getRestaurant(user.restaurantId);
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState(db.getProducts(user.restaurantId));
  const [categories, setCategories] = useState(db.getCategories(user.restaurantId));
  const [orders, setOrders] = useState(db.getOrders(user.restaurantId));
  const [employees, setEmployees] = useState(db.getEmployees(user.restaurantId));
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    costPrice: "",
    categoryId: "",
    sku: "",
    stock: "",
    minStock: "",
    prepTime: "15",
    isAvailable: true,
    isFeatured: false,
  });

  const refreshData = () => {
    setProducts(db.getProducts(user.restaurantId));
    setCategories(db.getCategories(user.restaurantId));
    setOrders(db.getOrders(user.restaurantId));
    setEmployees(db.getEmployees(user.restaurantId));
  };

  const handleAddProduct = () => {
    db.createProduct({
      restaurantId: user.restaurantId,
      categoryId: productForm.categoryId,
      name: productForm.name,
      nameAr: productForm.nameAr,
      description: productForm.description,
      descriptionAr: productForm.descriptionAr,
      price: parseFloat(productForm.price),
      costPrice: parseFloat(productForm.costPrice),
      sku: productForm.sku,
      stock: parseInt(productForm.stock),
      minStock: parseInt(productForm.minStock),
      prepTime: parseInt(productForm.prepTime),
      isAvailable: productForm.isAvailable,
      isFeatured: productForm.isFeatured,
    });

    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "PRODUCT_CREATED",
      details: `Manager created product ${productForm.name}`,
    });

    setShowAddProduct(false);
    setProductForm({
      name: "", nameAr: "", description: "", descriptionAr: "",
      price: "", costPrice: "", categoryId: "", sku: "",
      stock: "", minStock: "", prepTime: "15",
      isAvailable: true, isFeatured: false,
    });
    refreshData();
  };

  const handleUpdateProduct = () => {
    if (editingProduct) {
      db.updateProduct(editingProduct.id, {
        name: productForm.name,
        nameAr: productForm.nameAr,
        description: productForm.description,
        descriptionAr: productForm.descriptionAr,
        price: parseFloat(productForm.price),
        costPrice: parseFloat(productForm.costPrice),
        categoryId: productForm.categoryId,
        sku: productForm.sku,
        stock: parseInt(productForm.stock),
        minStock: parseInt(productForm.minStock),
        prepTime: parseInt(productForm.prepTime),
        isAvailable: productForm.isAvailable,
        isFeatured: productForm.isFeatured,
      });

      db.addActivityLog({
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: "PRODUCT_UPDATED",
        details: `Manager updated product ${productForm.name}`,
      });

      setEditingProduct(null);
      setShowAddProduct(false);
      refreshData();
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      db.deleteProduct(id);
      db.addActivityLog({
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: "PRODUCT_DELETED",
        details: `Manager deleted product`,
      });
      refreshData();
    }
  };

  const handleOrderStatus = (orderId: string, status: string) => {
    db.updateOrderStatus(orderId, status);
    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "ORDER_STATUS_CHANGED",
      details: `Manager changed order ${orderId} to ${status}`,
    });
    refreshData();
  };

  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status === "COMPLETED").reduce((sum, o) => sum + o.total, 0);
  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nameAr.includes(searchTerm)
  );

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-xl">
              {restaurant.logo}
            </div>
            <div>
              <h1 className="font-bold text-lg">{restaurant.name}</h1>
              <p className="text-xs text-slate-400">Manager Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "menu" ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "orders" ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "employees" ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            Employees
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "reports" ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Manager Access</span>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{restaurant.name}</h2>
              <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {db.getDaysRemaining(restaurant.id)} days left
              </Badge>
              <Button
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-100">Today's Sales</p>
                        <p className="text-3xl font-bold mt-1">{restaurant.currency} {todayRevenue.toFixed(2)}</p>
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
                        <p className="text-3xl font-bold mt-1 text-slate-900">{todayOrders.length}</p>
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
                        <p className="text-sm text-slate-500">Total Products</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{products.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Package className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Employees</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{employees.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div>
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-sm text-amber-700">Stock: {p.stock} (Min: {p.minStock})</p>
                          </div>
                          <Badge variant="secondary">Low Stock</Badge>
                        </div>
                      ))}
                      {lowStockProducts.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No low stock items</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orders.slice(-5).reverse().map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-900">Order #{o.orderNumber}</p>
                            <p className="text-xs text-slate-500">{o.customerName} • {new Date(o.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{restaurant.currency} {o.total.toFixed(2)}</p>
                            <Badge variant={o.status === "COMPLETED" ? "default" : o.status === "CANCELLED" ? "destructive" : "secondary"}>
                              {o.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowAddProduct(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
                          🍔
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingProduct(p);
                            setProductForm({
                              name: p.name,
                              nameAr: p.nameAr,
                              description: p.description,
                              descriptionAr: p.descriptionAr,
                              price: p.price.toString(),
                              costPrice: p.costPrice.toString(),
                              categoryId: p.categoryId,
                              sku: p.sku,
                              stock: p.stock.toString(),
                              minStock: p.minStock.toString(),
                              prepTime: p.prepTime.toString(),
                              isAvailable: p.isAvailable,
                              isFeatured: p.isFeatured,
                            });
                            setShowAddProduct(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteProduct(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-medium text-slate-900 mt-3">{p.name}</h3>
                      <p className="text-xs text-slate-500">{p.nameAr}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-slate-900">{restaurant.currency} {p.price}</p>
                        <Badge variant={p.isAvailable ? "default" : "destructive"}>
                          {p.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                        <span>Stock: {p.stock}</span>
                        <span>Min: {p.minStock}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Order #</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Items</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Payment</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice().reverse().map(o => (
                        <tr key={o.id} className="border-b border-slate-100">
                          <td className="py-3 font-medium text-slate-900">#{o.orderNumber}</td>
                          <td className="py-3 text-slate-600">{o.customerName}</td>
                          <td className="py-3 text-slate-600">{o.items.length} items</td>
                          <td className="py-3 font-medium text-slate-900">{restaurant.currency} {o.total.toFixed(2)}</td>
                          <td className="py-3 text-slate-600">{o.paymentMethod}</td>
                          <td className="py-3">
                            <Badge variant={o.status === "COMPLETED" ? "default" : o.status === "CANCELLED" ? "destructive" : "secondary"}>
                              {o.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-500">{new Date(o.createdAt).toLocaleTimeString()}</td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              {o.status === "NEW" && (
                                <Button size="sm" variant="outline" onClick={() => handleOrderStatus(o.id, "CONFIRMED")}>
                                  Confirm
                                </Button>
                              )}
                              {o.status === "READY" && (
                                <Button size="sm" variant="outline" onClick={() => handleOrderStatus(o.id, "COMPLETED")}>
                                  Complete
                                </Button>
                              )}
                              {o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleOrderStatus(o.id, "CANCELLED")}>
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
          )}

          {activeTab === "employees" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employees (View Only)</CardTitle>
                <CardDescription>
                  Only the restaurant owner can add or edit employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Phone</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(e => (
                        <tr key={e.id} className="border-b border-slate-100">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                                {e.name.charAt(0)}
                              </div>
                              <p className="font-medium text-slate-900">{e.name}</p>
                            </div>
                          </td>
                          <td className="py-3 text-slate-600">{e.email}</td>
                          <td className="py-3 text-slate-600">{e.phone}</td>
                          <td className="py-3">
                            <Badge variant="secondary">{e.role}</Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant={e.status === "ACTIVE" ? "default" : "destructive"}>{e.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{restaurant.currency} {orders.filter(o => o.status === "COMPLETED").reduce((sum, o) => sum + o.total, 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Completed Orders</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{orders.filter(o => o.status === "COMPLETED").length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-500">Cancelled Orders</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{orders.filter(o => o.status === "CANCELLED").length}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {products.map(p => {
                      const totalSold = orders
                        .filter(o => o.status === "COMPLETED")
                        .reduce((sum, o) => sum + o.items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0), 0);
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">SKU: {p.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{totalSold} sold</p>
                            <p className="text-xs text-slate-500">{restaurant.currency} {(totalSold * p.price).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product information" : "Create a new product for your menu"}
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
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
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
              <Select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
              <Label>Min Stock</Label>
              <Input
                type="number"
                value={productForm.minStock}
                onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Prep Time (minutes)</Label>
              <Input
                type="number"
                value={productForm.prepTime}
                onChange={(e) => setProductForm({ ...productForm, prepTime: e.target.value })}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label>Available</Label>
              <Select value={productForm.isAvailable ? "true" : "false"} onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.value === "true" })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddProduct(false); setEditingProduct(null); }}>
              Cancel
            </Button>
            <Button onClick={editingProduct ? handleUpdateProduct : handleAddProduct} className="bg-blue-600 hover:bg-blue-700">
              {editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}