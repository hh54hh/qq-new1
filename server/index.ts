import express from "express";
import cors from "cors";
import multer from "multer";
import { join } from "path";
import fs from "fs";
import path from "path";

// Environment variable helper function
const getEnvVar = (name: string) => {
  return process.env[name];
};
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile,
} from "./routes/auth";
import { createTestUser } from "./routes/test-user";
import { debugLogin } from "./routes/debug-auth";
import { resetTestPassword } from "./routes/reset-test-password";
import {
  getBarbers,
  searchBarbers,
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getPosts,
  createPost,
  getFollows,
  createFollow,
  deleteFollow,
  getFriendRequests,
  createFriendRequest,
  updateFriendRequest,
  likePost,
  unlikePost,
  getPostComments,
  createPostComment,
  getBarberRatings,
  createRating,
  getBarberServices,
  createService,
  updateService,
  deleteService,
  getWorkingHours,
  saveWorkingHours,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAdminStats,
  getAllUsers,
} from "./routes/barbershop";

import { uploadImage, uploadProfileImage } from "./routes/upload";
import {
  searchBarbers as advancedSearchBarbers,
  getRecommendations,
  searchUsers,
  getUserById,
} from "./routes/search";
import { getBarberAnalytics, getGlobalAnalytics } from "./routes/analytics";
import { getSystemDiagnostic } from "./routes/system-diagnostic";

// Configure multer for file uploads
let upload: multer.Multer;

// Check if we're in a serverless environment
const isServerless = !!(process.env.NETLIFY || process.env.VERCEL);

try {
  if (isServerless) {
    // Serverless environment - use memory storage only
    console.log("Serverless environment detected - using memory storage");
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit for serverless
    });
  } else {
    // Local/traditional server environment
    console.log("Traditional server environment - using disk storage");
    const uploadsDir = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, "uploads/");
      },
      filename: (req, file, cb) => {
        const userId =
          req.headers.authorization?.split(" ")[1]?.replace("supabase_", "") ||
          "unknown";
        const timestamp = Date.now();
        const fileExtension = file.originalname.split(".").pop();
        cb(null, `${userId}_${timestamp}.${fileExtension}`);
      },
    });

    upload = multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new Error("يجب أن يكون الملف صورة"));
        }
      },
    });
  }
} catch (error) {
  console.error("Multer configuration error:", error);
  // Fallback to memory storage if any error occurs
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 },
  });
}

export function createServer() {
  const app = express();

  // Check if we're in a serverless environment
  const isServerless = !!(process.env.NETLIFY || process.env.VERCEL);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" })); // Increased limit for image uploads
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Serve uploaded images statically (only in non-serverless mode)
  if (!isServerless) {
    try {
      app.use("/uploads", express.static("uploads"));
    } catch (err) {
      console.warn("Cannot serve static uploads:", err);
    }
  }

  return createAppWithRoutes(app);
}

export function createServerlessServer() {
  const app = express();

  // Middleware optimized for serverless
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
      ],
    }),
  );

  // Reduced limits for serverless environment
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // Don't serve static files in serverless - this will be handled differently
  // app.use("/uploads", express.static("uploads")); // Removed for serverless

  return createAppWithRoutes(app);
}

function createAppWithRoutes(app: express.Application) {
  // Global error handler middleware
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("Global error handler:", err);

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        error: "خطأ داخ��ي في الخادم",
        message: err instanceof Error ? err.message : "خطأ غير معروف",
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        serverless: !!process.env.NETLIFY,
      });
    },
  );

  // Health check and debugging routes - handle both /api and root paths
  const handlePing = (_req: express.Request, res: express.Response) => {
    try {
      res.json({
        message: "Hello from Express server v5!",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        serverless: !!process.env.NETLIFY,
        version: "5.0.0",
        supabase_configured: true,
        auto_config: true,
        path: _req.path,
        url: _req.url,
      });
    } catch (error) {
      console.error("Ping endpoint error:", error);
      res.status(500).json({
        error: "Ping endpoint failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  app.get("/ping", handlePing);
  app.get("/api/ping", handlePing);

  // Environment check endpoint
  const handleHealth = (_req: express.Request, res: express.Response) => {
    try {
      const isNetlify = !!process.env.NETLIFY;
      const hasSupabaseUrl = !!getEnvVar("VITE_SUPABASE_URL");
      const hasSupabaseKey = !!getEnvVar("VITE_SUPABASE_ANON_KEY");

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        platform: {
          is_netlify: isNetlify,
          is_serverless: isNetlify,
          node_version: process.version,
          platform: process.platform,
        },
        supabase: {
          url_configured: hasSupabaseUrl,
          key_configured: hasSupabaseKey,
          connection_type: isNetlify
            ? "Netlify Serverless"
            : "مدمجة في المشروع",
          url_preview: hasSupabaseUrl
            ? getEnvVar("VITE_SUPABASE_URL")?.substring(0, 40) + "..."
            : "https://yrsvksgkxjiogjuaeyvd.supabase.co",
          using_fallback: !hasSupabaseUrl,
        },
        features: {
          file_upload: !isNetlify,
          static_files: !isNetlify,
        },
        request_info: {
          path: _req.path,
          url: _req.url,
          method: _req.method,
        },
      });
    } catch (error) {
      console.error("Health endpoint error:", error);
      res.status(500).json({
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  app.get("/health", handleHealth);
  app.get("/api/health", handleHealth);

  // Add a simple debug endpoint that works in all environments
  const handleDebug = (_req: express.Request, res: express.Response) => {
    try {
      res.json({
        success: true,
        message: "Debug endpoint working",
        env_vars: {
          NODE_ENV: process.env.NODE_ENV,
          NETLIFY: process.env.NETLIFY,
          has_supabase_url: !!getEnvVar("VITE_SUPABASE_URL"),
          has_supabase_key: !!getEnvVar("VITE_SUPABASE_ANON_KEY"),
        },
        request_info: {
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          path: _req.path,
          url: _req.url,
          method: _req.method,
        },
      });
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  app.get("/debug", handleDebug);
  app.get("/api/debug", handleDebug);

  // System diagnostic endpoint
  app.get("/api/system-diagnostic", getSystemDiagnostic);

  app.get("/demo", handleDemo);
  app.get("/api/demo", handleDemo);

  // Authentication routes - both /api and direct paths for Netlify compatibility
  app.post("/api/auth/login", handleLogin);
  app.post("/auth/login", handleLogin);
  app.post("/api/login", handleLogin); // Direct login endpoint
  app.post("/login", handleLogin); // Direct login endpoint
  app.post("/api/auth/register", handleRegister);
  app.post("/auth/register", handleRegister);
  app.post("/api/register", handleRegister); // Direct register endpoint
  app.post("/register", handleRegister); // Direct register endpoint
  app.get("/api/auth/profile", handleGetProfile);
  app.get("/auth/profile", handleGetProfile);
  app.put("/api/auth/profile", handleUpdateProfile);
  app.put("/auth/profile", handleUpdateProfile);

  // Test routes (for development) - both /api and direct paths
  app.get("/api/create-test-user", createTestUser);
  app.get("/create-test-user", createTestUser);
  app.post("/api/debug-login", debugLogin);
  app.post("/debug-login", debugLogin);
  app.get("/api/reset-test-password", resetTestPassword);
  app.get("/reset-test-password", resetTestPassword);

  // Barbers routes - both /api and direct paths for Netlify compatibility
  app.get("/api/barbers", getBarbers);
  app.get("/barbers", getBarbers);
  app.get("/api/barbers/search", searchBarbers);
  app.get("/barbers/search", searchBarbers);
  app.get("/api/barbers/search/advanced", advancedSearchBarbers);
  app.get("/barbers/search/advanced", advancedSearchBarbers);
  app.get("/api/barbers/recommendations", getRecommendations);
  app.get("/barbers/recommendations", getRecommendations);

  // User search routes
  app.get("/api/users/search", searchUsers);
  app.get("/users/search", searchUsers);

  // Get user by ID
  app.get("/api/users/:id", getUserById);
  app.get("/users/:id", getUserById);

  // Bookings routes - both paths
  app.get("/api/bookings", getBookings);
  app.get("/bookings", getBookings);
  app.post("/api/bookings", createBooking);
  app.post("/bookings", createBooking);
  app.patch("/api/bookings/:id", updateBooking);
  app.patch("/bookings/:id", updateBooking);
  app.delete("/api/bookings/:id", deleteBooking);
  app.delete("/bookings/:id", deleteBooking);

  // Posts routes - both paths
  app.get("/api/posts", getPosts);
  app.get("/posts", getPosts);
  app.post("/api/posts", createPost);
  app.post("/posts", createPost);

  // Follows routes - both paths
  app.get("/api/follows", getFollows);
  app.get("/follows", getFollows);
  app.post("/api/follows", createFollow);
  app.post("/follows", createFollow);
  app.delete("/api/follows/:id", deleteFollow);
  app.delete("/follows/:id", deleteFollow);

  // Friend requests routes - both paths
  app.get("/api/friend-requests", getFriendRequests);
  app.get("/friend-requests", getFriendRequests);
  app.post("/api/friend-requests", createFriendRequest);
  app.post("/friend-requests", createFriendRequest);
  app.patch("/api/friend-requests/:id", updateFriendRequest);
  app.patch("/friend-requests/:id", updateFriendRequest);

  // Post likes routes - both paths
  app.post("/api/posts/:id/like", likePost);
  app.post("/posts/:id/like", likePost);
  app.delete("/api/posts/:id/like", unlikePost);
  app.delete("/posts/:id/like", unlikePost);

  // Post comments routes - both paths
  app.get("/api/posts/:id/comments", getPostComments);
  app.get("/posts/:id/comments", getPostComments);
  app.post("/api/posts/:id/comments", createPostComment);
  app.post("/posts/:id/comments", createPostComment);

  // Ratings routes - both paths
  app.get("/api/barbers/:id/ratings", getBarberRatings);
  app.get("/barbers/:id/ratings", getBarberRatings);
  app.post("/api/ratings", createRating);
  app.post("/ratings", createRating);

  // Services routes - both paths
  app.get("/api/barbers/:id/services", getBarberServices);
  app.get("/barbers/:id/services", getBarberServices);
  app.post("/api/services", createService);
  app.post("/services", createService);
  app.put("/api/services/:id", updateService);
  app.put("/services/:id", updateService);
  app.delete("/api/services/:id", deleteService);
  app.delete("/services/:id", deleteService);

  // Working hours routes - both paths
  app.get("/api/working-hours", getWorkingHours);
  app.get("/working-hours", getWorkingHours);
  app.put("/api/working-hours", saveWorkingHours);
  app.put("/working-hours", saveWorkingHours);

  // Notifications routes - both paths
  app.get("/api/notifications", getNotifications);
  app.get("/notifications", getNotifications);
  app.patch("/api/notifications/:id/read", markNotificationAsRead);
  app.patch("/notifications/:id/read", markNotificationAsRead);
  app.patch("/api/notifications/read-all", markAllNotificationsAsRead);
  app.patch("/notifications/read-all", markAllNotificationsAsRead);

  // Admin routes
  app.get("/api/admin/stats", getAdminStats);
  app.get("/api/admin/users", getAllUsers);
  app.get("/api/admin/analytics", getGlobalAnalytics);

  // Analytics routes
  app.get("/api/analytics/barber", getBarberAnalytics);

  // Upload routes - handle differently in serverless vs regular mode
  if (process.env.NETLIFY) {
    // Serverless mode - disable file uploads or handle them differently
    app.post("/api/upload/image", (req, res) => {
      res.status(501).json({
        error: "��فع الملفات غير مدعوم في البيئة الحالية",
        message: "File uploads are not supported in serverless environment",
        suggestion: "استخدم خدمة رفع ملفات خارجية مثل Cloudinary أو AWS S3",
      });
    });

    app.post("/api/upload/profile", (req, res) => {
      res.status(501).json({
        error: "رفع الملفات غير مدعوم في البيئة الحالية",
        message: "File uploads are not supported in serverless environment",
        suggestion: "استخدم خدمة رفع ملفات خارجية م��ل Cloudinary أو AWS S3",
      });
    });
  } else {
    // Regular server mode with file upload support
    app.post("/api/upload/image", upload.single("image"), (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "لم يتم رفع ملف" });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "خطأ في رفع ��لملف" });
      }
    });

    app.post("/api/upload/profile", upload.single("image"), uploadProfileImage);
  }

  // PWA Push Notifications routes
  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      // محاكاة تسجيل اشتراك Push
      console.log("Push subscription registered:", req.body);
      res.json({ success: true, message: "تم تسجيل الاشتراك بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تسجيل الاشتراك" });
    }
  });

  app.delete("/api/notifications/subscribe", async (req, res) => {
    try {
      console.log("Push subscription removed");
      res.json({ success: true, message: "تم إلغاء الاشتراك" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إلغاء الاشتراك" });
    }
  });

  app.post("/api/notifications/test", async (req, res) => {
    try {
      console.log("Test notification sent");
      res.json({ success: true, message: "تم إرسال الإشعار التجريبي" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إرسال الإشعار" });
    }
  });

  return app;
}
