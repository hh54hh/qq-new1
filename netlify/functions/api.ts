import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createServerlessServer } from "../../server/index";

// Create the Express app optimized for serverless
const app = createServerlessServer();

// Convert Express app to serverless function
const serverlessHandler = serverless(app, {
  basePath: "/api",
});

export const handler: Handler = async (event, context) => {
  // Add CORS headers for all requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
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
    // Log the request for debugging
    console.log(`[Netlify Function] ${event.httpMethod} ${event.path}`, {
      headers: Object.keys(event.headers),
      timestamp: new Date().toISOString(),
      query: event.queryStringParameters,
      nodeVersion: process.version,
      platform: process.platform,
    });

    // Ensure we have the proper context for serverless
    context.callbackWaitsForEmptyEventLoop = false;

    // Validate basic requirements
    if (!app) {
      throw new Error("Express app not initialized");
    }

    // Use the serverless handler
    const response = await serverlessHandler(event, context);

    console.log(`[Netlify Function] Response ${response.statusCode}`, {
      headers: response.headers ? Object.keys(response.headers) : [],
      bodyLength: response.body?.length || 0,
    });

    // Add CORS headers to the response
    return {
      ...response,
      headers: {
        ...response.headers,
        ...corsHeaders,
      },
    };
  } catch (error) {
    console.error("Netlify Function Error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack",
      nodeVersion: process.version,
      platform: process.platform,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NETLIFY: process.env.NETLIFY,
      },
      path: event.path,
      method: event.httpMethod,
    });

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
        environment: "netlify-function",
        path: event.path,
        method: event.httpMethod,
        debug: {
          nodeVersion: process.version,
          platform: process.platform,
          hasApp: !!app,
        },
      }),
    };
  }
};
