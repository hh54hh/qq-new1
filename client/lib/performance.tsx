/**
 * Performance Optimization Utilities for Barber App
 * Includes lazy loading, image optimization, and compression
 */

import React, { Suspense, lazy, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Lazy loading utility
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-golden-500"></div>
          </div>
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Optimized image component with lazy loading
interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  placeholder,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      },
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  // Generate optimized src for different formats
  const getOptimizedSrc = (originalSrc: string, format?: string) => {
    if (originalSrc.startsWith("data:") || originalSrc.startsWith("blob:")) {
      return originalSrc;
    }

    // If it's already a full URL, return as is
    if (originalSrc.startsWith("http")) {
      return originalSrc;
    }

    // For local images, you could implement format conversion here
    return originalSrc;
  };

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {!isLoaded && !isError && (
        <div
          className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center"
          style={{
            backgroundColor: placeholder || "hsl(var(--muted))",
          }}
        >
          <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-sm">فشل تحميل الصورة</div>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && !isError && (
        <img
          src={getOptimizedSrc(src)}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            "w-full h-full object-cover",
          )}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

// Progressive loading component for lists
interface ProgressiveListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  batchSize?: number;
  loadDelay?: number;
  className?: string;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function ProgressiveList<T>({
  items,
  renderItem,
  batchSize = 10,
  loadDelay = 100,
  className,
  loadingComponent,
  emptyComponent,
}: ProgressiveListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= items.length) return;

    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      setIsLoading(false);
    }, loadDelay);
  }, [isLoading, visibleCount, items.length, batchSize, loadDelay]);

  // Intersection observer for auto-loading
  const observerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <div className={className}>
        {emptyComponent || (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد عناصر للعرض
          </div>
        )}
      </div>
    );
  }

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={index} className="fade-in">
          {renderItem(item, index)}
        </div>
      ))}

      {hasMore && (
        <div ref={observerRef} className="text-center py-4">
          {isLoading ? (
            loadingComponent || (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-golden-500"></div>
                <span className="text-sm text-muted-foreground">
                  جاري التحميل...
                </span>
              </div>
            )
          ) : (
            <button
              onClick={loadMore}
              className="text-sm text-primary hover:underline"
            >
              تحميل المزيد ({items.length - visibleCount} متبقي)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Virtual scrolling for large lists
interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: "relative" }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: "absolute",
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: "100%",
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Code splitting and lazy route components
export const LazyCustomerDashboard = createLazyComponent(
  () => import("../pages/CustomerDashboard"),
);

export const LazyBarberDashboard = createLazyComponent(
  () => import("../pages/BarberDashboard"),
);

export const LazyAdminDashboard = createLazyComponent(
  () => import("../pages/AdminDashboard"),
);

export const LazyMessagesPage = createLazyComponent(
  () => import("../pages/MessagesPage"),
);

export const LazyNotificationsCenter = createLazyComponent(
  () => import("../pages/NotificationsCenter"),
);

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  }>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
  });

  useEffect(() => {
    // Performance metrics
    const loadTime = performance.now();

    // Memory usage (if available)
    const getMemoryUsage = () => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    };

    const updateMetrics = () => {
      setMetrics({
        loadTime: performance.now() - loadTime,
        renderTime: performance.now(),
        memoryUsage: getMemoryUsage(),
      });
    };

    // Initial measurement
    updateMetrics();

    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

// Resource preloader
export function preloadResources(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to preload ${url}`));
        document.head.appendChild(link);
      });
    }),
  );
}

// Critical CSS injection
export function injectCriticalCSS(css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== "development") return;

  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const styles = Array.from(document.querySelectorAll("link[rel=stylesheet]"));

  console.group("📦 Bundle Analysis");
  console.log("Scripts:", scripts.length);
  console.log("Stylesheets:", styles.length);

  scripts.forEach((script: HTMLScriptElement) => {
    console.log(`📄 ${script.src}`);
  });

  styles.forEach((style: HTMLLinkElement) => {
    console.log(`🎨 ${style.href}`);
  });

  console.groupEnd();
}
