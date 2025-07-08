import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

// قائمة بجميع أنواع الأخطاء المحتملة لاختبارها
const errorTypes = [
  {
    type: "MISSING_FIELDS",
    message: "يرجى ملء جميع الحقول المطلوبة",
    details: "البريد الإلكتروني وكلمة المرور ��طلوبان",
    category: "validation",
  },
  {
    type: "INVALID_EMAIL_FORMAT",
    message: "صيغة البريد الإلكتروني غير صحيحة",
    details: "مثال صحيح: user@example.com",
    category: "validation",
  },
  {
    type: "EMAIL_NOT_FOUND",
    message: "البريد الإلكتروني غير مسجل في النظام",
    details: "يمكنك إنشاء حساب جديد من تبويب 'إنشاء حساب'",
    category: "authentication",
  },
  {
    type: "INVALID_PASSWORD",
    message: "كلمة المرور غير صحيحة",
    details: "تأكد من كتابة كلمة المرور الصحيحة",
    category: "authentication",
  },
  {
    type: "ACCOUNT_BLOCKED",
    message: "تم حظر الحساب من قبل الإدارة",
    details: "للاستفسار اتصل على: 07800657822",
    category: "account",
  },
  {
    type: "ACCOUNT_PENDING",
    message: "الحساب في انتظار التفعيل من قبل الإدارة",
    details: "سيتم تفعيل الحساب خلال 24 ساعة",
    category: "account",
  },
  {
    type: "EMAIL_ALREADY_EXISTS",
    message: "البريد الإلكتروني مسجل مسبقاً في النظام",
    details: "��مكنك تسجيل الدخول أو استخدام بريد آخر",
    category: "registration",
  },
  {
    type: "PASSWORD_TOO_SHORT",
    message: "كلمة المرور ضعيفة جداً",
    details: "يجب أن تحتوي على 6 أحرف على الأقل",
    category: "validation",
  },
  {
    type: "MISSING_ACTIVATION_KEY",
    message: "مفتاح التفعيل مطلوب للحلاقين",
    details: "للحصول على مفتاح التفعيل اتصل: 07800657822",
    category: "registration",
  },
  {
    type: "INVALID_ACTIVATION_KEY",
    message: "مفتاح التفعيل غير صحيح أو غير موجود",
    details: "تحقق من المفتاح أو اتصل: 07800657822",
    category: "registration",
  },
  {
    type: "ACTIVATION_KEY_USED",
    message: "هذا المفتاح تم استخدامه مسبقاً من قبل حساب آخر",
    details: "للحصول على مفتاح جديد اتصل: 07800657822",
    category: "registration",
  },
  {
    type: "NETWORK_ERROR",
    message: "خطأ في الاتصال بالخادم",
    details: "تحقق من اتصال الإنترنت وحاول مرة أخرى",
    category: "network",
  },
  {
    type: "DATABASE_CONNECTION_ERROR",
    message: "خطأ في الاتصال بقاعدة البيانات",
    details: "يرجى المحاولة مرة أخرى خلال بضع دقائق",
    category: "server",
  },
  {
    type: "SERVER_ERROR",
    message: "خطأ في الخادم",
    details: "يرجى المحاولة مرة أخرى، أو اتصل بالدعم: 07800657822",
    category: "server",
  },
  {
    type: "RATE_LIMIT_ERROR",
    message: "تم تجاوز عدد المحاولات المسموحة",
    details: "انتظر دقيقة واحدة ثم حاول مرة أخرى",
    category: "security",
  },
  {
    type: "SERVICE_UNAVAILABLE_ERROR",
    message: "الخدمة غير متاحة مؤقتاً للصيانة",
    details: "يرجى المحاولة خلال بضع دقائق",
    category: "server",
  },
];

const categoryColors = {
  validation: "destructive",
  authentication: "destructive",
  account: "secondary",
  registration: "outline",
  network: "default",
  server: "destructive",
  security: "secondary",
} as const;

const categoryIcons = {
  validation: AlertTriangle,
  authentication: XCircle,
  account: AlertTriangle,
  registration: AlertTriangle,
  network: XCircle,
  server: XCircle,
  security: AlertTriangle,
};

export default function ErrorTestPage() {
  const [selectedError, setSelectedError] = useState<
    (typeof errorTypes)[0] | null
  >(null);

  const ErrorDisplay = ({ error }: { error: (typeof errorTypes)[0] }) => {
    const Icon = categoryIcons[error.category as keyof typeof categoryIcons];

    return (
      <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0 mt-1"></div>
          <div className="flex-1">
            <div className="whitespace-pre-line leading-relaxed">
              {error.message}
              {error.details && `\n${error.details}`}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const categories = [...new Set(errorTypes.map((e) => e.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            اختبار رسائل الخطأ
          </h1>
          <p className="text-muted-foreground">
            مراجعة جميع رسائل الخطأ المحتملة في النظام
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* قائمة الأخطاء */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                أنواع الأخطاء ({errorTypes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {category === "validation" && "أخطاء التحقق"}
                    {category === "authentication" && "أخطاء المصادقة"}
                    {category === "account" && "أخطاء الحساب"}
                    {category === "registration" && "أخطاء التسجيل"}
                    {category === "network" && "أخطاء الشبكة"}
                    {category === "server" && "أخطاء الخادم"}
                    {category === "security" && "أخطاء الأمان"}
                  </h3>
                  <div className="grid gap-2">
                    {errorTypes
                      .filter((error) => error.category === category)
                      .map((error) => {
                        const Icon =
                          categoryIcons[
                            error.category as keyof typeof categoryIcons
                          ];
                        return (
                          <button
                            key={error.type}
                            onClick={() => setSelectedError(error)}
                            className={`p-3 text-left rounded-lg border transition-colors hover:bg-muted/50 ${
                              selectedError?.type === error.type
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {error.message}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant={
                                      categoryColors[
                                        error.category as keyof typeof categoryColors
                                      ]
                                    }
                                    className="text-xs"
                                  >
                                    {error.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* معاينة الخطأ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                معاينة الخطأ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedError ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          categoryColors[
                            selectedError.category as keyof typeof categoryColors
                          ]
                        }
                      >
                        {selectedError.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedError.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">كيف ستظهر للمستخدم:</h4>
                    <ErrorDisplay error={selectedError} />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">التفاصيل التقنية:</h4>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <div>
                        <strong>النوع:</strong> {selectedError.type}
                      </div>
                      <div>
                        <strong>الفئة:</strong> {selectedError.category}
                      </div>
                      <div>
                        <strong>الرسالة:</strong> {selectedError.message}
                      </div>
                      {selectedError.details && (
                        <div>
                          <strong>التفاصيل:</strong> {selectedError.details}
                        </div>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      هذه معاينة لكيفية ظهور رسالة الخطأ في واجهة تسجيل الدخول.
                      الرسائل مصممة لتكون واضحة ومفيدة للمستخدم.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>اختر نوع خطأ من القائمة لمعاينته</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ملخص التحسينات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">✅ تم تطبيقها:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• رسائل خطأ واضحة ومحددة لكل حالة</li>
                  <li>• تفاصيل إضافية مفيدة للمستخدم</li>
                  <li>• أرقام هاتف للدعم الفني</li>
                  <li>• اقتراحات للحلول</li>
                  <li>• معالجة أخطاء الشبكة والخادم</li>
                  <li>• تصنيف الأخطاء حسب النوع</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🎯 الفوائد:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• تجربة مستخدم أفضل</li>
                  <li>• تقليل الارتباك والإحباط</li>
                  <li>• توجيه واضح للحلول</li>
                  <li>• سهولة التواصل مع الدعم</li>
                  <li>• تشخيص أسرع للمشاكل</li>
                  <li>• تق��يل طلبات الدعم</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// إضافة الدالة للوصول العالمي من Console
if (typeof window !== "undefined") {
  (window as any).openErrorTest = () => {
    window.location.href = "/error-test";
  };
}
