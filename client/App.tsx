import "./global.css";
import "./styles/telegram-chat.css";

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import CustomerDashboard from "./pages/CustomerDashboard";
import BarberDashboard from "./pages/BarberDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationService from "./components/NotificationService";
import NotificationsCenter from "./pages/NotificationsCenter";
import ChatNotifications from "./components/ChatNotifications";

import LocationPermissionDialog from "./components/LocationPermissionDialog";
import DebugPage from "./pages/DebugPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import SystemDiagnostic from "./pages/SystemDiagnostic";
import NetworkDiagnostic from "./pages/NetworkDiagnostic";
import NetworkDiagnosticTest from "./pages/NetworkDiagnosticTest";
import NetworkDiagnosticSimple from "./pages/NetworkDiagnosticSimple";
import OfflinePage from "./pages/OfflinePage";
import MessagesPage from "./pages/MessagesPage";
import EnhancedMessagesPage from "./pages/EnhancedMessagesPage";
import PWAManager from "./components/PWAManager";
import PWAUpdateNotification, {
  PWAStatusBar,
} from "./components/PWAUpdateNotification";
import PWAPerformanceMonitor, {
  usePWAMonitorConsole,
} from "./components/PWAPerformanceMonitor";
import NetworkStatusBanner from "./components/NetworkStatusBanner";

import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/api";
import { useAppStore } from "./lib/store";
import { useLocation } from "./hooks/use-location";
import { useMessageNotifications } from "./hooks/use-message-notifications";
import { usePWA, useNetworkStatus } from "./hooks/use-pwa";

const queryClient = new QueryClient();

// Main App Component with Authentication State
const AppContent = () => {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("home");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const { isPermissionRequested } = useLocation();

  // Enable message notifications
  useMessageNotifications();

  // Initialize authentication on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        await store.initializeAuth();
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();

    // إضافة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة التشخيص");
    };

    // إضافة دالة عالمية لفتح صفحة التشخيص الشامل
    (window as any).openDiagnostic = () => {
      window.location.href = "/network-diagnostic";
      console.log("🔍 تم فتح صفحة التشخيص الشامل");
    };

    console.log("💡 نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة التشخيص");
    console.log("  - اكتب openDiagnostic() في الكونسول لفتح التشخيص الشامل");
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

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-golden-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!state.user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <NotificationService />
      <ChatNotifications
        currentUserId={state.user.id}
        onMessageClick={() => (window.location.href = "/messages")}
      />
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
        onShowMessages={() => {
          window.location.href = "/messages";
        }}
      >
        {state.user.role === "customer" ? (
          <CustomerDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
            onStartChat={(user) =>
              (window.location.href = `/messages?user=${user.id}`)
            }
          />
        ) : state.user.role === "barber" ? (
          <BarberDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
            onStartChat={(user) =>
              (window.location.href = `/messages?user=${user.id}`)
            }
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
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("user");

  if (!state.user) {
    return <Navigate to="/auth" replace />;
  }

  // Use enhanced Telegram-style messages page
  return <EnhancedMessagesPage targetUserId={targetUserId || undefined} />;
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
          ← ال��ودة للتطبيق
        </Button>
      </div>
      <DebugPage />
    </div>
  );
};

const AuthRoute = () => {
  const [state] = useAppStore();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // If already logged in, redirect to dashboard
  if (state.user || shouldRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Auth onAuth={() => setShouldRedirect(true)} />;
};

const IndexRoute = () => {
  return <Index />;
};

// Main App with Router
const App = () => {
  const [state, store] = useAppStore();

  // Initialize PWA monitor console commands
  usePWAMonitorConsole();

  // Initialize global functions
  useEffect(() => {
    // إضافة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة التشخيص");
    };

    // إضافة دالة عالمية لفتح صفحة التشخيص الشامل
    (window as any).openDiagnostic = () => {
      window.location.href = "/network-diagnostic";
      console.log("🔍 تم فتح صفحة التشخيص الشامل");
    };

    console.log("💡 نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة التشخيص");
    console.log("  - اكتب openDiagnostic() في الكونسول لفتح التشخيص الشامل");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <NetworkStatusBanner />
          <PWAStatusBar />
          <PWAUpdateNotification />
          <PWAPerformanceMonitor />
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<IndexRoute />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/debug" element={<DebugRoute />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            <Route path="/system-diagnostic" element={<SystemDiagnostic />} />
            <Route
              path="/network-diagnostic"
              element={<NetworkDiagnosticSimple />}
            />
            <Route
              path="/network-diagnostic-complex"
              element={<NetworkDiagnostic />}
            />
            <Route
              path="/network-diagnostic-test"
              element={<NetworkDiagnosticTest />}
            />
            <Route path="/offline" element={<OfflinePage />} />

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
