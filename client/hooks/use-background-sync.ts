import { useState, useEffect, useCallback } from "react";
import { getBackgroundSync, SyncStatus } from "@/lib/background-sync";

export function useBackgroundSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingMessages: 0,
    lastSync: null,
    retryQueue: [],
  });

  const [syncService, setSyncService] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeSync = async () => {
      try {
        const service = await getBackgroundSync();

        if (mounted) {
          setSyncService(service);
          setStatus(service.getStatus());

          // Subscribe to status changes
          unsubscribe = service.onStatusChange((newStatus) => {
            if (mounted) {
              setStatus(newStatus);
            }
          });
        }
      } catch (error) {
        console.error("Failed to initialize background sync:", error);
      }
    };

    initializeSync();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const queueMessage = useCallback(
    async (messageData: { receiver_id: string; message: string }) => {
      if (!syncService) {
        throw new Error("Background sync service not initialized");
      }
      return await syncService.queueMessage(messageData);
    },
    [syncService],
  );

  const forceSync = useCallback(async () => {
    if (!syncService) {
      throw new Error("Background sync service not initialized");
    }
    await syncService.forcSync();
  }, [syncService]);

  return {
    status,
    queueMessage,
    forceSync,
    isReady: !!syncService,
  };
}
