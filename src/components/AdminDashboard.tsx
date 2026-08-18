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
  LayoutDashboard, Store, Users, CreditCard, Activity, LogOut,
  Plus, Search, AlertTriangle, Clock, CheckCircle2,
  Building2, DollarSign, ShoppingBag, Eye, Ban, RefreshCcw, Globe
} from "lucide-react";

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function AdminDashboard({ user, onLogout, lang, setLang }: AdminDashboardProps) {
  const t = (key: string) => translate(lang, key);
  const [activeTab, setActiveTab] = useState("overview");
  const [restaurants, setRestaurants] = useState(db.getRestaurants());
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    currency: "EGP",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",
    plan: "PRO",
    duration: "1",
    durationType: "months",
  });

  const refreshData = () => {
    setRestaurants(db.getRestaurants());
  };

  const handleCreateRestaurant = () => {
    const slug = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (db.getRestaurantBySlug(slug)) {
      alert("Restaurant slug already exists. Please choose another.");
      return;
    }

    const restaurant = db.createRestaurant({
      name: formData.name,
      slug: slug,
      logo: "🍽️",
      cover: "",
      description: formData.description,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      currency: formData.currency,
      timeZone: "Africa/Cairo",
      status: "ACTIVE",
      tax: 14,
      serviceCharge: 10,
      openingHours: "10:00",
      closingHours: "23:00",
    });

    db.createUser({
      name: formData.ownerName,
      email: formData.ownerEmail,
      password: formData.ownerPassword,
      phone: formData.ownerPhone,
      role: "RESTAURANT_OWNER",
      restaurantId: restaurant.id,
      status: "ACTIVE",
    });

    const startDate = new Date();
    const endDate = new Date();
    if (formData.durationType === "months") {
      endDate.setMonth(endDate.getMonth() + parseInt(formData.duration));
    } else {
      endDate.setDate(endDate.getDate() + parseInt(formData.duration));
    }

    db.createSubscription({
      restaurantId: restaurant.id,
      plan: formData.plan,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "ACTIVE",
    });

    db.addActivityLog({
      restaurantId: restaurant.id,
      userId: user.id,
      userName: user.name,
      action: "RESTAURANT_CREATED",
      details: `Admin created restaurant ${restaurant.name}`,
    });

    db.createNotification({
      restaurantId: restaurant.id,
      userId: null,
      title: "Restaurant Created",
      message: `${restaurant.name} has been created successfully`,
      type: "SYSTEM",
    });

    setShowCreateRestaurant(false);
    setFormData({
      name: "", slug: "", description: "", phone: "", email: "",
      address: "", city: "", country: "", currency: "EGP",
      ownerName: "", ownerEmail: "", ownerPassword: "", ownerPhone: "",
      plan: "PRO", duration: "1", durationType: "months",
    });
    refreshData();
  };

  const handleRestaurantAction = (action: string, restaurant: any) => {
    switch (action) {
      case "view":
        setSelectedRestaurant(restaurant);
        setShowDetails(true);
        break;
      case "suspend":
        db.updateRestaurant(restaurant.id, { status: "SUSPENDED" });
        db.addActivityLog({
          restaurantId: restaurant.id,
          userId: user.id,
          userName: user.name,
          action: "RESTAURANT_SUSPENDED",
          details: `Admin suspended restaurant ${restaurant.name}`,
        });
        refreshData();
        break;
      case "activate":
        db.updateRestaurant(restaurant.id, { status: "ACTIVE" });
        db.addActivityLog({
          restaurantId: restaurant.id,
          userId: user.id,
          userName: user.name,
          action: "RESTAURANT_ACTIVATED",
          details: `Admin activated restaurant ${restaurant.name}`,
        });
        refreshData();
        break;
      case "delete":
        if (confirm(`Are you sure you want to delete ${restaurant.name}?`)) {
          db.deleteRestaurant(restaurant.id);
          db.addActivityLog({
            restaurantId: restaurant.id,
            userId: user.id,
            userName: user.name,
            action: "RESTAURANT_DELETED",
            details: `Admin deleted restaurant ${restaurant.name}`,
          });
          refreshData();
        }
        break;
    }
  };

  const extendSubscription = (restaurant: any) => {
    const days = prompt("Enter number of days to extend:", "30");
    if (!days) return;
    const sub = db.getSubscriptionByRestaurant(restaurant.id);
    if (sub) {
      const newEndDate = new Date(sub.endDate);
      newEndDate.setDate(newEndDate.getDate() + parseInt(days));
      db.updateSubscription(sub.id, { endDate: newEndDate.toISOString() });
      db.addActivityLog({
        restaurantId: restaurant.id,
        userId: user.id,
        userName: user.name,
        action: "SUBSCRIPTION_EXTENDED",
        details: `Admin extended subscription by ${days} days`,
      });
      refreshData();
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalRestaurants: restaurants.length,
    activeRestaurants: restaurants.filter(r => r.status === "ACTIVE").length,
    expiredRestaurants: restaurants.filter(r => r.status === "EXPIRED").length,
    suspendedRestaurants: restaurants.filter(r => r.status === "SUSPENDED").length,
    totalUsers: db.getUsers().length,
    totalOrders: restaurants.reduce((sum, r) => sum + db.getOrders(r.id).length, 0),
    totalRevenue: restaurants.reduce((sum, r) => sum + db.getRestaurantRevenue(r.id), 0),
  };

  const recentActivity = db.getActivityLogs().slice(-5).reverse();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">RestaurantOS</h1>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "restaurants" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Store className="w-4 h-4" />
            Restaurants
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "users" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "subscriptions" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <CreditCard className="w-4 h-4" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "activity" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Activity className="w-4 h-4" />
            Activity Log
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
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
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Admin Dashboard</h2>
              <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateRestaurant(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Restaurant
              </Button>
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
                        <p className="text-sm text-emerald-100">Total Restaurants</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalRestaurants}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Store className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Active Restaurants</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.activeRestaurants}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Revenue</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">${stats.totalRevenue.toFixed(2)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Orders</p>
                        <p className="text-3xl font-bold mt-1 text-slate-900">{stats.totalOrders}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Expiring Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {restaurants.map(r => {
                        const days = db.getDaysRemaining(r.id);
                        if (days > 7) return null;
                        return (
                          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <div>
                              <p className="font-medium text-slate-900">{r.name}</p>
                              <p className="text-sm text-amber-700">Expires in {days} days</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-700 border-amber-300 hover:bg-amber-100"
                              onClick={() => extendSubscription(r)}
                            >
                              Extend
                            </Button>
                          </div>
                        );
                      })}
                      {restaurants.every(r => db.getDaysRemaining(r.id) > 7) && (
                        <p className="text-sm text-slate-500 text-center py-4">No subscriptions expiring soon</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{log.action}</p>
                            <p className="text-xs text-slate-500">{log.details}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Restaurants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Restaurants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="pb-3 font-medium">Restaurant</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Subscription</th>
                          <th className="pb-3 font-medium">Days Left</th>
                          <th className="pb-3 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurants.slice(0, 5).map(r => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                                  {r.logo}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{r.name}</p>
                                  <p className="text-xs text-slate-500">{r.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge variant={r.status === "ACTIVE" ? "default" : r.status === "SUSPENDED" ? "destructive" : "secondary"}>
                                {r.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-slate-600">{db.getSubscriptionByRestaurant(r.id)?.plan || "N/A"}</td>
                            <td className="py-3">
                              <span className={`font-medium ${db.getDaysRemaining(r.id) <= 7 ? "text-amber-600" : "text-slate-900"}`}>
                                {db.getDaysRemaining(r.id)} days
                              </span>
                            </td>
                            <td className="py-3 font-medium text-slate-900">${db.getRestaurantRevenue(r.id).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "restaurants" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search restaurants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowCreateRestaurant(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Restaurant
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                          <th className="p-4 font-medium">Restaurant</th>
                          <th className="p-4 font-medium">Owner</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Subscription</th>
                          <th className="p-4 font-medium">Days Left</th>
                          <th className="p-4 font-medium">Employees</th>
                          <th className="p-4 font-medium">Orders</th>
                          <th className="p-4 font-medium">Revenue</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRestaurants.map(r => {
                          const owner = db.getUsersByRestaurant(r.id).find(u => u.role === "RESTAURANT_OWNER");
                          const employees = db.getEmployees(r.id).length;
                          const orders = db.getOrders(r.id).length;
                          const revenue = db.getRestaurantRevenue(r.id);
                          const daysLeft = db.getDaysRemaining(r.id);
                          return (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                                    {r.logo}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{r.name}</p>
                                    <p className="text-xs text-slate-500">/{r.slug}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className="text-slate-900">{owner?.name || "N/A"}</p>
                                <p className="text-xs text-slate-500">{owner?.email || ""}</p>
                              </td>
                              <td className="p-4">
                                <Badge variant={r.status === "ACTIVE" ? "default" : r.status === "SUSPENDED" ? "destructive" : "secondary"}>
                                  {r.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-slate-600">{db.getSubscriptionByRestaurant(r.id)?.plan || "N/A"}</td>
                              <td className="p-4">
                                <span className={`font-medium ${daysLeft <= 7 ? "text-amber-600" : "text-slate-900"}`}>
                                  {daysLeft} days
                                </span>
                              </td>
                              <td className="p-4 text-slate-600">{employees}</td>
                              <td className="p-4 text-slate-600">{orders}</td>
                              <td className="p-4 font-medium text-slate-900">${revenue.toFixed(2)}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => handleRestaurantAction("view", r)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => extendSubscription(r)}>
                                    <Clock className="w-4 h-4" />
                                  </Button>
                                  {r.status === "ACTIVE" ? (
                                    <Button size="sm" variant="ghost" className="text-amber-600" onClick={() => handleRestaurantAction("suspend", r)}>
                                      <Ban className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleRestaurantAction("activate", r)}>
                                      <RefreshCcw className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">User</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Restaurant</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.getUsers().map(u => {
                        const restaurant = u.restaurantId ? db.getRestaurant(u.restaurantId) : null;
                        return (
                          <tr key={u.id} className="border-b border-slate-100">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{u.name}</p>
                                  <p className="text-xs text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge variant="secondary">{u.role}</Badge>
                            </td>
                            <td className="py-3 text-slate-600">{restaurant?.name || "Platform"}</td>
                            <td className="py-3">
                              <Badge variant={u.status === "ACTIVE" ? "default" : "destructive"}>{u.status}</Badge>
                            </td>
                            <td className="py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscriptions" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Restaurant</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Start Date</th>
                        <th className="pb-3 font-medium">End Date</th>
                        <th className="pb-3 font-medium">Days Left</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.map(r => {
                        const sub = db.getSubscriptionByRestaurant(r.id);
                        if (!sub) return null;
                        const daysLeft = db.getDaysRemaining(r.id);
                        return (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-3 font-medium text-slate-900">{r.name}</td>
                            <td className="py-3">
                              <Badge variant="secondary">{sub.plan}</Badge>
                            </td>
                            <td className="py-3 text-slate-600">{new Date(sub.startDate).toLocaleDateString()}</td>
                            <td className="py-3 text-slate-600">{new Date(sub.endDate).toLocaleDateString()}</td>
                            <td className="py-3">
                              <span className={`font-medium ${daysLeft <= 7 ? "text-amber-600" : "text-slate-900"}`}>
                                {daysLeft} days
                              </span>
                            </td>
                            <td className="py-3">
                              <Badge variant={daysLeft <= 7 ? "secondary" : "default"}>
                                {daysLeft <= 7 ? "EXPIRING_SOON" : "ACTIVE"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "activity" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {db.getActivityLogs().reverse().map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">{log.userName}</p>
                          <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{log.action}</p>
                        <p className="text-xs text-slate-500">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateRestaurant} onOpenChange={setShowCreateRestaurant}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Restaurant</DialogTitle>
            <DialogDescription>
              Set up a new restaurant with owner account and subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Restaurant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Burger House"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    placeholder="burger-house"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Restaurant description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+201234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@restaurant.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cairo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Egypt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="EGP">EGP - Egyptian Pound</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Owner Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Ahmed Hassan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Email</Label>
                  <Input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="owner@restaurant.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Password</Label>
                  <Input
                    type="password"
                    value={formData.ownerPassword}
                    onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Phone</Label>
                  <Input
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="+201234567890"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Subscription</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })}>
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="PREMIUM">Premium</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration Type</Label>
                  <Select value={formData.durationType} onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRestaurant(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRestaurant} className="bg-emerald-600 hover:bg-emerald-700">
              Create Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restaurant Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRestaurant && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedRestaurant.name}</DialogTitle>
                <DialogDescription>
                  Restaurant details and management
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Restaurant Information</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>Email: {selectedRestaurant.email}</p>
                      <p>Phone: {selectedRestaurant.phone}</p>
                      <p>Address: {selectedRestaurant.address}, {selectedRestaurant.city}</p>
                      <p>Currency: {selectedRestaurant.currency}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Subscription</p>
                    {(() => {
                      const sub = db.getSubscriptionByRestaurant(selectedRestaurant.id);
                      if (!sub) return <p className="mt-2 text-sm text-slate-600">No subscription</p>;
                      return (
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>Plan: {sub.plan}</p>
                          <p>Start: {new Date(sub.startDate).toLocaleDateString()}</p>
                          <p>End: {new Date(sub.endDate).toLocaleDateString()}</p>
                          <p>Days Left: {db.getDaysRemaining(selectedRestaurant.id)}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-emerald-50">
                    <p className="text-2xl font-bold text-emerald-600">{db.getOrders(selectedRestaurant.id).length}</p>
                    <p className="text-sm text-slate-600">Total Orders</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50">
                    <p className="text-2xl font-bold text-blue-600">${db.getRestaurantRevenue(selectedRestaurant.id).toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Revenue</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-600">{db.getEmployees(selectedRestaurant.id).length}</p>
                    <p className="text-sm text-slate-600">Employees</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50">
                    <p className="text-2xl font-bold text-purple-600">{db.getProducts(selectedRestaurant.id).length}</p>
                    <p className="text-sm text-slate-600">Products</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}