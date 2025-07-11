import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, MessageCircle, Settings } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { MessageSkeleton } from "@/components/ui/loading-skeleton";
import ChatStorageMonitor from "@/components/debug/ChatStorageMonitor";
import OptimizedMessagesPage from "./OptimizedMessagesPage";

interface MessagesPageProps {
  user: User;
  onBack: () => void;
}

interface Conversation {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  lastMessage: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
  messages: any[];
}

export default function MessagesPage({ user, onBack }: MessagesPageProps) {
  // Use the optimized version with storage monitoring in development
  const isDevMode = process.env.NODE_ENV === "development";

  if (isDevMode) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Enhanced Header with Storage Monitor */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">الرسائل (محسّن)</h1>
            <div className="flex items-center gap-2">
              <ChatStorageMonitor />
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Optimized Messages Page */}
        <div className="flex-1 overflow-hidden">
          <OptimizedMessagesPage user={user} onBack={onBack} />
        </div>
      </div>
    );
  }

  // Use optimized version in production
  return <OptimizedMessagesPage user={user} onBack={onBack} />;
}
