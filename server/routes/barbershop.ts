import { RequestHandler } from "express";
import {
  User,
  Booking,
  Post,
  FriendRequest,
  Follow,
  SearchBarbersRequest,
  CreateBookingRequest,
} from "../../shared/api";
import { db, getCurrentUserId, supabase } from "../../shared/supabase";

// Barbers endpoints
export const getBarbers: RequestHandler = async (req, res) => {
  try {
    const barbers = await db.users.getBarbers();

    // Remove password hash from response
    const barbersWithoutPassword = barbers.map(
      ({ password_hash, ...barber }) => barber,
    );

    res.json({ barbers: barbersWithoutPassword, total: barbers.length });
  } catch (error) {
    console.error("Get barbers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all customers with public information (same pattern as barbers)
export const getCustomers: RequestHandler = async (req, res) => {
  try {
    const customers = await db.users.getCustomers();

    // Remove password hash from response
    const customersWithoutPassword = customers.map(
      ({ password_hash, ...customer }) => customer,
    );

    res.json({ customers: customersWithoutPassword, total: customers.length });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchBarbers: RequestHandler = async (req, res) => {
  try {
    const filters: SearchBarbersRequest = req.query;

    // Start with all active barbers
    let barbers = await db.users.getBarbers();

    // Apply filters
    if (filters.query) {
      barbers = barbers.filter((barber) =>
        barber.name.toLowerCase().includes(filters.query!.toLowerCase()),
      );
    }

    if (filters.level) {
      barbers = barbers.filter((barber) => barber.level >= filters.level!);
    }

    // Remove password hash from response
    const barbersWithoutPassword = barbers.map(
      ({ password_hash, ...barber }) => barber,
    );

    res.json({ barbers: barbersWithoutPassword, total: barbers.length });
  } catch (error) {
    console.error("Search barbers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Bookings endpoints
export const getBookings: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const bookings = await db.bookings.getByUser(userId);

    // Convert database format to API format
    const apiBookings: Booking[] = bookings.map((booking) => ({
      id: booking.id,
      user_id: booking.customer_id,
      barber_id: booking.barber_id,
      datetime: booking.datetime,
      status: booking.status as any,
      created_at: booking.created_at,
      user: booking.customer
        ? {
            id: booking.customer.id,
            name: booking.customer.name,
            email: booking.customer.email,
            role: booking.customer.role as any,
            status: booking.customer.status as any,
            level: booking.customer.level,
            points: booking.customer.points,
            is_verified: booking.customer.is_verified,
            created_at: booking.customer.created_at,
          }
        : undefined,
      barber: booking.barber
        ? {
            id: booking.barber.id,
            name: booking.barber.name,
            email: booking.barber.email,
            role: booking.barber.role as any,
            status: booking.barber.status as any,
            level: booking.barber.level,
            points: booking.barber.points,
            is_verified: booking.barber.is_verified,
            created_at: booking.barber.created_at,
          }
        : undefined,
    }));

    res.json({ bookings: apiBookings, total: bookings.length });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createBooking: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const bookingData: CreateBookingRequest = req.body;

    if (!bookingData.barber_id || !bookingData.datetime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate that barber exists and is active
    const barber = await db.users.findById(bookingData.barber_id);
    if (!barber || barber.role !== "barber" || barber.status !== "active") {
      return res.status(400).json({ error: "Invalid barber" });
    }

    // Create booking
    const newBooking = await db.bookings.create({
      customer_id: userId,
      barber_id: bookingData.barber_id,
      datetime: bookingData.datetime,
      service_type: "��ص شعر", // Default service
      price: 50, // Default price
      duration_minutes: 30,
      status: "pending",
    });

    // Convert to API format
    const apiBooking: Booking = {
      id: newBooking.id,
      user_id: newBooking.customer_id,
      barber_id: newBooking.barber_id,
      datetime: newBooking.datetime,
      status: newBooking.status as any,
      created_at: newBooking.created_at,
    };

    res.status(201).json(apiBooking);
  } catch (error) {
    console.error("Create booking error:", error);

    // Handle specific database constraint violations
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as any;

      // Handle future booking constraint
      if (
        dbError.code === "23514" &&
        dbError.message?.includes("future_booking")
      ) {
        return res.status(400).json({
          error: "لا يمكن حجز موعد في الماضي، يرجى ��ختيار وقت في المستقبل",
        });
      }

      // Handle duplicate booking constraint
      if (dbError.code === "23505") {
        return res.status(409).json({
          error: "هذا الموعد محجوز بالفعل، يرجى اخت��ار وقت آخر",
        });
      }

      // Handle foreign key constraint violations
      if (dbError.code === "23503") {
        return res.status(400).json({
          error: "الحلاق المحدد غير موجود",
        });
      }
    }

    res.status(500).json({
      error: "حدث خطأ في الخادم، يرجى المحاولة مرة أخرى",
    });
  }
};

export const updateBooking: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Update booking
    const updatedBooking = await db.bookings.update(id, { status });

    // Convert to API format
    const apiBooking: Booking = {
      id: updatedBooking.id,
      user_id: updatedBooking.customer_id,
      barber_id: updatedBooking.barber_id,
      datetime: updatedBooking.datetime,
      status: updatedBooking.status as any,
      created_at: updatedBooking.created_at,
    };

    res.json(apiBooking);
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteBooking: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Delete booking (with permission check inside the function)
    await db.bookings.delete(id, userId);

    res.status(204).send();
  } catch (error) {
    console.error("Delete booking error:", error);

    // Handle specific errors
    if (
      error.message?.includes("not found") ||
      error.message?.includes("access denied")
    ) {
      return res.status(404).json({
        error: "الحجز غير موجود أو ليس لديك صلاحية لحذفه",
      });
    }

    res.status(500).json({
      error: "حدث خطأ في حذف الحجز، يرجى المحاولة مرة أخرى",
    });
  }
};

// Posts endpoints
export const getPosts: RequestHandler = async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log("getPosts called with user_id:", user_id);

    const dbPosts = await db.posts.getAll(user_id as string | undefined);
    console.log("Retrieved posts count:", dbPosts.length);

    // Convert to API format
    const apiPosts: Post[] = dbPosts.map((post) => ({
      id: post.id,
      user_id: post.user_id,
      image_url: post.image_url,
      caption: post.caption || "",
      frame_style: post.frame_style,
      likes: post.likes_count || 0,
      created_at: post.created_at,
      user: post.user
        ? {
            id: post.user.id,
            name: post.user.name,
            email: post.user.email,
            role: post.user.role as any,
            status: post.user.status as any,
            level: post.user.level,
            points: post.user.points,
            is_verified: post.user.is_verified,
            created_at: post.user.created_at,
          }
        : undefined,
    }));

    res.json({ posts: apiPosts, total: dbPosts.length });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DEBUG: Get detailed follows info
export const debugFollows: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("🔍 DEBUG: Getting detailed follows data for user:", userId);

    // Get following
    const following = await db.follows.getByUser(userId, "following");

    // Get followers
    const followers = await db.follows.getByUser(userId, "followers");

    // Get raw data from database
    const { data: rawFollows, error } = await supabase
      .from("follows")
      .select("*")
      .or(`follower_id.eq.${userId},followed_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    // Get all barbers with posts to suggest following
    const { data: barbersWithPosts } = await supabase
      .from("users")
      .select(
        `
        id, name, email, role,
        posts:posts(count)
      `,
      )
      .eq("role", "barber")
      .not("id", "eq", userId)
      .limit(10);

    // Check for users with posts that current user is not following
    const currentlyFollowing = following?.map((f) => f.followed_id) || [];
    const suggestedFollows =
      barbersWithPosts?.filter(
        (barber) =>
          !currentlyFollowing.includes(barber.id) &&
          barber.posts &&
          barber.posts.length > 0,
      ) || [];

    const result = {
      userId,
      following: {
        count: following?.length || 0,
        users:
          following?.map((f) => ({
            id: f.followed_id,
            name: f.user?.name,
            email: f.user?.email,
            createdAt: f.created_at,
          })) || [],
      },
      followers: {
        count: followers?.length || 0,
        users:
          followers?.map((f) => ({
            id: f.follower_id,
            name: f.user?.name,
            email: f.user?.email,
            createdAt: f.created_at,
          })) || [],
      },
      rawFollows: rawFollows || [],
      suggestedFollows: suggestedFollows.slice(0, 5),
      error: error?.message || null,
    };

    console.log("🔍 DEBUG follows result:", JSON.stringify(result, null, 2));

    // If action=fix is provided, automatically follow some barbers for testing
    if (req.query.action === "fix" && following?.length < 3) {
      console.log("🔧 Auto-fixing follows for testing...");

      for (const barber of suggestedFollows.slice(0, 3)) {
        try {
          await db.follows.create(userId, barber.id);
          console.log(`✅ Auto-followed ${barber.name} (${barber.id})`);
        } catch (error) {
          console.warn(`⚠️ Failed to auto-follow ${barber.name}:`, error);
        }
      }

      // Re-fetch the updated data
      const updatedFollowing = await db.follows.getByUser(userId, "following");
      result.following = {
        count: updatedFollowing?.length || 0,
        users:
          updatedFollowing?.map((f) => ({
            id: f.followed_id,
            name: f.user?.name,
            email: f.user?.email,
            createdAt: f.created_at,
          })) || [],
      };
      (result as any).autoFixed = true;
    }

    res.json(result);
  } catch (error) {
    console.error("Debug follows error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get posts from followed users only (for news feed)
export const getFollowingPosts: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Getting following posts for user:", userId);

    console.log("Getting real following posts for user:", userId);

    // Get user's following list
    const following = await db.follows.getByUser(userId, "following");
    console.log("User is following:", following.length, "people");

    if (following.length === 0) {
      // If not following anyone, return empty posts
      return res.json({ posts: [], total: 0 });
    }

    // Get all posts from followed users
    const followedUserIds = following.map((f) => f.followed_id);

    // Use raw Supabase query for better performance
    const { data: dbPosts, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        user:users(*)
      `,
      )
      .in("user_id", followedUserIds)
      .order("created_at", { ascending: false })
      .limit(50); // Limit to recent 50 posts

    if (error) {
      console.error("Error fetching following posts:", error);
      throw error;
    }

    console.log("Retrieved following posts count:", dbPosts?.length || 0);

    // Convert to API format
    const apiPosts: Post[] = (dbPosts || []).map((post) => ({
      id: post.id,
      user_id: post.user_id,
      image_url: post.image_url,
      caption: post.caption || "",
      frame_style: post.frame_style,
      likes: post.likes_count || 0,
      created_at: post.created_at,
      user: post.user
        ? {
            id: post.user.id,
            name: post.user.name,
            email: post.user.email,
            avatar_url: post.user.avatar_url,
            role: post.user.role as any,
            status: post.user.status as any,
            level: post.user.level,
            points: post.user.points,
            is_verified: post.user.is_verified,
            created_at: post.user.created_at,
          }
        : undefined,
    }));

    res.json({ posts: apiPosts, total: apiPosts.length });
  } catch (error) {
    console.error("Get following posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPost: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postData = req.body;

    if (!postData.image_url) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const newPost = await db.posts.create({
      user_id: userId,
      image_url: postData.image_url,
      caption: postData.caption || "",
      frame_style: postData.frame_style || "ذهبي",
    });

    // Convert to API format
    const apiPost: Post = {
      id: newPost.id,
      user_id: newPost.user_id,
      image_url: newPost.image_url,
      caption: newPost.caption || "",
      frame_style: newPost.frame_style,
      likes: newPost.likes_count || 0,
      created_at: newPost.created_at,
      user: newPost.user
        ? {
            id: newPost.user.id,
            name: newPost.user.name,
            email: newPost.user.email,
            role: newPost.user.role as any,
            status: newPost.user.status as any,
            level: newPost.user.level,
            points: newPost.user.points,
            is_verified: newPost.user.is_verified,
            created_at: newPost.user.created_at,
          }
        : undefined,
    };

    res.status(201).json(apiPost);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Follows endpoints
export const getFollows: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { type = "following" } = req.query;
    const followType = type as "followers" | "following";

    const dbFollows = await db.follows.getByUser(userId, followType);

    // Convert to API format
    const apiFollows: Follow[] = dbFollows.map((follow) => ({
      id: follow.id,
      follower_id: follow.follower_id,
      followed_id: follow.followed_id,
      created_at: follow.created_at,
    }));

    res.json({ follows: apiFollows, total: dbFollows.length });
  } catch (error) {
    console.error("Get follows error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createFollow: RequestHandler = async (req, res) => {
  const userId = getCurrentUserId(req.headers.authorization);

  try {
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { followed_id } = req.body;

    if (!followed_id) {
      return res.status(400).json({ error: "Missing followed_id" });
    }

    if (userId === followed_id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Check if already following first
    try {
      const existingFollow = await db.follows.checkExists(userId, followed_id);
      if (existingFollow) {
        // Return success response without error - already following
        const apiFollow: Follow = {
          id: existingFollow.id,
          follower_id: existingFollow.follower_id,
          followed_id: existingFollow.followed_id,
          created_at: existingFollow.created_at,
        };
        return res.status(200).json(apiFollow);
      }
    } catch (checkError) {
      // If check fails, continue with creation
      console.log("Follow check failed, attempting creation");
    }

    // Validate that user exists
    const userToFollow = await db.users.findById(followed_id);
    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    const newFollow = await db.follows.create(userId, followed_id);

    // Convert to API format
    const apiFollow: Follow = {
      id: newFollow.id,
      follower_id: newFollow.follower_id,
      followed_id: newFollow.followed_id,
      created_at: newFollow.created_at,
    };

    res.status(201).json(apiFollow);
  } catch (error) {
    console.error("Create follow error:", error);
    if (error.code === "23505") {
      // Unique constraint violation - return success instead of error
      const apiFollow: Follow = {
        id: "existing",
        follower_id: userId,
        followed_id: req.body.followed_id,
        created_at: new Date().toISOString(),
      };
      return res.status(200).json(apiFollow);
    }
    res.status(500).json({ error: "حدث خطأ في ا���خادم" });
  }
};

export const deleteFollow: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params; // This is the followed_id

    // Check if follow exists first
    try {
      const existingFollow = await db.follows.checkExists(userId, id);
      if (!existingFollow) {
        // Already unfollowed - return success
        return res.status(204).send();
      }
    } catch (checkError) {
      // If check fails, continue with deletion
      console.log("Follow check failed, attempting deletion");
    }

    await db.follows.delete(userId, id);

    res.status(204).send();
  } catch (error) {
    console.error("Delete follow error:", error);
    // Always return success for delete operations to prevent UI errors
    res.status(204).send();
  }
};

// Friend Requests endpoints
export const getFriendRequests: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const dbRequests = await db.friendRequests.getByUser(userId);

    // Convert to API format
    const apiRequests: FriendRequest[] = dbRequests.map((request) => ({
      id: request.id,
      sender_id: request.sender_id,
      receiver_id: request.receiver_id,
      status: request.status as any,
      created_at: request.created_at,
      sender: request.sender
        ? {
            id: request.sender.id,
            name: request.sender.name,
            email: request.sender.email,
            role: request.sender.role as any,
            status: request.sender.status as any,
            level: request.sender.level,
            points: request.sender.points,
            is_verified: request.sender.is_verified,
            created_at: request.sender.created_at,
          }
        : undefined,
      receiver: request.receiver
        ? {
            id: request.receiver.id,
            name: request.receiver.name,
            email: request.receiver.email,
            role: request.receiver.role as any,
            status: request.receiver.status as any,
            level: request.receiver.level,
            points: request.receiver.points,
            is_verified: request.receiver.is_verified,
            created_at: request.receiver.created_at,
          }
        : undefined,
    }));

    res.json({ requests: apiRequests, total: dbRequests.length });
  } catch (error) {
    console.error("Get friend requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createFriendRequest: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ error: "Missing receiver_id" });
    }

    if (userId === receiver_id) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // Validate that receiver exists
    const receiver = await db.users.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const newRequest = await db.friendRequests.create(userId, receiver_id);

    // Convert to API format
    const apiRequest: FriendRequest = {
      id: newRequest.id,
      sender_id: newRequest.sender_id,
      receiver_id: newRequest.receiver_id,
      status: newRequest.status as any,
      created_at: newRequest.created_at,
      sender: newRequest.sender
        ? {
            id: newRequest.sender.id,
            name: newRequest.sender.name,
            email: newRequest.sender.email,
            role: newRequest.sender.role as any,
            status: newRequest.sender.status as any,
            level: newRequest.sender.level,
            points: newRequest.sender.points,
            is_verified: newRequest.sender.is_verified,
            created_at: newRequest.sender.created_at,
          }
        : undefined,
      receiver: newRequest.receiver
        ? {
            id: newRequest.receiver.id,
            name: newRequest.receiver.name,
            email: newRequest.receiver.email,
            role: newRequest.receiver.role as any,
            status: newRequest.receiver.status as any,
            level: newRequest.receiver.level,
            points: newRequest.receiver.points,
            is_verified: newRequest.receiver.is_verified,
            created_at: newRequest.receiver.created_at,
          }
        : undefined,
    };

    res.status(201).json(apiRequest);
  } catch (error) {
    console.error("Create friend request error:", error);
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({ error: "Friend request already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateFriendRequest: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    console.log("Update friend request - userId:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { status } = req.body;
    console.log("Update friend request params:", { id, status });

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedRequest = await db.friendRequests.update(id, status);

    // Convert to API format
    const apiRequest: FriendRequest = {
      id: updatedRequest.id,
      sender_id: updatedRequest.sender_id,
      receiver_id: updatedRequest.receiver_id,
      status: updatedRequest.status as any,
      created_at: updatedRequest.created_at,
      sender: updatedRequest.sender
        ? {
            id: updatedRequest.sender.id,
            name: updatedRequest.sender.name,
            email: updatedRequest.sender.email,
            role: updatedRequest.sender.role as any,
            status: updatedRequest.sender.status as any,
            level: updatedRequest.sender.level,
            points: updatedRequest.sender.points,
            is_verified: updatedRequest.sender.is_verified,
            created_at: updatedRequest.sender.created_at,
          }
        : undefined,
      receiver: updatedRequest.receiver
        ? {
            id: updatedRequest.receiver.id,
            name: updatedRequest.receiver.name,
            email: updatedRequest.receiver.email,
            role: updatedRequest.receiver.role as any,
            status: updatedRequest.receiver.status as any,
            level: updatedRequest.receiver.level,
            points: updatedRequest.receiver.points,
            is_verified: updatedRequest.receiver.is_verified,
            created_at: updatedRequest.receiver.created_at,
          }
        : undefined,
    };

    res.json(apiRequest);
  } catch (error) {
    console.error("Update friend request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Post Likes endpoints
export const likePost: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: postId } = req.params;

    try {
      await db.postLikes.like(userId, postId);
      res.status(201).json({ success: true });
    } catch (error) {
      if (error.code === "23505") {
        // Already liked
        return res
          .status(200)
          .json({ success: true, message: "Already liked" });
      }
      throw error;
    }
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unlikePost: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: postId } = req.params;
    await db.postLikes.unlike(userId, postId);
    res.status(204).send();
  } catch (error) {
    console.error("Unlike post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserLikes: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const likedPostIds = await db.postLikes.getUserLikes(userId);
    res.json({ liked_posts: likedPostIds });
  } catch (error) {
    console.error("Get user likes error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Post Comments endpoints
export const getPostComments: RequestHandler = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const comments = await db.postComments.getByPost(postId);
    res.json({ comments, total: comments.length });
  } catch (error) {
    console.error("Get post comments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPostComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: postId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: "Comment is required" });
    }

    const newComment = await db.postComments.create(
      userId,
      postId,
      comment.trim(),
    );
    res.status(201).json(newComment);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Ratings endpoints
export const getBarberRatings: RequestHandler = async (req, res) => {
  try {
    const { id: barberId } = req.params;
    const ratings = await db.ratings.getByBarber(barberId);
    const avgRating = await db.ratings.getAverageRating(barberId);

    res.json({
      ratings,
      total: ratings.length,
      average: avgRating.average,
      count: avgRating.count,
    });
  } catch (error) {
    console.error("Get barber ratings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createRating: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { barber_id, booking_id, stars, comment, images } = req.body;

    if (!barber_id || !stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: "Invalid rating data" });
    }

    const ratingData = {
      customer_id: userId,
      barber_id,
      booking_id,
      stars,
      comment,
      images,
    };

    const newRating = await db.ratings.create(ratingData);
    res.status(201).json({ success: true, rating: newRating });
  } catch (error) {
    console.error("Create rating error:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Rating already exists for this booking" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// Barber Services endpoints
export const getBarberServices: RequestHandler = async (req, res) => {
  try {
    const { id: barberId } = req.params;
    const services = await db.barberServices.getByBarber(barberId);
    res.json({ services, total: services.length });
  } catch (error) {
    console.error("Get barber services error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createService: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name, description, price, duration_minutes } = req.body;

    if (!name || !price || !duration_minutes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const serviceData = {
      barber_id: userId,
      name,
      description,
      price: parseFloat(price),
      duration_minutes: parseInt(duration_minutes),
    };

    const newService = await db.barberServices.create(serviceData);
    res.status(201).json({ success: true, service: newService });
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateService: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: serviceId } = req.params;
    const updates = req.body;

    const updatedService = await db.barberServices.update(serviceId, updates);
    res.json({ success: true, service: updatedService });
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteService: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: serviceId } = req.params;
    await db.barberServices.delete(serviceId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete service error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Working Hours endpoints
export const getWorkingHours: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const schedule = await db.availability.getByBarber(userId);
    res.json({ schedule });
  } catch (error) {
    console.error("Get working hours error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const saveWorkingHours: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: "Schedule must be an array" });
    }

    await db.availability.saveSchedule(userId, schedule);
    res.json({ success: true });
  } catch (error) {
    console.error("Save working hours error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAvailableSlots: RequestHandler = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { date } = req.query;

    if (!barberId || !date) {
      return res.status(400).json({
        error: "Barber ID and date are required",
      });
    }

    // Get barber's working hours for the day
    const selectedDate = new Date(date as string);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday

    const availability = await db.availability.getByBarber(barberId);
    const daySchedule = availability.find((a) => a.day_of_week === dayOfWeek);

    if (!daySchedule || !daySchedule.is_available) {
      // Barber is not available on this day
      return res.json({ slots: [] });
    }

    // Generate time slots based on working hours
    const slots = [];
    const startTime = daySchedule.start_time;
    const endTime = daySchedule.end_time;

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Convert to minutes for easier calculation
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Check if it's today and if we need to filter past times
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Get existing bookings for this day
    const existingBookings = await db.bookings.getByBarberAndDate(
      barberId,
      date as string,
    );
    const bookedTimes = existingBookings.map((booking) => {
      const bookingDate = new Date(booking.datetime);
      return `${bookingDate.getHours().toString().padStart(2, "0")}:${bookingDate.getMinutes().toString().padStart(2, "0")}`;
    });

    // Generate 30-minute slots
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      let available = true;

      // Check if time has passed today
      if (isToday && minutes <= currentMinutes + 30) {
        // 30 minute buffer
        available = false;
      }

      // Check if time is already booked
      if (bookedTimes.includes(timeString)) {
        available = false;
      }

      slots.push({
        time: timeString,
        available,
      });
    }

    res.json({ slots });
  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Notifications endpoints
export const getNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const notifications = await db.notifications.getByUser(userId);
    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markNotificationAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: notificationId } = req.params;
    await db.notifications.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAllNotificationsAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await db.notifications.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin endpoints
export const getAdminStats: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const user = await db.users.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get basic stats
    const allUsers = await db.users.getAll();
    const customers = allUsers.filter((u) => u.role === "customer");
    const barbers = allUsers.filter((u) => u.role === "barber");
    const admins = allUsers.filter((u) => u.role === "admin");

    const stats = {
      totalUsers: allUsers.length,
      customers: customers.length,
      barbers: barbers.length,
      admins: admins.length,
      activeUsers: allUsers.filter((u) => u.status === "active").length,
      pendingUsers: allUsers.filter((u) => u.status === "pending").length,
      blockedUsers: allUsers.filter((u) => u.status === "blocked").length,
    };

    res.json(stats);
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const user = await db.users.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const allUsers = await db.users.getAll();
    const usersWithoutPassword = allUsers.map(
      ({ password_hash, ...user }) => user,
    );

    res.json({ users: usersWithoutPassword });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Image Upload endpoint (real implementation with local storage)
export const uploadImage: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if file was uploaded
    const base64Data = req.body.image;
    if (!base64Data) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `${userId}_${timestamp}_${randomId}.jpg`;

    // Handle file uploads differently in serverless vs regular environments
    if (process.env.NETLIFY) {
      // In serverless environment, we can't save files to disk
      // For now, return a placeholder or handle with external service
      console.log("File upload attempted in serverless environment");
      res.status(501).json({
        error: "رفع الملفات غير مدعوم في البيئة الحالية",
        message: "File uploads are not supported in serverless environment",
        suggestion: "استخدم خدمة رفع ملفات خارجية مثل Cloudinary أو AWS S3",
      });
      return;
    }

    // Create uploads directory if it doesn't exist (only in non-serverless environments)
    const uploadDir = "./uploads";
    const fs = require("fs");
    const path = require("path");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Convert base64 to buffer and save
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
    const imageBuffer = Buffer.from(base64Image, "base64");
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, imageBuffer);

    // Return URL that can be served by static middleware
    const imageUrl = `/uploads/${fileName}`;

    console.log(`Image uploaded successfully: ${imageUrl}`);
    res.json({ url: imageUrl });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({ error: "فشل في ��فع الصورة" });
  }
};
