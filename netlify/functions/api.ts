import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server/index.js";

// Create Express app
const app = createServer();

// Convert Express app to serverless function
const serverlessHandler = serverless(app, {
  binary: false,
});

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
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

  try {
    // Pass the event to the serverless Express handler
    const result = await serverlessHandler(event, context);

    // Ensure CORS headers are always present
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    };

    return {
      ...result,
      headers: {
        ...result.headers,
        ...corsHeaders,
      },
    };
  } catch (error) {
    console.error("Netlify Function Error:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
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
