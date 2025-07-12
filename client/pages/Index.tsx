import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          قيد التطوير
        </h1>
        <p className="text-xl text-muted-foreground">
          نحن نعمل على تحسين التطبيق لتوفير أفضل تجربة ممكنة
        </p>
      </div>
    </div>
  );
};

export default Index;
