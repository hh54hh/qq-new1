import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

const NetworkDiagnosticTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runTest = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      // Test 1: Basic API connection
      console.log("Testing API connection...");
      const apiResponse = await fetch("/api/ping");
      const apiData = await apiResponse.json();

      setTestResults((prev) => [
        ...prev,
        {
          name: "اختبار API",
          status: apiResponse.ok ? "success" : "error",
          message: apiResponse.ok ? "متصل بنجاح" : "فشل الاتصال",
          details: apiData,
        },
      ]);

      // Test 2: System diagnostic
      console.log("Testing system diagnostic...");
      const sysResponse = await fetch("/api/system-diagnostic");
      const sysData = await sysResponse.json();

      setTestResults((prev) => [
        ...prev,
        {
          name: "تشخيص النظام",
          status: sysResponse.ok ? "success" : "error",
          message: sysResponse.ok ? "النظام يعمل بنجاح" : "مشكلة في النظام",
          details: sysData,
        },
      ]);
    } catch (error) {
      console.error("Test error:", error);
      setTestResults((prev) => [
        ...prev,
        {
          name: "خطأ عام",
          status: "error",
          message: "فشل في تشغيل الاختبارات",
          details: error instanceof Error ? error.message : "خطأ غير معروف",
        },
      ]);
    }

    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">اختبار صفحة التشخيص</h1>
        <p className="text-muted-foreground">
          اختبار بسيط للتأكد من عمل صفحة التشخيص
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={runTest}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "جاري الاختبار..." : "تشغيل الاختبار"}
        </Button>
      </div>

      <div className="space-y-4">
        {testResults.map((result, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <CardTitle className="text-lg">{result.name}</CardTitle>
                <Badge
                  variant={
                    result.status === "success" ? "default" : "destructive"
                  }
                >
                  {result.status === "success" ? "نجح" : "فشل"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{result.message}</p>
            </CardHeader>

            {result.details && (
              <CardContent>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    عرض التفاصيل
                  </summary>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {testResults.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p>
              لم يتم تشغيل أي اختبارات بعد. اضغط على "تشغيل الاختبار" للبدء.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>معلومات المتصفح</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>العنوان:</strong> {window.location.href}
          </p>
          <p>
            <strong>المسار:</strong> {window.location.pathname}
          </p>
          <p>
            <strong>User Agent:</strong> {navigator.userAgent}
          </p>
          <p>
            <strong>اللغة:</strong> {navigator.language}
          </p>
          <p>
            <strong>متصل بالإنترنت:</strong> {navigator.onLine ? "نعم" : "لا"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkDiagnosticTest;
