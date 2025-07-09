import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scissors, Star, Clock, MapPin } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PWAManager from "@/components/PWAManager";

const Index = () => {
  const [state] = useAppStore();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (state.user) {
      navigate("/dashboard");
    }
  }, [state.user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-golden-900/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Main header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 sm:h-8 sm:w-8 text-golden-500" />
              <span className="text-lg sm:text-2xl font-bold text-golden-500">
                BarberApp
              </span>
            </div>

            {/* Mobile: Only login button */}
            <div className="sm:hidden">
              <Button
                size="sm"
                onClick={() => (window.location.href = "/auth")}
              >
                دخول
              </Button>
            </div>

            {/* Desktop: All buttons */}
            <div className="hidden sm:flex gap-2">
              <Button onClick={() => (window.location.href = "/auth")}>
                تسجيل الدخول
              </Button>
            </div>
          </div>

          {/* Debug buttons - only for development */}
          {import.meta.env.DEV && (
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => (window.location.href = "/debug")}
              >
                تشخيص
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => (window.location.href = "/network-diagnostic")}
              >
                شبكة
              </Button>
            </div>
          )}

          {/* PWA Manager - compact */}
          <div className="mt-2">
            <PWAManager className="w-full max-w-md mx-auto" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            أفضل حلاقين في
            <span className="text-golden-500 block sm:inline"> مدينتك</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            احجز موعدك مع أمهر الحلاقين، واستمتع بخدمة عالية الجودة وأسعار
            مناسبة
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8"
              onClick={() => (window.location.href = "/auth")}
            >
              ابدأ الآن
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8"
            >
              تعرف على المزيد
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            لماذا تختارنا؟
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Star className="h-12 w-12 text-golden-500 mx-auto mb-4" />
                <CardTitle>حلاقين محترفين</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  فريق من أمهر الحلاقين المتخصصين في جميع أنواع القصات
                  والتسريحات العصرية
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-golden-500 mx-auto mb-4" />
                <CardTitle>حجز سهل وسريع</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  احجز موعدك في ثوانٍ معدودة واختر الوقت الذي يناسبك
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <MapPin className="h-12 w-12 text-golden-500 mx-auto mb-4" />
                <CardTitle>مواقع متعددة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  اختر من بين ��لعديد من المحلات في مختلف أنحاء المدينة
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-golden-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            جاهز للحصول على أفضل قصة شعر؟
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            انضم إلى آلاف العملاء الراضين واحجز موعدك الآن
          </p>
          <Button
            size="lg"
            className="px-8"
            onClick={() => (window.location.href = "/auth")}
          >
            احجز موعدك الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-background/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scissors className="h-6 w-6 text-golden-500" />
            <span className="text-xl font-bold text-golden-500">BarberApp</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 BarberApp. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
