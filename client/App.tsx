import "./global.css";
import React, { useState, useEffect, Component } from "react";
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
  useLocation as useRouterLocation,
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

import LocationPermissionDialog from "./components/LocationPermissionDialog";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import DebugPage from "./pages/DebugPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import SystemDiagnostic from "./pages/SystemDiagnostic";
import NetworkDiagnostic from "./pages/NetworkDiagnostic";
import NetworkDiagnosticTest from "./pages/NetworkDiagnosticTest";
import NetworkDiagnosticSimple from "./pages/NetworkDiagnosticSimple";
import OfflinePage from "./pages/OfflinePage";
import ChatPage from "./pages/ChatPage";
import OptimizedChatPage from "./pages/OptimizedChatPage";

import IndexedDBStatus from "./components/debug/IndexedDBStatus";

import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/api";
import { useAppStore } from "./lib/store";
import { useLocation } from "./hooks/use-location";
import { getBarberCache } from "./lib/barber-cache";
import { getUltraFastBarberCache } from "./lib/ultra-fast-barber-cache";

const queryClient = new QueryClient();

// Simple Error Boundary Class Component
class SimpleErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error Boundary caught an error:", error, errorInfo);

    // Special handling for React Context errors
    if (
      error.message?.includes("useState") ||
      error.message?.includes("null")
    ) {
      console.error(
        "React Context error detected. This might be a React version mismatch or import issue.",
      );
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">ح��ث خطأ</h2>
        <p className="text-gray-600 mb-6">
          عذراً، حدث خطأ غير متوقع في التطبيق
        </p>
        <pre className="text-sm bg-gray-100 p-4 rounded mb-4 text-left overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    </div>
  );
}

// Main App Component with Authentication State
const AppContent = () => {
  const [state, store] = useAppStore();
  const routerLocation = useRouterLocation();
  const [activeTab, setActiveTab] = useState("homepage");

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const { isPermissionRequested } = useLocation();

  // استلام activeTab من navigation state إذا تم تمريره
  useEffect(() => {
    if (routerLocation.state?.activeTab) {
      setActiveTab(routerLocation.state.activeTab);
    }
  }, [routerLocation.state]);

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

    // Refresh posts when user returns to app
    const handleVisibilityChange = async () => {
      if (!document.hidden && state.user && state.user.role === "customer") {
        console.log("📱 App became visible - refreshing posts");
        setTimeout(() => {
          window.dispatchEvent(new Event("manualPostsRefresh"));
        }, 500); // Small delay to ensure smooth transition
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const cleanup = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    // إضافة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة التشخيص");
    };

    // إضافة دالة عالمية ��فتح صفحة التشخيص الشامل
    (window as any).openDiagnostic = () => {
      window.location.href = "/network-diagnostic";
      console.log("🔍 تم فتح صفحة ��لتشخيص الشامل");
    };

    console.log("��� نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفت�� صفحة ��لتشخيص");
    console.log("  - ا��تب openDiagnostic() ف�� الكونسول لفتح التشخيص الشامل");

    return cleanup;
  }, [state.user]);

  // Check if we need to show location dialog for existing customers
  useEffect(() => {
    if (
      state.user &&
      state.user.role === "customer" &&
      !isPermissionRequested() &&
      !localStorage.getItem("location_permission_denied")
    ) {
      setShowLocationDialog(true);
    }
  }, [state.user, isPermissionRequested]);

  const handleAuth = async (authenticatedUser: User) => {
    // User is already set in store by login/register
    setActiveTab("homepage");

    // Preload barbers for customers in background
    if (authenticatedUser.role === "customer") {
      try {
        console.log(
          "🚀 Preloading barbers for customer:",
          authenticatedUser.id,
        );
        const ultraCache = await getUltraFastBarberCache(authenticatedUser.id);
        await ultraCache.preloadOnLogin();
        console.log("✅ Barbers preloaded successfully");

        // Also preload following posts
        const { getFollowingPostsCache } = await import(
          "./lib/following-posts-cache"
        );
        const postsCache = getFollowingPostsCache(authenticatedUser.id);
        await postsCache.preloadOnLogin();
        console.log("✅ Following posts preloaded successfully");
      } catch (error) {
        console.warn("⚠️ Preloading failed:", error);
      }
    }
  };

  const handleLogout = () => {
    store.logout();
    setActiveTab("homepage");
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
          <p className="text-muted-foreground">جارٍ ��لتحميل...</p>
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
      <PWAInstallPrompt />

      <LocationPermissionDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onComplete={handleLocationDialogComplete}
      />
      <Layout
        user={state.user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
        onShowNotifications={() => (window.location.href = "/notifications")}
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
            <h2 className="text-xl font-bold">نو�� حساب غير مدعو��</h2>
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

const DebugRoute = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 border-b">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          ← ال��ودة للتطب��ق
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

  // Initialize global functions
  useEffect(() => {
    // إض��فة دالة عالمية لفتح صفحة التشخيص
    (window as any).openDebug = () => {
      window.location.href = "/debug";
      console.log("🔧 تم فتح صفحة الت��خيص");
    };

    // إضافة دالة عالمية لفتح صفحة التشخيص الشامل
    (window as any).openDiagnostic = () => {
      window.location.href = "/network-diagnostic";
      console.log("🔍 تم فتح صفحة التشخيص الشامل");
    };

    // إضافة دالة عالمية لإعادة تعيين الإشعارات
    (window as any).resetNotifications = () => {
      // إعادة تعيين إشعارا�� طلبات الصداقة
      const userId = localStorage.getItem("barbershop_user_id") || "user";
      localStorage.removeItem(`friend_requests_shown_${userId}`);

      // إعادة تعيين إعدادات الموقع
      localStorage.removeItem("location_permission_requested");
      localStorage.removeItem("location_permission_denied");
      localStorage.removeItem("user_location");

      console.log("✅ تم إعادة تعيين جميع الإشعارات وإعدادات الموقع");
      console.log("🔄 قم بإعادة تحميل الصفحة لرؤية الإشعارات مرة أخرى");
    };

    console.log("💡 نصا��ح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة ��لتشخيص");
    console.log("  - اكتب openDiagnostic() في ا����ونسول لفتح التشخيص الشامل");
    console.log("  - اكتب resetNotifications() لإعادة تعيين الإشعارات");
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
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat-optimized" element={<OptimizedChatPage />} />

            {/* Authenticated routes */}
            <Route
              path="/dashboard"
              element={
                <SimpleErrorBoundary fallback={ErrorFallback}>
                  <AppContent />
                </SimpleErrorBoundary>
              }
            />
            <Route path="/notifications" element={<NotificationsRoute />} />

            {/* Catch all route - show 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
