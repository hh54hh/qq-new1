// Service Worker for Barber App
// Version 2.1 - Enhanced PWA installation support

const CACHE_NAME = "barber-app-v2.1";
const RUNTIME_CACHE = "runtime-cache-v2.0";
const API_CACHE = "api-cache-v2.0";
const IMAGES_CACHE = "images-cache-v2.0";
const OFFLINE_URL = "/offline";

// Static files to cache immediately
const STATIC_CACHE_URLS = [
  "/",
  "/dashboard",
  "/auth",
  "/offline",
  "/manifest.json",

  // Icons for PWA
  "/icons/app-icon.svg",
  "/icons/icon-144x144.svg",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",

  // Core scripts and styles
  "/client/main.tsx",
  "/client/global.css",

  // Critical UI components
  "/client/App.tsx",
  "/client/components/Layout.tsx",
  "/client/pages/Auth.tsx",
  "/client/pages/CustomerDashboard.tsx",
  "/client/pages/BarberDashboard.tsx",
  "/client/pages/AdminDashboard.tsx",
  "/client/pages/OfflinePage.tsx",

  // Essential hooks and utilities
  "/client/hooks/use-pwa.ts",
  "/client/lib/store.ts",
  "/client/lib/api.ts",

  // UI components library
  "/client/components/ui/button.tsx",
  "/client/components/ui/card.tsx",
  "/client/components/ui/dialog.tsx",
  "/client/components/ui/input.tsx",
  "/client/components/ui/toast.tsx",
  "/client/components/ui/badge.tsx",

  // Fonts and external resources
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap",
];

// API routes to cache
const API_CACHE_PATTERNS = [
  "/api/barbershops",
  "/api/auth/me",
  "/api/bookings",
  "/api/services",
  "/api/notifications",
];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        console.log("📦 Caching static resources...");
        await cache.addAll(STATIC_CACHE_URLS);
        console.log("✅ Static resources cached successfully");
      } catch (error) {
        console.error("❌ Failed to cache static resources:", error);
        // Cache individually to avoid failing on single resource
        for (const url of STATIC_CACHE_URLS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`⚠️ Failed to cache ${url}:`, err);
          }
        }
      }

      // Force activation
      self.skipWaiting();
    })(),
  );
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      const deletions = cacheNames
        .filter(
          (name) =>
            name.startsWith("barber-app-") &&
            name !== CACHE_NAME &&
            name !== RUNTIME_CACHE &&
            name !== API_CACHE &&
            name !== IMAGES_CACHE,
        )
        .map((name) => caches.delete(name));

      await Promise.all(deletions);
      console.log("🧹 Old caches cleaned");

      // Take control of all clients
      await self.clients.claim();
      console.log("✅ Service Worker activated and controlling all clients");
    })(),
  );
});

// Fetch event - smart caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome extension requests
  if (url.protocol === "chrome-extension:") return;

  // Skip cross-origin requests that we don't control
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes("googleapis.com") &&
    !url.hostname.includes("fonts.gstatic.com")
  ) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Navigation requests - app shell strategy
  if (request.mode === "navigate") {
    return handleNavigationRequest(request);
  }

  // API requests - network first with fallback
  if (url.pathname.startsWith("/api/")) {
    return handleAPIRequest(request);
  }

  // Images - cache first
  if (request.destination === "image") {
    return handleImageRequest(request);
  }

  // Static assets - cache first
  if (isStaticAsset(request)) {
    return handleStaticRequest(request);
  }

  // External fonts and resources
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    return handleExternalResource(request);
  }

  // Default: network first
  return handleNetworkFirst(request);
}

// Navigation strategy - app shell with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error("Network response not ok");
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }

    // Fallback to basic HTML
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>غير متصل - حلاقة</title>
          <style>
            body { 
              font-family: 'Noto Sans Arabic', sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #1a1b1e; 
              color: #f59e0b; 
            }
            .logo { font-size: 3em; margin-bottom: 20px; }
            .message { font-size: 1.2em; margin-bottom: 30px; }
            .retry { 
              background: #f59e0b; 
              color: #1a1b1e; 
              padding: 10px 20px; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <div class="logo">✂️</div>
          <h1>غير متصل</h1>
          <p class="message">لا يمكن الوصول إلى ��لإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.</p>
          <button class="retry" onclick="window.location.reload()">إعادة المحاولة</button>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

// API strategy - network first with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request, {
      timeout: 5000, // 5 second timeout
    });

    if (networkResponse.ok) {
      // Cache GET requests only
      if (request.method === "GET") {
        const cache = await caches.open(API_CACHE);
        // Clone response before caching
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }

    throw new Error("Network response not ok");
  } catch (error) {
    console.log(`🌐 API network failed for ${url.pathname}, trying cache...`);

    // For GET requests, try cache
    if (request.method === "GET") {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log(`📦 Serving cached API response for ${url.pathname}`);
        return cachedResponse;
      }
    }

    // Return offline-friendly error response
    if (url.pathname.includes("/auth/")) {
      return new Response(
        JSON.stringify({
          error: "offline",
          message: "التطبيق يعمل في الوضع غير المتصل",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // For other APIs, return empty array or fallback data
    return new Response(
      JSON.stringify({
        data: [],
        offline: true,
        message: "البيانات غير متوفرة في الوضع غير المتصل",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Image strategy - cache first
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn("Failed to fetch image:", request.url);
  }

  // Return placeholder image
  return new Response("", { status: 404 });
}

// Static assets strategy - cache first
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    return networkResponse;
  } catch (error) {
    return new Response("", { status: 404 });
  }
}

// External resources - cache first with long TTL
async function handleExternalResource(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response("", { status: 404 });
  }
}

// Network first strategy
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response("", { status: 404 });
  }
}

// Helper function to identify static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.includes(".js") ||
    url.pathname.includes(".css") ||
    url.pathname.includes(".tsx") ||
    url.pathname.includes(".ts") ||
    url.pathname.includes("/client/") ||
    url.pathname.includes("/components/") ||
    url.pathname === "/manifest.json"
  );
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("🔄 Background sync triggered:", event.tag);

  if (event.tag === "background-sync-bookings") {
    event.waitUntil(syncBookings());
  } else if (event.tag === "background-sync-messages") {
    event.waitUntil(syncMessages());
  } else if (event.tag === "background-sync-posts") {
    event.waitUntil(syncPosts());
  }
});

// Sync offline bookings
async function syncBookings() {
  try {
    console.log("📅 Syncing offline bookings...");

    // Get offline bookings from IndexedDB
    const offlineBookings = await getOfflineData("bookings");

    for (const booking of offlineBookings) {
      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking),
        });

        if (response.ok) {
          await removeOfflineData("bookings", booking.id);
          console.log("✅ Booking synced:", booking.id);
        }
      } catch (error) {
        console.error("❌ Failed to sync booking:", error);
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Sync offline messages
async function syncMessages() {
  console.log("💬 Syncing offline messages...");
  // Implementation similar to bookings
}

// Sync offline posts
async function syncPosts() {
  console.log("📝 Syncing offline posts...");
  // Implementation for other offline actions
}

// IndexedDB helpers (simplified)
async function getOfflineData(store) {
  // This would interact with IndexedDB
  return [];
}

async function removeOfflineData(store, id) {
  // This would remove from IndexedDB
}

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  console.log("📱 Push notification received:", data);

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    image: data.image,
    tag: data.tag || "barber-notification",
    data: data.data,
    actions: [
      {
        action: "view",
        title: "عرض",
        icon: "/icons/action-view.png",
      },
      {
        action: "dismiss",
        title: "إغلاق",
        icon: "/icons/action-dismiss.png",
      },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "view" && data?.url) {
    event.waitUntil(clients.openWindow(data.url));
  } else if (action === "dismiss") {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(clients.openWindow("/"));
  }
});

// Message handling from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(clearAllCaches());
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  console.log("🧹 All caches cleared");
}

console.log("🚀 Advanced Service Worker loaded successfully");
