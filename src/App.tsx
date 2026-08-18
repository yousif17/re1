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
  const [customerRestaurant, setCustomerRestaurant] =
    useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // تحميل البيانات من Firebase
        const hasData = await db.initializeFromFirebase();

        // لو Firebase فاضي، نعمل Seed مرة واحدة
        if (!hasData) {
          console.log(
            "ℹ️ No Firebase data found. Creating demo data..."
          );

          await db.seed();

          // بعد الـseed نعيد تحميل البيانات
          await db.initializeFromFirebase();
        }

        // =====================================================
        // ADMIN LOGIN
        // =====================================================

        const savedUser =
          localStorage.getItem("restaurantos_user");

        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (error) {
            console.error(
              "Invalid saved user:",
              error
            );

            localStorage.removeItem(
              "restaurantos_user"
            );
          }
        }

        // =====================================================
        // PUBLIC CUSTOMER MENU
        // =====================================================

        const path =
          window.location.pathname;

        if (path.startsWith("/m/")) {
          const parts = path.split("/");
          const slug = parts[2];

          if (slug) {
            const restaurant =
              db.getRestaurantBySlug(slug);

            if (restaurant) {
              console.log(
                "✅ Public restaurant found:",
                restaurant.name
              );

              setCustomerRestaurant(
                restaurant
              );
            } else {
              console.error(
                "❌ Restaurant not found:",
                slug
              );

              console.log(
                "Available restaurants:",
                db.getRestaurants()
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "❌ Application initialization failed:",
          error
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // ============================================================
  // REAL-TIME FIREBASE SYNC
  // ============================================================

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    const activeRestaurantId =
      customerRestaurant?.id ||
      currentUser?.restaurantId;

    if (!activeRestaurantId) {
      return;
    }

    const unsubscribe =
      db.syncRestaurantData(
        activeRestaurantId,
        () => {
          console.log(
            "🔄 Restaurant data updated"
          );

          // إعادة الرسم
          if (currentUser) {
            setCurrentUser({
              ...currentUser,
            });
          }

          if (customerRestaurant) {
            const updatedRestaurant =
              db.getRestaurant(
                customerRestaurant.id
              );

            if (updatedRestaurant) {
              setCustomerRestaurant(
                updatedRestaurant
              );
            }
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    customerRestaurant?.id,
    currentUser?.id,
    isInitializing,
  ]);

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = (user: any) => {
    setCurrentUser(user);

    localStorage.setItem(
      "restaurantos_user",
      JSON.stringify(user)
    );
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    setCurrentUser(null);

    localStorage.removeItem(
      "restaurantos_user"
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />

        <p className="text-slate-600 font-medium text-lg">
          Connecting to Cloud Server...
        </p>
      </div>
    );
  }

  // ============================================================
  // PUBLIC MENU
  // IMPORTANT:
  // CUSTOMER DOES NOT NEED LOGIN
  // ============================================================

  if (customerRestaurant) {
    return (
      <CustomerMenu
        restaurant={customerRestaurant}
        lang={lang}
      />
    );
  }

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  // ============================================================
  // DASHBOARDS
  // ============================================================

  switch (currentUser.role) {
    case "SUPER_ADMIN":
      return (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          setLang={setLang}
        />
      );

    case "RESTAURANT_OWNER":
      return (
        <OwnerDashboard
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          setLang={setLang}
        />
      );

    case "MANAGER":
      return (
        <ManagerDashboard
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          setLang={setLang}
        />
      );

    case "CASHIER":
      return (
        <CashierDashboard
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          setLang={setLang}
        />
      );

    case "KITCHEN":
      return (
        <KitchenDashboard
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          setLang={setLang}
        />
      );

    default:
      return (
        <LoginPage
          onLogin={handleLogin}
          lang={lang}
          setLang={setLang}
        />
      );
  }
}