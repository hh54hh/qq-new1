import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Server,
  Shield,
  Globe,
} from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: "success" | "error" | "warning" | "loading";
  message: string;
  details?: string;
}

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    const tests: Array<() => Promise<DiagnosticResult>> = [
      testApiConnection,
      testDatabaseConnection,
      testAuthEndpoint,
      testEnvironmentVariables,
      testNetlifyFunctions,
    ];

    for (const test of tests) {
      try {
        const result = await test();
        setDiagnostics((prev) => [...prev, result]);
      } catch (error) {
        setDiagnostics((prev) => [
          ...prev,
          {
            name: "خطأ في التشخيص",
            status: "error",
            message: "فشل في تشغيل الاختبار",
            details: error instanceof Error ? error.message : "خطأ غير معروف",
          },
        ]);
      }
      // انتظر قليلاً بين الاختبارات
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const testApiConnection = async (): Promise<DiagnosticResult> => {
    try {
      const response = await fetch("/api/ping");
      if (response.ok) {
        const data = await response.json();
        return {
          name: "اتصال API",
          status: "success",
          message: "API يعمل بشكل صحيح",
          details: data.message,
        };
      } else {
        return {
          name: "اتصال API",
          status: "error",
          message: `خطأ في API: ${response.status}`,
          details: response.statusText,
        };
      }
    } catch (error) {
      return {
        name: "اتصال API",
        status: "error",
        message: "فشل في الاتصال بـ API",
        details: error instanceof Error ? error.message : "خطأ شبكة",
      };
    }
  };

  const testDatabaseConnection = async (): Promise<DiagnosticResult> => {
    try {
      // اختبار اتصال قاعدة البيانات من خلال endpoint خاص
      const response = await fetch("/api/demo");
      if (response.ok) {
        return {
          name: "قاعدة البيانات",
          status: "success",
          message: "قاعدة البيانات متصلة",
          details: "Supabase يعمل بشكل صحيح",
        };
      } else {
        return {
          name: "قاعدة البيانات",
          status: "error",
          message: "خطأ في قاعدة البيانات",
          details: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        name: "قاعدة البيانات",
        status: "error",
        message: "فشل في الاتصال بقاعدة البيانات",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
      };
    }
  };

  const testAuthEndpoint = async (): Promise<DiagnosticResult> => {
    try {
      // اختبار endpoint تسجيل الدخول بدون بيانات
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // نتوقع 400 لأن البيانات فارغة، لكن هذا يؤكد أن endpoint يعمل
      if (response.status === 400) {
        return {
          name: "نظام المصادقة",
          status: "success",
          message: "endpoint المصادقة يعمل",
          details: "استجابة صحيحة للبيانات الفارغة",
        };
      } else if (response.status === 404) {
        return {
          name: "نظام المصادقة",
          status: "error",
          message: "endpoint المصادقة غير موجود",
          details: "المسار غير صحيح أو Function لا تعمل",
        };
      } else {
        return {
          name: "نظام المصادقة",
          status: "warning",
          message: `استجابة غير متوقعة: ${response.status}`,
          details: response.statusText,
        };
      }
    } catch (error) {
      return {
        name: "نظام المصادقة",
        status: "error",
        message: "فشل في اختبار المصادقة",
        details: error instanceof Error ? error.message : "خطأ شبكة",
      };
    }
  };

  const testEnvironmentVariables = async (): Promise<DiagnosticResult> => {
    const hasSupabaseUrl =
      import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const hasSupabaseKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (hasSupabaseUrl && hasSupabaseKey) {
      return {
        name: "متغيرات البيئة",
        status: "success",
        message: "متغيرات البيئة مح��دة",
        details: `URL: ${hasSupabaseUrl.substring(0, 20)}...`,
      };
    } else {
      return {
        name: "متغيرات البيئة",
        status: "warning",
        message: "متغيرات البيئة غير محددة",
        details: "قد تكون محددة في الخادم فقط",
      };
    }
  };

  const testNetlifyFunctions = async (): Promise<DiagnosticResult> => {
    try {
      // اختبار المسار المباشر لـ Netlify Functions
      const response = await fetch("/.netlify/functions/api/ping");
      if (response.ok) {
        return {
          name: "Netlify Functions",
          status: "success",
          message: "Netlify Functions تعمل",
          details: "المسار المباشر يعمل بشكل صحيح",
        };
      } else {
        return {
          name: "Netlify Functions",
          status: "error",
          message: `خطأ في Functions: ${response.status}`,
          details: "تحقق من إعدادات Netlify",
        };
      }
    } catch (error) {
      return {
        name: "Netlify Functions",
        status: "error",
        message: "Netlify Functions لا تعمل",
        details: error instanceof Error ? error.message : "خطأ في النشر",
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "loading":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      loading: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status === "success" && "يعمل"}
        {status === "error" && "خطأ"}
        {status === "warning" && "تحذير"}
        {status === "loading" && "جاري الفحص..."}
      </Badge>
    );
  };

  const getTestIcon = (name: string) => {
    if (name.includes("API")) return <Server className="h-4 w-4" />;
    if (name.includes("قاعدة البيانات"))
      return <Database className="h-4 w-4" />;
    if (name.includes("المصاد��ة")) return <Shield className="h-4 w-4" />;
    if (name.includes("Netlify")) return <Globe className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">تشخيص النظام</h1>
          <p className="text-muted-foreground">
            فحص شامل لتحديد مشاكل تسجيل الدخول في Netlify
          </p>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
            />
            {isRunning ? "جاري الفحص..." : "إعادة الفحص"}
          </Button>
        </div>

        <div className="grid gap-4">
          {diagnostics.map((diagnostic, index) => (
            <Card key={index} className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTestIcon(diagnostic.name)}
                    <span>{diagnostic.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostic.status)}
                    {getStatusBadge(diagnostic.status)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground mb-2">
                  {diagnostic.message}
                </p>
                {diagnostic.details && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {diagnostic.details}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {isRunning && diagnostics.length < 5 && (
            <Card className="border-border/50">
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري تشغيل الاختبارات...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {diagnostics.length > 0 && !isRunning && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">نصائح الإصلاح</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p>
                  <strong>إذا كان API لا يعمل:</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mr-4">
                  <li>تحقق من أن Netlify Functions تم نشرها بشكل صحيح</li>
                  <li>راجع سجلات Functions في Netlify Dashboard</li>
                  <li>تأكد من أن ملف netlify.toml صحيح</li>
                </ul>

                <p className="mt-4">
                  <strong>إذا كانت قاعدة البيانات لا تعمل:</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mr-4">
                  <li>تحقق من متغيرات بيئة Supabase</li>
                  <li>تأكد من أن الجداول موجودة</li>
                  <li>راجع إعدادات RLS في Supabase</li>
                </ul>

                <p className="mt-4">
                  <strong>للدعم الفني:</strong>
                </p>
                <p className="text-muted-foreground">اتصل على: 07800657822</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// إضافة الدالة للوصول العالمي من Console
if (typeof window !== "undefined") {
  (window as any).openDebug = () => {
    window.location.href = "/diagnostic";
  };
}
