/**
 * Performance Monitor for Ultra-Fast Loading
 * Tracks and optimizes loading times to ensure <50ms response
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  source: string;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeOperations = new Map<string, PerformanceMetric>();

  // Performance thresholds (in milliseconds)
  private readonly thresholds = {
    ultraFast: 50, // Instagram-level
    fast: 100, // Good
    acceptable: 200, // Acceptable
    slow: 500, // Needs optimization
  };

  startOperation(operation: string, source: string, metadata?: any): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      source,
      metadata,
    };

    this.activeOperations.set(id, metric);
    return id;
  }

  endOperation(id: string): PerformanceMetric | null {
    const metric = this.activeOperations.get(id);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.activeOperations.delete(id);
    this.metrics.push(metric);

    // Log performance
    this.logPerformance(metric);

    // Keep only recent metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }

    return metric;
  }

  private logPerformance(metric: PerformanceMetric): void {
    const { operation, duration = 0, source } = metric;

    let level = "🚀"; // Ultra-fast
    let color = "color: #00ff00";

    if (duration > this.thresholds.slow) {
      level = "🐌"; // Slow
      color = "color: #ff0000";
    } else if (duration > this.thresholds.acceptable) {
      level = "⚠️"; // Needs optimization
      color = "color: #ff8800";
    } else if (duration > this.thresholds.fast) {
      level = "✅"; // Good
      color = "color: #88ff00";
    } else if (duration > this.thresholds.ultraFast) {
      level = "⚡"; // Fast
      color = "color: #00ff88";
    }

    console.log(
      `%c${level} ${operation}: ${duration.toFixed(1)}ms (${source})`,
      color,
    );

    // Warn about slow operations
    if (duration > this.thresholds.acceptable) {
      console.warn(
        `Performance Warning: ${operation} took ${duration.toFixed(1)}ms from ${source}. Target: <${this.thresholds.ultraFast}ms`,
      );
    }
  }

  // Quick measurement helper
  async measureAsync<T>(
    operation: string,
    source: string,
    fn: () => Promise<T>,
    metadata?: any,
  ): Promise<T> {
    const id = this.startOperation(operation, source, metadata);
    try {
      const result = await fn();
      this.endOperation(id);
      return result;
    } catch (error) {
      this.endOperation(id);
      throw error;
    }
  }

  measureSync<T>(
    operation: string,
    source: string,
    fn: () => T,
    metadata?: any,
  ): T {
    const id = this.startOperation(operation, source, metadata);
    try {
      const result = fn();
      this.endOperation(id);
      return result;
    } catch (error) {
      this.endOperation(id);
      throw error;
    }
  }

  // Analytics
  getPerformanceStats(): {
    averageDuration: number;
    ultraFastCount: number;
    fastCount: number;
    slowCount: number;
    totalOperations: number;
    recentMetrics: PerformanceMetric[];
  } {
    const recentMetrics = this.metrics.slice(-20);
    const totalDuration = recentMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );

    return {
      averageDuration:
        recentMetrics.length > 0 ? totalDuration / recentMetrics.length : 0,
      ultraFastCount: recentMetrics.filter(
        (m) => (m.duration || 0) <= this.thresholds.ultraFast,
      ).length,
      fastCount: recentMetrics.filter(
        (m) =>
          (m.duration || 0) <= this.thresholds.fast &&
          (m.duration || 0) > this.thresholds.ultraFast,
      ).length,
      slowCount: recentMetrics.filter(
        (m) => (m.duration || 0) > this.thresholds.acceptable,
      ).length,
      totalOperations: recentMetrics.length,
      recentMetrics,
    };
  }

  // Performance report
  generateReport(): string {
    const stats = this.getPerformanceStats();
    const ultraFastPercent =
      stats.totalOperations > 0
        ? ((stats.ultraFastCount / stats.totalOperations) * 100).toFixed(1)
        : "0";
    const slowPercent =
      stats.totalOperations > 0
        ? ((stats.slowCount / stats.totalOperations) * 100).toFixed(1)
        : "0";

    return `
🚀 Performance Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Operations: ${stats.totalOperations}
⚡ Ultra-Fast (<50ms): ${stats.ultraFastCount} (${ultraFastPercent}%)
✅ Fast (50-100ms): ${stats.fastCount}
🐌 Slow (>200ms): ${stats.slowCount} (${slowPercent}%)
📈 Average: ${stats.averageDuration.toFixed(1)}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: >80% ultra-fast operations
    `;
  }

  // Clear metrics
  clear(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Convenient helpers
export const measurePerformance = {
  async: performanceMonitor.measureAsync.bind(performanceMonitor),
  sync: performanceMonitor.measureSync.bind(performanceMonitor),
  start: performanceMonitor.startOperation.bind(performanceMonitor),
  end: performanceMonitor.endOperation.bind(performanceMonitor),
  stats: performanceMonitor.getPerformanceStats.bind(performanceMonitor),
  report: performanceMonitor.generateReport.bind(performanceMonitor),
};

// Make globally available for debugging
if (typeof window !== "undefined") {
  (window as any).performanceMonitor = performanceMonitor;
  (window as any).showPerformanceReport = () =>
    console.log(performanceMonitor.generateReport());
}

export default performanceMonitor;
