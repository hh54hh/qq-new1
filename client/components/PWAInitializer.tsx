import React, { useEffect, useState } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { getOfflineStorage } from "@/lib/offline-storage";
import syncManager from "@/lib/sync-manager";
import offlineAPI from "@/lib/offline-api";

interface PWAInitializerProps {
  children: React.ReactNode;
}

interface PWAStatus {
  storageInitialized: boolean;
  syncManagerReady: boolean;
  serviceWorkerReady: boolean;
  isOnline: boolean;
  pendingSync: number;
}

export default function PWAInitializer({ children }: PWAInitializerProps) {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    storageInitialized: false,
    syncManagerReady: false,
    serviceWorkerReady: false,
    isOnline: navigator.onLine,
    pendingSync: 0,
  });

  const [initializationComplete, setInitializationComplete] = useState(false);
  const pwa = usePWA();

  useEffect(() => {
    initializePWA();
  }, []);

  useEffect(() => {
    // Update online status
    const handleOnline = () =>
      setPwaStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setPwaStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const initializePWA = async () => {
    try {
      console.log("🚀 Initializing PWA components...");

      // Initialize offline storage
      try {
        await getOfflineStorage();
        setPwaStatus((prev) => ({ ...prev, storageInitialized: true }));
        console.log("✅ Offline storage initialized");
      } catch (error) {
        console.error("❌ Failed to initialize offline storage:", error);
      }

      // Initialize sync manager
      try {
        // Sync manager initializes automatically
        setPwaStatus((prev) => ({ ...prev, syncManagerReady: true }));
        console.log("✅ Sync manager ready");

        // Get initial pending sync count
        updatePendingSyncCount();
      } catch (error) {
        console.error("❌ Failed to initialize sync manager:", error);
      }

      // Check service worker status
      try {
        if ("serviceWorker" in navigator) {
          await navigator.serviceWorker.ready;
          setPwaStatus((prev) => ({ ...prev, serviceWorkerReady: true }));
          console.log("✅ Service worker ready");
        }
      } catch (error) {
        console.error("❌ Service worker initialization failed:", error);
      }

      // Setup periodic sync monitoring
      setupSyncMonitoring();

      setInitializationComplete(true);
      console.log("🎉 PWA initialization complete");
    } catch (error) {
      console.error("❌ PWA initialization failed:", error);
      setInitializationComplete(true); // Still allow app to load
    }
  };

  const updatePendingSyncCount = async () => {
    try {
      const storage = await getOfflineStorage();
      const pendingActions = await storage.getPendingActions();
      setPwaStatus((prev) => ({ ...prev, pendingSync: pendingActions.length }));
    } catch (error) {
      console.warn("Failed to get pending sync count:", error);
    }
  };

  const setupSyncMonitoring = () => {
    // Monitor sync status every 30 seconds
    const interval = setInterval(() => {
      if (pwaStatus.isOnline && !syncManager.isSyncing()) {
        updatePendingSyncCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  const handleForcSync = async () => {
    if (!pwaStatus.isOnline) {
      console.warn("Cannot sync while offline");
      return;
    }

    try {
      console.log("🔄 Manual sync triggered...");
      await syncManager.syncAll();
      await updatePendingSyncCount();
      console.log("✅ Manual sync completed");
    } catch (error) {
      console.error("❌ Manual sync failed:", error);
    }
  };

  // Expose global debug functions
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).pwaDebug = {
        status: () => pwaStatus,
        forceSync: handleForcSync,
        clearStorage: () => offlineAPI.clearOfflineData(),
        getPendingActions: async () => {
          const storage = await getOfflineStorage();
          return storage.getPendingActions();
        },
        getStorageInfo: () => offlineAPI.getStorageInfo(),
        syncManager: syncManager,
      };

      console.log("💡 PWA Debug tools available:");
      console.log("  - Type pwaDebug.status() to see PWA status");
      console.log("  - Type pwaDebug.forceSync() to force sync");
      console.log("  - Type pwaDebug.clearStorage() to clear offline data");
    }
  }, [pwaStatus]);

  if (!initializationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-golden-500 mx-auto"></div>
          <p className="text-muted-foreground">جاري تهيئة التطبيق...</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              التخزين المحلي:{" "}
              {pwaStatus.storageInitialized ? "✅ جاهز" : "⏳ جاري التحميل"}
            </div>
            <div>
              مدير المزامنة:{" "}
              {pwaStatus.syncManagerReady ? "✅ جاهز" : "⏳ جاري التحميل"}
            </div>
            <div>
              Service Worker:{" "}
              {pwaStatus.serviceWorkerReady ? "✅ جاهز" : "⏳ جاري التحميل"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* PWA Status indicator (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <PWAStatusIndicator
          status={pwaStatus}
          onForceSync={handleForcSync}
          onUpdatePendingCount={updatePendingSyncCount}
        />
      )}
    </>
  );
}

// Development-only status indicator
interface PWAStatusIndicatorProps {
  status: PWAStatus;
  onForceSync: () => void;
  onUpdatePendingCount: () => void;
}

function PWAStatusIndicator({
  status,
  onForceSync,
  onUpdatePendingCount,
}: PWAStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`bg-black/80 text-white text-xs rounded-lg p-2 transition-all duration-200 ${
          isExpanded ? "w-64" : "w-12"
        }`}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          {isExpanded ? "PWA Status" : "🔧"}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1">
            <div>🌐 {status.isOnline ? "Online" : "Offline"}</div>
            <div>💾 Storage: {status.storageInitialized ? "✅" : "❌"}</div>
            <div>🔄 Sync: {status.syncManagerReady ? "✅" : "❌"}</div>
            <div>⚙️ SW: {status.serviceWorkerReady ? "✅" : "❌"}</div>
            <div>📤 Pending: {status.pendingSync}</div>

            <div className="flex gap-1 mt-2">
              <button
                onClick={onForceSync}
                className="bg-blue-600 px-2 py-1 rounded text-xs"
                disabled={!status.isOnline}
              >
                Sync
              </button>
              <button
                onClick={onUpdatePendingCount}
                className="bg-gray-600 px-2 py-1 rounded text-xs"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for components to access PWA status
export function usePWAStatus() {
  const [status, setStatus] = useState<PWAStatus>({
    storageInitialized: false,
    syncManagerReady: false,
    serviceWorkerReady: false,
    isOnline: navigator.onLine,
    pendingSync: 0,
  });

  useEffect(() => {
    // Get status from window if available
    const updateStatus = () => {
      if ((window as any).pwaDebug) {
        setStatus((window as any).pwaDebug.status());
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return status;
}
