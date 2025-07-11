import { RequestHandler } from "express";
import { supabase, getCurrentUserId, db } from "../../shared/supabase";

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const searchBarbers: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const {
      query,
      lat,
      lng,
      radius = 50, // Default 50km radius
      minRating = 0,
      maxPrice,
      services,
      sortBy = "distance",
    } = req.query;

    let barbersQuery = supabase
      .from("users")
      .select(
        `
        *,
        barber_services (*),
        ratings:ratings!ratings_barber_id_fkey (
          stars,
          comment
        )
      `,
      )
      .eq("role", "barber")
      .eq("status", "active");

    // Text search
    if (query) {
      barbersQuery = barbersQuery.ilike("name", `%${query}%`);
    }

    const { data: barbers, error } = await barbersQuery;

    if (error) {
      console.error("Error searching barbers:", error);
      return res.status(500).json({ error: "خطأ في البحث" });
    }

    if (!barbers) {
      return res.json({ barbers: [], total: 0 });
    }

    // Process and filter barbers
    let processedBarbers = barbers.map((barber) => {
      // Calculate average rating
      const ratings = barber.ratings || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.stars, 0) /
            ratings.length
          : 0;

      // Calculate distance if user location provided
      let distance = 0;
      if (lat && lng && barber.location) {
        try {
          const barberLat = barber.location.lat;
          const barberLng = barber.location.lng;
          distance = calculateDistance(
            parseFloat(lat as string),
            parseFloat(lng as string),
            barberLat,
            barberLng,
          );
        } catch (locError) {
          console.warn("Error calculating distance for barber:", barber.id);
        }
      }

      // Calculate minimum service price
      const services = barber.barber_services || [];
      const minServicePrice =
        services.length > 0
          ? Math.min(...services.map((s: any) => s.price))
          : 0;

      return {
        ...barber,
        avgRating,
        distance,
        minPrice: minServicePrice,
        totalRatings: ratings.length,
        services: services.filter((s: any) => s.is_active),
      };
    });

    // Apply filters
    if (lat && lng && radius) {
      processedBarbers = processedBarbers.filter(
        (barber) => barber.distance <= parseFloat(radius as string),
      );
    }

    if (minRating) {
      processedBarbers = processedBarbers.filter(
        (barber) => barber.avgRating >= parseFloat(minRating as string),
      );
    }

    if (maxPrice) {
      processedBarbers = processedBarbers.filter(
        (barber) => barber.minPrice <= parseFloat(maxPrice as string),
      );
    }

    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      processedBarbers = processedBarbers.filter((barber) =>
        barber.services.some((service: any) =>
          serviceArray.some((searchService) =>
            service.name
              .toLowerCase()
              .includes(String(searchService).toLowerCase()),
          ),
        ),
      );
    }

    // Sort results
    switch (sortBy) {
      case "rating":
        processedBarbers.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case "price":
        processedBarbers.sort((a, b) => a.minPrice - b.minPrice);
        break;
      case "level":
        processedBarbers.sort((a, b) => b.level - a.level);
        break;
      case "distance":
      default:
        if (lat && lng) {
          processedBarbers.sort((a, b) => a.distance - b.distance);
        }
        break;
    }

    res.json({
      barbers: processedBarbers,
      total: processedBarbers.length,
      filters: {
        query,
        location: lat && lng ? { lat, lng, radius } : null,
        minRating,
        maxPrice,
        services,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "خطأ في البحث" });
  }
};

export const getRecommendations: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    // Get user's booking history and preferences
    const { data: userBookings } = await supabase
      .from("bookings")
      .select("barber_id, service_type")
      .eq("customer_id", userId)
      .eq("status", "completed");

    const { data: userRatings } = await supabase
      .from("ratings")
      .select("barber_id, stars")
      .eq("customer_id", userId);

    const { data: userFollows } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", userId);

    // Get user location for proximity recommendations
    const { data: user } = await supabase
      .from("users")
      .select("location")
      .eq("id", userId)
      .single();

    // Get all active barbers with their stats
    const { data: barbers } = await supabase
      .from("users")
      .select(
        `
        *,
        barber_services (*),
        ratings:ratings!ratings_barber_id_fkey (stars)
      `,
      )
      .eq("role", "barber")
      .eq("status", "active");

    if (!barbers) {
      return res.json({ recommendations: [] });
    }

    // Score barbers based on various factors
    const scoredBarbers = barbers.map((barber) => {
      let score = 0;
      let reason = "";

      // Base score from ratings
      const ratings = barber.ratings || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.stars, 0) /
            ratings.length
          : 3;
      score += avgRating * 2;

      // Bonus for high level barbers
      score += Math.min(barber.level / 10, 5);

      // Check if user has booked this barber before
      const hasBooked = userBookings?.some(
        (booking: any) => booking.barber_id === barber.id,
      );
      if (hasBooked) {
        score += 10;
        reason = "حجزت معه من قبل";
      }

      // Check if user rated this barber highly
      const userRating = userRatings?.find(
        (rating: any) => rating.barber_id === barber.id,
      );
      if (userRating && userRating.stars >= 4) {
        score += 15;
        reason = "قيمته بدرجة عالية";
      }

      // Check if user follows this barber
      const isFollowed = userFollows?.some(
        (follow: any) => follow.followed_id === barber.id,
      );
      if (isFollowed) {
        score += 8;
        reason = "تتابعه";
      }

      // Proximity bonus
      if (user?.location && barber.location) {
        try {
          const distance = calculateDistance(
            user.location.lat,
            user.location.lng,
            barber.location.lat,
            barber.location.lng,
          );
          if (distance <= 5)
            score += 5; // Very close
          else if (distance <= 15)
            score += 3; // Close
          else if (distance <= 30) score += 1; // Nearby

          if (!reason && distance <= 10) {
            reason = "قريب منك";
          }
        } catch (error) {
          console.warn("Error calculating distance:", error);
        }
      }

      // Popular barber bonus
      if (ratings.length >= 10) {
        score += 3;
        if (!reason) reason = "حلاق مشهور";
      }

      // High level bonus
      if (barber.level >= 80) {
        score += 4;
        if (!reason) reason = "حلاق متمرس";
      }

      if (!reason) {
        if (avgRating >= 4.5) reason = "تقييم ممتاز";
        else if (avgRating >= 4) reason = "تقيي�� جيد";
        else reason = "حلاق موصى به";
      }

      return {
        id: barber.id,
        name: barber.name,
        avatar_url: barber.avatar_url,
        level: barber.level,
        avgRating,
        totalRatings: ratings.length,
        score,
        reason,
        confidence: Math.min(score / 20, 1), // Normalize to 0-1
      };
    });

    // Sort by score and take top recommendations
    const recommendations = scoredBarbers
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({ recommendations });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: "خطأ في جلب التوصيات" });
  }
};

// Search users for messaging
export const searchUsers: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { q: query } = req.query;

    console.log("🔍 البحث عن المستخدمين:", { query, requesterId: userId });

    // Build query - if empty search, get all users
    let dbQuery = supabase
      .from("users")
      .select("id, name, email, role, status, avatar_url, is_verified")
      .neq("id", userId) // Exclude current user
      .eq("status", "active") // Only active users
      .order("created_at", { ascending: false })
      .limit(50); // More users for suggestions

    // Add name filter only if query is provided and valid
    if (query && typeof query === "string" && query.trim().length >= 2) {
      dbQuery = dbQuery.ilike("name", `%${query.trim()}%`);
      console.log("🔍 Searching with filter:", query.trim());
    } else {
      console.log("🔍 Getting all users (no filter)");
    }

    const { data: users, error } = await dbQuery;

    if (error) {
      console.error("User search error:", error);
      return res.status(500).json({ error: "خطأ في البحث عن المستخدمين" });
    }

    // Transform users for frontend
    const searchResults = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
    }));

    console.log("✅ نتائج البحث:", {
      query,
      resultsCount: searchResults.length,
      users: searchResults.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
      })),
    });

    res.json({ users: searchResults });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ error: "خط�� في البحث عن المستخدمين" });
  }
};

// Get user by ID for starting conversations
export const getUserById: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "معرف المستخدم مطلوب" });
    }

    console.log("👤 طلب معلومات المستخدم:", {
      targetUserId: id,
      requesterId: userId,
    });

    // Get user info
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, status, avatar_url, is_verified")
      .eq("id", id)
      .eq("status", "active") // Only active users
      .single();

    if (error) {
      console.error("Get user error:", error);
      if (error.code === "PGRST116") {
        // No rows returned
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      return res.status(500).json({ error: "خطأ في جلب بيانات المستخدم" });
    }

    console.log("✅ تم جلب بيانات المستخدم:", {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    res.json(user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: "خطأ في جلب بيانات المستخدم" });
  }
};
