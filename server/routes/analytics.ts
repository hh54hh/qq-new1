import { RequestHandler } from "express";
import { supabase, getCurrentUserId } from "../../shared/supabase";

export const getBarberAnalytics: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { period = "month", barberId } = req.query;
    const targetBarberId = barberId || userId;

    // Verify user can access this data
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (
      user?.role !== "admin" &&
      userId !== targetBarberId &&
      user?.role !== "barber"
    ) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get bookings data
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `
        *,
        customer:users!bookings_customer_id_fkey(name, email)
      `,
      )
      .eq("barber_id", targetBarberId)
      .gte("created_at", startDate.toISOString());

    // Get ratings data
    const { data: ratings } = await supabase
      .from("ratings")
      .select("*")
      .eq("barber_id", targetBarberId)
      .gte("created_at", startDate.toISOString());

    // Get posts data
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", targetBarberId)
      .gte("created_at", startDate.toISOString());

    // Get followers data
    const { data: followers } = await supabase
      .from("follows")
      .select("*")
      .eq("followed_id", targetBarberId)
      .gte("created_at", startDate.toISOString());

    // Calculate analytics
    const totalBookings = bookings?.length || 0;
    const completedBookings =
      bookings?.filter((b) => b.status === "completed").length || 0;
    const cancelledBookings =
      bookings?.filter((b) => b.status === "cancelled").length || 0;
    const pendingBookings =
      bookings?.filter((b) => b.status === "pending").length || 0;

    const totalRevenue =
      bookings
        ?.filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + b.price, 0) || 0;

    const averageRating =
      ratings?.length > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
        : 0;

    const newFollowers = followers?.length || 0;
    const newPosts = posts?.length || 0;

    // Calculate completion rate
    const completionRate =
      totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    // Group bookings by day for chart data
    const bookingsByDay: { [key: string]: number } = {};
    const revenueByDay: { [key: string]: number } = {};

    bookings?.forEach((booking) => {
      const date = new Date(booking.created_at).toISOString().split("T")[0];
      bookingsByDay[date] = (bookingsByDay[date] || 0) + 1;

      if (booking.status === "completed") {
        revenueByDay[date] = (revenueByDay[date] || 0) + booking.price;
      }
    });

    // Service popularity
    const serviceStats: { [key: string]: number } = {};
    bookings?.forEach((booking) => {
      serviceStats[booking.service_type] =
        (serviceStats[booking.service_type] || 0) + 1;
    });

    // Customer insights
    const uniqueCustomers = new Set(bookings?.map((b) => b.customer_id)).size;
    const repeatCustomers =
      bookings?.reduce(
        (acc, booking) => {
          const customerId = booking.customer_id;
          acc[customerId] = (acc[customerId] || 0) + 1;
          return acc;
        },
        {} as { [key: string]: number },
      ) || {};

    const repeatCustomerCount = Object.values(repeatCustomers).filter(
      (count) => Number(count) > 1,
    ).length;

    // Best performing hours
    const hourlyStats: { [key: string]: number } = {};
    bookings?.forEach((booking) => {
      const hour = new Date(booking.datetime).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    const analytics = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      overview: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        completionRate: Math.round(completionRate * 100) / 100,
        totalRevenue,
        averageBookingValue:
          completedBookings > 0 ? totalRevenue / completedBookings : 0,
        averageRating: Math.round(averageRating * 100) / 100,
        totalRatings: ratings?.length || 0,
        newFollowers,
        newPosts,
      },
      customers: {
        uniqueCustomers,
        repeatCustomers: repeatCustomerCount,
        repeatRate:
          uniqueCustomers > 0
            ? Math.round((repeatCustomerCount / uniqueCustomers) * 100)
            : 0,
      },
      charts: {
        bookingsByDay: Object.entries(bookingsByDay).map(([date, count]) => ({
          date,
          bookings: count,
          revenue: revenueByDay[date] || 0,
        })),
        servicePopularity: Object.entries(serviceStats)
          .map(([service, count]) => ({
            service,
            count,
            percentage:
              totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count),
        hourlyDistribution: Object.entries(hourlyStats)
          .map(([hour, count]) => ({
            hour: parseInt(hour),
            bookings: count,
          }))
          .sort((a, b) => a.hour - b.hour),
      },
      trends: {
        bookingsGrowth: calculateGrowthRate(bookings || [], "created_at"),
        revenueGrowth: calculateRevenueGrowthRate(bookings || []),
        ratingTrend: calculateRatingTrend(ratings || []),
      },
    };

    res.json({ analytics });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "خطأ في جلب التحليلات" });
  }
};

// Helper functions
function calculateGrowthRate(
  items: any[],
  dateField: string,
): { current: number; previous: number; growth: number } {
  const now = new Date();
  const midPoint = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const recent = items.filter(
    (item) => new Date(item[dateField]) >= midPoint,
  ).length;
  const previous = items.filter(
    (item) => new Date(item[dateField]) < midPoint,
  ).length;

  const growth = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

  return {
    current: recent,
    previous,
    growth: Math.round(growth * 100) / 100,
  };
}

function calculateRevenueGrowthRate(bookings: any[]): {
  current: number;
  previous: number;
  growth: number;
} {
  const now = new Date();
  const midPoint = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const recentRevenue = bookings
    .filter(
      (booking) =>
        new Date(booking.created_at) >= midPoint &&
        booking.status === "completed",
    )
    .reduce((sum, b) => sum + b.price, 0);

  const previousRevenue = bookings
    .filter(
      (booking) =>
        new Date(booking.created_at) < midPoint &&
        booking.status === "completed",
    )
    .reduce((sum, b) => sum + b.price, 0);

  const growth =
    previousRevenue > 0
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

  return {
    current: recentRevenue,
    previous: previousRevenue,
    growth: Math.round(growth * 100) / 100,
  };
}

function calculateRatingTrend(ratings: any[]): {
  current: number;
  previous: number;
  trend: "up" | "down" | "stable";
} {
  const now = new Date();
  const midPoint = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const recentRatings = ratings.filter(
    (rating) => new Date(rating.created_at) >= midPoint,
  );
  const previousRatings = ratings.filter(
    (rating) => new Date(rating.created_at) < midPoint,
  );

  const currentAvg =
    recentRatings.length > 0
      ? recentRatings.reduce((sum, r) => sum + r.stars, 0) /
        recentRatings.length
      : 0;

  const previousAvg =
    previousRatings.length > 0
      ? previousRatings.reduce((sum, r) => sum + r.stars, 0) /
        previousRatings.length
      : 0;

  let trend: "up" | "down" | "stable" = "stable";
  if (currentAvg > previousAvg + 0.1) trend = "up";
  else if (currentAvg < previousAvg - 0.1) trend = "down";

  return {
    current: Math.round(currentAvg * 100) / 100,
    previous: Math.round(previousAvg * 100) / 100,
    trend,
  };
}

export const getGlobalAnalytics: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    // Verify admin access
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (user?.role !== "admin") {
      return res.status(403).json({ error: "يتطلب صلاحية مدير" });
    }

    // Get global statistics
    const { data: users } = await supabase.from("users").select("*");
    const { data: bookings } = await supabase.from("bookings").select("*");
    const { data: posts } = await supabase.from("posts").select("*");
    const { data: ratings } = await supabase.from("ratings").select("*");

    const totalUsers = users?.length || 0;
    const totalCustomers =
      users?.filter((u) => u.role === "customer").length || 0;
    const totalBarbers = users?.filter((u) => u.role === "barber").length || 0;
    const totalBookings = bookings?.length || 0;
    const totalRevenue =
      bookings
        ?.filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + b.price, 0) || 0;
    const averageRating =
      ratings?.length > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
        : 0;

    res.json({
      analytics: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          barbers: totalBarbers,
        },
        bookings: { total: totalBookings },
        revenue: { total: totalRevenue },
        rating: { average: Math.round(averageRating * 100) / 100 },
        posts: { total: posts?.length || 0 },
      },
    });
  } catch (error) {
    console.error("Global analytics error:", error);
    res.status(500).json({ error: "خطأ في جلب الإحصائيات العامة" });
  }
};
