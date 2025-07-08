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

const NetworkDiagnosticSimple: React.FC = () => {
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
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState("overview");

  // Collect browser information
  useEffect(() => {
    const getBrowserInfo = () => {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        location: {
          origin: window.location.origin,
          protocol: window.location.protocol,
          host: window.location.host,
          pathname: window.location.pathname,
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
    };

    setBrowserInfo(getBrowserInfo());
  }, []);

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

  const testSystemDiagnostic = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري التشخيص الشامل...",
    });
    const startTime = Date.now();

    try {
      const response = await fetch("/api/system-diagnostic");
      const data = await response.json();
      const timing = Date.now() - startTime;

      if (response.ok) {
        setSystemDiagnostic(data);
        updateDiagnostic(index, {
          status: "success",
          message: `التشخيص الشامل مكتمل (${timing}ms)`,
          details: data,
          timing,
        });
      } else {
        updateDiagnostic(index, {
          status: "error",
          message: "فشل التشخيص الشامل",
          details: data,
          timing,
        });
      }
    } catch (error) {
      const timing = Date.now() - startTime;
      updateDiagnostic(index, {
        status: "error",
        message: "خطأ في التشخيص الشامل",
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
      const clientVars = {
        VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || "غير موجود",
        VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY
          ? "موجود"
          : "غير موجود",
        MODE: import.meta.env?.MODE || "غير محدد",
        DEV: import.meta.env?.DEV || false,
        PROD: import.meta.env?.PROD || false,
      };

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

  const runAllTests = async () => {
    setIsLoading(true);
    await testApiConnection(0);
    await testEnvironmentVariables(3);
    await testSystemDiagnostic(5);
    setIsLoading(false);
  };

  const runSingleTest = (index: number) => {
    switch (index) {
      case 0:
        return testApiConnection(index);
      case 3:
        return testEnvironmentVariables(index);
      case 5:
        return testSystemDiagnostic(index);
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">تشخيص شامل للنظام والشبكة</h1>
        <p className="text-muted-foreground">
          فحص مفصل لجميع مكونات النظام والاتصالات والتكوين
        </p>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
        <Button
          onClick={runAllTests}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "جاري الفحص..." : "فحص شامل"}
        </Button>
        <div className="flex items-center gap-2">
          <span>الحالة العامة:</span>
          {getStatusBadge(overallStatus)}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { key: "overview", label: "نظرة عامة", icon: Monitor },
          { key: "system", label: "النظام", icon: Server },
          { key: "environment", label: "البيئة", icon: Settings },
          { key: "network", label: "الشبكة", icon: Network },
          { key: "browser", label: "المتصفح", icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={currentView === key ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView(key)}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content based on current view */}
      {currentView === "overview" && (
        <div className="space-y-4">
          {/* Critical Issues and Warnings */}
          {systemDiagnostic?.summary && (
            <div className="space-y-4">
              {systemDiagnostic.summary.critical_issues.length > 0 && (
                <div className="p-4 border border-red-500 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h3 className="font-bold text-red-700">
                      مشاكل حرجة (
                      {systemDiagnostic.summary.critical_issues.length})
                    </h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    {systemDiagnostic.summary.critical_issues.map(
                      (issue, i) => (
                        <li key={i}>{issue}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {systemDiagnostic.summary.warnings.length > 0 && (
                <div className="p-4 border border-yellow-500 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-bold text-yellow-700">
                      تحذيرات ({systemDiagnostic.summary.warnings.length})
                    </h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    {systemDiagnostic.summary.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Quick Tests Overview */}
          <div className="grid gap-4">
            {[0, 3, 5].map((index) => {
              const diagnostic = diagnostics[index];
              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(diagnostic.status)}
                        <CardTitle className="text-lg">
                          {diagnostic.name}
                        </CardTitle>
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
              );
            })}
          </div>
        </div>
      )}

      {currentView === "system" && systemDiagnostic && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>
                    <strong>إصدار Node.js:</strong>{" "}
                    {systemDiagnostic.system.node_version}
                  </p>
                  <p>
                    <strong>النظام:</strong> {systemDiagnostic.system.platform}
                  </p>
                  <p>
                    <strong>البنية:</strong> {systemDiagnostic.system.arch}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>وقت التشغيل:</strong>{" "}
                    {Math.floor(systemDiagnostic.system.uptime / 60)} دقيقة
                  </p>
                  <p>
                    <strong>المنطقة الزمنية:</strong>{" "}
                    {systemDiagnostic.system.timezone}
                  </p>
                  <p>
                    <strong>الذاكرة المستخدمة:</strong>{" "}
                    {Math.round(
                      systemDiagnostic.system.memory.used / 1024 / 1024,
                    )}{" "}
                    MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === "environment" && systemDiagnostic && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>متغيرات البيئة - Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      VITE_SUPABASE_URL
                    </h4>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          systemDiagnostic.env_analysis.supabase.url.exists
                            ? "default"
                            : "destructive"
                        }
                      >
                        {systemDiagnostic.env_analysis.supabase.url.exists
                          ? "موجود"
                          : "غير موجود"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        المصدر:{" "}
                        {systemDiagnostic.env_analysis.supabase.url.source}
                      </p>
                      <p className="text-xs bg-muted p-2 rounded break-all">
                        {systemDiagnostic.env_analysis.supabase.url.value}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      VITE_SUPABASE_ANON_KEY
                    </h4>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          systemDiagnostic.env_analysis.supabase.key.exists
                            ? "default"
                            : "destructive"
                        }
                      >
                        {systemDiagnostic.env_analysis.supabase.key.exists
                          ? "موجود"
                          : "غير موجود"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        المصدر:{" "}
                        {systemDiagnostic.env_analysis.supabase.key.source}
                      </p>
                      <p className="text-xs bg-muted p-2 rounded">
                        {systemDiagnostic.env_analysis.supabase.key.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === "browser" && browserInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              معلومات المتصفح
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>النظام:</strong> {browserInfo.platform}
                </p>
                <p>
                  <strong>اللغة:</strong> {browserInfo.language}
                </p>
                <p>
                  <strong>متصل بالإنترنت:</strong>{" "}
                  {browserInfo.onLine ? "نعم" : "لا"}
                </p>
              </div>
              <div>
                <p>
                  <strong>الشاشة:</strong> {browserInfo.screen.width}x
                  {browserInfo.screen.height}
                </p>
                <p>
                  <strong>العرض:</strong> {browserInfo.viewport.width}x
                  {browserInfo.viewport.height}
                </p>
                <p>
                  <strong>العنوان:</strong> {browserInfo.location.origin}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      {systemDiagnostic && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ملخص الأداء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>إجمالي وقت التشخيص:</strong>{" "}
                  {systemDiagnostic.timing.total}ms
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((systemDiagnostic.timing.total / 5000) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p>
                  <strong>وقت اختبار Supabase:</strong>{" "}
                  {systemDiagnostic.timing.supabase}ms
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((systemDiagnostic.timing.supabase / 2000) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NetworkDiagnosticSimple;
