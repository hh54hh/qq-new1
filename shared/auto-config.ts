// Auto-configuration utility for production environments
// This provides fallback configuration when environment variables are not available

export interface AutoConfig {
  supabaseUrl: string;
  supabaseKey: string;
  isProduction: boolean;
  configSource: "env" | "fallback" | "auto";
}

// Fallback configuration (هذه القيم آمنة للاستخدام العام)
const FALLBACK_CONFIG = {
  supabaseUrl: "https://yrsvksgkxjiogjuaeyvd.supabase.co",
  supabaseKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyc3Zrc2dreGppb2dqdWFleXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDMzMDMsImV4cCI6MjA2NzM3OTMwM30.-haPW80fiZMWYCm83TXvwZ2kHHBhcvhWAc6jPYdlUXM",
};

// Detection utilities
export const detectEnvironment = () => {
  const isServer = typeof window === "undefined";
  const isNetlify = isServer
    ? !!process.env.NETLIFY
    : window.location.hostname.includes("netlify.app");
  const isProduction = isServer
    ? process.env.NODE_ENV === "production"
    : import.meta.env?.PROD || false;

  return { isServer, isNetlify, isProduction };
};

// Get environment variable with fallback
export const getEnvVar = (name: string, fallback?: string): string => {
  const { isServer } = detectEnvironment();

  let value: string | undefined;

  if (isServer) {
    // Server-side: try process.env first
    value = process.env[name];
  } else {
    // Client-side: try import.meta.env first
    value = import.meta.env?.[name];
  }

  // If not found and we have a fallback, use it
  if (!value && fallback) {
    return fallback;
  }

  // If still not found, return empty string
  return value || "";
};

// Auto-detect and configure Supabase settings
export const getAutoConfig = (): AutoConfig => {
  const { isProduction, isNetlify } = detectEnvironment();

  // Try to get from environment variables
  const envUrl = getEnvVar("VITE_SUPABASE_URL");
  const envKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

  // Determine configuration source and values
  let config: AutoConfig;

  if (envUrl && envKey) {
    // Environment variables are available
    config = {
      supabaseUrl: envUrl,
      supabaseKey: envKey,
      isProduction,
      configSource: "env",
    };
  } else {
    // Use fallback configuration
    config = {
      supabaseUrl: FALLBACK_CONFIG.supabaseUrl,
      supabaseKey: FALLBACK_CONFIG.supabaseKey,
      isProduction,
      configSource: "fallback",
    };

    // Log warning in development
    if (!isProduction) {
      console.warn(
        "⚠️  Using fallback configuration. Environment variables not found:",
        { envUrl: !!envUrl, envKey: !!envKey },
      );
    }
  }

  // Auto-configure based on environment
  if (isNetlify && !envUrl) {
    config.configSource = "auto";
    console.log("🔧 Auto-configured for Netlify production environment");
  }

  return config;
};

// Validate configuration
export const validateConfig = (config: AutoConfig): boolean => {
  const isValid =
    config.supabaseUrl &&
    config.supabaseKey &&
    config.supabaseUrl.startsWith("https://") &&
    config.supabaseKey.length > 50;

  if (!isValid) {
    console.error("❌ Invalid Supabase configuration:", {
      hasUrl: !!config.supabaseUrl,
      hasKey: !!config.supabaseKey,
      urlFormat: config.supabaseUrl?.startsWith("https://"),
      keyLength: config.supabaseKey?.length,
    });
  }

  return isValid;
};

// Get validated configuration with logging
export const getValidatedConfig = (): AutoConfig => {
  const config = getAutoConfig();
  const isValid = validateConfig(config);

  if (!isValid) {
    throw new Error("❌ Failed to get valid Supabase configuration");
  }

  // Log configuration info (without sensitive data)
  console.log("✅ Supabase configuration loaded:", {
    source: config.configSource,
    isProduction: config.isProduction,
    urlPrefix: config.supabaseUrl.substring(0, 30) + "...",
    keyPrefix: config.supabaseKey.substring(0, 20) + "...",
  });

  return config;
};

// Hook for React components
export const useAutoConfig = (): AutoConfig => {
  try {
    return getValidatedConfig();
  } catch (error) {
    console.error("Configuration error:", error);
    // Return minimal working config as absolute fallback
    return {
      supabaseUrl: FALLBACK_CONFIG.supabaseUrl,
      supabaseKey: FALLBACK_CONFIG.supabaseKey,
      isProduction: false,
      configSource: "fallback",
    };
  }
};
