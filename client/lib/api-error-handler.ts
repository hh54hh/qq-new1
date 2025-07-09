// معالج أخطاء محسن للـ API مع دعم العمل بدون اتصال

interface ApiError {
  message: string;
  type: string;
  suggestion?: string;
  isNetworkError: boolean;
  canRetry: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export class ApiErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
  };

  // تحديد إذا كان الخطأ خطأ شبكة
  static isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("ERR_NETWORK"))
    );
  }

  // تحديد إذا كان يمكن إعادة المحاولة
  static canRetry(error: any, statusCode?: number): boolean {
    // أخطاء الشبكة يمكن إعادة المحاولة معها
    if (this.isNetworkError(error)) {
      return true;
    }

    // أكواد HTTP التي يمكن إعادة المحاولة معها
    if (statusCode) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(statusCode);
    }

    return false;
  }

  // معالجة خطأ الشبكة وإنشاء رسالة مناسبة
  static handleNetworkError(error: any): ApiError {
    let message = "فشل في الاتصال بالخادم";
    let suggestion = "تحقق من اتصال الإنترنت وحاول مرة أخرى";

    if (error.message.includes("Failed to fetch")) {
      message = "لا يمكن الوصول للخادم";
      suggestion = "تحقق من اتصال الإنترنت أو جرب لاحقاً";
    } else if (error.message.includes("NetworkError")) {
      message = "خطأ في الشبكة";
      suggestion = "تحقق من اتصال Wi-Fi أو بيانات الهاتف";
    } else if (error.message.includes("timeout")) {
      message = "انتهت مهلة الاتصال";
      suggestion = "الاتصال بطيء، يرجى المحاولة مرة أخرى";
    }

    return {
      message,
      type: "NETWORK_ERROR",
      suggestion,
      isNetworkError: true,
      canRetry: true,
    };
  }

  // معالجة أخطاء HTTP
  static handleHttpError(status: number, responseText?: string): ApiError {
    let message = `خطأ HTTP ${status}`;
    let type = "HTTP_ERROR";
    let suggestion: string | undefined;
    let canRetry = false;

    switch (status) {
      case 400:
        message = "بيانات غير صحيحة";
        type = "VALIDATION_ERROR";
        break;
      case 401:
        message = "غير مسموح لك بالوصول";
        type = "AUTHORIZATION_ERROR";
        suggestion = "يرجى تسجيل الدخول مرة أخرى";
        break;
      case 403:
        message = "ليس لديك صلاحية للقيام بهذا الإجراء";
        type = "PERMISSION_ERROR";
        break;
      case 404:
        message = "الخدمة غير متوفرة";
        type = "NOT_FOUND_ERROR";
        break;
      case 408:
        message = "انتهت مهلة الطلب";
        type = "TIMEOUT_ERROR";
        canRetry = true;
        break;
      case 409:
        message = "البيانات موجودة بالفعل";
        type = "CONFLICT_ERROR";
        break;
      case 429:
        message = "تم تجاوز عدد المحاولات المسموحة";
        type = "RATE_LIMIT_ERROR";
        suggestion = "انتظر دقيقة واحدة ثم حاول مرة أخرى";
        canRetry = true;
        break;
      case 500:
        message = "خطأ في الخادم";
        type = "SERVER_ERROR";
        canRetry = true;
        break;
      case 502:
        message = "الخادم غير متاح حالياً";
        type = "BAD_GATEWAY_ERROR";
        canRetry = true;
        break;
      case 503:
        message = "الخدمة غير متاحة مؤقتاً";
        type = "SERVICE_UNAVAILABLE_ERROR";
        canRetry = true;
        break;
      case 504:
        message = "انتهت مهلة الاتصال بالخادم";
        type = "GATEWAY_TIMEOUT_ERROR";
        canRetry = true;
        break;
    }

    return {
      message,
      type,
      suggestion,
      isNetworkError: false,
      canRetry,
    };
  }

  // إعادة المحاولة مع تأخير تدريجي
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: any;
    let delay = finalConfig.baseDelay;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // إذا كان هذا هو آخر محاولة، ارمي الخطأ
        if (attempt === finalConfig.maxRetries) {
          throw error;
        }

        // تحقق إذا كان يمكن إعادة المحاولة
        if (!this.canRetry(error)) {
          throw error;
        }

        // انتظر قبل إعادة المحاولة
        await new Promise((resolve) => setTimeout(resolve, delay));

        // زيادة التأخير للمحاولة التالية
        if (finalConfig.exponentialBackoff) {
          delay = Math.min(delay * 2, finalConfig.maxDelay);
        }

        console.log(
          `🔄 إعادة المحاولة ${attempt + 1}/${finalConfig.maxRetries} بعد ${delay}ms`,
        );
      }
    }

    throw lastError;
  }

  // دالة للتعامل مع الأخطاء بشكل موحد
  static createErrorFromException(error: any, statusCode?: number): ApiError {
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error);
    }

    if (statusCode) {
      return this.handleHttpError(statusCode);
    }

    // خطأ عام
    return {
      message: error.message || "حدث خطأ غير متوقع",
      type: "UNKNOWN_ERROR",
      isNetworkError: false,
      canRetry: false,
    };
  }
}

// Hook للتعامل مع أخطاء API في React
export function useApiErrorHandler() {
  const handleError = (error: any, fallbackData?: any) => {
    const apiError = ApiErrorHandler.createErrorFromException(error);

    // طباعة الخطأ للتطوير
    console.error("API Error:", {
      message: apiError.message,
      type: apiError.type,
      suggestion: apiError.suggestion,
      isNetworkError: apiError.isNetworkError,
      canRetry: apiError.canRetry,
      originalError: error,
    });

    // إذا كان خطأ شبكة وتوجد بيانات احتياطية، استخدمها
    if (apiError.isNetworkError && fallbackData) {
      console.log("🔄 استخدام البيانات المحفوظة محلياً");
      return fallbackData;
    }

    // يمكن إضافة منطق إضافي هنا مثل إظهار toast notification
    return null;
  };

  const retryRequest = async <T>(operation: () => Promise<T>) => {
    return ApiErrorHandler.retryWithBackoff(operation);
  };

  return {
    handleError,
    retryRequest,
    isNetworkError: ApiErrorHandler.isNetworkError,
    canRetry: ApiErrorHandler.canRetry,
  };
}
