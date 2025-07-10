import React, { useState, useEffect } from "react";
import { Activity, Database, Wifi, Clock, HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useStorageInfo, useNetworkStatus } from "@/hooks/use-pwa";

interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  apiResponseTime: number;
  memoryUsage: number;
}

export default function PWAPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    cacheHitRate: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
  });

  const [isVisible, setIsVisible] = useState(false);
  const storageInfo = useStorageInfo();
  const { isOnline, connectionType } = useNetworkStatus();

  useEffect(() => {
    // حساب مقاييس الأداء
    calculatePerformanceMetrics();

    // إخفاء المراقب في بيئة الإنتاج
    const isDev = import.meta.env.DEV;
    setIsVisible(isDev || localStorage.getItem("show_pwa_monitor") === "true");

    // تحديث دوري للمقاييس
    const interval = setInterval(calculatePerformanceMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculatePerformanceMetrics = () => {
    // Load Time
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const loadTime = navigation
      ? navigation.loadEventEnd - navigation.fetchStart
      : 0;

    // Memory Usage (if available)
    const memory = (performance as any).memory;
    const memoryUsage = memory
      ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      : 0;

    // API Response Time (آخر استدعاء API)
    const apiEntries = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/api/"))
      .slice(-1)[0] as PerformanceResourceTiming;

    const apiResponseTime = apiEntries
      ? apiEntries.responseEnd - apiEntries.requestStart
      : 0;

    // Cache Hit Rate (تقدير بناءً على الطلبات)
    const resourceEntries = performance.getEntriesByType("resource");
    const cachedRequests = resourceEntries.filter(
      (entry: any) => entry.transferSize === 0,
    ).length;
    const cacheHitRate =
      resourceEntries.length > 0
        ? (cachedRequests / resourceEntries.length) * 100
        : 0;

    setMetrics({
      loadTime: Math.round(loadTime),
      cacheHitRate: Math.round(cacheHitRate),
      apiResponseTime: Math.round(apiResponseTime),
      memoryUsage: Math.round(memoryUsage),
    });
  };

  const getPerformanceStatus = (metric: keyof PerformanceMetrics): string => {
    const thresholds = {
      loadTime: { good: 2000, average: 4000 },
      cacheHitRate: { good: 70, average: 50 },
      apiResponseTime: { good: 500, average: 1000 },
      memoryUsage: { good: 50, average: 75 },
    };

    const value = metrics[metric];
    const threshold = thresholds[metric];

    if (metric === "cacheHitRate") {
      return value >= threshold.good
        ? "excellent"
        : value >= threshold.average
          ? "good"
          : "poor";
    } else {
      return value <= threshold.good
        ? "excellent"
        : value <= threshold.average
          ? "good"
          : "poor";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case "4g":
        return "📶";
      case "3g":
        return "📶";
      case "2g":
        return "📶";
      case "slow-2g":
        return "🐌";
      default:
        return "🌐";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <Card className="bg-background/95 backdrop-blur-sm border-2 border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            مراقب الأداء PWA
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="text-xs"
            >
              {isOnline ? "متصل" : "غير متصل"}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          {/* Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3" />
              <span>الشبكة:</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{getConnectionIcon()}</span>
              <span className="capitalize">{connectionType}</span>
            </div>
          </div>

          {/* Load Time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>زمن التحميل:</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(getPerformanceStatus("loadTime"))}`}
                />
                <span>{metrics.loadTime}ms</span>
              </div>
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-3 h-3" />
                <span>معدل التخزين:</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(getPerformanceStatus("cacheHitRate"))}`}
                />
                <span>{metrics.cacheHitRate}%</span>
              </div>
            </div>
            <Progress value={metrics.cacheHitRate} className="h-1" />
          </div>

          {/* API Response Time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>استجابة API:</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(getPerformanceStatus("apiResponseTime"))}`}
                />
                <span>{metrics.apiResponseTime}ms</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3 h-3" />
                  <span>الذاكرة:</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(getPerformanceStatus("memoryUsage"))}`}
                  />
                  <span>{metrics.memoryUsage}%</span>
                </div>
              </div>
              <Progress value={metrics.memoryUsage} className="h-1" />
            </div>
          )}

          {/* Storage Info */}
          {storageInfo && (
            <div className="space-y-1 pt-2 border-t border-muted">
              <div className="flex items-center justify-between">
                <span>مساحة التخزين:</span>
                <span>{formatBytes(storageInfo.usage)}</span>
              </div>
              <Progress value={storageInfo.percentage} className="h-1" />
              <div className="text-xs text-muted-foreground text-center">
                {storageInfo.percentage.toFixed(1)}% من{" "}
                {formatBytes(storageInfo.quota)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle button */}
      <button
        onClick={() => {
          setIsVisible(false);
          localStorage.setItem("show_pwa_monitor", "false");
        }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
        title="إخفاء مراقب الأداء"
      >
        ×
      </button>
    </div>
  );
}

// Hook لتفعيل مراقب الأداء عبر الكونسول
export function usePWAMonitorConsole() {
  // Defensive check to ensure useEffect is available
  if (typeof useEffect !== "function") {
    console.warn("⚠️ useEffect is not available in usePWAMonitorConsole");
    return;
  }

  useEffect(() => {
    try {
      // إضافة دالة عالمية لتفعيل المراقب
      (window as any).showPWAMonitor = () => {
        localStorage.setItem("show_pwa_monitor", "true");
        window.location.reload();
        console.log("🔍 تم تفعيل مراقب الأداء PWA");
      };

      (window as any).hidePWAMonitor = () => {
        localStorage.setItem("show_pwa_monitor", "false");
        window.location.reload();
        console.log("🚫 تم إخفاء مراقب الأداء PWA");
      };

      console.log("💡 PWA Monitor Commands:");
      console.log("  - showPWAMonitor() لإظهار مراقب الأداء");
      console.log("  - hidePWAMonitor() لإخفاء مراقب الأداء");
    } catch (error) {
      console.error("❌ Error in usePWAMonitorConsole:", error);
    }
  }, []);
}
