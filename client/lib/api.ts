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

      // إذا كان على Netlify (أي موقع يحتوي على netlify في الاسم)
      if (
        hostname.includes("netlify.app") ||
        hostname.includes("netlify.com") ||
        hostname.includes("netlify")
      ) {
        console.log("🌐 Detected Netlify deployment, using Functions path");
        return window.location.origin + "/.netlify/functions";
      }

      // لجميع البيئات الأخ��ى (fly.dev وغيرها) استخدم /api العادي
      return window.location.origin + "/api";
    }
    // للخادم أو SSR
    return "/api";
  }

  private async verifyApiUrl(): Promise<void> {
    if (this.apiUrlVerified || typeof window === "undefined") return;

    const hostname = window.location.hostname;
    console.log("🔍 بدء التحقق من API URL:", {
      hostname,
      currentBaseUrl: this.baseUrl,
    });

    // إذا كان على Netlify، استخدم مسار Functions مباشرة دون اختبار
    if (hostname.includes("netlify")) {
      this.baseUrl = window.location.origin + "/.netlify/functions/api";
      this.apiUrlVerified = true;
      console.log("✅ Netlify detected - using functions path directly");
      return;
    }

    // للبيئات الأخرى، اختبر ال��سارات المختلفة
    const possiblePaths = ["/api", "/.netlify/functions/api"];

    for (const path of possiblePaths) {
      try {
        const testUrl = window.location.origin + path + "/ping";
        console.log(`⏳ اختبار: ${testUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(testUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ API متاح على: ${path}`);
          this.baseUrl = window.location.origin + path;
          this.apiUrlVerified = true;
          return;
        } else {
          console.log(`❌ API غير متاح على ${path}: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ خطأ في الاتصال بـ ${path}:`, error);
      }
    }

    console.warn("⚠️ لم يتم العثور على API على أي من المسارات المتوقعة");
    // في حالة عدم العثور على API، استخدم المسار الافتراضي
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
      "/messages",
      "/barbers",
      "/notifications",
      "/api/auth/profile",
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
    // التحقق من صحة مسار API إذا لم يتم التحقق مسبقاً
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

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

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
                "البيانات المد��لة غير صحيحة، يرجى التحقق من جميع الحقول";
              errorType = "VALIDATION_ERROR";
              break;
            case 401:
              if (endpoint.includes("/api/auth/login")) {
                errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
                errorType = "LOGIN_FAILED";
                suggestion =
                  "تأكد من ص��ة البريد وكلمة المرور، أو أنشئ حساب جديد إذا لم يكن لديك حساب";
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
              errorMessage = "غير مصرح لك بالوصول إلى هذه الخدمة";
              errorType = "AUTHORIZATION_ERROR";
              break;
            case 404:
              errorMessage = "خ��مة API غير متوفرة - مشكلة في إعدادات الخادم";
              errorType = "API_NOT_FOUND_ERROR";
              suggestion =
                "يبدو أن هناك مشكلة في إعدادات الخادم. اتصل بالدعم الفني على: 07800657822";
              break;
            case 409:
              errorMessage = "البيانات موجودة بالفعل في النظام";
              errorType = "CONFLICT_ERROR";
              break;
            case 429:
              errorMessage =
                "تم تجاوز عدد المحاولات المسموحة، يرجى ال��نتظار والمحاولة مرة أخرى";
              errorType = "RATE_LIMIT_ERROR";
              suggestion = "انتظر دقيقة واحدة ثم حاول مرة أخرى";
              break;
            case 500:
              errorMessage = "خطأ في الخادم، يرجى المحاولة مرة أخرى";
              errorType = "SERVER_ERROR";
              suggestion =
                "إذا استمرت المشكلة، اتصل بالدعم الفني على: 07800657822";
              break;
            case 502:
              errorMessage = "الخادم غير متاح حالياً، يرجى المحاولة لاح��اً";
              errorType = "BAD_GATEWAY_ERROR";
              break;
            case 503:
              errorMessage = "الخدمة غير متاحة مؤقتاً للصيانة";
              errorType = "SERVICE_UNAVAILABLE_ERROR";
              suggestion = "يرجى المحاولة خلال بضع دقائق";
              break;
            case 504:
              errorMessage = "انتهت مهلة الاتصا��، يرجى المحاولة مرة أخرى";
              errorType = "TIMEOUT_ERROR";
              break;
            default:
              errorMessage = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
              errorType = "UNKNOWN_ERROR";
          }
        }

        console.error(`API Error [${response.status}]:`, {
          message: errorMessage,
          details: errorDetails,
          errorType,
          suggestion,
          url,
          method: options.method || "GET",
        });

        // إنشاء خطأ مخصص مع معلومات إضافية
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
      // Handle network errors with detailed messages
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network error:", { error, url });

        let networkErrorMessage = "خطأ في الاتصال بالخادم";
        let suggestion = "��حقق من الاتصال بالإنترنت وحاول مرة أخرى";

        if (error.message.includes("Failed to fetch")) {
          networkErrorMessage = "فشل في الاتصال بالخادم";
          suggestion = "تحقق من اتصال الإنترنت أو أن الخادم متاح";
        } else if (error.message.includes("NetworkError")) {
          networkErrorMessage = "خطأ في ا��شبكة";
          suggestion = "تحقق من اتصال Wi-Fi أو بيانات الهات��";
        } else if (error.message.includes("timeout")) {
          networkErrorMessage = "انتهت مهلة الاتصال";
          suggestion = "الاتصال بطيء، يرجى المحاولة مرة أخرى";
        }

        const networkError = new Error(networkErrorMessage) as any;
        networkError.errorType = "NETWORK_ERROR";
        networkError.suggestion = suggestion;
        networkError.originalError = error.message;

        ErrorHandler.handle(networkError, "API Request");
        throw networkError;
      }

      // Handle custom errors (already processed)
      if (error && typeof error === "object" && "errorType" in error) {
        throw error;
      }

      // Handle unexpected errors
      console.error("Unexpected API error:", { error, url, endpoint });

      const unexpectedError = new Error(
        "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
      ) as any;
      unexpectedError.errorType = "UNEXPECTED_ERROR";
      unexpectedError.originalError =
        error instanceof Error ? error.message : String(error);
      unexpectedError.suggestion =
        "إذا استمرت المشكلة، اتصل بالدعم الفني على: 07800657822";

      throw unexpectedError;
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
      const result = await this.request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password } as LoginRequest),
      });
      console.log("Login successful:", { user: result.user.name });
      return result;
    } catch (error) {
      console.error("Login failed:", error);
      console.error("Login attempt details:", {
        endpoint: "/api/auth/login",
        email,
        emailTrimmed: email.trim(),
        passwordProvided: !!password,
        baseUrl: this.baseUrl,
      });
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>("/api/auth/profile");
  }

  async updateProfile(profileData: {
    avatar_url?: string;
    name?: string;
    email?: string;
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  // Barbers
  async getBarbers(): Promise<GetBarbersResponse> {
    return this.request<GetBarbersResponse>("/barbers");
  }

  // Users (alias for getBarbers for compatibility)
  async getUsers(): Promise<User[]> {
    const response = await this.getBarbers();
    return response.barbers || [];
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

  // Post Likes
  async likePost(postId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/posts/${postId}/like`, {
      method: "POST",
    });
  }

  async unlikePost(postId: string): Promise<void> {
    return this.request<void>(`/posts/${postId}/like`, {
      method: "DELETE",
    });
  }

  // Post Comments
  async getPostComments(
    postId: string,
  ): Promise<{ comments: any[]; total: number }> {
    try {
      return await this.request<{ comments: any[]; total: number }>(
        `/posts/${postId}/comments`,
      );
    } catch (error) {
      console.warn("Comments endpoint not available, returning empty array");
      return { comments: [], total: 0 };
    }
  }

  async createPostComment(postId: string, comment: string): Promise<any> {
    try {
      return await this.request<any>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      });
    } catch (error) {
      console.warn("Comment creation failed:", error);
      // إنشاء تعليق مؤقت للعرض
      return {
        id: Date.now().toString(),
        user: {
          id: "current",
          name: "أنت",
          avatar_url: null,
        },
        comment,
        created_at: new Date().toISOString(),
      };
    }
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

  // Messages
  async getConversations(): Promise<{ conversations: any[] }> {
    return this.request<{ conversations: any[] }>("/messages/conversations");
  }

  async getMessages(otherUserId: string): Promise<{ messages: any[] }> {
    return this.request<{ messages: any[] }>(`/messages/${otherUserId}`);
  }

  async sendMessage(messageData: {
    receiver_id: string;
    content: string;
    message_type?: string;
  }): Promise<{ message: any; success: boolean }> {
    return this.request<{ message: any; success: boolean }>("/messages", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  }

  async markMessagesAsRead(senderId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${senderId}/read`, {
      method: "PATCH",
    });
  }

  async getUnreadMessageCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/messages/unread-count");
  }

  async deleteConversation(otherUserId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${otherUserId}`, {
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
}

// Create singleton instance
const apiClient = new ApiClient();

// دالة تشخيص سريعة لاختبار API
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
