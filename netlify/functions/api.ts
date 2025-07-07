import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Create the Express app
const app = createServer();

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
    });

    // Use the serverless handler
    const response = await serverlessHandler(event, context);

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
      }),
    };
  }
};
