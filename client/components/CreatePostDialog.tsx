// Create Post Dialog - Offline Support
import React, { useState, useRef } from "react";
import { User } from "@shared/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Image as ImageIcon,
  Send,
  Loader2,
  WifiOff,
  Upload,
} from "lucide-react";
import { getPostsManager } from "@/lib/posts-manager";

interface CreatePostDialogProps {
  user: User;
  children: React.ReactNode;
  onPostCreated?: (postId: string, synced: boolean) => void;
}

export default function CreatePostDialog({
  user,
  children,
  onPostCreated,
}: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isPosting, setIsPosting] = useState(false);
  const [frameStyle, setFrameStyle] = useState("ذهبي");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postsManager = getPostsManager(user.id);

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image and create post
  const handleSubmit = async () => {
    if (!imageFile || !caption.trim()) {
      return;
    }

    setIsPosting(true);

    try {
      // Upload image first (this handles offline scenarios)
      const imageUrl = await uploadImage(imageFile);

      // Create post
      const postId = await postsManager.addPost({
        image_url: imageUrl,
        caption: caption.trim(),
        frame_style: frameStyle,
      });

      console.log(
        `✅ Post created: ${postId} (${navigator.onLine ? "online" : "offline"})`,
      );

      // Notify parent
      onPostCreated?.(postId, navigator.onLine);

      // Reset form
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("❌ Error creating post:", error);
      // Could show error toast here
    } finally {
      setIsPosting(false);
    }
  };

  // Upload image (with offline fallback)
  const uploadImage = async (file: File): Promise<string> => {
    if (!navigator.onLine) {
      // Offline: Convert to base64 for local storage
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }

    // Online: Upload to server
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("barbershop_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.warn("⚠️ Upload failed, using base64 fallback:", error);
      // Fallback to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setCaption("");
    setImageFile(null);
    setImagePreview("");
    setFrameStyle("ذهبي");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const frameStyles = [
    { value: "ذهبي", label: "ذهبي", color: "bg-yellow-500" },
    { value: "فضي", label: "فضي", color: "bg-gray-400" },
    { value: "برونزي", label: "برونزي", color: "bg-orange-600" },
    { value: "أسود", label: "أسود", color: "bg-gray-900" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            إنشاء منشور جديد
            {!navigator.onLine && (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                أوفلاين
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {navigator.onLine ? "متصل" : "غير متصل"}
              </p>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    اختر صورة
                  </span>
                </div>
              </Button>
            )}
          </div>

          {/* Caption */}
          <Textarea
            placeholder="اكتب تعليقاً..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Frame Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">نمط الإطار:</label>
            <div className="flex gap-2">
              {frameStyles.map((style) => (
                <Button
                  key={style.value}
                  variant={frameStyle === style.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFrameStyle(style.value)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${style.color}`}></div>
                  {style.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Offline Notice */}
          {!navigator.onLine && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">
                  سيتم حفظ المنشور محلياً وإرساله عند عودة الإنترنت
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={isPosting}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!imageFile || !caption.trim() || isPosting}
              className="flex-1"
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري النشر...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  نشر
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
