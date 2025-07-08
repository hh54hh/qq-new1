import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@shared/supabase";

export default function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try a simple query to test connection
        const { error } = await supabase.from("users").select("id").limit(1);
        setIsConnected(!error);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  if (isConnected === null) {
    return null; // Don't render while checking
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      {isConnected ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span>متصل بقاعدة البيانات</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4 text-red-500" />
          <span>غير متصل بقاعدة البيانات</span>
        </>
      )}
    </div>
  );
}
