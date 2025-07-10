import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Heart,
  Edit,
  Send,
  MoreHorizontal,
  Bookmark,
  Share,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

interface PostViewPageProps {
  post: any;
  user: User;
  onBack: () => void;
  onLike?: (postId: string) => void;
}

interface Comment {
  id: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  comment: string;
  created_at: string;
}

export default function PostViewPage({
  post,
  user,
  onBack,
  onLike,
}: PostViewPageProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const response = await apiClient.getPostComments(post.id);
      setComments(response.comments || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLike = async () => {
    try {
      const previousState = isLiked;
      const previousCount = likesCount;

      // تحديث فوري للواجهة
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

      if (isLiked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }

      onLike?.(post.id);
    } catch (error) {
      // إعادة الحالة السابقة في حالة الخطأ
      setIsLiked(!isLiked);
      setLikesCount(likesCount);
      console.error("Error toggling like:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const comment = await apiClient.createPostComment(
        post.id,
        newComment.trim(),
      );

      // إضافة التعليق الجديد للقائمة
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "الآن";
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "أمس";
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`;

    return postDate.toLocaleDateString("ar-SA");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">المنشور</h1>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {/* صاحب المنشور */}
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.user?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.user?.name?.charAt(0) || "ح"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">
                  {post.user?.name || "حلاق"}
                </h3>
                {post.user?.is_verified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(post.created_at)}
              </p>
            </div>
            <Button variant="outline" size="sm">
              متابعة
            </Button>
          </div>

          {/* الصورة */}
          <div className="relative aspect-square bg-black">
            <img
              src={post.image_url}
              alt={post.caption}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* أزرار التفاعل */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="p-2 -m-2 hover:scale-110 transition-transform"
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isLiked ? "fill-red-500 text-red-500" : "text-foreground",
                  )}
                />
              </button>
              <button className="p-2 -m-2 hover:scale-110 transition-transform">
                <Edit className="h-6 w-6 text-foreground" />
              </button>
              <button className="p-2 -m-2 hover:scale-110 transition-transform">
                <Share className="h-6 w-6 text-foreground" />
              </button>
            </div>
            <button className="p-2 -m-2 hover:scale-110 transition-transform">
              <Bookmark className="h-6 w-6 text-foreground" />
            </button>
          </div>

          {/* عدد الإعجابات */}
          <div className="px-4 pb-2">
            <p className="font-semibold text-sm">
              {likesCount.toLocaleString("ar-SA")} إعجاب
            </p>
          </div>

          {/* النص */}
          {post.caption && (
            <div className="px-4 pb-3">
              <p className="text-sm">
                <span className="font-semibold mr-2">
                  {post.user?.name || "حلاق"}
                </span>
                <span>{post.caption}</span>
              </p>
            </div>
          )}

          {/* التعليقات */}
          <div className="space-y-3 px-4 pb-4">
            {isLoadingComments ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {comment.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold mr-2">
                        {comment.user.name}
                      </span>
                      <span>{comment.comment}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      <button className="text-xs text-muted-foreground font-medium">
                        رد
                      </button>
                      <button className="text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {comments.length === 0 && !isLoadingComments && (
              <div className="text-center py-6">
                <Edit className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  لا توجد تعليقات بعد
                </p>
                <p className="text-xs text-muted-foreground">
                  كن أول من يعلق ��لى هذا المنشور
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* إدخال التعليق */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="أضف تعليقاً..."
              className="flex-1 border-none bg-muted/50 focus-visible:ring-1"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmittingComment}
              size="sm"
              className="px-3"
            >
              {isSubmittingComment ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
