import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { translate, Language } from "@/lib/i18n";
import { LogOut, Globe, Clock, CheckCircle2, ChefHat, AlertTriangle } from "lucide-react";

interface KitchenDashboardProps {
  user: any;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function KitchenDashboard({ user, onLogout, lang, setLang }: KitchenDashboardProps) {
  const t = (key: string) => translate(lang, key);
  const restaurant = db.getRestaurant(user.restaurantId);
  const [orders, setOrders] = useState(db.getOrders(user.restaurantId));
  const [timers, setTimers] = useState<Record<string, number>>({});

  const refreshData = () => {
    setOrders(db.getOrders(user.restaurantId));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = { ...prev };
        orders.forEach(o => {
          if (o.status === "NEW" || o.status === "PREPARING") {
            const created = new Date(o.createdAt).getTime();
            const elapsed = Math.floor((Date.now() - created) / 1000);
            newTimers[o.id] = elapsed;
          }
        });
        return newTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const handleStatusChange = (orderId: string, status: string) => {
    db.updateOrderStatus(orderId, status);
    db.addActivityLog({
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action: "ORDER_STATUS_CHANGED",
      details: `Order ${orderId} status changed to ${status}`,
    });
    refreshData();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const newOrders = orders.filter(o => o.status === "NEW");
  const preparingOrders = orders.filter(o => o.status === "PREPARING");
  const readyOrders = orders.filter(o => o.status === "READY");
  const completedOrders = orders.filter(o => o.status === "COMPLETED");

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Kitchen Dashboard</h2>
              <p className="text-sm text-slate-400">{restaurant.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="text-white border-slate-700 hover:bg-slate-800" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
              <Globe className="w-4 h-4 mr-2" />
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="outline" size="sm" className="text-white border-slate-700 hover:bg-slate-800" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* New Orders */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              New Orders ({newOrders.length})
            </h3>
            <div className="space-y-4">
              {newOrders.map(order => (
                <Card key={order.id} className="border-red-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg text-slate-900">#{order.orderNumber}</h4>
                      <Badge variant="destructive">NEW</Badge>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-700">{item.name} × {item.quantity}</span>
                          <span className="text-slate-500">{restaurant.currency} {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded mb-3">
                        📝 {order.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="text-sm font-mono font-bold text-red-600">
                        {formatTime(timers[order.id] || 0)}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleStatusChange(order.id, "PREPARING")}
                    >
                      Start Preparing
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {newOrders.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No new orders</p>
              )}
            </div>
          </div>

          {/* Preparing */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Preparing ({preparingOrders.length})
            </h3>
            <div className="space-y-4">
              {preparingOrders.map(order => {
                const elapsed = timers[order.id] || 0;
                const isDelayed = elapsed > 900; // 15 minutes
                return (
                  <Card key={order.id} className={`border-amber-200 shadow-lg ${isDelayed ? 'border-red-400' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-lg text-slate-900">#{order.orderNumber}</h4>
                        <Badge variant="secondary">PREPARING</Badge>
                      </div>
                      <div className="space-y-2 mb-3">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-700">{item.name} × {item.quantity}</span>
                            <span className="text-slate-500">{restaurant.currency} {item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded mb-3">
                          📝 {order.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-2">
                          {isDelayed && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Delayed
                            </Badge>
                          )}
                          <span className={`text-sm font-mono font-bold ${isDelayed ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatTime(elapsed)}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        onClick={() => handleStatusChange(order.id, "READY")}
                      >
                        Mark as Ready
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {preparingOrders.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No orders preparing</p>
              )}
            </div>
          </div>

          {/* Ready */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Ready ({readyOrders.length})
            </h3>
            <div className="space-y-4">
              {readyOrders.map(order => (
                <Card key={order.id} className="border-emerald-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg text-slate-900">#{order.orderNumber}</h4>
                      <Badge className="bg-emerald-500">READY</Badge>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-700">{item.name} × {item.quantity}</span>
                          <span className="text-slate-500">{restaurant.currency} {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-600">
                        {formatTime(timers[order.id] || 0)}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleStatusChange(order.id, "COMPLETED")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {readyOrders.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No ready orders</p>
              )}
            </div>
          </div>

          {/* Completed */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
              Completed ({completedOrders.length})
            </h3>
            <div className="space-y-4">
              {completedOrders.slice(-5).reverse().map(order => (
                <Card key={order.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">#{order.orderNumber}</h4>
                      <Badge variant="secondary">COMPLETED</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {completedOrders.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No completed orders</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}