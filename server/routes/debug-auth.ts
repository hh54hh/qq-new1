import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../../shared/supabase";

export const debugLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Debug login attempt:", { email, password: "***" });

    // Test direct Supabase query without RLS
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database error", details: error });
    }

    console.log("Found users:", users?.length);

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    console.log("User found:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    if (!user.password_hash) {
      return res.status(400).json({ error: "No password set for user" });
    }

    // Test password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Return success without JWT for debugging
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        level: user.level,
        points: user.points,
        is_verified: user.is_verified,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Debug login error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
