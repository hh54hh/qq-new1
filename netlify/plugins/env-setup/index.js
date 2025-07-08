const fs = require("fs");
const path = require("path");

module.exports = {
  onPreBuild: ({ utils, inputs }) => {
    console.log("🔧 Netlify Plugin: Auto Environment Setup");

    // Read .env.production file
    const envProductionPath = path.join(process.cwd(), ".env.production");
    const envPath = path.join(process.cwd(), ".env");

    function parseEnvFile(filePath) {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${filePath} not found`);
        return {};
      }

      const content = fs.readFileSync(filePath, "utf8");
      const env = {};

      content.split("\n").forEach((line) => {
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

    // Load environment variables
    const productionEnv = parseEnvFile(envProductionPath);
    const fallbackEnv = parseEnvFile(envPath);
    const mergedEnv = { ...fallbackEnv, ...productionEnv };

    // Set environment variables
    let setCount = 0;
    Object.entries(mergedEnv).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`✅ Set ${key}=${value.substring(0, 20)}...`);
        setCount++;
      }
    });

    console.log(`📦 Set ${setCount} environment variables automatically`);

    // Verify critical variables
    const criticalVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
    const missingVars = criticalVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      utils.build.failBuild(
        `Missing critical environment variables: ${missingVars.join(", ")}`,
      );
    }

    console.log("✅ All critical environment variables are set");
  },

  onBuild: ({ utils }) => {
    console.log("🚀 Build starting with environment variables configured");
  },

  onPostBuild: ({ utils }) => {
    console.log("🎉 Build completed successfully with auto environment setup");
  },
};
