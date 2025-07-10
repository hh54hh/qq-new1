// Script to debug IndexedDB status
console.log("🔍 بدء فحص قاعدة البيانات IndexedDB...");

// Check if IndexedDB is available
if (!("indexedDB" in window)) {
  console.error("❌ IndexedDB غير متاح في هذا المتصفح");
}

// Function to check database
async function checkDatabase() {
  try {
    console.log("📊 فتح قاعدة البيانات...");

    const dbName = "BarberAppOfflineDB";
    const dbVersion = 2;

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      console.error("❌ فشل في فتح قاعدة البيانات:", event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log("✅ تم فتح قاعدة البيانات بنجاح");
      console.log("📊 نسخة قاعدة البيانات:", db.version);
      console.log("📋 الجداول الموجودة:", Array.from(db.objectStoreNames));

      // Check specific stores
      const requiredStores = [
        "conversations",
        "messages",
        "pendingMessages",
        "pendingConversationReads",
        "users",
        "bookings",
      ];

      console.log("🔍 فحص الجداول المطلوبة:");
      requiredStores.forEach((store) => {
        if (db.objectStoreNames.contains(store)) {
          console.log(`✅ الجدول ${store} موجود`);
        } else {
          console.log(`❌ الجدول ${store} غير موجود`);
        }
      });

      // Check conversations table content
      if (db.objectStoreNames.contains("conversations")) {
        const transaction = db.transaction(["conversations"], "readonly");
        const store = transaction.objectStore("conversations");
        const request = store.getAll();

        request.onsuccess = () => {
          const conversations = request.result;
          console.log("💬 عدد المحادثات المحفوظة:", conversations.length);
          if (conversations.length > 0) {
            console.log("💬 ��لمحادثات:", conversations);
          }
        };
      }

      // Check other tables content
      if (db.objectStoreNames.contains("posts")) {
        const transaction = db.transaction(["messages"], "readonly");
        const store = transaction.objectStore("messages");
        const request = store.getAll();

        request.onsuccess = () => {
          const messages = request.result;
          console.log("📨 عدد الرسائل المحفوظة:", messages.length);
          if (messages.length > 0) {
            console.log("📨 الرسائل:", messages);
          }
        };
      }

      db.close();
    };

    request.onupgradeneeded = (event) => {
      console.log("🔄 يتم تحديث قاعدة البيانات...");
      const db = event.target.result;

      const stores = [
        "bookings",
        "messages",
        "users",
        "barbershops",
        "services",
        "notifications",
        "posts",
        "reviews",
        "pendingActions",
        "conversations",
        "pendingMessages",
        "pendingConversationReads",
      ];

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: false,
          });

          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
          store.createIndex("type", "type", { unique: false });

          console.log(`📦 تم إنشاء الجدول: ${storeName}`);
        }
      });
    };
  } catch (error) {
    console.error("❌ خطأ في فحص قاعدة البيانات:", error);
  }
}

// Run the check
checkDatabase();

// Also add this to window for manual testing
window.checkIndexedDB = checkDatabase;

console.log("ℹ️ يمكنك تشغيل checkIndexedDB() يدوياً من الكونسول");
