import { RequestHandler } from "express";
import { supabase } from "../../shared/supabase";
import { detectEnvironment, getAutoConfig } from "../../shared/auto-config";

export const getSystemDiagnostic: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();

    // Environment Detection
    const environment = detectEnvironment();
    const autoConfig = getAutoConfig();

    // System Information
    const systemInfo = {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Environment Variables Analysis
    const envAnalysis = {
      // Critical Supabase variables
      supabase: {
        url: {
          exists: !!process.env.VITE_SUPABASE_URL,
          value: process.env.VITE_SUPABASE_URL || "غير موجود",
          source: process.env.VITE_SUPABASE_URL ? "env" : "fallback",
          length: process.env.VITE_SUPABASE_URL?.length || 0,
        },
        key: {
          exists: !!process.env.VITE_SUPABASE_ANON_KEY,
          value: process.env.VITE_SUPABASE_ANON_KEY
            ? process.env.VITE_SUPABASE_ANON_KEY.substring(0, 30) + "..."
            : "غير موجود",
          source: process.env.VITE_SUPABASE_ANON_KEY ? "env" : "fallback",
          length: process.env.VITE_SUPABASE_ANON_KEY?.length || 0,
        },
      },

      // Build and runtime variables
      build: {
        NODE_ENV: process.env.NODE_ENV || "غير محدد",
        NETLIFY: process.env.NETLIFY || "غير موجود",
        CI: process.env.CI || "غير موجود",
        BUILD_ID: process.env.BUILD_ID || "غير موجود",
        CONTEXT: process.env.CONTEXT || "غير موجود",
        BRANCH: process.env.BRANCH || "غير موجود",
        HEAD: process.env.HEAD || "غير موجود",
        COMMIT_REF: process.env.COMMIT_REF || "غير موجود",
      },

      // All environment variables (without sensitive values)
      all_env_keys: Object.keys(process.env)
        .filter((key) => !key.includes("SECRET") && !key.includes("PASSWORD"))
        .sort(),
    };

    // Supabase Connection Test
    let supabaseTest = {
      connection: "غير محدد",
      error: null,
      timing: 0,
      details: {},
    };

    try {
      const supabaseStart = Date.now();
      const { data, error } = await supabase.from("users").select("count");
      const supabaseTiming = Date.now() - supabaseStart;

      if (error) {
        supabaseTest = {
          connection: "فشل",
          error: error.message,
          timing: supabaseTiming,
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details,
          },
        };
      } else {
        supabaseTest = {
          connection: "نجح",
          error: null,
          timing: supabaseTiming,
          details: {
            query_result: data,
            records_accessible: true,
          },
        };
      }
    } catch (error) {
      supabaseTest = {
        connection: "خطأ",
        error: error instanceof Error ? error.message : "خطأ غ��ر معروف",
        timing: 0,
        details: { type: "connection_error" },
      };
    }

    // File System Check
    const fs = await import("fs");
    const path = await import("path");
    const fileSystemCheck = {
      current_directory: process.cwd(),
      env_files: {
        ".env": fs.existsSync(path.join(process.cwd(), ".env")),
        ".env.production": fs.existsSync(
          path.join(process.cwd(), ".env.production"),
        ),
        ".env.local": fs.existsSync(path.join(process.cwd(), ".env.local")),
        "netlify.toml": fs.existsSync(path.join(process.cwd(), "netlify.toml")),
      },
      package_json: fs.existsSync(path.join(process.cwd(), "package.json")),
    };

    // Network Information
    const networkInfo = {
      request_info: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: {
          host: req.headers.host,
          "user-agent": req.headers["user-agent"],
          origin: req.headers.origin,
          referer: req.headers.referer,
          "x-forwarded-for": req.headers["x-forwarded-for"],
          "x-forwarded-proto": req.headers["x-forwarded-proto"],
        },
      },
    };

    // Auto-Configuration Status
    const autoConfigStatus = {
      config: autoConfig,
      validation: {
        url_valid: autoConfig.supabaseUrl.startsWith("https://"),
        key_valid: autoConfig.supabaseKey.length > 50,
        source: autoConfig.configSource,
      },
    };

    // Response Time
    const totalTiming = Date.now() - startTime;

    const diagnosticReport = {
      status: "نجح",
      timestamp: new Date().toISOString(),
      timing: {
        total: totalTiming,
        supabase: supabaseTest.timing,
      },
      environment,
      system: systemInfo,
      env_analysis: envAnalysis,
      supabase_test: supabaseTest,
      filesystem: fileSystemCheck,
      network: networkInfo,
      auto_config: autoConfigStatus,
      summary: {
        critical_issues: [],
        warnings: [],
        status: "تحليل شامل مكتمل",
      },
    };

    // Add critical issues
    if (!envAnalysis.supabase.url.exists) {
      diagnosticReport.summary.critical_issues.push(
        "متغير VITE_SUPABASE_URL غير موجود",
      );
    }
    if (!envAnalysis.supabase.key.exists) {
      diagnosticReport.summary.critical_issues.push(
        "متغير VITE_SUPABASE_ANON_KEY غير موجود",
      );
    }
    if (supabaseTest.connection === "فشل") {
      diagnosticReport.summary.critical_issues.push(
        "فشل الاتصال بقاعدة البيانات Supabase",
      );
    }

    // Add warnings
    if (autoConfig.configSource === "fallback") {
      diagnosticReport.summary.warnings.push(
        "يتم استخدام التكوين الاحتياطي بدلاً من متغيرات البيئة",
      );
    }
    if (
      !fileSystemCheck.env_files[".env.production"] &&
      environment.isNetlify
    ) {
      diagnosticReport.summary.warnings.push("ملف .env.production غير موجود");
    }

    res.json(diagnosticReport);
  } catch (error) {
    console.error("System diagnostic error:", error);

    res.status(500).json({
      status: "فشل",
      error: "خطأ في تشخيص النظام",
      message: error instanceof Error ? error.message : "خطأ غير معروف",
      timestamp: new Date().toISOString(),
    });
  }
};
