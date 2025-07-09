/**
 * Instant Navigation Router for Barber App
 * Provides smooth, instant navigation without page reloads
 */

import React from "react";

export type NavigationDirection = "forward" | "back" | "replace";

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  title?: string;
  preload?: boolean;
  keepAlive?: boolean;
  transition?: "slide" | "fade" | "none";
}

export interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  direction: NavigationDirection;
  isNavigating: boolean;
  history: string[];
}

export interface RouterContextValue {
  navigationState: NavigationState;
  navigate: (path: string, direction?: NavigationDirection) => void;
  goBack: () => boolean;
  preloadRoute: (path: string) => Promise<void>;
  isRouteLoaded: (path: string) => boolean;
}

// Route cache for instant loading
const routeCache = new Map<string, React.ComponentType<any>>();
const preloadedComponents = new Set<string>();

class InstantRouter {
  private listeners = new Set<(state: NavigationState) => void>();
  private state: NavigationState = {
    currentPath: "/",
    previousPath: null,
    direction: "forward",
    isNavigating: false,
    history: ["/"],
  };

  private routes = new Map<string, RouteConfig>();

  constructor() {
    this.setupHistoryListener();
    this.initializeFromCurrentLocation();
  }

  private setupHistoryListener(): void {
    window.addEventListener("popstate", () => {
      const path = window.location.pathname;
      this.navigateInternal(path, "back", false);
    });
  }

  private initializeFromCurrentLocation(): void {
    const currentPath = window.location.pathname;
    this.state = {
      ...this.state,
      currentPath,
      history: [currentPath],
    };
  }

  registerRoute(config: RouteConfig): void {
    this.routes.set(config.path, config);
    routeCache.set(config.path, config.component);

    if (config.preload) {
      this.preloadRoute(config.path);
    }
  }

  registerRoutes(configs: RouteConfig[]): void {
    configs.forEach((config) => this.registerRoute(config));
  }

  async navigate(
    path: string,
    direction: NavigationDirection = "forward",
  ): Promise<void> {
    return this.navigateInternal(path, direction, true);
  }

  private async navigateInternal(
    path: string,
    direction: NavigationDirection,
    updateHistory: boolean,
  ): Promise<void> {
    if (this.state.currentPath === path) return;

    this.updateState({
      isNavigating: true,
      direction,
    });

    try {
      await this.preloadRoute(path);

      if (updateHistory) {
        if (direction === "replace") {
          window.history.replaceState(null, "", path);
        } else {
          window.history.pushState(null, "", path);
        }
      }

      const newHistory =
        direction === "back"
          ? this.state.history.slice(0, -1)
          : direction === "replace"
            ? [...this.state.history.slice(0, -1), path]
            : [...this.state.history, path];

      this.updateState({
        previousPath: this.state.currentPath,
        currentPath: path,
        history: newHistory,
        direction,
      });

      const route = this.routes.get(path);
      if (route?.title) {
        document.title = route.title;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      console.error("Navigation failed:", error);
    } finally {
      this.updateState({
        isNavigating: false,
      });
    }
  }

  async preloadRoute(path: string): Promise<void> {
    if (preloadedComponents.has(path)) return;

    const route = this.routes.get(path);
    if (!route) {
      console.warn(`Route not found: ${path}`);
      return;
    }

    try {
      preloadedComponents.add(path);
      console.log(`✅ Preloaded route: ${path}`);
    } catch (error) {
      console.error(`Failed to preload route ${path}:`, error);
    }
  }

  goBack(): boolean {
    if (this.state.history.length <= 1) return false;

    const previousPath = this.state.history[this.state.history.length - 2];
    this.navigate(previousPath, "back");
    return true;
  }

  isRouteLoaded(path: string): boolean {
    return preloadedComponents.has(path);
  }

  getCurrentRoute(): RouteConfig | null {
    return this.routes.get(this.state.currentPath) || null;
  }

  private updateState(partial: Partial<NavigationState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState(): NavigationState {
    return { ...this.state };
  }
}

const router = new InstantRouter();

export function useInstantRouter(): RouterContextValue {
  const [navigationState, setNavigationState] = React.useState(
    router.getState(),
  );

  React.useEffect(() => {
    const unsubscribe = router.subscribe(setNavigationState);
    return unsubscribe;
  }, []);

  const navigate = React.useCallback(
    (path: string, direction?: NavigationDirection) => {
      router.navigate(path, direction);
    },
    [],
  );

  const goBack = React.useCallback(() => {
    return router.goBack();
  }, []);

  const preloadRoute = React.useCallback((path: string) => {
    return router.preloadRoute(path);
  }, []);

  const isRouteLoaded = React.useCallback((path: string) => {
    return router.isRouteLoaded(path);
  }, []);

  return {
    navigationState,
    navigate,
    goBack,
    preloadRoute,
    isRouteLoaded,
  };
}

export const RouterContext = React.createContext<RouterContextValue | null>(
  null,
);

interface InstantRouterProviderProps {
  routes: RouteConfig[];
  children: React.ReactNode;
}

export function InstantRouterProvider({
  routes,
  children,
}: InstantRouterProviderProps) {
  React.useEffect(() => {
    router.registerRoutes(routes);

    const criticalRoutes = routes.filter((route) => route.preload);
    criticalRoutes.forEach((route) => {
      router.preloadRoute(route.path);
    });
  }, [routes]);

  const contextValue = useInstantRouter();

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

export function RouteRenderer() {
  const context = React.useContext(RouterContext);
  if (!context) {
    throw new Error("RouteRenderer must be used within InstantRouterProvider");
  }

  const { navigationState } = context;
  const route = router.getCurrentRoute();

  if (!route) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">صفحة غير موجودة</h2>
          <p className="text-muted-foreground">
            لم يتم العثور على الصفحة المطلوبة
          </p>
        </div>
      </div>
    );
  }

  const Component = route.component;
  const transition = route.transition || "slide";

  const getAnimationClass = () => {
    if (navigationState.isNavigating) {
      return "opacity-50";
    }

    switch (transition) {
      case "slide":
        return navigationState.direction === "back"
          ? "slide-in-left"
          : "slide-in-right";
      case "fade":
        return "fade-in";
      default:
        return "";
    }
  };

  return (
    <div
      className={`w-full h-full transition-all duration-300 ease-out ${getAnimationClass()}`}
      key={navigationState.currentPath}
    >
      <Component />
    </div>
  );
}

interface InstantLinkProps {
  to: string;
  direction?: NavigationDirection;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}

export function InstantLink({
  to,
  direction = "forward",
  className,
  children,
  onNavigate,
  ...props
}: InstantLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useInstantRouter();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();

    if (onNavigate) {
      onNavigate();
    }

    navigate(to, direction);
  };

  return (
    <a
      href={to}
      className={className}
      onClick={handleClick}
      {...props}
      style={{ cursor: "pointer" }}
    >
      {children}
    </a>
  );
}

export function useNavigationGuard(
  guard: (from: string, to: string) => boolean | Promise<boolean>,
) {
  const { navigationState } = useInstantRouter();

  React.useEffect(() => {
    // Navigation guard implementation would go here
  }, [guard, navigationState]);
}

export function useRoutePreloader(routes: string[]) {
  const { preloadRoute } = useInstantRouter();

  React.useEffect(() => {
    const preloadPromises = routes.map((route) => preloadRoute(route));
    Promise.all(preloadPromises).catch((error) => {
      console.warn("Failed to preload some routes:", error);
    });
  }, [routes, preloadRoute]);
}

export { router as instantRouter };
