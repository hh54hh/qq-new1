import express from "express";
import cors from "cors";
import multer from "multer";
import { join } from "path";
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
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  deleteConversation,
} from "./routes/messages";
import { uploadImage, uploadProfileImage } from "./routes/upload";
import {
  searchBarbers as advancedSearchBarbers,
  getRecommendations,
} from "./routes/search";
import { getBarberAnalytics, getGlobalAnalytics } from "./routes/analytics";

// Configure multer for file uploads
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

const upload = multer({
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

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" })); // Increased limit for image uploads
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Serve uploaded images statically (only in non-serverless mode)
  if (process.env.NODE_ENV !== "production" || !process.env.NETLIFY) {
    app.use("/uploads", express.static("uploads"));
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
  // Health check and debugging routes
  app.get("/api/ping", (_req, res) => {
    res.json({
      message: "Hello from Express server v2!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Environment check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      supabase: {
        url_configured: true,
        key_configured: true,
        connection_type: "مدمجة في المشروع",
        url_preview: "https://yrsvksgkxjiogjuaeyvd.supabase.co",
      },
      server: {
        node_version: process.version,
        platform: process.platform,
      },
    });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register", handleRegister);
  app.get("/api/auth/profile", handleGetProfile);
  app.put("/api/auth/profile", handleUpdateProfile);

  // Test routes (for development)
  app.get("/api/create-test-user", createTestUser);
  app.post("/api/debug-login", debugLogin);
  app.get("/api/reset-test-password", resetTestPassword);

  // Barbers routes
  app.get("/api/barbers", getBarbers);
  app.get("/api/barbers/search", searchBarbers);
  app.get("/api/barbers/search/advanced", advancedSearchBarbers);
  app.get("/api/barbers/recommendations", getRecommendations);

  // Bookings routes
  app.get("/api/bookings", getBookings);
  app.post("/api/bookings", createBooking);
  app.patch("/api/bookings/:id", updateBooking);

  // Posts routes
  app.get("/api/posts", getPosts);
  app.post("/api/posts", createPost);

  // Follows routes
  app.get("/api/follows", getFollows);
  app.post("/api/follows", createFollow);
  app.delete("/api/follows/:id", deleteFollow);

  // Friend requests routes
  app.get("/api/friend-requests", getFriendRequests);
  app.post("/api/friend-requests", createFriendRequest);
  app.patch("/api/friend-requests/:id", updateFriendRequest);

  // Post likes routes
  app.post("/api/posts/:id/like", likePost);
  app.delete("/api/posts/:id/like", unlikePost);

  // Post comments routes
  app.get("/api/posts/:id/comments", getPostComments);
  app.post("/api/posts/:id/comments", createPostComment);

  // Ratings routes
  app.get("/api/barbers/:id/ratings", getBarberRatings);
  app.post("/api/ratings", createRating);

  // Services routes
  app.get("/api/barbers/:id/services", getBarberServices);
  app.post("/api/services", createService);
  app.put("/api/services/:id", updateService);
  app.delete("/api/services/:id", deleteService);

  // Working hours routes
  app.get("/api/working-hours", getWorkingHours);
  app.put("/api/working-hours", saveWorkingHours);

  // Notifications routes
  app.get("/api/notifications", getNotifications);
  app.patch("/api/notifications/:id/read", markNotificationAsRead);
  app.patch("/api/notifications/read-all", markAllNotificationsAsRead);

  // Admin routes
  app.get("/api/admin/stats", getAdminStats);
  app.get("/api/admin/users", getAllUsers);
  app.get("/api/admin/analytics", getGlobalAnalytics);

  // Analytics routes
  app.get("/api/analytics/barber", getBarberAnalytics);

  // Upload routes
  app.post("/api/upload/image", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع ملف" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "خطأ في رفع الملف" });
    }
  });

  app.post("/api/upload/profile", upload.single("image"), uploadProfileImage);

  // Messages routes
  app.get("/api/messages/conversations", getConversations);
  app.get("/api/messages/unread-count", getUnreadCount);
  app.get("/api/messages/:otherUserId", getMessages);
  app.post("/api/messages", sendMessage);
  app.patch("/api/messages/:senderId/read", markMessagesAsRead);
  app.delete("/api/messages/:otherUserId", deleteConversation);

  return app;
}
