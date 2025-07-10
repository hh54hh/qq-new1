import "./global.css";
import "./styles/telegram-chat.css";

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
import DebugPage from "./pages/DebugPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import SystemDiagnostic from "./pages/SystemDiagnostic";
import NetworkDiagnostic from "./pages/NetworkDiagnostic";
import NetworkDiagnosticTest from "./pages/NetworkDiagnosticTest";
import NetworkDiagnosticSimple from "./pages/NetworkDiagnosticSimple";
import OfflinePage from "./pages/OfflinePage";

import IndexedDBStatus from "./components/debug/IndexedDBStatus";

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

import { usePWA, useNetworkStatus } from "./hooks/use-pwa";

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
        <h2 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h2>
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
  const [activeTab, setActiveTab] = useState("home");

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const { isPermissionRequested } = useLocation();

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

    // إضافة دالة عالمية ��فتح صفحة التشخيص الشامل
    (window as any).openDiagnostic = () => {
      window.location.href = "/network-diagnostic";
      console.log("🔍 تم فتح صفحة التشخيص الشامل");
    };

    console.log("💡 نصائح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة التشخيص");
    console.log("  - اكتب openDiagnostic() ف�� الكونسول لفتح التشخيص الشامل");
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
            onStartChat={(user) => {
              console.log("🔥 [APP-CUSTOMER] onStartChat تم استدعاؤها!");
              console.log(
                "💬 [APP-CUSTOMER] بدء محادثة مع:",
                user.id,
                user.name,
              );
              setTargetChatUserId(user.id);
              setActiveTab("messages");
              console.log(
                "💬 [APP-CUSTOMER] تم تغيير activeTab إلى messages, targetChatUserId:",
                user.id,
              );
            }}
            targetChatUserId={targetChatUserId}
          />
        ) : state.user.role === "barber" ? (
          <BarberDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
            onStartChat={(user) => {
              console.log("🔥 [APP-BARBER] onStartChat تم استدعاؤها!");
              console.log("💬 [APP-BARBER] بدء محادثة مع:", user.id, user.name);
              setTargetChatUserId(user.id);
              setActiveTab("messages");
              console.log(
                "💬 [APP-BARBER] تم تغيير activeTab إلى messages, targetChatUserId:",
                user.id,
              );
            }}
            targetChatUserId={targetChatUserId}
          />
        ) : state.user.role === "admin" ? (
          <AdminDashboard
            user={state.user}
            activeTab={activeTab}
            onLogout={handleLogout}
          />
        ) : (
          <div className="p-4">
            <h2 className="text-xl font-bold">نوع حساب غير مدعو��</h2>
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

    console.log("💡 نصا��ح مفيدة:");
    console.log("  - اكتب openDebug() في الكونسول لفتح صفحة ��لتشخيص");
    console.log("  - اكتب openDiagnostic() في ا����ونسول لفتح التشخيص الشامل");
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
            <Route
              path="/dashboard"
              element={
                <SimpleErrorBoundary fallback={ErrorFallback}>
                  <AppContent />
                </SimpleErrorBoundary>
              }
            />
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
