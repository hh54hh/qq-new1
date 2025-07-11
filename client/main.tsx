import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Debug IndexedDB on startup
async function debugIndexedDB() {
  console.log("🔍 [STARTUP] فحص قاعدة البيانات IndexedDB...");

  if (!("indexedDB" in window)) {
    console.error("❌ [STARTUP] IndexedDB غير متاح");
    return;
  }

  try {
    const dbName = "BarberAppOfflineDB";
    const dbVersion = 2;

    const request = indexedDB.open(dbName, dbVersion);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log("✅ [STARTUP] قاعدة البيانات متاحة، نسخة:", db.version);
      console.log("📋 [STARTUP] الجداول:", Array.from(db.objectStoreNames));

      // Basic database check
      console.log("✅ [STARTUP] قاعدة البيانات تعمل بشكل صحيح");

      db.close();
    };

    request.onerror = (event) => {
      console.error(
        "❌ [STARTUP] فشل في فتح قاعدة البيانات:",
        (event.target as IDBOpenDBRequest).error,
      );
    };
  } catch (error) {
    console.error("❌ [STARTUP] خطأ في فحص ��اعدة البيانات:", error);
  }
}

// Run debug check
debugIndexedDB();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

// Verify React is properly loaded before starting the app
if (!React || !React.useState || !React.useEffect) {
  console.error("React is not properly loaded. Required hooks are missing.");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2 style="color: #dc3545;">خطأ في تحميل التطبيق</h2>
      <p>React لم يتم تحميله بشكل صحيح. يرجى إعادة تحميل الصفحة.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        إعادة تحميل
      </button>
    </div>
  `;
} else {
  console.log("✅ React loaded successfully with all required hooks");

  try {
    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error("Failed to render app:", error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">خطأ في تشغيل التطبيق</h2>
        <p>حدث خطأ أثناء تشغيل التطبيق. يرجى إعادة تحميل الصفحة.</p>
        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: left; overflow: auto;">
          ${error instanceof Error ? error.message : "Unknown error"}
        </pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          إعادة تحميل
        </button>
      </div>
    `;
  }
}
