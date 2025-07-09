const CACHE_NAME = "barber-app-v1.2.0";
const OFFLINE_URL = "/offline";

// استراتيجيات التخزين المختلفة
const CACHE_STRATEGIES = {
  CACHE_FIRST: "cache-first",
  NETWORK_FIRST: "network-first",
  STALE_WHILE_REVALIDATE: "stale-while-revalidate",
  NETWORK_ONLY: "network-only",
  CACHE_ONLY: "cache-only",
};

// تكوين التخزين حسب نوع المورد
const CACHE_CONFIG = {
  // ملفات أساسية (Cache First)
  static: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: `${CACHE_NAME}-static`,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 يوم
    patterns: [
      /\.(js|css|html|png|jpg|jpeg|svg|woff2|woff)$/,
      /\/client\//,
      /\/static\//,
    ],
  },

  // API calls (Network First مع Offline fallback)
  api: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: `${CACHE_NAME}-api`,
    maxAge: 5 * 60 * 1000, // 5 دقائق
    patterns: [/\/api\//, /\/auth\//, /\.netlify\/functions\//],
  },

  // الصور والوسائط (Stale While Revalidate)
  media: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: `${CACHE_NAME}-media`,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
    patterns: [/\/uploads\//, /\/images\//, /\.supabase\.co\/storage\//],
  },

  // صفحات التطبيق (Network First)
  pages: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: `${CACHE_NAME}-pages`,
    maxAge: 24 * 60 * 60 * 1000, // 24 ساعة
    patterns: [/\/$/, /\/dashboard/, /\/booking/, /\/auth/, /\/messages/],
  },
};

// تثبيت Service Worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");

  event.waitUntil(
    (async () => {
      // تخزين الملفات الأساسية
      const cache = await caches.open(CACHE_CONFIG.static.cacheName);

      const essentialResources = [
        "/",
        "/client/main.tsx",
        "/client/global.css",
        "/manifest.json",
        OFFLINE_URL,
      ];

      try {
        await cache.addAll(essentialResources);
        console.log("✅ Essential resources cached");
      } catch (error) {
        console.warn("⚠️ Some essential resources failed to cache:", error);
      }

      // فرض التحديث الفوري
      self.skipWaiting();
    })(),
  );
});

// تفعيل Service Worker
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    (async () => {
      // تنظيف Cache القديمة
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(
        (name) =>
          name.includes("barber-app") &&
          !name.includes(CACHE_NAME.split("-v")[0]),
      );

      await Promise.all(
        oldCaches.map((cacheName) => {
          console.log(`🗑️ Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        }),
      );

      // تولي التحكم في جميع العملاء
      await self.clients.claim();

      console.log("✅ Service Worker activated and controlling all clients");
    })(),
  );
});

// التعامل مع طلبات الشبكة
self.addEventListener("fetch", (event) => {
  // تجاهل طلبات غير HTTP
  if (!event.request.url.startsWith("http")) return;

  // تجاهل طلبات POST/PUT/DELETE للبيانات الحساسة
  if (event.request.method !== "GET") {
    return handleNonGetRequest(event);
  }

  const url = new URL(event.request.url);
  const config = getCacheConfig(url.pathname);

  if (!config) {
    // استراتيجية افتراضية للموارد غير المصنفة
    event.respondWith(networkFirst(event.request, CACHE_CONFIG.pages));
    return;
  }

  switch (config.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(event.request, config));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(event.request, config));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(event.request, config));
      break;
    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(fetch(event.request));
      break;
    case CACHE_STRATEGIES.CACHE_ONLY:
      event.respondWith(caches.match(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request, config));
  }
});

// تحديد تكوين التخزين حسب المسار
function getCacheConfig(pathname) {
  for (const [type, config] of Object.entries(CACHE_CONFIG)) {
    if (config.patterns.some((pattern) => pattern.test(pathname))) {
      return config;
    }
  }
  return null;
}

// استراتيجية Cache First
async function cacheFirst(request, config) {
  try {
    const cache = await caches.open(config.cacheName);
    const cached = await cache.match(request);

    if (cached && !isExpired(cached, config.maxAge)) {
      // تحديث في الخلفية إذا كان قديماً نسبياً
      if (isStale(cached, config.maxAge / 2)) {
        fetchAndCache(request, config).catch(console.warn);
      }
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn("Cache first failed:", error);
    const cached = await caches.match(request);
    return cached || createOfflineResponse(request);
  }
}

// استراتيجية Network First
async function networkFirst(request, config) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(config.cacheName);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn("Network request failed, trying cache:", error);

    const cache = await caches.open(config.cacheName);
    const cached = await cache.match(request);

    if (cached && !isExpired(cached, config.maxAge)) {
      return cached;
    }

    return createOfflineResponse(request);
  }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request, config) {
  const cache = await caches.open(config.cacheName);
  const cached = await cache.match(request);

  // تحديث في الخلفية دائماً
  const fetchPromise = fetchAndCache(request, config);

  // إرجاع النسخة المخزنة فوراً إذا متوفرة
  if (cached && !isExpired(cached, config.maxAge)) {
    fetchPromise.catch(console.warn); // تجاهل أخطاء التحديث
    return cached;
  }

  // إنتظار الاستجابة الجديدة إذا لم تكن محفوظة
  try {
    return await fetchPromise;
  } catch (error) {
    return cached || createOfflineResponse(request);
  }
}

// جلب وحفظ المورد
async function fetchAndCache(request, config) {
  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(config.cacheName);
    await cache.put(request, response.clone());
  }

  return response;
}

// التحقق من انتهاء صلاحية المورد
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get("date");
  if (!dateHeader) return false;

  const date = new Date(dateHeader);
  return Date.now() - date.getTime() > maxAge;
}

// التحقق من قدم المورد (لتحديث الخلفية)
function isStale(response, staleAge) {
  const dateHeader = response.headers.get("date");
  if (!dateHeader) return true;

  const date = new Date(dateHeader);
  return Date.now() - date.getTime() > staleAge;
}

// التعامل مع طلبات غير GET
function handleNonGetRequest(event) {
  // للطلبات الحساسة، تأكد من وجود اتصال
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        JSON.stringify({
          error: "طلبك يحتاج اتصال بالإنترنت",
          offline: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }),
  );
}

// إنشاء استجابة Offline
function createOfflineResponse(request) {
  const url = new URL(request.url);

  // للصفحات HTML، أرجع صفحة offline
  if (request.headers.get("accept")?.includes("text/html")) {
    return (
      caches.match(OFFLINE_URL) ||
      new Response(createOfflineHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }

  // لطلبات API، أرجع استجابة JSON
  if (url.pathname.includes("/api/") || url.pathname.includes("/auth/")) {
    return new Response(
      JSON.stringify({
        error: "غير متصل بالإنترنت",
        message: "يرجى التحقق من الاتصال والمحاولة مرة أخرى",
        offline: true,
        cached: false,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // للموارد الأخرى
  return new Response("غير متاح في وضع عدم الاتصال", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// إنشاء صفحة HTML للوضع Offline
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>غير متصل - حلاقة</title>
      <style>
        body {
          font-family: 'Noto Sans Arabic', sans-serif;
          background: linear-gradient(135deg, #1a1b1e 0%, #2d2e36 100%);
          color: #fff;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .offline-container {
          max-width: 400px;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        h1 {
          color: #d4af37;
          margin-bottom: 15px;
        }
        p {
          margin-bottom: 25px;
          opacity: 0.9;
        }
        .retry-btn {
          background: #d4af37;
          color: #1a1b1e;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
        }
        .retry-btn:hover {
          background: #f4c842;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>غير متصل بالإنترنت</h1>
        <p>يبدو أنك غير متصل بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          المحاولة مرة أخرى
        </button>
      </div>
    </body>
    </html>
  `;
}

// التعامل مع الرسائل من التطبيق الرئيسي
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data?.type === "CLEAR_CACHE") {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// تنظيف جميع التخزين المؤقت
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const barberCaches = cacheNames.filter((name) => name.includes("barber-app"));

  return Promise.all(barberCaches.map((cacheName) => caches.delete(cacheName)));
}

// تحسين الأداء - Background Sync
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-bookings") {
    event.waitUntil(syncPendingBookings());
  }

  if (event.tag === "background-sync-messages") {
    event.waitUntil(syncPendingMessages());
  }
});

// مزامنة الحجوزات المعلقة
async function syncPendingBookings() {
  try {
    const cache = await caches.open("pending-data");
    const pendingBookings = await cache.match("/pending-bookings");

    if (pendingBookings) {
      const bookings = await pendingBookings.json();

      for (const booking of bookings) {
        try {
          await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking),
          });
        } catch (error) {
          console.warn("Failed to sync booking:", error);
        }
      }

      await cache.delete("/pending-bookings");
    }
  } catch (error) {
    console.warn("Background sync failed:", error);
  }
}

// مزامنة الرسائل المعلقة
async function syncPendingMessages() {
  // مشابه لـ syncPendingBookings
  console.log("Syncing pending messages...");
}

// Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.message || "لديك إشعار جديد",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      image: data.image,
      data: data.data,
      actions: [
        {
          action: "view",
          title: "عرض",
          icon: "/icons/action-view.png",
        },
        {
          action: "dismiss",
          title: "تجاهل",
          icon: "/icons/action-dismiss.png",
        },
      ],
      tag: data.tag || "general",
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "حلاقة", options),
    );
  } catch (error) {
    console.warn("Push notification error:", error);
  }
});

// التعامل مع النقر على الإشعارات
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة
        for (const client of clientList) {
          if (
            client.url.includes(self.registration.scope) &&
            "focus" in client
          ) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        // فتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

console.log("🚀 Advanced Service Worker loaded successfully");
