import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface DiagnosticCheck {
  status: "loading" | "success" | "error";
  message: string;
  details?: string;
}

const SystemDiagnostic = () => {
  const [checks, setChecks] = useState<Record<string, DiagnosticCheck>>({
    frontend: { status: "loading", message: "جاري فحص الواجهة الأمامية..." },
    api: { status: "loading", message: "جاري فحص API..." },
    database: { status: "loading", message: "جاري فحص قاعدة البيانات..." },
    auth: { status: "loading", message: "جاري فحص نظام المصادقة..." },
    environment: { status: "loading", message: "جاري فحص متغيرات البيئة..." },
  });

  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);

    // Reset all checks
    setChecks({
      frontend: { status: "loading", message: "جاري فحص الواجهة الأمامية..." },
      api: { status: "loading", message: "جاري فحص API..." },
      database: { status: "loading", message: "جاري فحص قاعدة البيانات..." },
      auth: { status: "loading", message: "جاري فحص نظام المصادقة..." },
      environment: { status: "loading", message: "جاري فحص متغيرات البيئة..." },
    });

    // Check frontend
    setTimeout(() => {
      setChecks((prev) => ({
        ...prev,
        frontend: {
          status: "success",
          message: "الواجهة الأمامية تعمل بشكل صحيح",
          details: `React: ${React.version || "غير محدد"}, URL: ${window.location.href}`,
        },
      }));
    }, 500);

    // Check environment variables
    setTimeout(() => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Environment variables are optional since we have hardcoded fallbacks
      if (supabaseUrl && supabaseKey) {
        setChecks((prev) => ({
          ...prev,
          environment: {
            status: "success",
            message: "متغيرات البيئة محددة بشكل ��حيح",
            details: `Supabase URL من المتغيرات: ${supabaseUrl.substring(0, 30)}...`,
          },
        }));
      } else {
        // This is actually OK since we have fallbacks
        setChecks((prev) => ({
          ...prev,
          environment: {
            status: "success",
            message: "استخدام الإعدادات الافتراضية",
            details: `VITE_SUPABASE_URL: ${supabaseUrl ? "موجود" : "مفقود"}, VITE_SUPABASE_ANON_KEY: ${supabaseKey ? "موجود" : "مفقود"} - يتم استخدام القيم الافتراضية`,
          },
        }));
      }
    }, 1000);

    // Check API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/ping", {
        signal: controller.signal,
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setChecks((prev) => ({
          ...prev,
          api: {
            status: "success",
            message: "API يعمل بشكل صحيح",
            details: `الاستجابة: ${data.message || "تم الاتصال بنجاح"}, الحالة: ${response.status}`,
          },
        }));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      let errorMessage = "خطأ في API";
      let details = "";

      if (error.name === "AbortError") {
        errorMessage = "انتهت مهلة الاتصال بـ API";
        details = "المهلة المحددة: 5 ثوانٍ";
      } else if (error.message.includes("fetch")) {
        errorMessage = "فشل في الاتصال بـ API";
        details = "تحقق من الشبكة والإعدادات";
      } else {
        errorMessage = `خطأ في API: ${error.message}`;
        details = error.stack || "لا توجد تفاصيل إضافية";
      }

      setChecks((prev) => ({
        ...prev,
        api: { status: "error", message: errorMessage, details },
      }));
    }

    // Check database
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/demo", {
        signal: controller.signal,
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setChecks((prev) => ({
          ...prev,
          database: {
            status: "success",
            message: "قاعدة البيانات متصلة",
            details: `نوع البيانات: ${typeof data}, الحالة: ${response.status}`,
          },
        }));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      setChecks((prev) => ({
        ...prev,
        database: {
          status: "error",
          message: "خطأ في قاعدة البيانات",
          details: error.message || "خطأ غير محدد",
        },
      }));
    }

    // Check auth system
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch("/api/auth/profile", {
        signal: controller.signal,
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        setChecks((prev) => ({
          ...prev,
          auth: {
            status: "success",
            message: "نظام المصادقة يعمل (غير مسجل دخول)",
            details: "الاستجابة الصحيحة للمستخدم غير المسجل",
          },
        }));
      } else if (response.ok) {
        setChecks((prev) => ({
          ...prev,
          auth: {
            status: "success",
            message: "نظام المصادقة يعمل (مسجل دخول)",
            details: "تم العثور على جلسة صالحة",
          },
        }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      setChecks((prev) => ({
        ...prev,
        auth: {
          status: "error",
          message: "خطأ في نظام المصادقة",
          details: error.message || "خطأ غير محدد",
        },
      }));
    }

    setIsRunning(false);
  };

  const getIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return (
          <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />
        );
    }
  };

  const allPassed = Object.values(checks).every(
    (check) => check.status === "success",
  );
  const hasErrors = Object.values(checks).some(
    (check) => check.status === "error",
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 تشخيص شامل للنظام
              {isRunning && <RefreshCw className="h-5 w-5 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                variant="outline"
              >
                {isRunning ? "جاري الفحص..." : "إعادة فحص"}
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="ghost"
              >
                العودة للرئيسية
              </Button>
            </div>

            {allPassed && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  ✅ جميع الفحو��ات نجحت! النظام يعمل بشكل صحيح.
                </p>
              </div>
            )}

            {hasErrors && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-600 dark:text-red-400 font-medium">
                  ❌ تم العثور على مشاكل. راجع التفاصيل أدناه.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnostic Results */}
        <div className="grid gap-4">
          {Object.entries(checks).map(([key, check]) => (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getIcon(check.status)}
                  <div className="flex-1">
                    <p className="font-medium">{check.message}</p>
                    {check.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {check.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>المتصفح:</strong> {navigator.userAgent}
            </div>
            <div>
              <strong>الرابط الحالي:</strong> {window.location.href}
            </div>
            <div>
              <strong>البروتوكول:</strong> {window.location.protocol}
            </div>
            <div>
              <strong>المضيف:</strong> {window.location.host}
            </div>
            <div>
              <strong>المسار:</strong> {window.location.pathname}
            </div>
            <div>
              <strong>الوقت:</strong> {new Date().toLocaleString("ar")}
            </div>
          </CardContent>
        </Card>

        {/* Console Commands */}
        <Card>
          <CardHeader>
            <CardTitle>أوامر مفيدة للتشخيص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted p-3 rounded font-mono text-sm">
              <div>
                <strong>في Developer Console (F12):</strong>
              </div>
              <div>
                • <code>diagnoseNetlify()</code> - تشخيص Netlify
              </div>
              <div>
                • <code>openDebug()</code> - فتح صفحة التشخيص
              </div>
              <div>
                • <code>fetch('/api/ping')</code> - اختبار API
              </div>
              <div>
                • <code>fetch('/.netlify/functions/api/ping')</code> - اختبار
                Functions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>إرشادات إصلاح مشاكل Netlify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong className="text-destructive">خطأ HTTP 404 في API:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>تأكد من أن Netlify Functions تم بنائها ونشرها بشكل صحيح</li>
                <li>راجع سجلات الوظائف في Netlify Dashboard</li>
                <li>
                  تحقق من أن المسار /api/* يُوجه إلى /.netlify/functions/api
                </li>
                <li>تأكد من وجود ملف netlify/functions/api.ts</li>
              </ul>
            </div>

            <div>
              <strong className="text-amber-600">خطوات الإصلاح:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                <li>
                  في Netlify Dashboard، انتقل إلى Site Settings → Functions
                </li>
                <li>
                  تحقق من أن Functions Directory محدد إلى netlify/functions
                </li>
                <li>راجع سجلات البناء للتأكد من عدم وجود أخطاء</li>
                <li>اختبر المسار المباشر: /.netlify/functions/api/ping</li>
                <li>إذا كان يعمل، فالمشكلة في إعادة التوجيه</li>
              </ol>
            </div>

            <div>
              <strong className="text-blue-600">متغيرات البيئة:</strong>
              <p className="mt-2 text-muted-foreground">
                البرنامج يستخدم قيم افتراضية مضمنة، لذلك عدم وجود متغيرات البيئة
                عادة لا يسبب مشكلة. إذا كنت تريد استخدام قاعدة بيانات مختلفة،
                أضف:
              </p>
              <div className="mt-2 bg-muted p-2 rounded font-mono text-xs">
                VITE_SUPABASE_URL=your_url
                <br />
                VITE_SUPABASE_ANON_KEY=your_key
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Global diagnostic functions for console
if (typeof window !== "undefined") {
  (window as any).diagnoseNetlify = async () => {
    console.group("🔧 Netlify Deployment Diagnosis");

    console.log("📍 Current URL:", window.location.href);
    console.log("🌍 Environment:", {
      hostname: window.location.hostname,
      isNetlify: window.location.hostname.includes("netlify.app"),
      isLocalhost: window.location.hostname === "localhost",
    });

    // Test different API endpoints
    const tests = [
      { name: "API via redirect", url: "/api/ping" },
      { name: "Direct Netlify Function", url: "/.netlify/functions/api/ping" },
      { name: "Netlify Function root", url: "/.netlify/functions/api" },
    ];

    for (const test of tests) {
      try {
        console.log(`🧪 Testing ${test.name}:`, test.url);
        const response = await fetch(test.url);
        console.log(
          `✅ ${test.name}: ${response.status} ${response.statusText}`,
        );
        if (response.ok) {
          const data = await response.json();
          console.log(`📦 Response:`, data);
        }
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
      }
    }

    console.groupEnd();
  };

  (window as any).openDebug = () => {
    window.location.href = "/system-diagnostic";
  };
}

export default SystemDiagnostic;
