import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl mb-4">404</CardTitle>
          <CardTitle>الصفحة غير موجودة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              الصفحة الرئيسية
            </Button>

            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
