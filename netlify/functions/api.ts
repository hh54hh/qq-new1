import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createServerlessServer } from "../../server/index";

// Initialize the Express app
let app: any = null;
let serverlessHandler: any = null;

// Initialize app and handler on first request
const initializeApp = () => {
  if (!app) {
    try {
      console.log("Initializing serverless app...");

      // Set environment variables for serverless detection
      process.env.NETLIFY = "true";
      process.env.AWS_LAMBDA_FUNCTION_NAME = "netlify-functions";

      app = createServerlessServer();

      // Create serverless handler with proper configuration
      serverlessHandler = serverless(app, {
        basePath: "",
        request: (request: any, event: any) => {
          // Fix path to remove the function base path
          const originalPath = event.path || event.rawPath || "";
          const cleanPath =
            originalPath.replace(/^\/\.netlify\/functions\/api/, "") || "/";

          console.log(`Path transformation: ${originalPath} -> ${cleanPath}`);

          // Update the request with the cleaned path
          request.url =
            cleanPath + (event.rawQuery ? `?${event.rawQuery}` : "");
        },
      });

      console.log("App initialized successfully");
    } catch (error) {
      console.error("App initialization failed:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NETLIFY: process.env.NETLIFY,
          AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
        },
      });
      throw error;
    }
  }
  return { app, serverlessHandler };
};

export const handler: Handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Set serverless context
    context.callbackWaitsForEmptyEventLoop = false;

    // Initialize app if needed
    const { serverlessHandler } = initializeApp();

    console.log(
      `[${new Date().toISOString()}] ${event.httpMethod} ${event.path}`,
      {
        rawPath: event.rawPath,
        rawQuery: event.rawQuery,
        headers: event.headers ? Object.keys(event.headers).join(", ") : "none",
      },
    );

    // Call the serverless handler
    const result = await serverlessHandler(event, context);

    console.log(`Response: ${result.statusCode}`, {
      hasBody: !!result.body,
      bodyLength: result.body ? result.body.length : 0,
    });

    // Ensure response has CORS headers
    return {
      ...result,
      headers: {
        ...result.headers,
        ...corsHeaders,
      },
    };
  } catch (error) {
    console.error("Function execution error:", error);

    // More detailed error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack available",
      timestamp: new Date().toISOString(),
      path: event.path,
      rawPath: event.rawPath,
      method: event.httpMethod,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NETLIFY: process.env.NETLIFY,
        nodeVersion: process.version,
      },
    };

    console.error(
      "Detailed error info:",
      JSON.stringify(errorDetails, null, 2),
    );

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "خطأ داخلي في الخادم",
        message: error instanceof Error ? error.message : "خطأ غير معروف",
        timestamp: new Date().toISOString(),
        details: errorDetails,
      }),
    };
  }
};
