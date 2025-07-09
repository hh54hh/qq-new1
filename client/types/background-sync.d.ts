// Background Sync API type definitions
declare global {
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  interface ServiceWorkerGlobalScope {
    addEventListener(type: "sync", listener: (event: SyncEvent) => void): void;
  }

  interface SyncEvent extends ExtendableEvent {
    tag: string;
    lastChance: boolean;
  }

  // Push Manager types
  interface PushManager {
    subscribe(options?: PushSubscriptionOptions): Promise<PushSubscription>;
    getSubscription(): Promise<PushSubscription | null>;
    permissionState(
      options?: PushSubscriptionOptions,
    ): Promise<PushPermissionState>;
  }

  interface PushSubscriptionOptions {
    userVisibleOnly?: boolean;
    applicationServerKey?: BufferSource | string;
  }

  type PushPermissionState = "granted" | "denied" | "prompt";

  // Storage API
  interface StorageManager {
    estimate(): Promise<StorageEstimate>;
    persist(): Promise<boolean>;
    persisted(): Promise<boolean>;
  }

  interface StorageEstimate {
    quota?: number;
    usage?: number;
    usageDetails?: Record<string, number>;
  }

  interface Navigator {
    storage?: StorageManager;
    connection?: NetworkInformation;
  }

  interface NetworkInformation extends EventTarget {
    readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
    readonly type:
      | "bluetooth"
      | "cellular"
      | "ethernet"
      | "none"
      | "wifi"
      | "wimax"
      | "other"
      | "unknown";
    readonly downlink: number;
    readonly rtt: number;
    readonly saveData: boolean;
  }

  // Performance API extensions
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  // Notification API extensions
  interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
  }

  interface NotificationOptions {
    actions?: NotificationAction[];
    badge?: string;
    body?: string;
    data?: any;
    dir?: NotificationDirection;
    icon?: string;
    image?: string;
    lang?: string;
    renotify?: boolean;
    requireInteraction?: boolean;
    silent?: boolean;
    tag?: string;
    timestamp?: DOMTimeStamp;
    vibrate?: VibratePattern;
  }
}

export {};
