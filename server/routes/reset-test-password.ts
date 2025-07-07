import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../../shared/supabase";

export const resetTestPassword: RequestHandler = async (req, res) => {
  try {
    const testPassword = "123456";
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(testPassword, saltRounds);

    console.log("Resetting password for test users...");
    console.log("New password hash:", password_hash);

    // Update test@test.com password
    const { data: testUser, error: testError } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("email", "test@test.com")
      .select();

    if (testError) {
      console.error("Error updating test@test.com:", testError);
    } else {
      console.log("Updated test@test.com:", testUser);
    }

    // Update barber@test.com password
    const { data: barberUser, error: barberError } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("email", "barber@test.com")
      .select();

    if (barberError) {
      console.error("Error updating barber@test.com:", barberError);
    } else {
      console.log("Updated barber@test.com:", barberUser);
    }

    res.json({
      message: "Test passwords reset successfully",
      password: testPassword,
      users: [
        { email: "test@test.com", updated: !testError },
        { email: "barber@test.com", updated: !barberError },
      ],
    });
  } catch (error) {
    console.error("Error resetting test passwords:", error);
    res.status(500).json({ error: "Failed to reset passwords" });
  }
};
