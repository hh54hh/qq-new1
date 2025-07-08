import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../shared/supabase";

export const createTestUser: RequestHandler = async (req, res) => {
  try {
    // Test database connection first
    console.log("Testing database connection...");

    // Create test user with proper password hash
    const testPassword = "123456";
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(testPassword, saltRounds);

    console.log("Password hash created:", password_hash);

    // Check if test user already exists
    console.log("Checking if test user exists...");
    const existingUser = await db.users.findByEmail("test@test.com");

    if (existingUser) {
      // Update existing user with new password hash
      await db.users.update(existingUser.id, { password_hash });

      // Also update other test users if they exist
      const existingBarber = await db.users.findByEmail("barber@test.com");
      if (existingBarber) {
        await db.users.update(existingBarber.id, { password_hash });
      }

      // Check current users and update their passwords
      const user1 = await db.users.findByEmail("www.hmzhh123.com@gmail.com");
      if (user1) {
        await db.users.update(user1.id, { password_hash });
      }

      const user2 = await db.users.findByEmail("www.hmzhh1234.com@gmail.com");
      if (user2) {
        await db.users.update(user2.id, { password_hash });
      }

      return res.json({
        message: "Test users passwords updated",
        users: [
          { email: "test@test.com", password: testPassword, role: "customer" },
          { email: "barber@test.com", password: testPassword, role: "barber" },
          {
            email: "www.hmzhh123.com@gmail.com",
            password: testPassword,
            role: "customer",
          },
          {
            email: "www.hmzhh1234.com@gmail.com",
            password: testPassword,
            role: "barber",
          },
        ],
      });
    }

    // Create test customer
    const testUser = await db.users.create({
      name: "مستخدم تجريبي",
      email: "test@test.com",
      password_hash,
      role: "customer",
      status: "active",
      level: 1,
      points: 0,
      is_verified: true,
    });

    // Create test barber
    const testBarber = await db.users.create({
      name: "حلاق تجريبي",
      email: "barber@test.com",
      password_hash,
      role: "barber",
      status: "active",
      level: 50,
      points: 500,
      is_verified: true,
    });

    res.json({
      message: "Test users created successfully",
      users: [
        { email: "test@test.com", password: testPassword, role: "customer" },
        { email: "barber@test.com", password: testPassword, role: "barber" },
      ],
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    res.status(500).json({ error: "Failed to create test user" });
  }
};
