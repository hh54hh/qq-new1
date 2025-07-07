import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  UserRole,
} from "../../shared/api";
import { db, getCurrentUserId } from "../../shared/supabase";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;
    console.log("Login attempt:", {
      email,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        error: "البريد الإلكتروني وكلم�� المرور مطلوبان",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "صيغة البريد الإلكتروني غير صحيحة",
      });
    }

    // Find user by email
    console.log("Looking for user with email:", email);
    const user = await db.users.findByEmail(email.toLowerCase().trim());
    console.log(
      "User found:",
      user ? { id: user.id, email: user.email, role: user.role } : null,
    );

    if (!user) {
      return res.status(401).json({
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    console.log("Password verification:", {
      userId: user.id,
      hasPassword: !!password,
      hasStoredHash: !!user.password_hash,
      isValid: isValidPassword,
    });

    if (!isValidPassword) {
      console.log("Login failed: Invalid password for user", user.email);
      return res.status(401).json({
        error: "البريد الإلكتروني أو كل��ة المرور غير صحيحة",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      let statusMessage = "الحساب غير نشط";
      if (user.status === "blocked") {
        statusMessage = "تم حظر هذا الحساب، تواصل مع الإدارة";
      } else if (user.status === "pending") {
        statusMessage = "الحساب في انتظار التفعيل";
      }
      return res.status(403).json({ error: statusMessage });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword as User,
      token: `supabase_${user.id}`, // Custom format for easy extraction
    };

    console.log("Login successful for user:", user.id);
    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "حدث خطأ في الخادم، يرجى المحاولة مرة أخرى",
    });
  }
};

export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, role, activation_key }: RegisterRequest =
      req.body;

    console.log("Registration attempt:", {
      name,
      email,
      role,
      hasActivationKey: !!activation_key,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields with specific messages
    if (!name || !email || !password || !role) {
      let missingFields = [];
      if (!name) missingFields.push("الاسم");
      if (!email) missingFields.push("البريد الإلكتروني");
      if (!password) missingFields.push("كلمة المرور");
      if (!role) missingFields.push("نوع الحساب");

      return res.status(400).json({
        error: `الحقول التالية مطلوبة: ${missingFields.join("، ")}`,
        errorType: "MISSING_REQUIRED_FIELDS",
        missingFields,
      });
    }

    // Validate name
    if (name.trim().length === 0) {
      return res.status(400).json({
        error: "الاسم لا يمكن أن يكون فارغاً",
        errorType: "EMPTY_NAME",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "الاسم يجب أن يحتوي على حرفين على الأقل",
        errorType: "NAME_TOO_SHORT",
        details: `الاسم الحالي: ${name.trim().length} حرف، المطلوب: حرفان على الأقل`,
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        error: "الاسم طويل جداً، يجب أن يكون أقل من 50 حرف",
        errorType: "NAME_TOO_LONG",
      });
    }

    // Validate email format
    if (email.trim().length === 0) {
      return res.status(400).json({
        error: "البريد الإلكتروني لا يمكن أن يكون فارغاً",
        errorType: "EMPTY_EMAIL",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        error:
          "صيغة البريد الإلكتروني غير صحيحة، يرجى كتابة البريد بالشكل الصحيح",
        errorType: "INVALID_EMAIL_FORMAT",
        details: "مثال صحيح: username@example.com",
      });
    }

    // Validate password strength
    if (password.trim().length === 0) {
      return res.status(400).json({
        error: "كلمة المرور لا يمكن أن تكون فارغة",
        errorType: "EMPTY_PASSWORD",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور ضعيفة جداً، يجب أن تحتوي على 6 أحرف على الأقل",
        errorType: "PASSWORD_TOO_SHORT",
        details: `كلمة المرور الحالية: ${password.length} أحرف، المطلوب: 6 أحرف على الأقل`,
      });
    }

    if (password.length > 100) {
      return res.status(400).json({
        error: "كلمة المرور طويلة جداً",
        errorType: "PASSWORD_TOO_LONG",
      });
    }

    // Validate role
    if (!["customer", "barber"].includes(role)) {
      return res.status(400).json({
        error: "نوع الحساب غير صحيح، يجب أن يكون 'زبون' أو 'حلاق'",
        errorType: "INVALID_ROLE",
        validRoles: ["customer", "barber"],
      });
    }

    // Check if user already exists
    console.log("Checking if user exists with email:", email);
    let existingUser;
    try {
      existingUser = await db.users.findByEmail(email.toLowerCase().trim());
    } catch (dbError) {
      console.error("Database error during user check:", dbError);
      return res.status(500).json({
        error: "خطأ في التحقق من البريد الإلكتروني، يرجى المحاولة مرة أخرى",
        errorType: "DATABASE_CHECK_ERROR",
      });
    }

    if (existingUser) {
      console.log("User already exists with this email");
      return res.status(409).json({
        error: "هذا البريد الإلكتروني مسجل مسبقاً في النظام",
        errorType: "EMAIL_ALREADY_EXISTS",
        suggestion:
          "يمكنك تسجيل الدخول باستخدام هذا البريد أو استخدام بريد آخر",
      });
    }

    // For barbers, validate activation key
    if (role === "barber") {
      if (!activation_key || !activation_key.trim()) {
        return res.status(400).json({
          error: "مفتاح التفعيل مطلوب لإنشاء حساب حلاق",
          errorType: "MISSING_ACTIVATION_KEY",
          suggestion: "للحصول على مفتاح التفعيل، اتصل على: 07800657822",
        });
      }

      console.log("Validating activation key:", activation_key);
      let keyStatus;
      try {
        keyStatus = await db.activationKeys.checkStatus(activation_key.trim());
      } catch (dbError) {
        console.error("Database error during key validation:", dbError);
        return res.status(500).json({
          error: "خطأ في التحقق من مفتاح التفعيل، يرجى المحاولة مرة أخرى",
          errorType: "KEY_VALIDATION_ERROR",
        });
      }

      if (!keyStatus.exists) {
        console.log("Activation key does not exist");
        return res.status(400).json({
          error: "مفتاح التفعيل غير صحيح أو غير موجود",
          errorType: "INVALID_ACTIVATION_KEY",
          suggestion:
            "تأكد من كتابة المفتاح بشكل صحيح أو اتصل على: 07800657822",
        });
      }

      if (keyStatus.isUsed) {
        console.log("Activation key is already used");
        return res.status(400).json({
          error: "هذا المفتاح تم استخدامه مسبقاً من قبل حساب آخر",
          errorType: "ACTIVATION_KEY_USED",
          suggestion: "للحصول على مفتاح جديد، اتصل على: 07800657822",
        });
      }
    }

    // Hash password
    console.log("Hashing password");
    let password_hash;
    try {
      const saltRounds = 12;
      password_hash = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
      console.error("Password hashing error:", hashError);
      return res.status(500).json({
        error: "خطأ في معالجة كلمة المرور، يرجى المحاولة مرة أخرى",
        errorType: "PASSWORD_HASH_ERROR",
      });
    }

    // Create new user
    console.log("Creating new user");
    let newUser;
    try {
      newUser = await db.users.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        role,
        status: "active",
        level: 1,
        points: 0,
        is_verified: role === "customer", // Barbers might need manual verification
      });
    } catch (createError) {
      console.error("User creation error:", createError);
      return res.status(500).json({
        error: "خطأ في إنشاء الحساب، يرجى المحاولة مرة أخرى",
        errorType: "USER_CREATION_ERROR",
      });
    }

    console.log("User created successfully:", {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Mark activation key as used if it's a barber
    if (role === "barber" && activation_key) {
      try {
        console.log("Marking activation key as used");
        const validKey = await db.activationKeys.validate(
          activation_key.trim(),
        );
        if (validKey) {
          await db.activationKeys.markUsed(validKey.id, newUser.id);
        }
      } catch (keyError) {
        console.error("Error marking activation key as used:", keyError);
        // Don't fail the registration for this, just log it
      }
    }

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = newUser;

    const response: AuthResponse = {
      user: userWithoutPassword as User,
      token: `supabase_${newUser.id}`,
    };

    console.log("Registration successful for user:", newUser.id);
    res.status(201).json(response);
  } catch (error) {
    console.error("Unexpected registration error:", error);

    // Handle specific database errors with clear messages
    if (error && typeof error === "object" && "message" in error) {
      const dbError = error as any;

      // Handle unique constraint violations
      if (
        dbError.code === "23505" ||
        dbError.message?.includes("duplicate") ||
        dbError.message?.includes("unique")
      ) {
        return res.status(409).json({
          error: "هذا البريد الإلكتروني مسجل مسبقاً في النظام",
          errorType: "DUPLICATE_EMAIL",
          suggestion: "استخدم بريد إلكتروني آخر أو سجل الدخول بالبريد الموجود",
        });
      }

      // Handle validation errors
      if (
        dbError.code === "23514" ||
        dbError.message?.includes("check constraint")
      ) {
        return res.status(400).json({
          error: "البيانات المدخلة لا تتوافق مع متطلبات النظام",
          errorType: "DATA_VALIDATION_ERROR",
          suggestion: "تحقق من جميع البيانات المدخلة",
        });
      }

      // Handle connection errors
      if (
        dbError.message?.includes("connection") ||
        dbError.message?.includes("network")
      ) {
        return res.status(500).json({
          error: "خطأ في الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى",
          errorType: "DATABASE_CONNECTION_ERROR",
        });
      }
    }

    // Default error for unexpected cases
    res.status(500).json({
      error: "حدث خطأ غير متوقع أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى",
      errorType: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

export const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await db.users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpdateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { avatar_url, name, email } = req.body;

    // Update user profile
    const updatedUser = await db.users.update(userId, {
      ...(avatar_url && { avatar_url }),
      ...(name && { name }),
      ...(email && { email }),
    });

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
