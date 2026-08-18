import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { Language } from "@/lib/i18n";
import { ShoppingBag, Plus, Minus, X, Phone, MapPin, Clock, ImageIcon, ChevronRight } from "lucide-react";

interface CustomerMenuProps {
  restaurant: any;
  lang: Language;
}

export function CustomerMenu({ restaurant, lang }: CustomerMenuProps) {
  const [categories, setCategories] = useState(db.getCategories(restaurant.id));
  const [products, setProducts] = useState(db.getProducts(restaurant.id));
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

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
  const tax = subtotal * (restaurant.tax || 0) / 100;
  const serviceCharge = subtotal * (restaurant.serviceCharge || 0) / 100;
  const total = subtotal + tax + serviceCharge;

  const filteredProducts = products.filter(p =>
    (!selectedCategory || p.categoryId === selectedCategory) && p.isAvailable && p.stock > 0
  );

  const handlePlaceOrder = () => {
    const order = db.createOrder({
      restaurantId: restaurant.id,
      customerName: customerName || "Guest",
      customerPhone: customerPhone,
      items: cart,
      subtotal: subtotal,
      discount: 0,
      tax: tax,
      serviceCharge: serviceCharge,
      total: total,
      paymentMethod: "CASH",
      status: "NEW",
      notes: "",
    });

    cart.forEach(item => {
      const product = db.getProduct(item.productId);
      if (product) {
        db.updateProduct(product.id, { stock: product.stock - item.quantity });
      }
    });

    db.createNotification({
      restaurantId: restaurant.id,
      userId: null,
      title: "New Order",
      message: `New order #${order.orderNumber} received`,
      type: "ORDER",
    });

    setCart([]);
    setShowCart(false);
    setShowCheckout(false);
    setCustomerName("");
    setCustomerPhone("");
    alert(`Order #${order.orderNumber} placed successfully!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {restaurant.logo || restaurant.name.charAt(0)}
            </div>
            <h1 className="text-lg font-bold text-slate-900 truncate max-w-[150px] md:max-w-md">
              {restaurant.name}
            </h1>
          </div>
          <Button
            variant="ghost"
            className="relative hidden md:flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            onClick={() => setShowCart(true)}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-semibold">Cart</span>
            {cart.length > 0 && (
              <span className="absolute 1 top-1.5 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Restaurant Info Banner */}
      <div className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-400 via-slate-900 to-slate-900"></div>
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <p className="mt-1 text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
            {restaurant.description}
          </p>
          <div className="flex flex-wrap gap-y-2 gap-x-6 mt-5 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> {restaurant.phone}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {restaurant.city}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> {restaurant.openingHours} - {restaurant.closingHours}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Categories Filter */}
      <div className="sticky top-16 z-10 bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              className={`rounded-full px-5 whitespace-nowrap transition-all ${selectedCategory === "" ? "bg-emerald-600 hover:bg-emerald-700 shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setSelectedCategory("")}
            >
              {lang === 'ar' ? 'الكل' : 'All Menu'}
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className={`rounded-full px-5 whitespace-nowrap transition-all ${selectedCategory === cat.id ? "bg-emerald-600 hover:bg-emerald-700 shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {lang === 'en' ? cat.name : cat.nameAr}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(p => (
            <Card key={p.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardContent className="p-0">
                <div className="flex md:flex-col h-full">
                  {/* Image Placeholder */}
                  <div className="w-28 md:w-full md:h-40 bg-slate-100 shrink-0 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-200/50 group-hover:bg-transparent transition-colors"></div>
                    <ImageIcon className="w-8 h-8 opacity-50 mb-1" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">No Image</span>
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 p-3.5 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">
                        {lang === 'en' ? p.name : p.nameAr}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {lang === 'en' ? p.description : p.descriptionAr}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="font-black text-emerald-600 text-lg">
                        {restaurant.currency} {p.price}
                      </p>
                      <Button
                        size="sm"
                        className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-0 shadow-none font-bold rounded-xl transition-colors h-9 px-4"
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="w-4 h-4 mr-1 md:mr-0 lg:mr-1" />
                        <span className="md:hidden lg:inline">{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{lang === 'ar' ? 'لا توجد منتجات في هذا القسم' : 'No products found in this category'}</p>
          </div>
        )}
      </div>

      {/* Floating Mobile Cart Bar */}
      {cart.length > 0 && !showCart && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-30 md:hidden animate-in slide-in-from-bottom-5">
          <Button 
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-between px-6 shadow-lg shadow-emerald-600/30"
            onClick={() => setShowCart(true)}
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-lg font-bold text-sm">
                {cart.length}
              </span>
              <span className="font-semibold text-base">{lang === 'ar' ? 'عرض السلة' : 'View Cart'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{restaurant.currency} {total.toFixed(2)}</span>
              <ChevronRight className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </div>
          </Button>
        </div>
      )}

      {/* Cart Drawer/Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md md:rounded-2xl rounded-t-3xl p-6 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{lang === 'ar' ? 'سلة الطلبات' : 'Your Order'}</h2>
                <p className="text-sm text-slate-500 mt-1">{cart.length} {lang === 'ar' ? 'عناصر' : 'items'}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 hover:bg-slate-100" onClick={() => setShowCart(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] scrollbar-hide space-y-4 pr-1">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <ShoppingBag className="w-16 h-16 opacity-20" />
                  <p>{lang === 'ar' ? 'السلة فارغة' : 'Your cart is empty'}</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex flex-col gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full -mt-1 -mr-1" onClick={() => removeFromCart(item.productId)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-emerald-600">{restaurant.currency} {(item.price * item.quantity).toFixed(2)}</p>
                      <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm text-slate-600" onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-bold w-4 text-center text-slate-800">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm text-emerald-600" onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-100 mt-6 pt-5 bg-white space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span className="font-medium text-slate-700">{restaurant.currency} {subtotal.toFixed(2)}</span>
                </div>
                {(tax > 0) && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{lang === 'ar' ? 'الضريبة' : 'Tax'} ({restaurant.tax}%)</span>
                    <span className="font-medium text-slate-700">{restaurant.currency} {tax.toFixed(2)}</span>
                  </div>
                )}
                {(serviceCharge > 0) && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{lang === 'ar' ? 'الخدمة' : 'Service'} ({restaurant.serviceCharge}%)</span>
                    <span className="font-medium text-slate-700">{restaurant.currency} {serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2 pb-4">
                  <span className="font-bold text-slate-900">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="font-black text-2xl text-emerald-600">{restaurant.currency} {total.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20"
                  onClick={() => setShowCheckout(true)}
                >
                  {lang === 'ar' ? 'تأكيد الطلب' : 'Proceed to Checkout'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'إتمام الطلب' : 'Checkout'}</h2>
              <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'يرجى إدخال بياناتك لتأكيد الطلب' : 'Please enter your details to confirm'}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسمك الكريم' : 'Your name'}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={lang === 'ar' ? 'رقم للتواصل' : 'Phone number'}
                />
              </div>
              
              <div className="bg-emerald-50 p-4 rounded-xl mt-6 flex justify-between items-center">
                <span className="font-bold text-emerald-900">{lang === 'ar' ? 'الإجمالي المطلوب' : 'Total to Pay'}</span>
                <span className="font-black text-xl text-emerald-700">{restaurant.currency} {total.toFixed(2)}</span>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold" onClick={() => setShowCheckout(false)}>
                  {lang === 'ar' ? 'رجوع' : 'Back'}
                </Button>
                <Button className="flex-[2] h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold" onClick={handlePlaceOrder}>
                  {lang === 'ar' ? 'إرسال الطلب' : 'Confirm Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}