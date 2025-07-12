import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Scissors,
  Key,
  BarChart3,
  AlertTriangle,
  Plus,
  Search,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Crown,
  Settings,
  Shield,
} from "lucide-react";
import { User } from "@shared/api";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
  user: User;
  activeTab: string;
  onLogout?: () => void;
}

interface AdminStats {
  totalUsers: number;
  totalBarbers: number;
  totalCustomers: number;
  activeUsers: number;
  pendingVerifications: number;
  totalBookings: number;
  totalRevenue: number;
  reportsCount: number;
}

interface ActivationKey {
  id: string;
  code: string;
  is_used: boolean;
  created_by: string;
  used_by?: string;
  expires_at?: string;
  created_at: string;
}

export default function AdminDashboard({
  user,
  activeTab,
  onLogout,
}: AdminDashboardProps) {
  const [state, store] = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("all");
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [keyCount, setKeyCount] = useState(1);
  const [keyExpiry, setKeyExpiry] = useState("30");

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBarbers: 0,
    totalCustomers: 0,
    activeUsers: 0,
    pendingVerifications: 0,
    totalBookings: 0,
    totalRevenue: 0,
    reportsCount: 0,
  });

  useEffect(() => {
    loadStats();
    loadUsers();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await apiClient.getAdminStats();
      setStats(response.stats);
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await apiClient.getAllUsers();
      setUsers(response.users);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [activationKeys, setActivationKeys] = useState<ActivationKey[]>([
    {
      id: "1",
      code: "BARBER2024-001",
      is_used: false,
      created_by: user.id,
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      code: "BARBER2024-002",
      is_used: true,
      created_by: user.id,
      used_by: "1",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        apiClient.getGlobalAnalytics(),
        apiClient.getAllUsers(),
      ]);

      // Update state with real data if needed
      console.log("Admin data loaded:", { statsData, usersData });
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateActivationKeys = async () => {
    setIsLoading(true);
    try {
      const newKeys: ActivationKey[] = [];
      for (let i = 0; i < keyCount; i++) {
        const code = `BARBER${new Date().getFullYear()}-${String(activationKeys.length + i + 1).padStart(3, "0")}`;
        newKeys.push({
          id: Date.now().toString() + i,
          code,
          is_used: false,
          created_by: user.id,
          expires_at:
            keyExpiry !== "0"
              ? new Date(
                  Date.now() + parseInt(keyExpiry) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : undefined,
          created_at: new Date().toISOString(),
        });
      }

      setActivationKeys((prev) => [...prev, ...newKeys]);
      setShowCreateKeyDialog(false);
      setKeyCount(1);

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم إنشاء مفاتيح التفعيل",
        message: `تم إنشاء ${keyCount} مفتاح تفعيل جديد`,
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error generating keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (
    userId: string,
    newStatus: "active" | "pending" | "blocked",
  ) => {
    try {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
      );

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم تحديث حالة المستخدم",
        message: `تم تحديث حالة المستخدم إلى ${newStatus}`,
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const verifyBarber = async (userId: string) => {
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: true, status: "active" } : u,
        ),
      );

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم توثيق الحلاق",
        message: "تم توثيق حساب الحلاق بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error verifying barber:", error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        setUsers((prev) => prev.filter((u) => u.id !== userId));

        store.addNotification({
          id: Date.now().toString(),
          type: "system",
          title: "تم حذف المستخدم",
          message: "تم حذف المستخدم بنجاح",
          data: null,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const deleteActivationKey = async (keyId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المفتاح؟")) {
      try {
        setActivationKeys((prev) => prev.filter((k) => k.id !== keyId));

        store.addNotification({
          id: Date.now().toString(),
          type: "system",
          title: "تم حذف المفتاح",
          message: "تم حذف مفتاح التفعيل بنجاح",
          data: null,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error deleting key:", error);
      }
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (selectedUserType !== "all") {
      filtered = filtered.filter((user) => user.role === selectedUserType);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filtered;
  };

  const formatCurrency = (amount: number) => {
    return (amount / 1000).toLocaleString("ar-SA") + " ألف د.ع";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "blocked":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "نشط";
      case "pending":
        return "في الانتظار";
      case "blocked":
        return "محظور";
      default:
        return status;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {stats.totalUsers}
            </p>
            <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <Scissors className="h-8 w-8 text-golden-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {stats.totalBarbers}
            </p>
            <p className="text-sm text-muted-foreground">الحلاقين</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {stats.totalBookings}
            </p>
            <p className="text-sm text-muted-foreground">إجمالي الحج��زات</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {stats.pendingVerifications}
            </p>
            <p className="text-sm text-muted-foreground">في انتظار التوثيق</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">تم توثيق حلاق جديد</p>
                <p className="text-xs text-muted-foreground">
                  أحمد الحلاق - منذ 5 دقائق
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">مستخدم جديد مسجل</p>
                <p className="text-xs text-muted-foreground">
                  فاطمة محمد - منذ 15 دقيقة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Key className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">تم استخدام مفتاح تفعيل</p>
                <p className="text-xs text-muted-foreground">
                  BARBER2024-002 - منذ ساعة
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مستخدم..."
            className="pr-10 text-right"
          />
        </div>
        <Select value={selectedUserType} onValueChange={setSelectedUserType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المس��خدمين</SelectItem>
            <SelectItem value="customer">العملاء</SelectItem>
            <SelectItem value="barber">الحلاقين</SelectItem>
            <SelectItem value="admin">المديرين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {getFilteredUsers().map((userItem) => (
          <Card key={userItem.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userItem.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userItem.name ? userItem.name.charAt(0) : "م"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {userItem.name}
                    </h4>
                    {userItem.role === "barber" && !userItem.is_verified && (
                      <Badge variant="destructive" className="text-xs">
                        غير موثق
                      </Badge>
                    )}
                    {userItem.role === "admin" && (
                      <Crown className="h-4 w-4 text-golden-500" />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {userItem.email}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(userItem.status)}
                    >
                      {getStatusLabel(userItem.status)}
                    </Badge>
                    <Badge variant="outline">
                      {userItem.role === "customer"
                        ? "زبون"
                        : userItem.role === "barber"
                          ? "حلاق"
                          : "مدير"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {userItem.role === "barber" && !userItem.is_verified && (
                    <Button
                      size="sm"
                      onClick={() => verifyBarber(userItem.id)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      توثيق
                    </Button>
                  )}

                  {userItem.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(userItem.id, "blocked")}
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      حظر
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(userItem.id, "active")}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      تفعيل
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteUser(userItem.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {getFilteredUsers().length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا توجد نتائج
              </h3>
              <p className="text-muted-foreground">
                لم يتم العثور على مستخدمين مطابقين لمعايير البحث
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderActivationKeys = () => (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">مفاتيح التفعيل</h3>

        <Dialog
          open={showCreateKeyDialog}
          onOpenChange={setShowCreateKeyDialog}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              إنشاء مفاتيح جديدة
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء مفاتيح تفعيل جديدة</DialogTitle>
              <DialogDescription>
                أنشئ مفاتيح تفعيل للحلاقين الجدد
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">عدد المفاتيح</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={keyCount}
                  onChange={(e) => setKeyCount(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  مدة الصلاحية (أيام)
                </label>
                <Select value={keyExpiry} onValueChange={setKeyExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                    <SelectItem value="90">90 يوم</SelectItem>
                    <SelectItem value="0">بدون انتهاء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateKeyDialog(false)}
              >
                إلغاء
              </Button>
              <Button onClick={generateActivationKeys} disabled={isLoading}>
                {isLoading ? "إنشاء..." : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Keys List */}
      <div className="space-y-4">
        {activationKeys.map((key) => (
          <Card key={key.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {key.code}
                    </code>
                    <Badge
                      className={
                        key.is_used
                          ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                          : "bg-green-500/10 text-green-500 border-green-500/20"
                      }
                    >
                      {key.is_used ? "مستخدم" : "متاح"}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    تم الإنشاء:{" "}
                    {new Date(key.created_at).toLocaleDateString("ar-SA")}
                    {key.expires_at && (
                      <>
                        {" "}
                        | انتهاء الصلاحية:{" "}
                        {new Date(key.expires_at).toLocaleDateString("ar-SA")}
                      </>
                    )}
                  </p>

                  {key.used_by && (
                    <p className="text-sm text-green-600">
                      تم الاستخدام من قبل:{" "}
                      {users.find((u) => u.id === key.used_by)?.name ||
                        "مستخدم محذوف"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(key.code)}
                  >
                    نسخ
                  </Button>

                  {!key.is_used && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteActivationKey(key.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {activationKeys.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا توجد مفاتيح تفعيل
              </h3>
              <p className="text-muted-foreground mb-4">
                أنشئ ��فاتيح تفعيل للحلاقين الجدد
              </p>
              <Button
                onClick={() => setShowCreateKeyDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                إنشاء مفاتيح جديدة
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <Tabs value={activeTab === "profile" ? "overview" : activeTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="keys">مفاتيح التفعيل</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">{renderOverview()}</TabsContent>
          <TabsContent value="users">{renderUsers()}</TabsContent>
          <TabsContent value="keys">{renderActivationKeys()}</TabsContent>
        </div>
      </Tabs>

      {/* Settings Button */}
      {activeTab === "profile" && (
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3">
            <Settings className="h-4 w-4" />
            إعدادات النظام
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3">
            <Shield className="h-4 w-4" />
            سجل الأمان
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start gap-3"
            onClick={onLogout}
          >
            تسجيل خروج
          </Button>
        </div>
      )}
    </div>
  );
}
