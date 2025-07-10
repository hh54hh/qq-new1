import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Eye,
  Save,
  Trash2,
  MapPin,
} from "lucide-react";
import { User } from "@shared/api";
import { useAppStore } from "@/lib/store";
import AdvancedApiService from "@/lib/api";

interface SettingsPageProps {
  user: User;
  onBack: () => void;
}

interface SettingsData {
  notifications: {
    bookings: boolean;
    ratings: boolean;
    follows: boolean;
    marketing: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showLocation: boolean;
    showActivity: boolean;
  };
  preferences: {
    theme: "light" | "dark" | "auto";
    language: "ar" | "en";
    currency: "IQD" | "USD";
    distanceUnit: "km" | "miles";
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}

export default function SettingsPage({ user, onBack }: SettingsPageProps) {
  const [state, store] = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      bookings: true,
      ratings: true,
      follows: true,
      marketing: false,
      pushEnabled: true,
      emailEnabled: true,
    },
    privacy: {
      profileVisible: true,
      showLocation: true,
      showActivity: true,
    },
    preferences: {
      theme: "dark",
      language: "ar",
      currency: "IQD",
      distanceUnit: "km",
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // TODO: Load from API
      // const response = await AdvancedApiService.getUserSettings(user.id);
      // setSettings(response.data);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const updateSetting = (
    category: keyof SettingsData,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage for now (can be extended to API later)
      localStorage.setItem(
        `user_settings_${user.id}`,
        JSON.stringify(settings),
      );

      // Apply theme changes
      if (settings.preferences.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (settings.preferences.theme === "light") {
        document.documentElement.classList.remove("dark");
      }

      setIsDirty(false);

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم حفظ الإعدادات",
        message: "تم تحديث إعداداتك بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (
      confirm("هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.")
    ) {
      const confirmation = prompt(
        'للتأكيد، اكتب "حذف حسابي" في المربع أد��اه:',
      );
      if (confirmation === "حذف حسابي") {
        const password = prompt("أدخل كلمة المرور لتأكيد حذف الحساب:");
        if (password) {
          try {
            const result = await networkAwareAPI.deleteAccount(password);
            if (result.success) {
              alert("تم حذف حسابك بنجاح");
              // Clear auth and redirect to home
              localStorage.removeItem("auth_token");
              localStorage.removeItem("user_data");
              window.location.href = "/";
            } else {
              alert("فشل في حذف الحساب: " + result.message);
            }
          } catch (error) {
            console.error("Error deleting account:", error);
            alert("حدث خطأ في حذف الحساب، يرجى المحاولة مرة أخرى");
          }
        }
      }
    }
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
            <h1 className="text-lg font-bold text-foreground">الإعدادات</h1>
          </div>

          {isDirty && (
            <Button
              onClick={saveSettings}
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
        {/* Notifications Settings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>إشعارات الحجوزا��</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات عند الحجز أو التغييرات
                </p>
              </div>
              <Switch
                checked={settings.notifications.bookings}
                onCheckedChange={(checked) =>
                  updateSetting("notifications", "bookings", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>إشعارات التقييمات</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات عند حصولك على تقييم جديد
                </p>
              </div>
              <Switch
                checked={settings.notifications.ratings}
                onCheckedChange={(checked) =>
                  updateSetting("notifications", "ratings", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>إشعارات المتابعة</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات عند متابعة أشخاص جدد لك
                </p>
              </div>
              <Switch
                checked={settings.notifications.follows}
                onCheckedChange={(checked) =>
                  updateSetting("notifications", "follows", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>الإشعارات التسويقية</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي عروض وإشعارات ترويجية
                </p>
              </div>
              <Switch
                checked={settings.notifications.marketing}
                onCheckedChange={(checked) =>
                  updateSetting("notifications", "marketing", checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>طرق الإشعار</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">إشعارات المتصفح</span>
                <Switch
                  checked={settings.notifications.pushEnabled}
                  onCheckedChange={(checked) =>
                    updateSetting("notifications", "pushEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">البريد الإلكتروني</span>
                <Switch
                  checked={settings.notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    updateSetting("notifications", "emailEnabled", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              الخصوصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>إظهار الملف الشخصي</Label>
                <p className="text-sm text-muted-foreground">
                  السماح للآخرين برؤية ملفك الشخصي
                </p>
              </div>
              <Switch
                checked={settings.privacy.profileVisible}
                onCheckedChange={(checked) =>
                  updateSetting("privacy", "profileVisible", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>إظهار الموقع</Label>
                <p className="text-sm text-muted-foreground">
                  السماح بإظهار موقعك في نتائج البحث
                </p>
              </div>
              <Switch
                checked={settings.privacy.showLocation}
                onCheckedChange={(checked) =>
                  updateSetting("privacy", "showLocation", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>إظهار النشاط</Label>
                <p className="text-sm text-muted-foreground">
                  إظهار آخر نشاط لك للمتابعين
                </p>
              </div>
              <Switch
                checked={settings.privacy.showActivity}
                onCheckedChange={(checked) =>
                  updateSetting("privacy", "showActivity", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              التفضيلات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المظهر</Label>
              <Select
                value={settings.preferences.theme}
                onValueChange={(value: any) =>
                  updateSetting("preferences", "theme", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      فاتح
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      داكن
                    </div>
                  </SelectItem>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      تلقائي
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select
                value={settings.preferences.language}
                onValueChange={(value: any) =>
                  updateSetting("preferences", "language", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={settings.preferences.currency}
                onValueChange={(value: any) =>
                  updateSetting("preferences", "currency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IQD">دينار عراقي (د.ع)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>وحدة المسافة</Label>
              <Select
                value={settings.preferences.distanceUnit}
                onValueChange={(value: any) =>
                  updateSetting("preferences", "distanceUnit", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">كيلومتر</SelectItem>
                  <SelectItem value="miles">ميل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              الأمان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>المصادقة الثنائية</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل طبقة حماية إضافية لحسابك
                </p>
              </div>
              <Switch
                checked={settings.security.twoFactorEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("security", "twoFactorEnabled", checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>انتهاء صلاحية الجلسة (دقيقة)</Label>
              <Select
                value={settings.security.sessionTimeout.toString()}
                onValueChange={(value) =>
                  updateSetting("security", "sessionTimeout", Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 دقيقة</SelectItem>
                  <SelectItem value="30">30 دقيقة</SelectItem>
                  <SelectItem value="60">ساعة واحدة</SelectItem>
                  <SelectItem value="120">ساعتان</SelectItem>
                  <SelectItem value="0">بدون انتهاء</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              منطقة الخطر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-red-500">حذف الحساب</Label>
              <p className="text-sm text-muted-foreground mb-4">
                حذف حسابك نهائياً مع جميع البيانات. هذا الإجراء لا يمكن التراجع
                عنه.
              </p>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                حذف الحساب نهائياً
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
