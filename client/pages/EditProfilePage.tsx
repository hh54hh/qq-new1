import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Camera,
  Save,
  MapPin,
  Phone,
  Mail,
  User as UserIcon,
  Upload,
  X,
} from "lucide-react";
import { User } from "@shared/api";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";

interface EditProfilePageProps {
  user: User;
  onBack: () => void;
  onSave?: (updatedUser: User) => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  avatar_url?: string;
}

export default function EditProfilePage({
  user,
  onBack,
  onSave,
}: EditProfilePageProps) {
  const [state, store] = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name,
    email: user.email,
    phone: "",
    bio: "",
    location: {
      address: "",
    },
    avatar_url: user.avatar_url,
  });

  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleLocationChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح");
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert("حجم الصورة كبير جداً. الحد الأقصى 500 كيلوبايت");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Compress and convert image to base64
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Set canvas size to 200x200 for avatar
        canvas.width = 200;
        canvas.height = 200;

        // Draw and compress image
        ctx?.drawImage(img, 0, 0, 200, 200);

        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setFormData((prev) => ({ ...prev, avatar_url: compressedDataUrl }));
        setIsDirty(true);
      };

      img.onerror = () => {
        alert("فشل في معالجة الصورة");
        setIsUploadingAvatar(false);
        return;
      };

      // Read file as data URL to load into image
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        alert("فشل في قراءة ملف الصورة");
        setIsUploadingAvatar(false);
        return;
      };
      reader.readAsDataURL(file);

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم رفع الصورة",
        message: "تم تحديث صورتك الشخصية بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("حدث خطأ أثناء رفع الصورة");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar_url: undefined }));
    setIsDirty(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setFormData((prev) => ({
            ...prev,
            location: {
              ...prev.location,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          }));
          setIsDirty(true);

          // Reverse geocoding to get address
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=YOUR_API_KEY&language=ar&pretty=1`,
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
              const address = data.results[0].formatted;
              handleLocationChange("address", address);
            } else {
              handleLocationChange(
                "address",
                `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              );
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            handleLocationChange(
              "address",
              `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            );
          }
        },
        (error) => {
          console.error("Location error:", {
            code: error.code,
            message: (error as any).message || "Location error",
          });
          alert("لا يمكن الحصول على موقعك الحالي");
        },
      );
    } else {
      alert("متصفحك لا يدعم خدمات الموقع");
    }
  };

  const saveProfile = async () => {
    if (!formData.name.trim()) {
      alert("الاسم مطلوب");
      return;
    }

    if (!formData.email.trim()) {
      alert("البريد الإلكتروني مطلوب");
      return;
    }

    setIsLoading(true);
    try {
      // Save to API with real profile update
      const response = await apiClient.updateProfile({
        name: formData.name,
        email: formData.email,
        avatar_url: formData.avatar_url,
      });

      // Update user in store with response from server
      store.setUser(response.user);
      onSave?.(response.user);
      setIsDirty(false);

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم حفظ الملف الشخصي",
        message: "تم تحديث بياناتك بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });

      onBack();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠";
    if (level >= 51) return "🟡";
    if (level >= 21) return "🔹";
    return "🔸";
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "ذهبي";
    if (level >= 21) return "محترف";
    return "مبتدئ";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              تعديل الملف الشخصي
            </h1>
          </div>

          {isDirty && (
            <Button
              onClick={saveProfile}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-1" />
              {isLoading ? "حفظ..." : "حفظ"}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Picture */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>الصورة الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {formData.name ? formData.name.charAt(0) : "م"}
                  </AvatarFallback>
                </Avatar>

                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    رفع صورة
                  </Button>

                  {formData.avatar_url && (
                    <Button
                      variant="outline"
                      onClick={removeAvatar}
                      disabled={isUploadingAvatar}
                    >
                      <X className="h-4 w-4 mr-2" />
                      إزالة
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  PNG, JPG أو GIF - حتى 5MB
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="example@email.com"
                className="text-right"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+964 7XX XXX XXXX"
                className="text-right"
                dir="ltr"
              />
            </div>

            {user.role === "barber" && (
              <div className="space-y-2">
                <Label htmlFor="bio">نبذة تعريفية</Label>
                <Textarea
                  id="bio"
                  value={formData.bio || ""}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="اكتب نبذ�� مختصرة عن خبرتك وتخصصك..."
                  className="text-right min-h-[100px]"
                  dir="rtl"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        {user.role === "barber" && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                الموقع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={formData.location?.address || ""}
                  onChange={(e) =>
                    handleLocationChange("address", e.target.value)
                  }
                  placeholder="أدخل عنوان صالونك"
                  className="text-right"
                />
              </div>

              <Button
                variant="outline"
                onClick={getCurrentLocation}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                استخدام الموقع الحالي
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>معلوم��ت الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">نوع الحساب:</span>
              <Badge variant="outline">
                {user.role === "customer"
                  ? "زبون"
                  : user.role === "barber"
                    ? "حل��ق"
                    : "مدير"}
              </Badge>
            </div>

            {user.role === "barber" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    المستوى:
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{getLevelIcon(user.level)}</span>
                    <Badge
                      variant="outline"
                      className="bg-golden-500/10 text-golden-500 border-golden-500/20"
                    >
                      {getLevelLabel(user.level)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">النقاط:</span>
                  <span className="font-medium text-primary">
                    {user.points}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                تاريخ التسجيل:
              </span>
              <span className="text-sm">
                {new Date(user.created_at).toLocaleDateString("ar-SA")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                حالة الحساب:
              </span>
              <Badge
                className={
                  user.is_verified
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }
              >
                {user.is_verified ? "موثق" : "في انتظار التوثيق"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={saveProfile}
          disabled={!isDirty || isLoading}
          className="w-full bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </div>
  );
}
