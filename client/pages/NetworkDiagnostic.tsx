import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Info,
  Server,
  Database,
  Globe,
  Settings,
  Monitor,
  Network,
  Clock,
  HardDrive,
  Cpu,
  Eye,
  FileText,
  Zap,
} from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: "success" | "error" | "loading" | "pending";
  message: string;
  details?: any;
  timing?: number;
}

interface SystemDiagnostic {
  status: string;
  timestamp: string;
  timing: {
    total: number;
    supabase: number;
  };
  environment: {
    isServer: boolean;
    isNetlify: boolean;
    isProduction: boolean;
  };
  system: {
    node_version: string;
    platform: string;
    arch: string;
    memory: any;
    uptime: number;
    timestamp: string;
    timezone: string;
  };
  env_analysis: {
    supabase: {
      url: { exists: boolean; value: string; source: string; length: number };
      key: { exists: boolean; value: string; source: string; length: number };
    };
    build: any;
    all_env_keys: string[];
  };
  supabase_test: {
    connection: string;
    error: string | null;
    timing: number;
    details: any;
  };
  filesystem: {
    current_directory: string;
    env_files: Record<string, boolean>;
    package_json: boolean;
  };
  network: any;
  auto_config: any;
  summary: {
    critical_issues: string[];
    warnings: string[];
    status: string;
  };
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  connection?: any;
  location: {
    origin: string;
    protocol: string;
    host: string;
    pathname: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}

const NetworkDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([
    {
      name: "اتصال API الأساسي",
      status: "pending",
      message: "في انتظار الفحص",
    },
    {
      name: "قاعدة البيانات Supabase",
      status: "pending",
      message: "في انتظار الفحص",
    },
    { name: "نظام المصادقة", status: "pending", message: "في انتظار الفحص" },
    { name: "متغيرات البيئة", status: "pending", message: "في انتظار الفحص" },
    { name: "وظائف الخادم", status: "pending", message: "في انتظار الفحص" },
    { name: "التشخيص الشامل", status: "pending", message: "في انتظار الفحص" },
  ]);

  const [systemDiagnostic, setSystemDiagnostic] =
    useState<SystemDiagnostic | null>(null);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const updateDiagnostic = (
    index: number,
    update: Partial<DiagnosticResult>,
  ) => {
    setDiagnostics((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...update } : item)),
    );
  };

  const testApiConnection = async (index: number) => {
    updateDiagnostic(index, { status: "loading", message: "جاري الفحص..." });
    const startTime = Date.now();

    try {
      const response = await fetch("/api/ping");
      const data = await response.json();
      const timing = Date.now() - startTime;

      if (response.ok) {
        updateDiagnostic(index, {
          status: "success",
          message: `متصل بنجاح (${timing}ms)`,
          details: data,
          timing,
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: `خطأ HTTP ${response.status}`,
          details: data,
          timing,
        });
      }
    } catch (error) {
      const timing = Date.now() - startTime;
      updateDiagnostic(index, {
        status: "error",
        message: "فشل الاتصال",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
        timing,
      });
    }
  };

  const testSupabase = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري فحص قاعدة البيانات...",
    });
    const startTime = Date.now();

    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      const timing = Date.now() - startTime;

      if (response.ok && data.supabase) {
        updateDiagnostic(index, {
          status: "success",
          message: `قاعدة البيانات متصلة (${timing}ms)`,
          details: data.supabase,
          timing,
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: "فشل اتصال قاعدة البيانات",
          details: data,
          timing,
        });
      }
    } catch (error) {
      const timing = Date.now() - startTime;
      updateDiagnostic(index, {
        status: "error",
        message: "خطأ في فحص قاعدة البيانات",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
        timing,
      });
    }
  };

  const testAuthentication = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري فحص نظام المصادقة...",
    });
    const startTime = Date.now();

    try {
      const response = await fetch("/api/debug");
      const data = await response.json();
      const timing = Date.now() - startTime;

      if (response.ok) {
        updateDiagnostic(index, {
          status: "success",
          message: `نظام المصادقة يعمل (${timing}ms)`,
          details: data,
          timing,
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: "مشكلة في نظام المصادقة",
          details: data,
          timing,
        });
      }
    } catch (error) {
      const timing = Date.now() - startTime;
      updateDiagnostic(index, {
        status: "error",
        message: "فشل فحص نظام المصادقة",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
        timing,
      });
    }
  };

  const testEnvironmentVariables = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري فحص متغيرات البيئة...",
    });

    try {
      // Check client-side environment variables
      const clientVars = {
        VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || "غير موجود",
        VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY
          ? "موجود"
          : "غير موجود",
        MODE: import.meta.env?.MODE || "غير محدد",
        DEV: import.meta.env?.DEV || false,
        PROD: import.meta.env?.PROD || false,
      };

      // Test server-side variables through API
      const response = await fetch("/api/health");
      const serverData = await response.json();

      const hasClientVars =
        !!import.meta.env?.VITE_SUPABASE_URL &&
        !!import.meta.env?.VITE_SUPABASE_ANON_KEY;
      const hasServerVars =
        serverData.supabase?.url_configured &&
        serverData.supabase?.key_configured;

      if (hasClientVars && hasServerVars) {
        updateDiagnostic(index, {
          status: "success",
          message: "جميع المتغيرات متوفرة",
          details: { client: clientVars, server: serverData.supabase },
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: "متغيرات البيئة ناقصة",
          details: {
            client: clientVars,
            server: serverData.supabase,
            issues: {
              client_missing: !hasClientVars,
              server_missing: !hasServerVars,
            },
          },
        });
      }
    } catch (error) {
      updateDiagnostic(index, {
        status: "error",
        message: "فشل فحص متغيرات البيئة",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  };

  const testServerFunctions = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري فحص وظائف الخادم...",
    });
    const startTime = Date.now();

    try {
      const response = await fetch("/api/demo");
      const data = await response.json();
      const timing = Date.now() - startTime;

      if (response.ok) {
        updateDiagnostic(index, {
          status: "success",
          message: `وظائف الخادم تعمل (${timing}ms)`,
          details: data,
          timing,
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: "مشكلة في وظائف الخادم",
          details: data,
          timing,
        });
      }
    } catch (error) {
      const timing = Date.now() - startTime;
      updateDiagnostic(index, {
        status: "error",
        message: "فشل اتصال وظائف الخادم",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
        timing,
      });
    }
  };

  const runAllTests = async () => {
    await testApiConnection(0);
    await testSupabase(1);
    await testAuthentication(2);
    await testEnvironmentVariables(3);
    await testServerFunctions(4);
  };

  const runSingleTest = (index: number) => {
    switch (index) {
      case 0:
        return testApiConnection(index);
      case 1:
        return testSupabase(index);
      case 2:
        return testAuthentication(index);
      case 3:
        return testEnvironmentVariables(index);
      case 4:
        return testServerFunctions(index);
      default:
        return Promise.resolve();
    }
  };

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    const variants = {
      success: "default",
      error: "destructive",
      loading: "secondary",
      pending: "outline",
    } as const;

    const labels = {
      success: "نجح",
      error: "فشل",
      loading: "جاري الفحص",
      pending: "في الانتظار",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const overallStatus = diagnostics.every((d) => d.status === "success")
    ? "success"
    : diagnostics.some((d) => d.status === "error")
      ? "error"
      : "pending";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">تشخيص الاتصال والشبكة</h1>
        <p className="text-muted-foreground">
          فحص شامل لجميع الخدمات والاتصالات في التطبيق
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <Button onClick={runAllTests} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          فحص جميع الخدمات
        </Button>
        <div className="flex items-center gap-2">
          <span>الحالة العامة:</span>
          {getStatusBadge(overallStatus)}
        </div>
      </div>

      <div className="grid gap-4">
        {diagnostics.map((diagnostic, index) => (
          <Card key={index} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostic.status)}
                  <CardTitle className="text-lg">{diagnostic.name}</CardTitle>
                  {getStatusBadge(diagnostic.status)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSingleTest(index)}
                  disabled={diagnostic.status === "loading"}
                >
                  {diagnostic.status === "loading"
                    ? "جاري الفحص..."
                    : "إعادة فحص"}
                </Button>
              </div>
              <CardDescription>{diagnostic.message}</CardDescription>
            </CardHeader>

            {diagnostic.details && (
              <CardContent>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    عرض التفاصيل التقنية
                  </summary>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-60">
                    {JSON.stringify(diagnostic.details, null, 2)}
                  </pre>
                </details>
                {diagnostic.timing && (
                  <p className="text-sm text-muted-foreground mt-2">
                    وقت الاستجابة: {diagnostic.timing}ms
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            معلومات الإعداد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>البيئة الحالية:</strong>{" "}
            {import.meta.env?.MODE || "غير محدد"}
          </p>
          <p>
            <strong>وضع التطوير:</strong> {import.meta.env?.DEV ? "نعم" : "لا"}
          </p>
          <p>
            <strong>وضع الإنتاج:</strong> {import.meta.env?.PROD ? "نعم" : "لا"}
          </p>
          <p>
            <strong>عنوان التطبيق:</strong> {window.location.origin}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkDiagnostic;
