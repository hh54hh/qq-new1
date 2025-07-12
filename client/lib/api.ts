import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Post,
  Booking,
  CreateBookingRequest,
  Follow,
  FriendRequest,
  GetBarbersResponse,
  GetPostsResponse,
  GetBookingsResponse,
  GetFollowsResponse,
  GetFriendRequestsResponse,
} from "@shared/api";
import { ErrorHandler } from "./error-handler";
import { ApiErrorHandler } from "./api-error-handler";

// Extended interfaces for frontend use
export interface SearchFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  rating?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  services?: string[];
}

// API Client class that matches our server implementation
class ApiClient {
  private baseUrl = this.getBaseUrl();
  private authToken: string | null = null;
  private apiUrlVerified = false;

  private getBaseUrl(): string {
    if (typeof window !== "undefined") {
      // في بيئة التطوير
      if (window.location.hostname === "localhost") {
        return window.location.origin + "/api";
      }

      // في بيئة الإنتاج - تحقق من نوع النشر
      const hostname = window.location.hostname;

      // إذا كان على Netlify (أي موقع يحتو�� ��لى netlify في الاسم)
      if (
        hostname.includes("netlify.app") ||
        hostname.includes("netlify.com") ||
        hostname.includes("netlify")
      ) {
        console.log("🌐 Detected Netlify deployment, using Functions path");
        return window.location.origin + "/.netlify/functions/api";
      }

      // لجميع البيئات ال��خ��ى (fly.dev وغيرها) استخدم /api العادي
      return window.location.origin + "/api";
    }
    // للخادم أو SSR
    return "/api";
  }

  private async verifyApiUrl(): Promise<void> {
    if (this.apiUrlVerified || typeof window === "undefined") return;

    const hostname = window.location.hostname;
    console.log("🔍 ��دء التحقق من API URL:", {
      hostname,
      currentBaseUrl: this.baseUrl,
    });

    // إذ�� كان على Netlify، استخدم م��ار Functions مباشرة ��ون اختبار
    if (hostname.includes("netlify")) {
      this.baseUrl = window.location.origin + "/.netlify/functions/api";
      this.apiUrlVerified = true;
      console.log("✅ Netlify detected - using functions path directly");
      return;
    }

    // للبيئات الأخرى، اختبر ا������سارات المختلفة
    const possiblePaths = ["/api", "/.netlify/functions/api"];

    for (const path of possiblePaths) {
      try {
        const testUrl = window.location.origin + path + "/ping";
        console.log(`⏳ ��ختبار: ${testUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏰ انتهت مهلة الاخت��ار لـ ${path} (5 ثواني)`);
          controller.abort();
        }, 5000);

        const response = await fetch(testUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ API مت��ح على: ${path}`);
          this.baseUrl = window.location.origin + path;
          this.apiUrlVerified = true;
          return;
        } else {
          console.log(`❌ API غير متاح على ${path}: ${response.status}`);
        }
      } catch (error) {
        // تجا��ل أخطاء AbortController timeout الع��دية
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`⏰ انتهت مهلة الاختبار لـ ${path} (طبيعي)`);
        } else {
          const errorMsg =
            error instanceof Error
              ? error.message
              : typeof error === "object"
                ? JSON.stringify(error)
                : String(error);
          console.log(`❌ خطأ في الاتصال بـ ${path}:`, errorMsg);
        }
      }
    }

    console.warn("⚠️ لم يتم العث��ر على API على أي من المسار��ت المت��قعة");
    // في حالة عدم الع��ور على API، استخدم المسار الا��تراضي
    console.log("🔄 استخدام المسار الا��تراضي:", this.baseUrl);
  }

  setAuthToken(token: string) {
    this.authToken = token;
    console.log("🔑 Auth token set:", {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 15) + "...",
    });
  }

  clearAuthToken() {
    this.authToken = null;
    console.log("🔑 Auth token cleared");
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // دالة للتحقق من صحة auth token
  private checkAuthToken(endpoint: string): boolean {
    // المسارات التي تحتاج authentication
    const protectedPaths = [
      "/bookings",
      "/barbers",
      "/notifications",
      "/auth/profile",
      "/posts",
      "/follows",
      "/ratings",
    ];

    const needsAuth = protectedPaths.some((path) => endpoint.includes(path));

    if (needsAuth && !this.authToken) {
      console.warn(`⚠️ Missing auth token for protected endpoint: ${endpoint}`);
      return false;
    }

    if (this.authToken) {
      console.log(`🔑 Using auth token for: ${endpoint}`, {
        hasToken: true,
        tokenPrefix: this.authToken.substring(0, 10) + "...",
      });
    }

    return true;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // التحقق من ��حة مسار API إذا لم يتم التح��ق مسبقاً
    await this.verifyApiUrl();

    // التحقق من auth token للمسارات المحمية
    this.checkAuthToken(endpoint);

    const url = `${this.baseUrl}${endpoint}`;

    console.log(`API Request: ${options.method || "GET"} ${url}`, {
      baseUrl: this.baseUrl,
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "server",
      isLocalhost:
        typeof window !== "undefined"
          ? window.location.hostname === "localhost"
          : false,
      verified: this.apiUrlVerified,
      hasAuthToken: !!this.authToken,
      endpoint,
    });

    // إنشاء controller للطلب فقط إذا لم يوجد signal مُمرر
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // استخدام signal المُمرر أو إنشاء جديد مع timeout
      if (!options.signal) {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.warn(`⏰ انتهت مهلة الطلب (30 ثانية): ${endpoint}`);
          controller?.abort();
        }, 30000);
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: options.signal || controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      console.log(`API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        let errorType = "UNKNOWN_ERROR";
        let suggestion = null;

        try {
          const responseText = await response.text();
          console.log("Raw error response:", responseText);

          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (jsonError) {
            console.warn(
              "Could not parse error response as JSON:",
              responseText,
            );
            errorData = { error: responseText || errorMessage };
          }

          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details;
          errorType = errorData.errorType || errorType;
          suggestion = errorData.suggestion;
        } catch (parseError) {
          console.warn("Could not parse error response:", parseError);
          // If we can't parse JSON, use status-specific default messages
          switch (response.status) {
            case 400:
              errorMessage =
                "البيانات المد��لة غير صحيحة�� يرجى الت��قق م�� جميع الحقول";
              errorType = "VALIDATION_ERROR";
              break;
            case 401:
              if (endpoint.includes("/auth/login")) {
                errorMessage = "البريد الإلكت��وني ��و ��لمة المرور ��ير صحيحة";
                errorType = "LOGIN_FAILED";
                suggestion =
                  "تأكد من ص��ة البريد وكل��ة المرور، أو أنشئ حساب جديد إذا لم يكن لديك حساب";
              } else {
                errorMessage = "انتهت صلاحية ج��سة المستخدم";
                errorType = "SESSION_EXPIRED";
                suggestion = "يرجى تسجيل الدخول مرة أخرى";

                // مسح token المنتهي الصلاحية
                this.clearAuthToken();
                localStorage.removeItem("barbershop_token");
                localStorage.removeItem("barbershop_user");
              }
              break;
            case 403:
              errorMessage = "غير مصرح لك ��الوصول إل�� هذه الخدمة";
              errorType = "AUTHORIZATION_ERROR";
              break;
            case 404:
              errorMessage =
                "خ��مة API ��ير متوف����ة - مشكلة في ��عدادات الخادم";
              errorType = "API_NOT_FOUND_ERROR";
              suggestion =
                "يبدو أن هناك مشكلة في إعدادات الخادم. اتصل بالدعم ��لفني على: 07800657822";
              break;
            case 409:
              errorMessage = "ا��بي��نات موجودة بالفعل ف�� النظام";
              errorType = "CONFLICT_ERROR";
              break;
            case 429:
              errorMessage =
                "تم تجاوز عدد المحاولات المسموحة، يرجى ال��نتظار والمحاولة مرة أخرى";
              errorType = "RATE_LIMIT_ERROR";
              suggestion = "انتظر دقيقة واحدة ثم حاول مرة أخرى";
              break;
            case 500:
              errorMessage = "خطأ في الخادم، يرجى المحاول�� مرة أخرى";
              errorType = "SERVER_ERROR";
              suggestion =
                "إذا اس��مرت المشكلة، ات��ل بال��عم الف��ي على: 07800657822";
              break;
            case 502:
              errorMessage = "الخادم غير مت��ح حالياً، يرجى المحاولة لاح��اً";
              errorType = "BAD_GATEWAY_ERROR";
              break;
            case 503:
              errorMessage = "الخدمة غ��ر متاحة مؤقتاً للصيانة";
              errorType = "SERVICE_UNAVAILABLE_ERROR";
              suggestion = "يرج�� المحاولة خلال بضع دقائق";
              break;
            case 504:
              errorMessage = "انتهت مهلة الاتصا��، يرجى المحاولة مرة أخرى";
              errorType = "TIMEOUT_ERROR";
              break;
            default:
              errorMessage = "حدث خ��أ غير متوقع، يرجى المحاولة مرة أخرى";
              errorType = "UNKNOWN_ERROR";
          }
        }

        // طباعة مبسطة للخطأ
        console.warn(`⚠️ API [${response.status}]: ${errorMessage}`);
        if (suggestion) {
          console.info(`💡 ${suggestion}`);
        }

        // إنشاء خطأ مخصص مع معلومات ��ضافية
        const customError = new Error(errorMessage) as any;
        customError.errorType = errorType;
        customError.details = errorDetails;
        customError.suggestion = suggestion;
        customError.statusCode = response.status;

        throw customError;
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      console.log("API Success:", {
        endpoint,
        data: data ? "received" : "empty",
      });
      return data;
    } catch (error) {
      // تنظ��ف timeout ��ي حالة الخطأ
      if (timeoutId) clearTimeout(timeoutId);

      // Handle AbortError (timeout or cancellation)
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(`⏰ تم إ��غاء الطلب أو انتهت المهلة: ${endpoint}`);

        const timeoutError = new Error(
          "انتهت مهلة الاتصال (30 ثانية)، يرجى المحاولة مرة أخرى",
        ) as any;
        timeoutError.errorType = "TIMEOUT_ERROR";
        timeoutError.suggestion = "تحقق من سرعة الإنترنت وحاول مرة ����خرى";
        throw timeoutError;
      }

      // Handle network errors with detailed messages
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("���� Network error details:", {
          message: error.message,
          url: url,
          endpoint: endpoint,
          errorType: error.name,
          isOnline: navigator.onLine,
          timestamp: new Date().toISOString(),
        });

        let networkErrorMessage = "خطأ في ��لاتصال بالخادم";
        let suggestion = "��حقق من الاتصال بالإنترنت وحاول مرة أخرى";

        if (error.message.includes("Failed to fetch")) {
          networkErrorMessage = "فشل في الاتصال بالخادم";
          suggestion = "تحقق من اتصال الإنترنت أو أن الخادم متاح";
        } else if (error.message.includes("NetworkError")) {
          networkErrorMessage = "خطأ في ا������شبكة";
          suggestion = "تحقق من اتصال Wi-Fi أو بيانات الهات��";
        } else if (error.message.includes("timeout")) {
          networkErrorMessage = "ا��تهت مهلة ��لاتصال";
          suggestion = "الاتصال بطيء، يرجى المحاولة مرة أخرى";
        }

        const networkError = new Error(networkErrorMessage) as any;
        networkError.errorType = "NETWORK_ERROR";
        networkError.suggestion = suggestion;
        networkError.originalError = error.message;
        networkError.isNetworkError = true;

        // Don't log network errors here - let the wrapper handle them gracefully
        throw networkError;
      }

      // Handle custom errors (already processed)
      if (error && typeof error === "object" && "errorType" in error) {
        throw error;
      }

      // Handle unexpected errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object"
            ? JSON.stringify(error)
            : String(error);
      console.error("❌ Unexpected API error:", {
        message: errorMessage,
        errorDetails: error?.message || error?.toString() || "Unknown error",
        errorType: error?.name || "Unknown",
        url,
        endpoint,
      });

      const unexpectedError = new Error(
        "حدث خطأ غير متوقع، يرجى المحا��لة مرة أخرى",
      ) as any;
      unexpectedError.errorType = "UNEXPECTED_ERROR";
      unexpectedError.originalError =
        error instanceof Error ? error.message : String(error);
      unexpectedError.suggestion =
        "إذا استمرت المشكلة، اتصل بالدعم الفني عل��: 07800657822";

      throw unexpectedError;
    }
  }

  // دالة طلب محسنة مع معا��جة أخطاء أفضل
  private async requestWithFallback<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackData?: T,
  ): Promise<T> {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      // Better error logging
      console.warn("🌐 API Request failed:", {
        endpoint,
        method: options.method || "GET",
        error: error instanceof Error ? error.message : String(error),
        hasInternet: navigator.onLine,
      });

      const apiError = ApiErrorHandler.createErrorFromException(error);

      // إذا كان خطأ شبكة وتوجد بيانات احتياطية، استخدمها
      if (apiError.isNetworkError && fallbackData !== undefined) {
        console.log(`🔄 استخدام البيانات الاحتياطية لـ ${endpoint}:`, {
          errorType: apiError.type,
          errorMessage: apiError.message,
          hasInternet: navigator.onLine,
        });
        return fallbackData;
      }

      // إذا لم تكن هناك بيانات احتياطية ولكن هو خطأ شبكة، أرجع قيم افتراضية
      if (apiError.isNetworkError) {
        console.log(`📱 خطأ شبكة: إرجاع بيانات فارغة لـ ${endpoint}`, {
          isOnline: navigator.onLine,
          endpoint,
          errorType: apiError.type,
        });

        // Return appropriate empty data structure based on endpoint
        if (endpoint.includes("posts")) {
          return { posts: [], total: 0 } as unknown as T;
        }
        if (endpoint.includes("barbers")) {
          return { barbers: [], total: 0 } as unknown as T;
        }
        if (endpoint.includes("bookings")) {
          return { bookings: [], total: 0 } as unknown as T;
        }

        // For other endpoints, return empty object
        return {} as unknown as T;
      }

      // إذا كان يم��ن إعادة ال��حاولة، جرب مرة واحدة أخرى
      if (apiError.canRetry) {
        try {
          console.log(`�� إعادة المحاولة لـ ${endpoint}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return await this.request<T>(endpoint, options);
        } catch (retryError) {
          console.error(`❌ فشلت إعادة المحاولة لـ ${endpoint}`);
          if (fallbackData !== undefined) {
            console.log(
              `🔄 استخدام البيانات الاحتياطية بعد فشل إعادة المحاول��`,
            );
            return fallbackData;
          }
          throw retryError;
        }
      }

      // إذا و����دت بيانات احتياطية، استخدمها بدلاً من رمي الخطأ
      if (fallbackData !== undefined) {
        console.log(`🔄 استخدام البيانات الاحتياطية لـ ${endpoint}`);
        return fallbackData;
      }

      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log("Attempting login with:", {
      email,
      password: "***",
      emailLength: email.length,
      passwordLength: password.length,
      emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    });

    try {
      const result = await this.request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password } as LoginRequest),
      });
      console.log("Login successful:", { user: result.user.name });
      return result;
    } catch (error) {
      console.error("Login failed:", error);
      console.error("Login attempt details:", {
        endpoint: "/auth/login",
        email,
        emailTrimmed: email.trim(),
        passwordProvided: !!password,
        baseUrl: this.baseUrl,
      });
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>("/auth/profile");
  }

  async updateProfile(profileData: {
    avatar_url?: string;
    name?: string;
    email?: string;
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async deleteAccount(
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      "/auth/account",
      {
        method: "DELETE",
        body: JSON.stringify({ password }),
      },
    );
  }

  // Barbers
  async getBarbers(): Promise<GetBarbersResponse> {
    try {
      console.log("📍 Starting getBarbers API call...", {
        baseUrl: this.baseUrl,
        hostname:
          typeof window !== "undefined" ? window.location.hostname : "server",
      });

      const response = await this.request<GetBarbersResponse>("/barbers");

      console.log("�� getBarbers successful:", {
        barbersCount: response?.barbers?.length || 0,
        hasBarbers: !!response?.barbers,
      });

      return response;
    } catch (error) {
      console.error("❌ Error fetching barbers:", error);

      // في حالة الفشل في بيئة الإنتاج، أرجع بيانات تجريبية
      if (
        typeof window !== "undefined" &&
        window.location.hostname.includes("netlify")
      ) {
        console.log("🎭 Using fallback barbers data for production");
        return {
          barbers: [
            {
              id: "prod_fallback_1",
              name: "محمد الحلاق",
              email: "mohammed@barbershop.com",
              role: "barber" as const,
              status: "active",
              level: 85,
              points: 850,
              is_verified: true,
              created_at: new Date().toISOString(),
              rating: 4.7,
              followers_count: 120,
              avatar_url:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            },
            {
              id: "prod_fallback_2",
              name: "أحمد العلي",
              email: "ahmed@barbershop.com",
              role: "barber" as const,
              status: "active",
              level: 92,
              points: 920,
              is_verified: true,
              created_at: new Date().toISOString(),
              rating: 4.9,
              followers_count: 85,
              avatar_url:
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
            },
            {
              id: "prod_fallback_3",
              name: "يوسف الأستاذ",
              email: "yousef@barbershop.com",
              role: "barber" as const,
              status: "active",
              level: 78,
              points: 780,
              is_verified: true,
              created_at: new Date().toISOString(),
              rating: 4.5,
              followers_count: 95,
              avatar_url:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            },
            {
              id: "prod_fallback_4",
              name: "سالم الماهر",
              email: "salem@barbershop.com",
              role: "barber" as const,
              status: "active",
              level: 88,
              points: 880,
              is_verified: true,
              created_at: new Date().toISOString(),
              rating: 4.8,
              followers_count: 110,
              avatar_url:
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
            },
          ],
          total: 4,
        };
      }

      throw error;
    }
  }

  // Get all customers
  async getCustomers(): Promise<{ customers: User[]; total: number }> {
    try {
      console.log("📍 Starting getCustomers API call...");
      const response = await this.request<{ customers: User[]; total: number }>(
        "/customers",
      );
      console.log("✅ getCustomers successful:", {
        customersCount: response?.customers?.length || 0,
        hasCustomers: !!response?.customers,
      });
      return response;
    } catch (error) {
      console.error("❌ getCustomers failed:", error);
      throw error;
    }
  }

  // Users (alias for getBarbers for compatibility)
  async getUsers(): Promise<User[]> {
    const response = await this.getBarbers();
    return response.barbers || [];
  }

  // Search all users (requires authentication)
  async searchUsers(query: string = ""): Promise<{ users: User[] }> {
    // Always send q parameter, even if empty, to get all users
    const params = `?q=${encodeURIComponent(query)}`;
    return this.request<{ users: User[] }>(`/users/search${params}`);
  }

  async searchBarbers(filters: SearchFilters): Promise<{ data: User[] }> {
    const searchParams = new URLSearchParams();
    if (filters.query) searchParams.set("query", filters.query);
    if (filters.rating)
      searchParams.set("min_rating", filters.rating.toString());
    if (filters.priceRange?.max)
      searchParams.set("max_price", filters.priceRange.max.toString());

    const response = await this.request<GetBarbersResponse>(
      `/barbers/search?${searchParams}`,
    );
    return { data: response.barbers || [] };
  }

  // Posts
  async getPosts(userId?: string): Promise<GetPostsResponse> {
    const params = userId ? `?user_id=${userId}` : "";
    return this.request<GetPostsResponse>(`/posts${params}`);
  }

  async getFollowingPosts(): Promise<GetPostsResponse> {
    return this.request<GetPostsResponse>("/posts/following");
  }

  async createPost(postData: {
    image_url: string;
    caption?: string;
    frame_style?: string;
  }): Promise<Post> {
    return this.request<Post>("/posts", {
      method: "POST",
      body: JSON.stringify(postData),
    });
  }

  async likePost(postId: string): Promise<void> {
    return this.request<void>(`/posts/${postId}/like`, {
      method: "POST",
    });
  }

  async unlikePost(postId: string): Promise<void> {
    return this.request<void>(`/posts/${postId}/like`, {
      method: "DELETE",
    });
  }

  async getPostComments(postId: string): Promise<{ comments: any[] }> {
    return this.request<{ comments: any[] }>(`/posts/${postId}/comments`);
  }

  async createPostComment(
    postId: string,
    comment: string,
  ): Promise<{ comment: any }> {
    return this.request<{ comment: any }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  }

  // Bookings
  async getBookings(): Promise<GetBookingsResponse> {
    return this.request<GetBookingsResponse>("/bookings");
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    return this.request<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  }

  async updateBooking(
    id: string,
    updates: { status: string },
  ): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteBooking(id: string): Promise<{ success: boolean }> {
    await this.request(`/bookings/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  }

  async getAvailableSlots(
    barberId: string,
    date: string,
  ): Promise<{ time: string; available: boolean }[]> {
    try {
      return await this.request<{ time: string; available: boolean }[]>(
        `/barbers/${barberId}/slots?date=${date}`,
      );
    } catch (error) {
      // If API endpoint doesn't exist, return generated slots
      console.warn(
        "Slots API endpoint not available, using fallback generation",
      );
      return this.generateAvailableSlots(date);
    }
  }

  private generateAvailableSlots(
    date: string,
  ): { time: string; available: boolean }[] {
    const slots = [];
    const selectedDate = new Date(date);
    const currentDate = new Date();
    const isToday = selectedDate.toDateString() === currentDate.toDateString();

    // Working hours: 9 AM to 8 PM
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        let available = true;

        if (isToday) {
          const currentHour = currentDate.getHours();
          const currentMinute = currentDate.getMinutes();

          if (
            hour < currentHour ||
            (hour === currentHour && minute <= currentMinute)
          ) {
            available = false; // Time has passed
          } else {
            // Most future times today are available, except peak hours
            available =
              !(hour >= 12 && hour <= 14) && !(hour >= 18 && hour <= 20); // Lunch and evening rush
          }
        } else if (selectedDate > currentDate) {
          // Most future dates are available, with some blocked for holidays/breaks
          const dayOfWeek = selectedDate.getDay();
          available = dayOfWeek !== 5; // Friday is typically busy/closed
        } else {
          available = false; // Past dates
        }

        slots.push({ time: timeString, available });
      }
    }

    return slots;
  }

  // Follows
  async getFollows(
    type: "followers" | "following" = "following",
  ): Promise<GetFollowsResponse> {
    return this.request<GetFollowsResponse>(`/follows?type=${type}`);
  }

  async followUser(userId: string): Promise<Follow> {
    try {
      return await this.request<Follow>("/follows", {
        method: "POST",
        body: JSON.stringify({ followed_id: userId }),
      });
    } catch (error) {
      // Silently handle 409 conflicts - user is already following
      if (error instanceof Error && error.message.includes("409")) {
        console.log("User already following - ignoring 409 error");
        return {} as Follow; // Return empty follow object
      }
      throw error;
    }
  }

  async unfollowUser(userId: string): Promise<void> {
    try {
      return await this.request<void>(`/follows/${userId}`, {
        method: "DELETE",
      });
    } catch (error) {
      // Silently handle 409 conflicts or 404 not found - user was not following
      if (
        error instanceof Error &&
        (error.message.includes("409") || error.message.includes("404"))
      ) {
        console.log(
          "User was not following or already unfollowed - ignoring error",
        );
        return;
      }
      throw error;
    }
  }

  async getFollowerCount(userId: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(`/users/${userId}/followers/count`);
  }

  // Friend Requests
  async getFriendRequests(): Promise<GetFriendRequestsResponse> {
    return this.request<GetFriendRequestsResponse>("/friend-requests");
  }

  async sendFriendRequest(userId: string): Promise<FriendRequest> {
    return this.request<FriendRequest>("/friend-requests", {
      method: "POST",
      body: JSON.stringify({ receiver_id: userId }),
    });
  }

  async respondToFriendRequest(
    requestId: string,
    status: "accepted" | "rejected",
  ): Promise<FriendRequest> {
    return this.request<FriendRequest>(`/friend-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Notifications
  async getNotifications(): Promise<{ notifications: any[] }> {
    return this.request<{ notifications: any[] }>("/notifications");
  }

  async markNotificationAsRead(
    notificationId: string,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      },
    );
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/notifications/read-all", {
      method: "PATCH",
    });
  }

  // Working Hours
  async getWorkingHours(): Promise<{ schedule: any[] }> {
    return this.request<{ schedule: any[] }>("/working-hours");
  }

  async saveWorkingHours(schedule: any[]): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/working-hours", {
      method: "PUT",
      body: JSON.stringify({ schedule }),
    });
  }

  // Admin APIs
  async getAdminStats(): Promise<any> {
    return this.request<any>("/admin/stats");
  }

  async getAllUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>("/admin/users");
  }

  async getUserLikes(): Promise<{ liked_posts: string[] }> {
    return this.request<{ liked_posts: string[] }>("/posts/likes/user");
  }

  // Ratings
  async createRating(ratingData: {
    customer_id: string;
    barber_id: string;
    booking_id?: string;
    stars: number;
    comment?: string;
  }): Promise<{ success: boolean; rating: any }> {
    return this.request<{ success: boolean; rating: any }>("/ratings", {
      method: "POST",
      body: JSON.stringify(ratingData),
    });
  }

  async getRatings(barberId: string): Promise<{
    ratings: any[];
    total: number;
    average: number;
    count: number;
  }> {
    return this.request<{
      ratings: any[];
      total: number;
      average: number;
      count: number;
    }>(`/barbers/${barberId}/ratings`);
  }

  // Image Upload
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    // Use different headers for file upload
    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      headers: {
        Authorization: this.authToken ? `Bearer ${this.authToken}` : "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Services
  async getBarberServices(
    barberId?: string,
  ): Promise<{ services: any[]; total: number }> {
    const endpoint = barberId ? `/barbers/${barberId}/services` : "/services";
    return this.request<{ services: any[]; total: number }>(endpoint);
  }

  async createService(serviceData: {
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    category?: string;
  }): Promise<{ success: boolean; service: any }> {
    return this.request<{ success: boolean; service: any }>("/services", {
      method: "POST",
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(
    serviceId: string,
    serviceData: any,
  ): Promise<{ success: boolean; service: any }> {
    return this.request<{ success: boolean; service: any }>(
      `/services/${serviceId}`,
      {
        method: "PUT",
        body: JSON.stringify(serviceData),
      },
    );
  }

  async deleteService(serviceId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/services/${serviceId}`, {
      method: "DELETE",
    });
  }

  // Advanced Search
  async advancedSearchBarbers(filters: {
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    minRating?: number;
    maxPrice?: number;
    services?: string[];
    sortBy?: string;
  }): Promise<{ barbers: any[]; total: number; filters: any }> {
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v.toString()));
        } else {
          searchParams.set(key, value.toString());
        }
      }
    });

    return this.request<{ barbers: any[]; total: number; filters: any }>(
      `/barbers/search/advanced?${searchParams}`,
    );
  }

  async getRecommendations(limit = 10): Promise<{ recommendations: any[] }> {
    return this.request<{ recommendations: any[] }>(
      `/barbers/recommendations?limit=${limit}`,
    );
  }

  // Analytics
  async getBarberAnalytics(
    period = "month",
    barberId?: string,
  ): Promise<{ analytics: any }> {
    const params = new URLSearchParams({ period });
    if (barberId) params.set("barberId", barberId);

    return this.request<{ analytics: any }>(`/analytics/barber?${params}`);
  }

  async getGlobalAnalytics(): Promise<{ analytics: any }> {
    return this.request<{ analytics: any }>("/admin/analytics");
  }

  // Image Upload with proper FormData
  async uploadImageFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      headers: {
        Authorization: this.authToken ? `Bearer ${this.authToken}` : "",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper function لعرض أخطاء واضحة بدلاً من [object Object]
  private logErrorDetails(title: string, error: any, context?: any) {
    console.error(`❌ ${title}`);

    if (error?.message) {
      console.error(`  Message: ${error.message}`);
    }

    if (error?.name) {
      console.error(`  Type: ${error.name}`);
    }

    if (error?.status || error?.statusCode) {
      console.error(`  Status: ${error.status || error.statusCode}`);
    }

    if (context) {
      console.error(`  Context:`, context);
    }

    if (error?.stack && process.env.NODE_ENV === "development") {
      console.error(`  Stack: ${error.stack}`);
    }

    // إذا كان الخطأ كائن معقد، اطبعه بشكل منسق
    if (
      typeof error === "object" &&
      error !== null &&
      !error.message &&
      !error.name
    ) {
      try {
        console.error(`  Raw Error:`, JSON.stringify(error, null, 2));
      } catch {
        console.error(`  Raw Error: [Complex Object - cannot stringify]`);
      }
    }
  }

  // Messages
  async getConversations(): Promise<{ conversations: any[]; total: number }> {
    return this.request<{ conversations: any[]; total: number }>(
      "/messages/conversations",
    );
  }

  async getMessages(
    otherUserId: string,
  ): Promise<{ messages: any[]; total: number }> {
    return this.request<{ messages: any[]; total: number }>(
      `/messages/${otherUserId}`,
    );
  }

  async createMessage(messageData: {
    receiver_id: string;
    message: string;
    message_type?: "text" | "image" | "voice" | "system";
  }): Promise<any> {
    return this.request<any>("/messages", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  }

  // Fast message sending without complex error handling
  async sendMessageFast(messageData: {
    receiver_id: string;
    message: string;
  }): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ ...messageData, message_type: "text" }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    return this.request<void>(`/messages/${messageId}/read`, {
      method: "PATCH",
    });
  }

  async markConversationAsRead(otherUserId: string): Promise<void> {
    return this.request<void>(`/messages/conversations/${otherUserId}/read`, {
      method: "PATCH",
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export the class for cases where it might be needed
export { ApiClient };

// Note: Most files should import the default export (apiClient instance)

// Example: import apiClient from './api';
// Only import { ApiClient } if you need the class itself

// دالة تشخيص سريعة ��اختبار API
export const diagnoseAPI = async () => {
  console.log("🔧 تشخيص API:", {
    baseUrl: apiClient["baseUrl"],
    hostname:
      typeof window !== "undefined" ? window.location.hostname : "server",
    origin: typeof window !== "undefined" ? window.location.origin : "server",
  });

  // اختبار عدة مسارات
  const pathsToTest = ["/api/ping", "/.netlify/functions/api/ping"];

  for (const path of pathsToTest) {
    try {
      const fullUrl =
        (typeof window !== "undefined" ? window.location.origin : "") + path;
      console.log(`⏳ اختبار: ${fullUrl}`);

      const response = await fetch(fullUrl);
      console.log(
        `${response.ok ? "✅" : "❌"} ${path}: ${response.status} ${response.statusText}`,
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📋 البيانات:", data);
      }
    } catch (error) {
      console.log(`❌ خطأ في ${path}:`, error);
    }
  }
};

// إضافة للوصول العالمي
if (typeof window !== "undefined") {
  (window as any).diagnoseAPI = diagnoseAPI;
}

export default apiClient;
