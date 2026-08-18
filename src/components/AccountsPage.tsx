import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import { translate, Language } from "@/lib/i18n";
import { DollarSign, TrendingUp, TrendingDown, Wallet, CalendarDays, Download, Printer } from "lucide-react";

interface AccountsPageProps {
  restaurantId: string;
  lang: Language;
}

export function AccountsPage({ restaurantId, lang }: AccountsPageProps) {
  const t = (key: string) => translate(lang, key);
  const restaurant = db.getRestaurant(restaurantId);
  const [period, setPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const orders = db.getOrders(restaurantId).filter(o => o.status === "COMPLETED");

  const getDateRange = () => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    switch (period) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        const day = now.getDay();
        from = new Date(now);
        from.setDate(now.getDate() - day);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        if (customFrom && customTo) {
          from = new Date(customFrom);
          to = new Date(customTo);
          to.setHours(23, 59, 59, 999);
        }
        break;
    }

    return { from, to };
  };

  const { from, to } = getDateRange();

  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= from && orderDate <= to;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCost = filteredOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum: number, item: any) => {
      const product = db.getProduct(item.productId);
      return itemSum + ((product?.costPrice || 0) * item.quantity);
    }, 0);
  }, 0);
  const netProfit = totalRevenue - totalCost;

  const paymentBreakdown = {
    CASH: filteredOrders.filter(o => o.paymentMethod === "CASH").reduce((sum, o) => sum + o.total, 0),
    CARD: filteredOrders.filter(o => o.paymentMethod === "CARD").reduce((sum, o) => sum + o.total, 0),
    OTHER: filteredOrders.filter(o => o.paymentMethod === "OTHER").reduce((sum, o) => sum + o.total, 0),
  };

  // Group by day for chart
  const salesByDay: { [key: string]: number } = {};
  filteredOrders.forEach(o => {
    const day = new Date(o.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
    salesByDay[day] = (salesByDay[day] || 0) + o.total;
  });

  // Top products
  const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
  filteredOrders.forEach(o => {
    o.items.forEach((item: any) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const exportCSV = () => {
    const headers = [t("orderNumber"), t("date"), t("customer"), t("items"), t("total"), t("paymentMethod")];
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString(),
      o.customerName,
      o.items.length,
      o.total.toFixed(2),
      o.paymentMethod
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("dateRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="week">{t("thisWeek")}</SelectItem>
              <SelectItem value="month">{t("thisMonth")}</SelectItem>
              <SelectItem value="year">{t("thisYear")}</SelectItem>
              <SelectItem value="custom">{t("custom")}</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <span className="text-slate-500">{t("to")}</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            {t("export")}
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="w-4 h-4 mr-2" />
            {t("print")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">{t("totalIncome")}</p>
                <p className="text-3xl font-bold mt-1">{restaurant?.currency} {totalRevenue.toFixed(2)}</p>
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
                <p className="text-sm text-slate-500">{t("totalExpenses")}</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">{restaurant?.currency} {totalCost.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t("netProfit")}</p>
                <p className={`text-3xl font-bold mt-1 ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {restaurant?.currency} {netProfit.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t("transactions")}</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">{filteredOrders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("paymentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600">{t("cash")}</span>
                <span className="font-bold text-slate-900">{restaurant?.currency} {paymentBreakdown.CASH.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600">{t("card")}</span>
                <span className="font-bold text-slate-900">{restaurant?.currency} {paymentBreakdown.CARD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600">{t("other")}</span>
                <span className="font-bold text-slate-900">{restaurant?.currency} {paymentBreakdown.OTHER.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Day */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t("salesByDay")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(salesByDay).map(([day, amount]) => (
                <div key={day} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-600">{day}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(amount / Math.max(...Object.values(salesByDay))) * 100}%` }}
                      />
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{restaurant?.currency} {amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("topProducts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">{t("productName")}</th>
                  <th className="pb-3 font-medium">{t("items")}</th>
                  <th className="pb-3 font-medium">{t("revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3 text-slate-600">{p.quantity}</td>
                    <td className="py-3 font-medium text-emerald-600">{restaurant?.currency} {p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("transactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">{t("orderNumber")}</th>
                  <th className="pb-3 font-medium">{t("date")}</th>
                  <th className="pb-3 font-medium">{t("customer")}</th>
                  <th className="pb-3 font-medium">{t("items")}</th>
                  <th className="pb-3 font-medium">{t("total")}</th>
                  <th className="pb-3 font-medium">{t("paymentMethod")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice().reverse().map(o => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">#{o.orderNumber}</td>
                    <td className="py-3 text-slate-600">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-slate-600">{o.customerName}</td>
                    <td className="py-3 text-slate-600">{o.items.length}</td>
                    <td className="py-3 font-medium text-slate-900">{restaurant?.currency} {o.total.toFixed(2)}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{o.paymentMethod}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}