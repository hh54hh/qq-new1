import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  const { httpMethod, path, body, headers } = event;

  // Handle CORS preflight
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      },
      body: "",
    };
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Content-Type": "application/json",
  };

  try {
    // Extract API path - handle both direct function calls and redirected calls
    let apiPath = path;
    if (apiPath.startsWith("/.netlify/functions/api")) {
      apiPath = apiPath.replace("/.netlify/functions/api", "");
    }
    if (!apiPath || apiPath === "/") {
      apiPath = "/ping";
    }

    console.log(`[Netlify Function] ${httpMethod} ${apiPath}`, {
      originalPath: path,
      headers: Object.keys(headers),
      timestamp: new Date().toISOString(),
    });

    // Handle basic health check routes
    if (apiPath === "/ping") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Hello from Express server v2!",
          timestamp: new Date().toISOString(),
          environment: "netlify-function",
          path: apiPath,
          originalPath: path,
        }),
      };
    }

    if (apiPath === "/health") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          environment: "netlify-function",
          supabase: {
            url_configured: !!process.env.VITE_SUPABASE_URL,
            key_configured: !!process.env.VITE_SUPABASE_ANON_KEY,
            connection_type: "serverless function",
          },
          netlify: {
            region: process.env.AWS_REGION,
            functionName: context.functionName,
            requestId: context.awsRequestId,
          },
        }),
      };
    }

    if (apiPath === "/demo") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Demo endpoint working from Netlify Functions",
          timestamp: new Date().toISOString(),
          environment: "netlify-function",
        }),
      };
    }

    // Handle auth profile endpoint - basic test
    if (apiPath === "/auth/profile") {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "غير مصرح",
            message: "يجب تقديم رمز المصادقة",
          }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "خدمة المصادقة تستجيب",
          authenticated: true,
        }),
      };
    }

    // Handle auth login endpoint - basic test
    if (apiPath === "/auth/login" && httpMethod === "POST") {
      const requestBody = body ? JSON.parse(body) : {};

      if (!requestBody.email || !requestBody.password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "البريد الإلكتروني وكلمة المرور مطلوبان",
          }),
        };
      }

      // This is just a test endpoint - in real implementation, validate credentials
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "endpoint تسجيل الدخول يعمل",
          test: true,
        }),
      };
    }

    // For any other route, return a helpful 404
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "المسار غير موجود",
        path: apiPath,
        originalPath: path,
        availableEndpoints: [
          "/ping",
          "/health",
          "/demo",
          "/auth/profile",
          "/auth/login",
        ],
        message: "تحقق من المسار المطلوب",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Netlify Function Error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "خطأ داخلي في الخادم",
        message: error instanceof Error ? error.message : "خطأ غير معروف",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        environment: "netlify-function",
      }),
    };
  }
};
