import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database,
  Trash2,
  RefreshCw,
  HardDrive,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { getChatCache } from "@/lib/chat-cache";

interface StorageStats {
  conversations: number;
  messages: number;
  pendingMessages: number;
  totalSizeKB: number;
}

export default function ChatStorageMonitor() {
  const [stats, setStats] = useState<StorageStats>({
    conversations: 0,
    messages: 0,
    pendingMessages: 0,
    totalSizeKB: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const chatCache = await getChatCache();
      const newStats = await chatCache.getStorageStats();
      setStats(newStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to load storage stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      const chatCache = await getChatCache();
      await chatCache.clearAllChatData();
      await loadStats();
    } catch (error) {
      console.error("Failed to clear chat data:", error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getStorageStatus = () => {
    if (stats.totalSizeKB > 5000)
      return { color: "destructive", label: "مرتفع" };
    if (stats.totalSizeKB > 2000) return { color: "warning", label: "متوسط" };
    return { color: "success", label: "طبيعي" };
  };

  const storageStatus = getStorageStatus();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          تخزين المحادثات
          <Badge
            variant={
              storageStatus.color === "destructive"
                ? "destructive"
                : "secondary"
            }
          >
            {formatBytes(stats.totalSizeKB)}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            مراقب تخزين المحادثات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Storage Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                استخدام التخزين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  الحجم الكلي
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      storageStatus.color === "destructive"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {formatBytes(stats.totalSizeKB)}
                  </Badge>
                  <Badge variant="outline">{storageStatus.label}</Badge>
                </div>
              </div>

              {stats.totalSizeKB > 3000 && (
                <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-orange-700 dark:text-orange-300">
                    استخدام عالي لل��خزين - فكر في التنظيف
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-lg font-semibold">
                      {stats.conversations}
                    </p>
                    <p className="text-xs text-muted-foreground">محادثة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-lg font-semibold">{stats.messages}</p>
                    <p className="text-xs text-muted-foreground">رسالة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Messages */}
          {stats.pendingMessages > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">رسائل معلقة</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingMessages} رسالة في انتظار الإرسال
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Update */}
          {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              آخر تحديث: {lastUpdate.toLocaleTimeString("ar-SA")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              تحديث
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllData}
              disabled={isClearing}
              className="flex-1"
            >
              {isClearing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              مسح الكل
            </Button>
          </div>

          {/* Storage Tips */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium mb-2">نصائح التخزين:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• يتم حفظ آخر 50 محادثة تلقائياً</li>
                <li>• كل محادثة تحتفظ بـ 100 رسالة كحد أقصى</li>
                <li>• التنظيف التلقائي كل 30 دقيقة</li>
                <li>• المحادثات القديمة تُحذف بعد 90 يوم</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
