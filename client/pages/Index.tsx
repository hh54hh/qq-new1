import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [state] = useAppStore();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard, others to auth
  useEffect(() => {
    if (state.user) {
      console.log(
        "✅ User is logged in, redirecting to dashboard:",
        state.user.name,
      );
      navigate("/dashboard");
    } else {
      console.log("❌ No user found, redirecting to auth");
      navigate("/auth");
    }
  }, [state.user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          جاري التحميل...
        </h1>
        <p className="text-muted-foreground">يرجى الانتظار</p>
      </div>
    </div>
  );
};

export default Index;
