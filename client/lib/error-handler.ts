import { toast } from "@/hooks/use-toast";

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  severity: "info" | "warning" | "error" | "critical";
}

export class ErrorHandler {
  static handle(error: any, context?: string): void {
    console.error(`Error in ${context || "unknown context"}:`, error);

    let userMessage = "حدث خطأ غير متوقع";
    let severity: AppError["severity"] = "error";

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      userMessage = "تحقق من اتصال الإنترنت";
      severity = "warning";
    }
    // Handle API errors
    else if (error.message) {
      userMessage = error.message;

      if (error.message.includes("401") || error.message.includes("المصادقة")) {
        userMessage = "انتهت جلسة العمل، يرجى تسجيل الدخول مرة أخرى";
        severity = "critical";
        // Could trigger logout here if needed
      } else if (
        error.message.includes("403") ||
        error.message.includes("مصرح")
      ) {
        userMessage = "غير مصرح لك بهذا الإجراء";
        severity = "warning";
      } else if (error.message.includes("404")) {
        userMessage = "البيانات المطلوبة غير موجودة";
        severity = "info";
      } else if (error.message.includes("500")) {
        userMessage = "خطأ في الخادم، يرجى المحاولة لاحقاً";
        severity = "error";
      }
    }

    // Show user-friendly error message
    toast({
      title: severity === "critical" ? "خطأ حرج" : "خطأ",
      description: userMessage,
      variant: severity === "info" ? "default" : "destructive",
    });

    // Log error details for debugging
    if (severity === "critical" || severity === "error") {
      this.logError(
        {
          message: userMessage,
          code: error.code,
          details: error,
          severity,
        },
        context,
      );
    }
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T,
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  private static logError(error: AppError, context?: string): void {
    // In production, this could send to error tracking service
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error("Error logged:", {
      message: errorLog.message,
      code: errorLog.code,
      details:
        typeof errorLog.details === "object"
          ? JSON.stringify(errorLog.details, null, 2)
          : errorLog.details,
      severity: errorLog.severity,
      timestamp: errorLog.timestamp,
      url: errorLog.url,
    });

    // Store in localStorage for later analysis
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("app_errors") || "[]",
      );
      existingErrors.push(errorLog);

      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }

      localStorage.setItem("app_errors", JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn("Could not store error log:", storageError);
    }
  }

  static getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem("app_errors") || "[]");
    } catch {
      return [];
    }
  }

  static clearStoredErrors(): void {
    localStorage.removeItem("app_errors");
  }
}

// Utility function for common async operations
export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  context?: string,
  fallback?: T,
) => ErrorHandler.handleAsync(operation, context, fallback);
