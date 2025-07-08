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
// Conditional imports - only use if components exist
const safeImport = (componentName: string) => {
  try {
    return require(`@/components/ui/${componentName}`);
  } catch {
    return null;
  }
};

// Basic fallback components
const TabsComponent = safeImport("tabs");
const AlertComponent = safeImport("alert");
const SeparatorComponent = safeImport("separator");
const ProgressComponent = safeImport("progress");

const { Tabs, TabsContent, TabsList, TabsTrigger } = TabsComponent || {
  Tabs: ({ children, value, onValueChange, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  TabsContent: ({ children, value, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  TabsList: ({ children, ...props }: any) => (
    <div className="flex gap-2 mb-4" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button className="px-3 py-1 border rounded" {...props}>
      {children}
    </button>
  ),
};

const { Alert, AlertDescription, AlertTitle } = AlertComponent || {
  Alert: ({ children, variant, ...props }: any) => (
    <div
      className={`p-4 border rounded ${variant === "destructive" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}`}
      {...props}
    >
      {children}
    </div>
  ),
  AlertDescription: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  AlertTitle: ({ children, ...props }: any) => (
    <h4 className="font-bold" {...props}>
      {children}
    </h4>
  ),
};

const { Separator } = SeparatorComponent || {
  Separator: ({ ...props }: any) => <hr className="my-4" {...props} />,
};

const { Progress } = ProgressComponent || {
  Progress: ({ value, ...props }: any) => (
    <div className="w-full bg-gray-200 rounded-full h-2" {...props}>
      <div
        className="bg-blue-600 h-2 rounded-full"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  ),
};
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

  // Collect browser information
  useEffect(() => {
    const getBrowserInfo = (): BrowserInfo => {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        connection: (navigator as any)?.connection,
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

  const testSupabase = async (index: number) => {
    updateDiagnostic(index, {
      status: "loading",
      message: "جاري فحص قاعدة ال��يانات...",
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
      const clientVars = {
        VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || "غير موجود",
        VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY
          ? "موجود"
          : "غير موجود",
        MODE: import.meta.env?.MODE || "غير محد��",
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

  const runAllTests = async () => {
    setIsLoading(true);
    await Promise.all([
      testApiConnection(0),
      testSupabase(1),
      testAuthentication(2),
      testEnvironmentVariables(3),
      testServerFunctions(4),
      testSystemDiagnostic(5),
    ]);
    setIsLoading(false);
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            النظام
          </TabsTrigger>
          <TabsTrigger value="environment" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            البيئة
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            الشبكة
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            قاعدة البيانات
          </TabsTrigger>
          <TabsTrigger value="browser" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            المتصفح
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Critical Issues and Warnings */}
          {systemDiagnostic?.summary && (
            <div className="space-y-4">
              {systemDiagnostic.summary.critical_issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    مشاكل حرجة (
                    {systemDiagnostic.summary.critical_issues.length})
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {systemDiagnostic.summary.critical_issues.map(
                        (issue, i) => (
                          <li key={i}>{issue}</li>
                        ),
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {systemDiagnostic.summary.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>
                    تحذيرات ({systemDiagnostic.summary.warnings.length})
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {systemDiagnostic.summary.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Quick Tests Overview */}
          <div className="grid gap-4">
            {diagnostics.map((diagnostic, index) => (
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
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {systemDiagnostic ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
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
                        <strong>النظام:</strong>{" "}
                        {systemDiagnostic.system.platform}
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    نظام الملفات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>المجلد الحالي:</strong>{" "}
                      {systemDiagnostic.filesystem.current_directory}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(
                        systemDiagnostic.filesystem.env_files,
                      ).map(([file, exists]) => (
                        <div key={file} className="flex items-center gap-2">
                          {exists ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span
                            className={
                              exists ? "text-green-700" : "text-red-700"
                            }
                          >
                            {file}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p>قم بتشغيل الفحص الشامل لعرض معلومات النظام</p>
                <Button
                  onClick={() => testSystemDiagnostic(5)}
                  className="mt-4"
                >
                  تشغيل التشخيص الشامل
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          {systemDiagnostic ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    بيئة التشغيل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <p className="font-bold">خادم</p>
                      <Badge
                        variant={
                          systemDiagnostic.environment.isServer
                            ? "default"
                            : "secondary"
                        }
                      >
                        {systemDiagnostic.environment.isServer ? "نعم" : "لا"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <p className="font-bold">Netlify</p>
                      <Badge
                        variant={
                          systemDiagnostic.environment.isNetlify
                            ? "default"
                            : "secondary"
                        }
                      >
                        {systemDiagnostic.environment.isNetlify ? "نعم" : "لا"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <p className="font-bold">إنتاج</p>
                      <Badge
                        variant={
                          systemDiagnostic.environment.isProduction
                            ? "default"
                            : "secondary"
                        }
                      >
                        {systemDiagnostic.environment.isProduction
                          ? "نعم"
                          : "لا"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                          <p className="text-sm text-muted-foreground">
                            الطول:{" "}
                            {systemDiagnostic.env_analysis.supabase.url.length}{" "}
                            حرف
                          </p>
                          <p className="text-xs bg-muted p-2 rounded break-all">
                            {systemDiagnostic.env_analysis.supabase.url.value}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4" />
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
                          <p className="text-sm text-muted-foreground">
                            الطول:{" "}
                            {systemDiagnostic.env_analysis.supabase.key.length}{" "}
                            حرف
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

              <Card>
                <CardHeader>
                  <CardTitle>
                    جميع متغيرات البيئة (
                    {systemDiagnostic.env_analysis.all_env_keys.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
                    {systemDiagnostic.env_analysis.all_env_keys.map((key) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p>قم بتشغيل الفحص الشامل لعرض تفاصيل البيئة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          {systemDiagnostic && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  معلومات الشبكة والطلب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p>
                        <strong>المضيف:</strong>{" "}
                        {systemDiagnostic.network.request_info.headers.host}
                      </p>
                      <p>
                        <strong>الأصل:</strong>{" "}
                        {systemDiagnostic.network.request_info.headers.origin ||
                          "غير محدد"}
                      </p>
                      <p>
                        <strong>البروتوكول:</strong>{" "}
                        {systemDiagnostic.network.request_info.headers[
                          "x-forwarded-proto"
                        ] || "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>عنوان IP:</strong>{" "}
                        {systemDiagnostic.network.request_info.headers[
                          "x-forwarded-for"
                        ] || "غير محدد"}
                      </p>
                      <p>
                        <strong>المسار:</strong>{" "}
                        {systemDiagnostic.network.request_info.path}
                      </p>
                      <p>
                        <strong>الطريقة:</strong>{" "}
                        {systemDiagnostic.network.request_info.method}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold mb-2">تفاصيل الطلب:</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(
                        systemDiagnostic.network.request_info,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          {systemDiagnostic && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    اختبار اتصال Supabase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          systemDiagnostic.supabase_test.connection === "نجح"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {systemDiagnostic.supabase_test.connection}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({systemDiagnostic.supabase_test.timing}ms)
                      </span>
                    </div>

                    {systemDiagnostic.supabase_test.error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>خطأ في الاتصال</AlertTitle>
                        <AlertDescription>
                          {systemDiagnostic.supabase_test.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <h4 className="font-bold mb-2">تفاصيل الاختبار:</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(
                          systemDiagnostic.supabase_test.details,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>التكوين التلقائي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p>
                          <strong>مصدر التكوين:</strong>
                        </p>
                        <Badge>
                          {systemDiagnostic.auto_config.config.configSource}
                        </Badge>
                      </div>
                      <div>
                        <p>
                          <strong>التحقق:</strong>
                        </p>
                        <div className="space-x-2">
                          <Badge
                            variant={
                              systemDiagnostic.auto_config.validation.url_valid
                                ? "default"
                                : "destructive"
                            }
                          >
                            URL{" "}
                            {systemDiagnostic.auto_config.validation.url_valid
                              ? "صالح"
                              : "غير صالح"}
                          </Badge>
                          <Badge
                            variant={
                              systemDiagnostic.auto_config.validation.key_valid
                                ? "default"
                                : "destructive"
                            }
                          >
                            Key{" "}
                            {systemDiagnostic.auto_config.validation.key_valid
                              ? "صالح"
                              : "غير صالح"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          {browserInfo && (
            <div className="space-y-4">
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
                        <strong>Cookies:</strong>{" "}
                        {browserInfo.cookieEnabled ? "مفعل" : "معطل"}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>الاتصال:</strong>{" "}
                        {browserInfo.onLine ? "متصل" : "غير متصل"}
                      </p>
                      <p>
                        <strong>الشاشة:</strong> {browserInfo.screen.width}x
                        {browserInfo.screen.height}
                      </p>
                      <p>
                        <strong>العرض:</strong> {browserInfo.viewport.width}x
                        {browserInfo.viewport.height}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p>
                      <strong>عنوان الموقع:</strong>{" "}
                      {browserInfo.location.origin}
                    </p>
                    <p>
                      <strong>البروتوكول:</strong>{" "}
                      {browserInfo.location.protocol}
                    </p>
                    <p>
                      <strong>المسار:</strong> {browserInfo.location.pathname}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold mb-2">User Agent:</h4>
                    <p className="text-xs bg-muted p-2 rounded break-all">
                      {browserInfo.userAgent}
                    </p>
                  </div>

                  {browserInfo.connection && (
                    <div>
                      <h4 className="font-bold mb-2">معلومات الاتصال:</h4>
                      <pre className="bg-muted p-3 rounded text-xs">
                        {JSON.stringify(browserInfo.connection, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                <Progress
                  value={(systemDiagnostic.timing.total / 5000) * 100}
                  className="mt-2"
                />
              </div>
              <div>
                <p>
                  <strong>وقت اختبار Supabase:</strong>{" "}
                  {systemDiagnostic.timing.supabase}ms
                </p>
                <Progress
                  value={(systemDiagnostic.timing.supabase / 2000) * 100}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NetworkDiagnostic;
