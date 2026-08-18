import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { translate, Language } from "@/lib/i18n";
import {
  LogOut, Plus, Search, ShoppingBag, Globe, Minus, Trash2, CheckCircle2, Clock
} from "lucide-react";

interface CashierDashboardProps {
  user: any;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function CashierDashboard({ user, onLogout, lang, setLang }: CashierDashboardProps) {
  const t = (key: string) => translate(lang, key);
  const restaurant = db.getRestaurant(user.restaurantId);
  const [activeTab, setActiveTab] = useState("newOrder");
  const [products, setProducts] = useState(db.getProducts(user.restaurantId));
  const [categories, setCategories] = useState(db.getCategories(user.restaurantId));
  const [orders, setOrders] = useState(db.getOrders(user.restaurantId));
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const refreshData = () => {
    setProducts(db.getProducts(user.restaurantId));
    setOrders(db.getOrders(user.restaurantId));
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item =>
      item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * (restaurant?.tax || 0) / 100;
  const serviceCharge = subtotal * (restaurant?.serviceCharge || 0) / 100;
  const total = subtotal + tax + serviceCharge;

  const handlePlaceOrder = () => {
    const order = db.createOrder({
      restaurantId: user.restaurantId,
      customerName: customerName || "Guest",
      customerPhone: customerPhone,
      items: cart,
      subtotal: subtotal,
      discount: 0,
      tax: tax,
      serviceCharge: serviceCharge,
      total: total,
      paymentMethod: paymentMethod,
      status: "NEW",
      notes: notes,
    });

    // Update stock
    cart.forEach(item => {
      const product = db.getProduct(item.productId);
      if (product) {
        db.updateProduct(product.id, { stock: product.stock - item.quantity });
      }
    });

    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "ORDER_CREATED",
      details: `Created order #${order.orderNumber}`,
    });

    db.createNotification({
      restaurantId: user.restaurantId,
      userId: null,
      title: "New Order",
      message: `New order #${order.orderNumber} received`,
      type: "ORDER",
    });

    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setShowCheckout(false);
    refreshData();
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.nameAr.includes(searchTerm);
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && p.isAvailable && p.stock > 0;
  });

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl">
              {restaurant.logo}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cashier Dashboard</h2>
              <p className="text-sm text-slate-500">{restaurant.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
              <Globe className="w-4 h-4 mr-2" />
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("")}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(p => (
                <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(p)}>
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl mb-3">
                      🍔
                    </div>
                    <h3 className="font-medium text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.nameAr}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold text-slate-900">{restaurant.currency} {p.price}</p>
                      <Badge variant="secondary">Stock: {p.stock}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  Current Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{restaurant.currency} {item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium">{restaurant.currency} {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Tax ({restaurant.tax}%)</span>
                        <span className="font-medium">{restaurant.currency} {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Service Charge ({restaurant.serviceCharge}%)</span>
                        <span className="font-medium">{restaurant.currency} {serviceCharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{restaurant.currency} {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCheckout(true)}>
                      Checkout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Checkout</DialogTitle>
            <DialogDescription>Complete the order</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Guest"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+201234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
              />
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{restaurant.currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="font-medium">{restaurant.currency} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Service Charge</span>
                <span className="font-medium">{restaurant.currency} {serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{restaurant.currency} {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} className="bg-emerald-600 hover:bg-emerald-700">
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}