import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ChatPerformanceMetrics {
  messageCount: number;
  loadTime: number;
  sendTime: number;
  memoryUsage: number;
  networkStatus: string;
  lastSync: number;
}

interface ChatPerformanceMonitorProps {
  enabled?: boolean;
  className?: string;
}

export default function ChatPerformanceMonitor({
  enabled = process.env.NODE_ENV === "development",
  className,
}: ChatPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<ChatPerformanceMetrics>({
    messageCount: 0,
    loadTime: 0,
    sendTime: 0,
    memoryUsage: 0,
    networkStatus: navigator.onLine ? "online" : "offline",
    lastSync: Date.now(),
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateMetrics = () => {
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: getMemoryUsage(),
        networkStatus: navigator.onLine ? "online" : "offline",
      }));
    };

    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [enabled]);

  const getMemoryUsage = (): number => {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (value: number, thresholds: number[]): string => {
    if (value <= thresholds[0]) return "text-green-500";
    if (value <= thresholds[1]) return "text-yellow-500";
    return "text-red-500";
  };

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-black/90 text-white rounded-lg transition-all duration-200",
        isExpanded ? "w-72 p-4" : "w-12 h-12",
        className,
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        {isExpanded ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Chat Monitor</h3>
              <span className="text-xs opacity-70">×</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Messages:</span>
                <span>{metrics.messageCount}</span>
              </div>

              <div className="flex justify-between">
                <span>Load Time:</span>
                <span className={getStatusColor(metrics.loadTime, [500, 1000])}>
                  {formatTime(metrics.loadTime)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Send Time:</span>
                <span className={getStatusColor(metrics.sendTime, [200, 500])}>
                  {formatTime(metrics.sendTime)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Memory:</span>
                <span
                  className={getStatusColor(metrics.memoryUsage, [50, 100])}
                >
                  {metrics.memoryUsage}MB
                </span>
              </div>

              <div className="flex justify-between">
                <span>Network:</span>
                <span
                  className={
                    metrics.networkStatus === "online"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {metrics.networkStatus}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span className="text-gray-400">
                  {formatTime(Date.now() - metrics.lastSync)} ago
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-600 text-xs opacity-70">
              <div>💡 Chat Performance Monitor</div>
              <div>Green: Good, Yellow: OK, Red: Slow</div>
            </div>
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center">
            <span className="text-xs">📊</span>
          </div>
        )}
      </button>
    </div>
  );
}

// Hook for tracking chat performance
export function useChatPerformance() {
  const [metrics, setMetrics] = useState({
    messagesSent: 0,
    messagesReceived: 0,
    averageSendTime: 0,
    averageLoadTime: 0,
    errorCount: 0,
  });

  const trackMessageSent = (sendTime: number) => {
    setMetrics((prev) => ({
      ...prev,
      messagesSent: prev.messagesSent + 1,
      averageSendTime:
        (prev.averageSendTime * (prev.messagesSent - 1) + sendTime) /
        prev.messagesSent,
    }));
  };

  const trackMessageReceived = () => {
    setMetrics((prev) => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
    }));
  };

  const trackLoadTime = (loadTime: number) => {
    setMetrics((prev) => ({
      ...prev,
      averageLoadTime:
        prev.averageLoadTime === 0
          ? loadTime
          : (prev.averageLoadTime + loadTime) / 2,
    }));
  };

  const trackError = () => {
    setMetrics((prev) => ({
      ...prev,
      errorCount: prev.errorCount + 1,
    }));
  };

  return {
    metrics,
    trackMessageSent,
    trackMessageReceived,
    trackLoadTime,
    trackError,
  };
}
