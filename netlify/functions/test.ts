import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: "Simple test function works!",
        timestamp: new Date().toISOString(),
        path: event.path,
        method: event.httpMethod,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NETLIFY: process.env.NETLIFY,
          nodeVersion: process.version,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Test function failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
