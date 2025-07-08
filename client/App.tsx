import "./global.css";

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import CustomerDashboard from "./pages/CustomerDashboard";
import BarberDashboard from "./pages/BarberDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationService from "./components/NotificationService";
import NotificationsCenter from "./pages/NotificationsCenter";
import MessagesPage from "./pages/MessagesPage";
import LocationPermissionDialog from "./components/LocationPermissionDialog";
import DebugPage from "./pages/DebugPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import SystemDiagnostic from "./pages/SystemDiagnostic";
import { Button } from "@/components/ui/button";
import { User } from "@shared/api";
import { useAppStore } from "./lib/store";
import { useLocation } from "./hooks/use-location";
import { useMessageNotifications } from "./hooks/use-message-notifications";

const queryClient = new QueryClient();

// Main App Component with Authentication State
const AppContent = () => {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("home");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const { isPermissionRequested } = useLocation();

  // Enable message notifications
  useMessageNotifications();

  // Initialize authentication on app start
  useEffect(() => {
    store.initializeAuth();

    // إضافة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة التشخيص");
    };

    console.log("💡 نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة التشخيص");
  }, []);

  // Check if we need to show location dialog for existing customers
  useEffect(() => {
    if (
      state.user &&
      state.user.role === "customer" &&
      !isPermissionRequested()
    ) {
      setShowLocationDialog(true);
    }
  }, [state.user, isPermissionRequested]);

  const handleAuth = (authenticatedUser: User) => {
    // User is already set in store by login/register
    setActiveTab("home");
  };

  const handleLogout = () => {
    store.logout();
    setActiveTab("home");
  };

  const handleLocationDialogComplete = () => {
    setShowLocationDialog(false);
  };

  // Redirect to login if not authenticated
  if (!state.user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <NotificationService />
      <LocationPermissionDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onComplete={handleLocationDialogComplete}
      />
      <Layout
        user={state.user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onShowNotifications={() => (window.location.href = "/notifications")}
        onShowMessages={() => (window.location.href = "/messages")}
      >
        {state.user.role === "customer" ? (
          <CustomerDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
          />
        ) : state.user.role === "barber" ? (
          <BarberDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
          />
        ) : state.user.role === "admin" ? (
          <AdminDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
          />
        ) : (
          <div className="p-4">
            <h2 className="text-xl font-bold">نوع حساب غير مدعوم</h2>
          </div>
        )}
      </Layout>
    </>
  );
};

// Individual route components
const NotificationsRoute = () => {
  const [state] = useAppStore();

  if (!state.user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <NotificationsCenter
      user={state.user}
      onBack={() => window.history.back()}
    />
  );
};

const MessagesRoute = () => {
  const [state] = useAppStore();

  if (!state.user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MessagesPage user={state.user} onBack={() => window.history.back()} />
  );
};

const DebugRoute = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 border-b">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          ← العودة للتطبيق
        </Button>
      </div>
      <DebugPage />
    </div>
  );
};

const AuthRoute = () => {
  const [state] = useAppStore();

  // If already logged in, redirect to dashboard
  if (state.user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Auth onAuth={() => (window.location.href = "/dashboard")} />;
};

const IndexRoute = () => {
  return <Index />;
};

// Main App with Router
const App = () => {
  const [state, store] = useAppStore();

  // Initialize authentication on app start
  useEffect(() => {
    store.initializeAuth();

    // إضافة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة التشخيص");
    };

    console.log("💡 نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة التشخيص");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<IndexRoute />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/debug" element={<DebugRoute />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            <Route path="/system-diagnostic" element={<SystemDiagnostic />} />

            {/* Authenticated routes */}
            <Route path="/dashboard" element={<AppContent />} />
            <Route path="/notifications" element={<NotificationsRoute />} />
            <Route path="/messages" element={<MessagesRoute />} />

            {/* Catch all route - show 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
