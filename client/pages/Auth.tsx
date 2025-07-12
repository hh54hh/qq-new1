import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scissors, Sparkles, Crown } from "lucide-react";
import { UserRole, LoginRequest, RegisterRequest } from "@shared/api";
import {
  ServiceCategory,
  getAllServiceCategories,
  getServiceCategoryConfig,
} from "@shared/service-categories";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import LocationPermissionDialog from "@/components/LocationPermissionDialog";
import DatabaseStatus from "@/components/DatabaseStatus";
import { useLocation } from "@/hooks/use-location";

interface AuthProps {
  onAuth: (user: any) => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("login");
  const [error, setError] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const { isPermissionRequested } = useLocation();

  // Login state
  const [loginData, setLoginData] = useState<LoginRequest>({
    email: "",
    password: "",
  });

  // Register state
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    name: "",
    email: "",
    password: "",
    role: "customer",
    service_category: undefined,
    activation_key: "", // Keep for legacy barber support
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل";
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // تحقق من صحة البيانات
    if (!loginData.email || !loginData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (!validateEmail(loginData.email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    try {
      const response = await store.login(loginData.email, loginData.password);

      // If user is a customer and location permission hasn't been requested, show dialog
      if (response.user.role === "customer" && !isPermissionRequested()) {
        setPendingUser(response.user);
        setShowLocationDialog(true);
      } else {
        onAuth(response.user);
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "فشل في تسجيل الدخول";
      let errorDetails = null;

      if (error instanceof Error) {
        // استخدام الرسالة المخصصة من الخادم
        errorMessage = error.message;

        // إضافة تفاصيل إضا��ية إذا كانت متوفرة
        const customError = error as any;
        if (customError.suggestion) {
          errorDetails = customError.suggestion;
        } else if (customError.details) {
          errorDetails = customError.details;
        }

        // التعامل مع أنواع الأخطاء المختلفة
        switch (customError.errorType) {
          case "MISSING_FIELDS":
            errorMessage = "يرجى ملء جميع الحقول المطل��بة";
            break;
          case "INVALID_EMAIL_FORMAT":
            errorMessage = "صيغة البريد الإلكتروني غير صحيحة";
            errorDetails = "مثال صحيح: user@example.com";
            break;
          case "LOGIN_FAILED":
          case "EMAIL_NOT_FOUND":
            errorMessage = "البريد الإلكتروني غير مسجل في النظام";
            errorDetails = "يمكنك إنشاء حساب جديد من تبويب 'إنشاء حساب'";
            break;
          case "INVALID_PASSWORD":
            errorMessage = "كلمة المرور غير صحيحة";
            errorDetails = "تأكد من كتابة كلمة المرور الصحيحة";
            break;
          case "ACCOUNT_BLOCKED":
            errorMessage = "تم حظر الحساب";
            errorDetails = "للاستفسار اتصل على: 07800657822";
            break;
          case "ACCOUNT_PENDING":
            errorMessage = "الحساب في انتظار التفعيل";
            errorDetails = "سيتم التفعيل خلال 24 ساعة";
            break;
          case "NETWORK_ERROR":
            errorMessage = "خطأ في الاتصال";
            errorDetails = "تحقق من اتصال الإنترنت";
            break;
          case "SERVER_ERROR":
            errorMessage = "خطأ في الخادم";
            errorDetails =
              "يرجى المحاولة مرة أخرى، أو اتصل بالدعم: 07800657822";
            break;
          case "DATABASE_CONNECTION_ERROR":
            errorMessage = "خطأ في الاتصال بقاعدة البيانات";
            errorDetails = "يرجى المحاولة مرة أخرى خلال بضع دقائق";
            break;
        }
      }

      // عرض الرسالة مع التفاصيل
      setError(
        errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage,
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // تحقق من صحة البيانات
    if (!registerData.name || !registerData.email || !registerData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (registerData.name.trim().length < 2) {
      setError("ال��سم يجب أن يحتوي على حرفين على الأقل");
      return;
    }

    if (!validateEmail(registerData.email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    const passwordError = validatePassword(registerData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      registerData.role === "barber" &&
      !registerData.activation_key?.trim()
    ) {
      setError("مفتاح التفعيل مطلوب لحسابات الحلاقين");
      return;
    }

    try {
      const response = await store.register(registerData);

      // If user is a customer and location permission hasn't been requested, show dialog
      if (response.user.role === "customer" && !isPermissionRequested()) {
        setPendingUser(response.user);
        setShowLocationDialog(true);
      } else {
        onAuth(response.user);
      }
    } catch (error) {
      console.error("Register error:", error);
      let errorMessage = "فشل في إنشاء الحساب";
      let errorDetails = null;

      if (error instanceof Error) {
        // استخدام الرسالة المخصصة من الخادم
        errorMessage = error.message;

        // إضافة تفاصيل إضافية إذا كانت متوفرة
        const customError = error as any;
        if (customError.suggestion) {
          errorDetails = customError.suggestion;
        } else if (customError.details) {
          errorDetails = customError.details;
        }

        // التعامل مع أنواع الأخطاء المختلفة للتسجيل
        switch (customError.errorType) {
          case "MISSING_REQUIRED_FIELDS":
            errorMessage = "يرجى ملء جميع الحقول المطلوبة";
            if (customError.missingFields) {
              errorDetails = `الحقول المفقودة: ${customError.missingFields.join("، ")}`;
            }
            break;
          case "NAME_TOO_SHORT":
            errorMessage = "ا��اسم قصير جداً";
            errorDetails = "يجب أن يحتوي الاسم على حرفين على الأقل";
            break;
          case "NAME_TOO_LONG":
            errorMessage = "الاسم طو��ل جداً";
            errorDetails = "يجب أن يكون الاسم أقل من 50 حرف";
            break;
          case "INVALID_EMAIL_FORMAT":
            errorMessage = "صيغة ال��ريد الإلكتروني غير صحيحة";
            errorDetails = "مثال صحيح: username@example.com";
            break;
          case "EMAIL_ALREADY_EXISTS":
            errorMessage = "البريد الإلكتروني مسجل مسبقاً";
            errorDetails = "يمكنك تسجيل الدخول أو استخدام بريد آخر";
            break;
          case "PASSWORD_TOO_SHORT":
            errorMessage = "كلمة المرور ضعيفة جداً";
            errorDetails = "يجب أن تحتوي على 6 أحرف على الأقل";
            break;
          case "MISSING_ACTIVATION_KEY":
            errorMessage = "مفتاح التفعيل مطلوب للحلاقين";
            errorDetails = "للحصول على مفتاح التفعيل اتصل: 07800657822";
            break;
          case "INVALID_ACTIVATION_KEY":
            errorMessage = "مفتاح التفعيل غير صحيح";
            errorDetails = "تحقق من المفتاح أو اتصل: 07800657822";
            break;
          case "ACTIVATION_KEY_USED":
            errorMessage = "مفتاح التفعيل مستخدم مسبقاً";
            errorDetails = "للحصول على مفتاح جديد اتصل: 07800657822";
            break;
          case "DATABASE_CONNECTION_ERROR":
            errorMessage = "خطأ في الاتصال بقاعدة البيانات";
            errorDetails = "يرجى المحاولة مرة أخرى خلال بضع دقائق";
            break;
          case "NETWORK_ERROR":
            errorMessage = "خطأ في الاتصال";
            errorDetails = "تحقق من اتصال الإنترنت";
            break;
          case "SERVER_ERROR":
            errorMessage = "خطأ في الخا��م";
            errorDetails = "يرجى المحاولة مرة أخرى، أو اتصل: 07800657822";
            break;
        }
      }

      // عرض الرسالة مع التفاصيل
      setError(
        errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage,
      );
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "customer":
        return <Sparkles className="h-4 w-4" />;
      case "barber":
        return <Scissors className="h-4 w-4" />;
      case "admin":
        return <Crown className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "customer":
        return "زبون";
      case "barber":
        return "حل��ق";
      case "admin":
        return "مدير";
    }
  };

  const handleLocationDialogComplete = (hasLocation: boolean) => {
    if (pendingUser) {
      onAuth(pendingUser);
      setPendingUser(null);
    }
  };

  return (
    <>
      <LocationPermissionDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onComplete={handleLocationDialogComplete}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/80 p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-golden-600 rounded-2xl flex items-center justify-center mb-4">
              <Scissors className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">حلاقة</h1>
            <p className="text-muted-foreground mt-2">
              نظام إدارة صالونات الحلاقة
            </p>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">تسجيل دخول</TabsTrigger>
                <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">م��حباً بعودتك</CardTitle>
                    <CardDescription>
                      سجل دخولك للوصول إلى حسابك
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="example@email.com"
                        required
                        className="text-right"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {error && (
                      <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0 mt-1"></div>
                          <div className="flex-1">
                            <div className="whitespace-pre-line leading-relaxed">
                              {error}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={state.isLoading}
                    >
                      {state.isLoading ? "جاري تسجيل الدخول..." : "تسجيل دخول"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
                    <CardDescription>
                      أنشئ ��سابك وابدأ رحلتك معنا
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input
                        id="name"
                        type="text"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="أدخل اسمك الكامل"
                        required
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="example@email.com"
                        required
                        className="text-right"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">كلمة المرور</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        يجب أن تحتوي على 6 أحرف على الأقل
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">نوع الحساب</Label>
                      <Select
                        value={registerData.role}
                        onValueChange={(value: UserRole) =>
                          setRegisterData((prev) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">
                            <div className="flex items-center gap-2">
                              {getRoleIcon("customer")}
                              <span>{getRoleLabel("customer")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="barber">
                            <div className="flex items-center gap-2">
                              {getRoleIcon("barber")}
                              <span>{getRoleLabel("barber")}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {registerData.role === "barber" && (
                      <div className="space-y-2">
                        <Label htmlFor="activation-key">مفتاح التفعيل</Label>
                        <Input
                          id="activation-key"
                          type="text"
                          value={registerData.activation_key}
                          onChange={(e) =>
                            setRegisterData((prev) => ({
                              ...prev,
                              activation_key: e.target.value,
                            }))
                          }
                          placeholder="أدخل مفتاح التفعيل المقدم من الإدارة"
                          required
                          className="text-right"
                        />
                        <p className="text-xs text-muted-foreground">
                          للحصول على مفتاح التفعيل، تواصل مع الإدارة على
                          WhatsApp: 07800657822
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0 mt-1"></div>
                          <div className="flex-1">
                            <div className="whitespace-pre-line leading-relaxed">
                              {error}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={state.isLoading}
                    >
                      {state.isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              بإنشاء حساب، فإنك توافق على{" "}
              <a href="#" className="text-primary hover:underline">
                شروط الاستخدام
              </a>{" "}
              و{" "}
              <a href="#" className="text-primary hover:underline">
                سياسة الخصوصية
              </a>
            </p>
            <p className="text-xs text-muted-foreground/80">
              إذا كنت تواجه مشاكل في تسجيل الدخول، تأكد من إنشاء حساب جديد أولاً
            </p>
          </div>

          <DatabaseStatus />
        </div>
      </div>
    </>
  );
}
