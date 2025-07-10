import { createRoot } from "react-dom/client";
import App from "./App";

// Debug IndexedDB on startup
async function debugIndexedDB() {
  console.log("🔍 [STARTUP] فحص قاعدة البيانات IndexedDB...");
  alert("🔍 فحص قاعدة البيانات IndexedDB...");

  if (!("indexedDB" in window)) {
    console.error("❌ [STARTUP] IndexedDB غير متاح");
    return;
  }

  try {
    const dbName = "BarberAppOfflineDB";
    const dbVersion = 2;

    const request = indexedDB.open(dbName, dbVersion);

    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log("✅ [STARTUP] قاعدة البيانات متاحة، نسخة:", db.version);
      console.log("📋 [STARTUP] الجداول:", Array.from(db.objectStoreNames));

      // Check critical tables
      const criticalTables = ["conversations", "messages"];
      criticalTables.forEach((table) => {
        if (db.objectStoreNames.contains(table)) {
          console.log(`✅ [STARTUP] الجدول ${table} موجود`);
        } else {
          console.error(`❌ [STARTUP] الجدول ${table} غير موجود!`);
        }
      });

      db.close();
    };

    request.onerror = (event) => {
      console.error(
        "❌ [STARTUP] فشل في فتح قاعدة البيانات:",
        event.target.error,
      );
    };
  } catch (error) {
    console.error("❌ [STARTUP] خطأ في فحص قاعدة البيانات:", error);
  }
}

// Run debug check
debugIndexedDB();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);
root.render(<App />);
