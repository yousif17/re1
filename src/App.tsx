import { useState, useEffect } from "react";
import { LoginPage } from "@/components/LoginPage";
import { AdminDashboard } from "@/components/AdminDashboard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { ManagerDashboard } from "@/components/ManagerDashboard";
import { CashierDashboard } from "@/components/CashierDashboard";
import { KitchenDashboard } from "@/components/KitchenDashboard";
import { CustomerMenu } from "@/components/CustomerMenu";
import { db } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { Language } from "@/lib/i18n";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lang, setLang] = useState<Language>("en");
  const [customerRestaurant, setCustomerRestaurant] = useState<any>(null);

  useEffect(() => {
    // تجهيز قاعدة البيانات الافتراضية لو كانت فاضية
    if (!localStorage.getItem("restaurantos_seeded")) {
      seedDatabase();
      localStorage.setItem("restaurantos_seeded", "true");
    }

    // التحقق من وجود مستخدم مسجل دخوله مسبقاً عشان مش كل شوية يطلب منه باسورد
    const savedUser = localStorage.getItem("restaurantos_user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // التحقق هل الرابط الحالي يخص منيو عميل (QR Code) ولا يخص لوحة تحكم
    const path = window.location.pathname;
    if (path.startsWith("/m/")) {
      const slug = path.split("/")[2];
      const restaurant = db.getRestaurantBySlug(slug);
      if (restaurant) {
        setCustomerRestaurant(restaurant);
      }
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("restaurantos_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("restaurantos_user");
  };

  // 1. لو الرابط لمنيو عميل (عن طريق مسح الـ QR)، افتح المنيو فوراً بدون تسجيل دخول
  if (customerRestaurant) {
    return <CustomerMenu restaurant={customerRestaurant} lang={lang} />;
  }

  // 2. لو مفيش حد مسجل دخول، اعرض صفحة الدخول الأساسية
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} lang={lang} setLang={setLang} />;
  }

  // ==========================================
  // 🔴 نظام التوجيه الذكي وعزل الصلاحيات (RBAC)
  // ==========================================
  // النظام هنا يعمل كشرطي المرور، يقرأ "وظيفة" المستخدم ويوجهه لصفحته المعزولة فوراً
  
  switch (currentUser.role) {
    case "SUPER_ADMIN":
      // الإدارة العليا: إضافة مطاعم وتعديل الاشتراكات والتحكم الكامل
      return <AdminDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    
    case "RESTAURANT_OWNER":
      // صاحب المطعم: يرى إيرادات وإعدادات مطعمه فقط
      return <OwnerDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    
    case "MANAGER":
      // مدير الفرع: صلاحيات تشغيلية فقط
      return <ManagerDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    
    case "CASHIER":
      // الكاشير: شاشة معزولة لاستقبال الطلبات وتأكيدها بدون أرقام الإيرادات
      return <CashierDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    
    case "KITCHEN":
      // المطبخ (KDS): شاشة لعرض الطلبات المطلوبة فقط ككروت وبدون أي أسعار
      return <KitchenDashboard user={currentUser} onLogout={handleLogout} lang={lang} setLang={setLang} />;
    
    default:
      // كإجراء أمني، لو الوظيفة غير معروفة يرجعه لصفحة الدخول
      return <LoginPage onLogin={handleLogin} lang={lang} setLang={setLang} />;
  }
}