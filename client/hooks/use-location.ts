import { useState, useEffect, useCallback } from "react";

export interface UserLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface LocationState {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

const LOCATION_STORAGE_KEY = "user_location";
const PERMISSION_STORAGE_KEY = "location_permission_requested";

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    isLoading: false,
    error: null,
    hasPermission: null,
  });

  // Add debug function to window for testing
  useEffect(() => {
    (window as any).debugLocation = {
      checkSupport: () => {
        console.log("Geolocation supported:", !!navigator.geolocation);
        console.log("Is HTTPS:", location.protocol === "https:");
        console.log("Is localhost:", location.hostname === "localhost");
        return !!navigator.geolocation;
      },
      testPermission: async () => {
        if ("permissions" in navigator) {
          try {
            const permission = await navigator.permissions.query({
              name: "geolocation",
            });
            console.log("Permission state:", permission.state);
            return permission.state;
          } catch (e) {
            console.log("Permissions API error:", e);
            return "unknown";
          }
        } else {
          console.log("Permissions API not available");
          return "unknown";
        }
      },
      requestLocation: () => {
        console.log("Manual location request...");
        navigator.geolocation.getCurrentPosition(
          (pos) => console.log("Success:", pos.coords),
          (err) =>
            console.log("Error:", {
              code: err.code,
              message: (err as any).message || "Location error",
            }),
          { enableHighAccuracy: true, timeout: 15000 },
        );
      },
    };

    return () => {
      delete (window as any).debugLocation;
    };
  }, []);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setState((prev) => ({ ...prev, location, hasPermission: true }));
      } catch (error) {
        console.warn("Failed to parse saved location:", error);
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
  }, []);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        hasPermission: false,
        error: "الجهاز لا يدعم تحديد الموقع",
      }));
      return false;
    }

    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      const hasPermission = permission.state === "granted";
      setState((prev) => ({ ...prev, hasPermission }));
      return hasPermission;
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      console.log(
        "Permissions API not supported:",
        error instanceof Error ? error.message : String(error),
      );
      return true; // We'll find out when we try to get location
    }
  }, []);

  const requestLocation =
    useCallback(async (): Promise<UserLocation | null> => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          hasPermission: false,
          error: "الجهاز لا يدعم تحديد الموقع",
          isLoading: false,
        }));
        return null;
      }

      // Check if we're on HTTPS (required for geolocation in production)
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        console.warn("Geolocation requires HTTPS in production environments");
        setState((prev) => ({
          ...prev,
          hasPermission: false,
          error: "تحديد الموقع يتطلب اتصالاً آمناً (HTTPS)",
          isLoading: false,
        }));
        return null;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      console.log("Requesting location permission and coordinates...");
      console.log("Environment details:", {
        protocol: location.protocol,
        hostname: location.hostname,
        isSecure:
          location.protocol === "https:" || location.hostname === "localhost",
        userAgent: navigator.userAgent,
        hasGeolocation: !!navigator.geolocation,
        hasPermissions: "permissions" in navigator,
      });

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Try to get address from coordinates (reverse geocoding)
            let address = "الموقع الحالي";
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
              );
              const data = await response.json();
              if (data.locality || data.city) {
                address = data.locality || data.city;
              }
            } catch (error) {
              console.log(
                "Could not get address, using default. Error:",
                error instanceof Error ? error.message : String(error),
              );
            }

            const location: UserLocation = { lat, lng, address };

            // Save to localStorage
            localStorage.setItem(
              LOCATION_STORAGE_KEY,
              JSON.stringify(location),
            );
            localStorage.setItem(PERMISSION_STORAGE_KEY, "true");

            setState((prev) => ({
              ...prev,
              location,
              isLoading: false,
              hasPermission: true,
              error: null,
            }));

            resolve(location);
          },
          (error) => {
            // Properly format error details for logging
            const errorDetails = {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.PERMISSION_DENIED,
              POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
              TIMEOUT: error.TIMEOUT,
            };

            console.error("Location error details:", errorDetails);
            console.error("Raw error object:", error);

            let errorMessage = "لا يمكن الحصول على موقعك الحالي";
            let technicalDetails = "";

            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "تم رفض إذن الوصول للموقع";
                technicalDetails =
                  "المستخدم رفض الإذن أو المتصفح منع الوصول للموقع";
                setState((prev) => ({ ...prev, hasPermission: false }));
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "معلومات الموقع غير متوفرة";
                technicalDetails = "نظام تحديد الموقع غير متاح أو معطل";
                break;
              case error.TIMEOUT:
                errorMessage = "انتهت مهلة الحصول على الموقع";
                technicalDetails =
                  "استغرق الحصول على الموقع وقتاً أطول من المتوقع";
                break;
              default:
                errorMessage = "حدث خطأ في تحديد الموقع";
                technicalDetails = `كود الخطأ: ${error.code || "غير معروف"}, الرسالة: ${error.message || "غير متوفرة"}`;
                break;
            }

            console.log("Location error translation:", technicalDetails);

            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMessage,
            }));

            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000, // 5 minutes
          },
        );
      });
    }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      location: null,
      hasPermission: null,
      error: null,
    }));
  }, []);

  const isPermissionRequested = useCallback(() => {
    return localStorage.getItem(PERMISSION_STORAGE_KEY) === "true";
  }, []);

  return {
    ...state,
    requestLocation,
    checkPermission,
    clearLocation,
    isPermissionRequested,
  };
}
