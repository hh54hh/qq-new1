import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TelegramChat from "@/components/chat/TelegramChat";
import chatManager from "@/lib/chat-manager";
import { useAppStore } from "@/lib/store";

interface EnhancedMessagesPageProps {
  targetUserId?: string;
  initialConversationId?: string;
}

export default function EnhancedMessagesPage({
  targetUserId,
  initialConversationId,
}: EnhancedMessagesPageProps) {
  const navigate = useNavigate();
  const [state] = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetConversationId, setTargetConversationId] = useState<
    string | undefined
  >(initialConversationId);

  useEffect(() => {
    initializeChatSystem();
  }, [state.user]);

  useEffect(() => {
    // Handle target user from URL parameters
    if (targetUserId && state.user) {
      handleTargetUser(targetUserId);
    }
  }, [targetUserId, state.user]);

  const initializeChatSystem = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      if (!state.user) {
        navigate("/auth");
        return;
      }

      // Initialize chat manager
      await chatManager.initialize(state.user.id);

      setIsInitializing(false);
      console.log("✅ Chat system initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize chat system:", error);
      setError("فشل في تهيئة نظام المحادثات");
      setIsInitializing(false);
    }
  };

  const handleTargetUser = async (userId: string) => {
    try {
      // Get user name from local data or API
      let userName = "مستخدم";

      // Try to find user in local storage or make an API call
      // For now, we'll use a placeholder name

      // Create or get conversation with the target user
      const conversation = await chatManager.getOrCreateConversationWithUser(
        userId,
        userName,
      );

      if (conversation) {
        setTargetConversationId(conversation.id);
      }
    } catch (error) {
      console.error("Failed to create conversation with target user:", error);
    }
  };

  const handleBack = () => {
    // Use instant navigation if available, fallback to react-router
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/dashboard");
    }
  };

  if (!state.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">غير مصرح</h2>
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول أولاً</p>
          <button
            onClick={() => navigate("/auth")}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">جاري التهيئة</h2>
          <p className="text-muted-foreground">جاري تحضير نظام المحادث��ت...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-destructive">خطأ</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={initializeChatSystem}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={handleBack}
              className="bg-muted text-muted-foreground px-4 py-2 rounded-lg"
            >
              العودة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <TelegramChat
        currentUserId={state.user.id}
        onBack={handleBack}
        initialConversationId={targetConversationId}
      />
    </div>
  );
}
