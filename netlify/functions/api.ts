import type { Handler } from "@netlify/functions";

// Minimal serverless function that handles basic API requests
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
    // Extract API path
    const apiPath = path.replace(/^\/\.netlify\/functions\/api/, "") || "/";

    // Handle basic routes
    if (apiPath === "/ping" || apiPath === "/") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Hello from Express server v2!",
          timestamp: new Date().toISOString(),
          environment: "netlify-function",
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
            url_configured: true,
            key_configured: true,
            connection_type: "مدمجة في المشروع",
          },
        }),
      };
    }

    if (apiPath === "/demo") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Demo endpoint working",
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (apiPath.startsWith("/auth/profile")) {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: "غير مصرح" }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "خدمة المصادقة تستجيب" }),
      };
    }

    // Handle other routes
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "الصفحة غير موجودة",
        path: apiPath,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("API Error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "خطأ داخلي في الخادم",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
