import { useState, useEffect } from "react";
import { LoginPage } from "@/components/LoginPage";
import { AdminDashboard } from "@/components/AdminDashboard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { ManagerDashboard } from "@/components/ManagerDashboard";
import { CashierDashboard } from "@/components/CashierDashboard";
import { KitchenDashboard } from "@/components/KitchenDashboard";
import { CustomerMenu } from "@/components/CustomerMenu";
import { db } from "@/lib/db";
import { Language } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lang, setLang] = useState<Language>("en");
  const [customerRestaurant, setCustomerRestaurant] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // 1. مزامنة وتحميل البيانات من السيرفر السحابي (Firebase) لأي جهاز جديد
      const hasData = await db.initializeFromFirebase();
      
      if (!hasData && !localStorage.getItem("restaurantos_seeded")) {
        db.seed();
        localStorage.setItem("restaurantos_seeded", "true");
      }

      // 2. التحقق من وجود مستخدم مسجل الدخول
      const savedUser = localStorage.getItem("restaurantos_user");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }

      // 3. التحقق من رابط العميل (لو عمل Scan للـ QR Code)
      const path = window.location.pathname;
      if (path.startsWith("/m/")) {
        const slug = path.split("/")[2];
        const restaurant = db.getRestaurantBySlug(slug);
        if (restaurant) {
          setCustomerRestaurant(restaurant);
        }
      }

      setIsInitializing(false);
    };
    
    init();
  }, []);

  // 4. السحر هنا: اتصال حي (Real-time) مع Firebase
  // أي طلب هيتعمل من موبايل هيسمّع هنا فوراً ويحدث شاشات الإدارة والمطبخ
  useEffect(() => {
    let unsubscribe = () => {};
    const activeRestaurantId = customerRestaurant?.id || currentUser?.restaurantId;
    
    if (activeRestaurantId && !isInitializing) {
       unsubscribe = db.syncRestaurantData(activeRestaurantId, () => {
          // خدعة برمجية قوية لإجبار جميع الشاشات (كاشير/مطبخ) على التحديث فور وصول الأوردر
          if (currentUser) setCurrentUser({ ...currentUser });
          if (customerRestaurant) setCustomerRestaurant({ ...customerRestaurant });
       });
    }
    return () => unsubscribe();
  }, [customerRestaurant?.id, currentUser?.id, isInitializing]);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("restaurantos_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("restaurantos_user");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-600 font-medium text-lg">Connecting to Cloud Server...</p>
      </div>
    );
  }

  // Route: شاشة منيو العميل (QR Code)
  if (customerRestaurant) {
    return <CustomerMenu restaurant={customerRestaurant} lang={lang} />;
  }

  // Route: صفحة تسجيل الدخول
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} lang={lang} setLang={setLang} />;
  }

  // Route: نظام توجيه الصلاحيات (عزل الشاشات)
  switch (currentUser.role) {
    case "SUPER_ADMIN":
      return <AdminDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    case "RESTAURANT_OWNER":
      return <OwnerDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    case "MANAGER":
      return <ManagerDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    case "CASHIER":
      return <CashierDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    case "KITCHEN":
      return <KitchenDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    default:
      return <LoginPage onLogin={handleLogin} lang={lang} setLang={setLang} />;
  }
}