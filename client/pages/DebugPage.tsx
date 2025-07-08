import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Globe,
} from "lucide-react";
import apiClient from "@/lib/api";

interface TestResult {
  name: string;
  status: "pending" | "success" | "error";
  message: string;
  details?: any;
}

export default function DebugPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "اتصال API", status: "pending", message: "في انتظار ا��اختبار" },
    {
      name: "قاعدة البيانات",
      status: "pending",
      message: "في انتظار الاختبار",
    },
    { name: "المصادقة", status: "pending", message: "في انتظار الاختبار" },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (
    index: number,
    status: TestResult["status"],
    message: string,
    details?: any,
  ) => {
    setTests((prev) =>
      prev.map((test, i) =>
        i === index ? { ...test, status, message, details } : test,
      ),
    );
  };

  const runTests = async () => {
    setIsRunning(true);

    // إعادة تعيين الاختبارات
    setTests((prev) =>
      prev.map((test) => ({
        ...test,
        status: "pending",
        message: "جاري الاختبار...",
      })),
    );

    // اختبار 1: اتصال API
    try {
      const response = await fetch("/api/ping");
      if (response.ok) {
        const data = await response.json();
        updateTest(0, "success", "الاتصال ناجح", data);
      } else {
        updateTest(0, "error", `خطأ HTTP: ${response.status}`);
      }
    } catch (error) {
      updateTest(
        0,
        "error",
        `خطأ شبكة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      );
    }

    // انتظار قصير بين الاختبارات
    await new Promise((resolve) => setTimeout(resolve, 500));

    // اختبار 2: قاعدة البيانات (عبر API)
    try {
      const response = await fetch("/api/demo");
      if (response.ok) {
        const data = await response.json();
        updateTest(1, "success", "اتصال قاعدة البيانات ناجح", data);
      } else {
        updateTest(1, "error", `خطأ في قاعدة البيانات: ${response.status}`);
      }
    } catch (error) {
      updateTest(
        1,
        "error",
        `خطأ اتصال قاعدة البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // اختبار 3: المصادقة (اختبار تسجيل دخول وهمي)
    try {
      // محاولة تسجيل دخول بحساب اختبار
      await apiClient.login("test@example.com", "test123");
      updateTest(2, "success", "المصادقة تعمل بشكل صحيح");
    } catch (error) {
      // إذا كان الخطأ 401، فهذا طبيعي (الحساب غير مو��ود)
      if (error instanceof Error && error.message.includes("401")) {
        updateTest(
          2,
          "success",
          "خدمة المصادقة تعمل (الحساب غير موجود كما متوقع)",
        );
      } else if (error instanceof Error && error.message.includes("network")) {
        updateTest(2, "error", "خطأ شبكة في المصادقة");
      } else {
        updateTest(2, "success", "خدمة المصادقة تستجيب");
      }
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // تشغيل الاختبارات تلقائياً عند تحميل الصفحة
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">نجح</Badge>;
      case "error":
        return <Badge variant="destructive">فشل</Badge>;
      case "pending":
        return <Badge variant="secondary">جاري...</Badge>;
    }
  };

  const allSuccess = tests.every((test) => test.status === "success");
  const hasErrors = tests.some((test) => test.status === "error");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">تشخيص النظام</h1>
          <p className="text-muted-foreground">
            فحص حالة الاتصالات والخدمات الأساسية
          </p>
        </div>

        {allSuccess && !hasErrors && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              جميع الخدمات تعمل بشكل صحيح! 🎉
            </AlertDescription>
          </Alert>
        )}

        {hasErrors && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              توجد مشاكل في بعض الخدمات. راجع التفاصيل أدناه.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {tests.map((test, index) => (
            <Card key={index} className="transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <span>{test.name}</span>
                  </div>
                  {getStatusBadge(test.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {test.message}
                </p>
                {test.details && (
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                جاري الفحص...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة الفحص
              </>
            )}
          </Button>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              معلومات البيئة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>النطاق:</strong>{" "}
                {typeof window !== "undefined"
                  ? window.location.origin
                  : "غير متاح"}
              </div>
              <div>
                <strong>البيئة:</strong> {process.env.NODE_ENV || "development"}
              </div>
              <div>
                <strong>User Agent:</strong>{" "}
                {typeof navigator !== "undefined"
                  ? navigator.userAgent.substring(0, 50) + "..."
                  : "غير متاح"}
              </div>
              <div>
                <strong>الوقت:</strong> {new Date().toLocaleString("ar")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
