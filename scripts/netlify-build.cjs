#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🚀 Starting Netlify build with environment variable setup...");

// Function to read and parse .env file
function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split("\n");
    const env = {};

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    return env;
  }
  return {};
}

// Read environment files
const productionEnv = readEnvFile(".env.production");
const fallbackEnv = readEnvFile(".env");

// Merge environment variables (production takes precedence)
const envVars = { ...fallbackEnv, ...productionEnv };

// Set environment variables for build process
Object.keys(envVars).forEach((key) => {
  if (!process.env[key]) {
    process.env[key] = envVars[key];
    console.log(`✅ Set ${key}=${envVars[key].substring(0, 20)}...`);
  } else {
    console.log(`ℹ️  ${key} already set in environment`);
  }
});

// Verify critical variables
const criticalVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missingVars = criticalVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing critical environment variables:", missingVars);
  process.exit(1);
}

console.log("✅ Environment variables configured successfully");
console.log("📦 Starting build process...");

// Execute the actual build command
const { execSync } = require("child_process");

try {
  execSync("npm run build", {
    stdio: "inherit",
    env: { ...process.env },
  });
  console.log("🎉 Build completed successfully!");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
