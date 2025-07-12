import React, { useState, useEffect } from "react";
import { User } from "@shared/api";

interface TestNewsFeedProps {
  user: User;
}

export default function TestNewsFeed({ user }: TestNewsFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🧪 TestNewsFeed mounting for user:", user.id);
    loadPosts();
  }, [user.id]);

  const loadPosts = async () => {
    try {
      console.log("🔗 Loading posts via direct API call...");
      const token = localStorage.getItem("barbershop_token");

      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await fetch("/api/posts/following", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Posts loaded:", data);
      setPosts(data.posts || []);
    } catch (err) {
      console.error("❌ Error loading posts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-red-500 mb-2">خطأ!</h2>
          <p className="text-foreground">{error}</p>
          <button
            onClick={loadPosts}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        اختبار تحميل المنشورات
      </h1>

      <div className="mb-4 p-4 bg-card rounded border">
        <h3 className="font-bold">معلومات المستخدم:</h3>
        <p>الاسم: {user.name}</p>
        <p>البريد: {user.email}</p>
        <p>النوع: {user.role}</p>
        <p>المعرف: {user.id}</p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground">لا توجد منشورات</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold">المنشورات ({posts.length}):</h3>
          {posts.map((post, index) => (
            <div key={post.id || index} className="p-4 bg-card rounded border">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={post.user?.avatar_url || "https://picsum.photos/40/40"}
                  alt={post.user?.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{post.user?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleString("ar")}
                  </p>
                </div>
              </div>

              <img
                src={post.image_url}
                alt="منشور"
                className="w-full max-h-96 object-contain bg-black rounded mb-3"
              />

              {post.caption && (
                <p className="text-foreground">{post.caption}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>❤️ {post.likes} إعجاب</span>
                <span>🕒 {post.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
