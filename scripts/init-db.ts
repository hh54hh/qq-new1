import { supabase } from "../shared/supabase";

async function initializeDatabase() {
  console.log("🔍 Checking database tables...");

  try {
    // Check if tables exist by trying to query them
    const checks = [
      { name: "users", query: supabase.from("users").select("id").limit(1) },
      {
        name: "messages",
        query: supabase.from("messages").select("id").limit(1),
      },
      {
        name: "notifications",
        query: supabase.from("notifications").select("id").limit(1),
      },
      { name: "posts", query: supabase.from("posts").select("id").limit(1) },
      {
        name: "bookings",
        query: supabase.from("bookings").select("id").limit(1),
      },
      {
        name: "follows",
        query: supabase.from("follows").select("id").limit(1),
      },
      {
        name: "ratings",
        query: supabase.from("ratings").select("id").limit(1),
      },
    ];

    console.log("📊 Table Status:");
    for (const check of checks) {
      try {
        const { error } = await check.query;
        if (error) {
          console.log(`❌ ${check.name}: ${error.message}`);
        } else {
          console.log(`✅ ${check.name}: OK`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: Connection error`);
      }
    }

    // Test authentication
    console.log("\n🔐 Testing authentication:");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, role")
      .limit(5);

    if (usersError) {
      console.log(`❌ Users query failed: ${usersError.message}`);
    } else {
      console.log(`✅ Found ${users?.length || 0} users`);
      users?.forEach((user) => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
}

// Run if called directly
initializeDatabase()
  .then(() => {
    console.log("\n✅ Database check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database check failed:", error);
    process.exit(1);
  });

export { initializeDatabase };
