import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { translate, Language } from "@/lib/i18n";
import {
  LogOut,
  Plus,
  Search,
  ShoppingBag,
  Globe,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Table2,
  RefreshCcw,
  Utensils,
  ClipboardList,
} from "lucide-react";

interface CashierDashboardProps {
  user: any;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function CashierDashboard({
  user,
  onLogout,
  lang,
  setLang,
}: CashierDashboardProps) {
  const t = (key: string) => translate(lang, key);

  const [restaurant, setRestaurant] = useState<any>(
    db.getRestaurant(user.restaurantId)
  );

  const [activeTab, setActiveTab] =
    useState("newOrder");

  const [products, setProducts] =
    useState<any[]>(
      db.getProducts(user.restaurantId)
    );

  const [categories, setCategories] =
    useState<any[]>(
      db.getCategories(user.restaurantId)
    );

  const [orders, setOrders] =
    useState<any[]>(
      db.getOrders(user.restaurantId)
    );

  const [tables, setTables] =
    useState<any[]>(
      db.getTables(user.restaurantId)
    );

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedTableId, setSelectedTableId] =
    useState("");

  const [cart, setCart] =
    useState<any[]>([]);

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  const [notes, setNotes] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isPlacingOrder, setIsPlacingOrder] =
    useState(false);

  /*
   * ============================================================
   * REFRESH ALL DATA
   * ============================================================
   */

  const refreshData = () => {
    const restaurantId =
      user.restaurantId;

    if (!restaurantId) {
      return;
    }

    setRestaurant(
      db.getRestaurant(restaurantId)
    );

    setProducts(
      db.getProducts(restaurantId)
    );

    setCategories(
      db.getCategories(restaurantId)
    );

    setOrders(
      db.getOrders(restaurantId)
    );

    setTables(
      db.getTables(restaurantId)
    );
  };

  /*
   * ============================================================
   * FIREBASE REALTIME SYNC
   * ============================================================
   */

  useEffect(() => {
    if (!user.restaurantId) {
      return;
    }

    const unsubscribe =
      db.syncRestaurantData(
        user.restaurantId,
        () => {
          refreshData();
        }
      );

    return () => {
      unsubscribe();
    };
  }, [user.restaurantId]);

  /*
   * ============================================================
   * BACKUP REFRESH
   * ============================================================
   */

  useEffect(() => {
    const interval =
      setInterval(() => {
        refreshData();
      }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [user.restaurantId]);

  /*
   * ============================================================
   * ADD PRODUCT TO CART
   * ============================================================
   */

  const addToCart = (product: any) => {
    const existing =
      cart.find(
        (item) =>
          item.productId === product.id
      );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  /*
   * ============================================================
   * REMOVE FROM CART
   * ============================================================
   */

  const removeFromCart = (
    productId: string
  ) => {
    setCart(
      cart.filter(
        (item) =>
          item.productId !== productId
      )
    );
  };

  /*
   * ============================================================
   * UPDATE QUANTITY
   * ============================================================
   */

  const updateQuantity = (
    productId: string,
    delta: number
  ) => {
    setCart(
      cart
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity:
                  Math.max(
                    0,
                    item.quantity + delta
                  ),
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  /*
   * ============================================================
   * TOTALS
   * ============================================================
   */

  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
          item.quantity,
      0
    );

  const tax =
    (subtotal *
      (restaurant?.tax || 0)) /
    100;

  const serviceCharge =
    (subtotal *
      (restaurant?.serviceCharge ||
        0)) /
    100;

  const total =
    subtotal +
    tax +
    serviceCharge;

  /*
   * ============================================================
   * PLACE NEW CASHIER ORDER
   * ============================================================
   */

  const handlePlaceOrder =
    async () => {
      if (cart.length === 0) {
        alert(
          lang === "ar"
            ? "السلة فارغة"
            : "Cart is empty"
        );

        return;
      }

      if (isPlacingOrder) {
        return;
      }

      setIsPlacingOrder(true);

      try {
        const order =
          await db.createOrderAsync({
            restaurantId:
              user.restaurantId,
            customerName:
              customerName ||
              "Walk-in Customer",
            customerPhone:
              customerPhone,
            tableId:
              selectedTableId ||
              null,
            items: cart,
            subtotal:
              subtotal,
            discount: 0,
            tax: tax,
            serviceCharge:
              serviceCharge,
            total: total,
            paymentMethod:
              paymentMethod,
            status: "NEW",
            source: "CASHIER",
            notes: notes,
          });

        /*
         * UPDATE STOCK
         */

        for (const item of cart) {
          const product =
            db.getProduct(
              item.productId
            );

          if (product) {
            db.updateProduct(
              product.id,
              {
                stock: Math.max(
                  0,
                  product.stock -
                    item.quantity
                ),
              }
            );
          }
        }

        /*
         * ACTIVITY LOG
         */

        db.addActivityLog({
          restaurantId:
            user.restaurantId,
          userId: user.id,
          userName: user.name,
          action:
            "ORDER_CREATED",
          details:
            `Created order #${order.orderNumber}`,
        });

        /*
         * NOTIFICATION
         */

        db.createNotification({
          restaurantId:
            user.restaurantId,
          userId: null,
          title: "New Order",
          message:
            `New order #${order.orderNumber} received`,
          type: "ORDER",
        });

        /*
         * RESET
         */

        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setNotes("");
        setPaymentMethod(
          "CASH"
        );
        setSelectedTableId("");
        setShowCheckout(false);

        refreshData();

        alert(
          lang === "ar"
            ? `تم إنشاء الطلب رقم ${order.orderNumber} بنجاح`
            : `Order #${order.orderNumber} created successfully!`
        );
      } catch (error: any) {
        console.error(
          "❌ Cashier order failed:",
          error
        );

        alert(
          lang === "ar"
            ? "فشل إنشاء الطلب"
            : "Failed to create order"
        );
      } finally {
        setIsPlacingOrder(false);
      }
    };

  /*
   * ============================================================
   * CHANGE ORDER STATUS
   * ============================================================
   */

  const handleOrderStatus = (
    order: any,
    status: string
  ) => {
    db.updateOrderStatus(
      order.id,
      status
    );

    db.addActivityLog({
      restaurantId:
        user.restaurantId,
      userId: user.id,
      userName: user.name,
      action:
        "ORDER_STATUS_CHANGED",
      details:
        `Order #${order.orderNumber} status changed to ${status}`,
    });

    refreshData();
  };

  /*
   * ============================================================
   * FILTER PRODUCTS
   * ============================================================
   */

  const filteredProducts =
    products.filter((p) => {
      const matchesSearch =
        p.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        p.nameAr.includes(
          searchTerm
        );

      const matchesCategory =
        !selectedCategory ||
        p.categoryId ===
          selectedCategory;

      return (
        matchesSearch &&
        matchesCategory &&
        p.isAvailable &&
        p.stock > 0
      );
    });

  /*
   * ============================================================
   * ORDER FILTERS
   * ============================================================
   */

  const newOrders =
    orders.filter(
      (o) => o.status === "NEW"
    );

  const confirmedOrders =
    orders.filter(
      (o) =>
        o.status ===
        "CONFIRMED"
    );

  const preparingOrders =
    orders.filter(
      (o) =>
        o.status ===
        "PREPARING"
    );

  const readyOrders =
    orders.filter(
      (o) =>
        o.status === "READY"
    );

  /*
   * ============================================================
   * STATUS COLORS
   * ============================================================
   */

  const getStatusClass = (
    status: string
  ) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-700";

      case "CONFIRMED":
        return "bg-purple-100 text-purple-700";

      case "PREPARING":
        return "bg-amber-100 text-amber-700";

      case "READY":
        return "bg-emerald-100 text-emerald-700";

      case "DELIVERED":
        return "bg-teal-100 text-teal-700";

      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  /*
   * ============================================================
   * RESTAURANT CHECK
   * ============================================================
   */

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Restaurant not found
      </div>
    );
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl">
              {restaurant.logo}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Cashier Dashboard
              </h2>

              <p className="text-sm text-slate-500">
                {restaurant.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                refreshData();

                setTimeout(() => {
                  setIsRefreshing(
                    false
                  );
                }, 500);
              }}
            >
              <RefreshCcw
                className={`w-4 h-4 mr-2 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLang(
                  lang === "en"
                    ? "ar"
                    : "en"
                )
              }
            >
              <Globe className="w-4 h-4 mr-2" />

              {lang === "en"
                ? "العربية"
                : "English"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />

              Logout
            </Button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TABS */}
        {/* ==================================================== */}

        <div className="flex border-t border-slate-100 px-6">
          <button
            onClick={() =>
              setActiveTab(
                "newOrder"
              )
            }
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab ===
              "newOrder"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4 inline mr-2" />

            New Order
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "orders"
              )
            }
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab ===
              "orders"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-2" />

            Orders

            {newOrders.length >
              0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs">
                {newOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "tables"
              )
            }
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab ===
              "tables"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Table2 className="w-4 h-4 inline mr-2" />

            Tables

            <span className="ml-2 text-xs text-slate-400">
              {tables.length}
            </span>
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* ==================================================== */}
        {/* NEW ORDER */}
        {/* ==================================================== */}

        {activeTab ===
          "newOrder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PRODUCTS */}

            <div className="lg:col-span-2">
              <div className="flex flex-col gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                    <Input
                      placeholder="Search products..."
                      value={
                        searchTerm
                      }
                      onChange={(e) =>
                        setSearchTerm(
                          e.target.value
                        )
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    variant={
                      selectedCategory ===
                      ""
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setSelectedCategory(
                        ""
                      )
                    }
                  >
                    All
                  </Button>

                  {categories.map(
                    (cat) => (
                      <Button
                        key={
                          cat.id
                        }
                        variant={
                          selectedCategory ===
                          cat.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setSelectedCategory(
                            cat.id
                          )
                        }
                      >
                        {cat.name}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map(
                  (p) => (
                    <Card
                      key={p.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() =>
                        addToCart(
                          p
                        )
                      }
                    >
                      <CardContent className="p-4">
                        <div className="w-full h-32 rounded-xl bg-slate-100 mb-3 overflow-hidden">
                          {p.image ? (
                            <img
                              src={
                                p.image
                              }
                              alt={
                                p.name
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              🍔
                            </div>
                          )}
                        </div>

                        <h3 className="font-medium text-slate-900">
                          {p.name}
                        </h3>

                        <p className="text-xs text-slate-500">
                          {
                            p.nameAr
                          }
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-slate-900">
                            {
                              restaurant.currency
                            }{" "}
                            {p.price}
                          </p>

                          <Badge variant="secondary">
                            Stock:{" "}
                            {
                              p.stock
                            }
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {filteredProducts.length ===
                0 && (
                <div className="text-center py-16 text-slate-400">
                  No products found
                </div>
              )}
            </div>

            {/* CART */}

            <div>
              <Card className="sticky top-32">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />

                    Current Order
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {/* TABLE */}

                  <div className="mb-4">
                    <Label>
                      Table
                    </Label>

                    <select
                      value={
                        selectedTableId
                      }
                      onChange={(e) =>
                        setSelectedTableId(
                          e.target.value
                        )
                      }
                      className="w-full mt-2 h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">
                        No Table / Takeaway
                      </option>

                      {tables
                        .filter(
                          (table) =>
                            table.qrEnabled !==
                              false
                        )
                        .map(
                          (
                            table
                          ) => (
                            <option
                              key={
                                table.id
                              }
                              value={
                                table.id
                              }
                            >
                              {
                                table.name
                              }
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  {cart.length ===
                  0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Cart is empty
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.productId
                            }
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {
                                  item.name
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  restaurant.currency
                                }{" "}
                                {
                                  item.price
                                }
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    -1
                                  )
                                }
                              >
                                <Minus className="w-3 h-3" />
                              </Button>

                              <span className="font-medium">
                                {
                                  item.quantity
                                }
                              </span>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    1
                                  )
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() =>
                                  removeFromCart(
                                    item.productId
                                  )
                                }
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      )}

                      <div className="border-t border-slate-200 pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">
                            Subtotal
                          </span>

                          <span className="font-medium">
                            {
                              restaurant.currency
                            }{" "}
                            {subtotal.toFixed(
                              2
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">
                            Tax
                          </span>

                          <span className="font-medium">
                            {
                              restaurant.currency
                            }{" "}
                            {tax.toFixed(
                              2
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">
                            Service
                          </span>

                          <span className="font-medium">
                            {
                              restaurant.currency
                            }{" "}
                            {serviceCharge.toFixed(
                              2
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between font-bold text-lg">
                          <span>
                            Total
                          </span>

                          <span>
                            {
                              restaurant.currency
                            }{" "}
                            {total.toFixed(
                              2
                            )}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() =>
                          setShowCheckout(
                            true
                          )
                        }
                      >
                        Checkout
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* ORDERS */}
        {/* ==================================================== */}

        {activeTab ===
          "orders" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Orders
                </h2>

                <p className="text-sm text-slate-500">
                  Live orders from QR, cashier and other sources
                </p>
              </div>

              <Button
                variant="outline"
                onClick={
                  refreshData
                }
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* NEW */}

            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />

                New Orders (
                {
                  newOrders.length
                }
                )
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {newOrders.map(
                  (order) => (
                    <Card
                      key={
                        order.id
                      }
                      className="border-blue-200"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg">
                              #
                              {
                                order.orderNumber
                              }
                            </h4>

                            <p className="text-xs text-slate-500">
                              {
                                order.source
                              }
                            </p>
                          </div>

                          <Badge
                            className={getStatusClass(
                              order.status
                            )}
                          >
                            {
                              order.status
                            }
                          </Badge>
                        </div>

                        {order.tableId && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <Table2 className="w-4 h-4" />

                            {
                              db.getTable(
                                order.tableId
                              )?.name
                            }
                          </div>
                        )}

                        <div className="space-y-2 mb-4">
                          {order.items.map(
                            (
                              item: any,
                              i: number
                            ) => (
                              <div
                                key={
                                  i
                                }
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {
                                    item.name
                                  }{" "}
                                  ×{" "}
                                  {
                                    item.quantity
                                  }
                                </span>

                                <span>
                                  {
                                    restaurant.currency
                                  }{" "}
                                  {(
                                    item.price *
                                    item.quantity
                                  ).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        <div className="border-t pt-3 mb-3 flex justify-between">
                          <span className="font-medium">
                            Total
                          </span>

                          <span className="font-bold text-emerald-600">
                            {
                              restaurant.currency
                            }{" "}
                            {order.total.toFixed(
                              2
                            )}
                          </span>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() =>
                            handleOrderStatus(
                              order,
                              "CONFIRMED"
                            )
                          }
                        >
                          Confirm Order
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>

            {/* CONFIRMED */}

            <div>
              <h3 className="text-lg font-bold mb-3">
                Confirmed (
                {
                  confirmedOrders.length
                }
                )
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {confirmedOrders.map(
                  (
                    order
                  ) => (
                    <Card
                      key={
                        order.id
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold">
                            #
                            {
                              order.orderNumber
                            }
                          </h4>

                          <Badge
                            className={getStatusClass(
                              order.status
                            )}
                          >
                            {
                              order.status
                            }
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          {order.items.map(
                            (
                              item: any,
                              i: number
                            ) => (
                              <div
                                key={
                                  i
                                }
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {
                                    item.name
                                  }{" "}
                                  ×{" "}
                                  {
                                    item.quantity
                                  }
                                </span>

                                <span>
                                  {
                                    restaurant.currency
                                  }{" "}
                                  {(
                                    item.price *
                                    item.quantity
                                  ).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        <Button
                          className="w-full"
                          onClick={() =>
                            handleOrderStatus(
                              order,
                              "PREPARING"
                            )
                          }
                        >
                          Start Preparing
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>

            {/* PREPARING */}

            <div>
              <h3 className="text-lg font-bold mb-3">
                Preparing (
                {
                  preparingOrders.length
                }
                )
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {preparingOrders.map(
                  (
                    order
                  ) => (
                    <Card
                      key={
                        order.id
                      }
                      className="border-amber-200"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold">
                            #
                            {
                              order.orderNumber
                            }
                          </h4>

                          <Badge
                            className={getStatusClass(
                              order.status
                            )}
                          >
                            {
                              order.status
                            }
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          {order.items.map(
                            (
                              item: any,
                              i: number
                            ) => (
                              <div
                                key={
                                  i
                                }
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {
                                    item.name
                                  }{" "}
                                  ×{" "}
                                  {
                                    item.quantity
                                  }
                                </span>

                                <span>
                                  {
                                    restaurant.currency
                                  }{" "}
                                  {(
                                    item.price *
                                    item.quantity
                                  ).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={() =>
                            handleOrderStatus(
                              order,
                              "READY"
                            )
                          }
                        >
                          Mark Ready
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>

            {/* READY */}

            <div>
              <h3 className="text-lg font-bold mb-3">
                Ready (
                {
                  readyOrders.length
                }
                )
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {readyOrders.map(
                  (
                    order
                  ) => (
                    <Card
                      key={
                        order.id
                      }
                      className="border-emerald-200"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold">
                            #
                            {
                              order.orderNumber
                            }
                          </h4>

                          <Badge
                            className={getStatusClass(
                              order.status
                            )}
                          >
                            {
                              order.status
                            }
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-500 mb-3">
                          Ready for delivery / customer pickup
                        </p>

                        <Button
                          className="w-full"
                          onClick={() =>
                            handleOrderStatus(
                              order,
                              "DELIVERED"
                            )
                          }
                        >
                          Mark Delivered
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>

            {orders.length ===
              0 && (
              <div className="text-center py-20 text-slate-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />

                <p>
                  No orders yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TABLES */}
        {/* ==================================================== */}

        {activeTab ===
          "tables" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Tables
                </h2>

                <p className="text-sm text-slate-500">
                  Restaurant tables and current status
                </p>
              </div>

              <Button
                variant="outline"
                onClick={
                  refreshData
                }
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {tables.map(
                (table) => {
                  const tableOrders =
                    orders.filter(
                      (order) =>
                        order.tableId ===
                          table.id &&
                        order.status !==
                          "COMPLETED" &&
                        order.status !==
                          "CANCELLED"
                    );

                  const hasOrders =
                    tableOrders.length >
                    0;

                  return (
                    <Card
                      key={
                        table.id
                      }
                      className={`cursor-pointer transition-all ${
                        hasOrders
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200"
                      }`}
                      onClick={() => {
                        setSelectedTableId(
                          table.id
                        );
                        setActiveTab(
                          "newOrder"
                        );
                      }}
                    >
                      <CardContent className="p-5 text-center">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 bg-slate-100 flex items-center justify-center">
                          <Table2 className="w-7 h-7 text-slate-600" />
                        </div>

                        <h3 className="font-bold text-slate-900">
                          {
                            table.name
                          }
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Table #
                          {
                            table.tableNumber
                          }
                        </p>

                        <Badge
                          variant={
                            hasOrders
                              ? "secondary"
                              : "default"
                          }
                          className="mt-3"
                        >
                          {hasOrders
                            ? `${tableOrders.length} Active`
                            : table.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>

            {tables.length ===
              0 && (
              <div className="text-center py-20 text-slate-400">
                <Table2 className="w-12 h-12 mx-auto mb-3 opacity-20" />

                <p>
                  No tables found
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ====================================================== */}
      {/* CHECKOUT */}
      {/* ====================================================== */}

      <Dialog
        open={showCheckout}
        onOpenChange={
          setShowCheckout
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Checkout
            </DialogTitle>

            <DialogDescription>
              Complete the order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* CUSTOMER NAME */}

            <div className="space-y-2">
              <Label>
                Customer Name
              </Label>

              <Input
                value={
                  customerName
                }
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                placeholder="Guest"
              />
            </div>

            {/* PHONE */}

            <div className="space-y-2">
              <Label>
                Customer Phone
              </Label>

              <Input
                value={
                  customerPhone
                }
                onChange={(e) =>
                  setCustomerPhone(
                    e.target.value
                  )
                }
                placeholder="+201234567890"
              />
            </div>

            {/* PAYMENT */}

            <div className="space-y-2">
              <Label>
                Payment Method
              </Label>

              <select
                value={
                  paymentMethod
                }
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value
                  )
                }
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="CASH">
                  Cash
                </option>

                <option value="CARD">
                  Card
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

            {/* NOTES */}

            <div className="space-y-2">
              <Label>
                Notes
              </Label>

              <Input
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="Order notes..."
              />
            </div>

            {/* TABLE */}

            <div className="space-y-2">
              <Label>
                Table
              </Label>

              <select
                value={
                  selectedTableId
                }
                onChange={(e) =>
                  setSelectedTableId(
                    e.target.value
                  )
                }
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">
                  No Table / Takeaway
                </option>

                {tables.map(
                  (table) => (
                    <option
                      key={
                        table.id
                      }
                      value={
                        table.id
                      }
                    >
                      {
                        table.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-medium">
                  {
                    restaurant.currency
                  }{" "}
                  {subtotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Tax
                </span>

                <span className="font-medium">
                  {
                    restaurant.currency
                  }{" "}
                  {tax.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Service Charge
                </span>

                <span className="font-medium">
                  {
                    restaurant.currency
                  }{" "}
                  {serviceCharge.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between font-bold text-lg">
                <span>
                  Total
                </span>

                <span>
                  {
                    restaurant.currency
                  }{" "}
                  {total.toFixed(
                    2
                  )}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setShowCheckout(
                  false
                )
              }
              disabled={
                isPlacingOrder
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                handlePlaceOrder
              }
              disabled={
                isPlacingOrder
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPlacingOrder
                ? "Creating..."
                : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}