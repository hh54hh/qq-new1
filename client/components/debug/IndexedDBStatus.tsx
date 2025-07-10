import React, { useState, useEffect } from "react";

interface DatabaseStatus {
  isAvailable: boolean;
  version: number | null;
  stores: string[];
  conversationsCount: number;
  messagesCount: number;
  error?: string;
}

export default function IndexedDBStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    isAvailable: false,
    version: null,
    stores: [],
    conversationsCount: 0,
    messagesCount: 0,
  });

  useEffect(() => {
    checkIndexedDB();
  }, []);

  const checkIndexedDB = async () => {
    console.log("🔍 [IndexedDBStatus] بدء فحص قاعدة البيانات...");

    if (!("indexedDB" in window)) {
      setStatus((prev) => ({
        ...prev,
        error: "IndexedDB غير متاح في هذا المتصفح",
      }));
      return;
    }

    try {
      const dbName = "BarberAppOfflineDB";
      const dbVersion = 2;

      const request = indexedDB.open(dbName, dbVersion);

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log("✅ [IndexedDBStatus] قاعدة البيانات متاحة");

        const stores = Array.from(db.objectStoreNames);
        let conversationsCount = 0;
        let messagesCount = 0;

        // Count conversations
        if (db.objectStoreNames.contains("conversations")) {
          try {
            const transaction = db.transaction(["conversations"], "readonly");
            const store = transaction.objectStore("conversations");
            const request = store.getAll();

            request.onsuccess = () => {
              conversationsCount = request.result.length;
              console.log(
                "💬 [IndexedDBStatus] عدد المحادثات:",
                conversationsCount,
              );
              setStatus((prev) => ({ ...prev, conversationsCount }));
            };
          } catch (error) {
            console.error("❌ [IndexedDBStatus] خطأ في عد المحادثات:", error);
          }
        }

        // Count messages
        if (db.objectStoreNames.contains("messages")) {
          try {
            const transaction = db.transaction(["messages"], "readonly");
            const store = transaction.objectStore("messages");
            const request = store.getAll();

            request.onsuccess = () => {
              messagesCount = request.result.length;
              console.log("📨 [IndexedDBStatus] عدد الرسائل:", messagesCount);
              setStatus((prev) => ({ ...prev, messagesCount }));
            };
          } catch (error) {
            console.error("❌ [IndexedDBStatus] خطأ في عد الرسائل:", error);
          }
        }

        setStatus({
          isAvailable: true,
          version: db.version,
          stores,
          conversationsCount,
          messagesCount,
        });

        db.close();
      };

      request.onerror = (event) => {
        const error =
          (event.target as IDBOpenDBRequest).error?.message || "خطأ غير معروف";
        console.error("❌ [IndexedDBStatus] فشل في فتح قاعدة البيانات:", error);
        setStatus((prev) => ({
          ...prev,
          error: `فشل في فتح قاعدة البيانات: ${error}`,
        }));
      };

      request.onupgradeneeded = (event) => {
        console.log("🔄 [IndexedDBStatus] يتم تحديث قاعدة البيانات...");
        const db = (event.target as IDBOpenDBRequest).result;

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

            console.log(`📦 [IndexedDBStatus] تم إنشاء الجدول: ${storeName}`);
          }
        });
      };
    } catch (error) {
      console.error("❌ [IndexedDBStatus] خطأ في فحص قاعدة البيانات:", error);
      setStatus((prev) => ({
        ...prev,
        error: `خطأ في فحص قاعدة البيانات: ${error.message}`,
      }));
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "10px",
        backgroundColor: "#1a1b1e",
        color: "white",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: "300px",
        border: "1px solid #333",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        IndexedDB Status
      </div>
      {status.error ? (
        <div style={{ color: "#ff6b6b" }}>❌ {status.error}</div>
      ) : (
        <>
          <div>متاح: {status.isAvailable ? "✅" : "❌"}</div>
          <div>نسخة: {status.version}</div>
          <div>الجداول: {status.stores.length}</div>
          <div>المحادثات: {status.conversationsCount}</div>
          <div>الرسائل: {status.messagesCount}</div>
          <div style={{ fontSize: "10px", marginTop: "4px" }}>
            الجداول المطلوبة:
            {["bookings", "posts"].map((table) => (
              <span
                key={table}
                style={{
                  color: status.stores.includes(table) ? "#51cf66" : "#ff6b6b",
                  marginLeft: "4px",
                }}
              >
                {table}
                {status.stores.includes(table) ? "✅" : "❌"}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
