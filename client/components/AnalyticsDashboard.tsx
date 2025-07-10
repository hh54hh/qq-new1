import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Star,
  Activity,
  Clock,
  MessageSquare,
  Eye,
  Heart,
  Share2,
  Target,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeleton";

interface AnalyticsDashboardProps {
  user: User;
  onBack?: () => void;
}

interface AnalyticsData {
  totalBookings: number;
  revenue: number;
  averageRating: number;
  totalCustomers: number;
  completedBookings: number;
  canceledBookings: number;
  weeklyBookings: number[];
  monthlyRevenue: number[];
  topServices: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  customerSatisfaction: number;
  peakHours: Array<{
    hour: number;
    bookings: number;
  }>;
  socialMetrics: {
    postsCount: number;
    totalLikes: number;
    totalComments: number;
    profileViews: number;
    followers: number;
  };
}

const mockData: AnalyticsData = {
  totalBookings: 245,
  revenue: 12500,
  averageRating: 4.8,
  totalCustomers: 156,
  completedBookings: 220,
  canceledBookings: 25,
  weeklyBookings: [32, 28, 35, 42, 38, 45, 39],
  monthlyRevenue: [8500, 9200, 10800, 12500],
  topServices: [
    { name: "قص شعر كلاسيكي", count: 85, revenue: 2550 },
    { name: "حلاقة ذقن", count: 72, revenue: 2160 },
    { name: "تصفيف شعر", count: 58, revenue: 2900 },
    { name: "عناية بالوجه", count: 30, revenue: 1800 },
  ],
  customerSatisfaction: 94,
  peakHours: [
    { hour: 9, bookings: 12 },
    { hour: 14, bookings: 18 },
    { hour: 16, bookings: 25 },
    { hour: 18, bookings: 20 },
  ],
  socialMetrics: {
    postsCount: 24,
    totalLikes: 342,
    totalComments: 89,
    profileViews: 1240,
    followers: 186,
  },
};

export default function AnalyticsDashboard({ user }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    // Simulate loading analytics data
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setData(mockData);
      setIsLoading(false);
    };

    loadData();
  }, [timeRange]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    format = "number",
  }: {
    title: string;
    value: number;
    icon: any;
    trend?: "up" | "down";
    trendValue?: number;
    format?: "number" | "currency" | "percentage";
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case "currency":
          return `${val.toLocaleString("ar-SA")} ر.س`;
        case "percentage":
          return `${val}%`;
        default:
          return val.toLocaleString("ar-SA");
      }
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  formatValue(value)
                )}
              </p>
              {trend && trendValue && !isLoading && (
                <div className="flex items-center gap-1">
                  {trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      trend === "up" ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {trendValue}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    من الشهر الماضي
                  </span>
                </div>
              )}
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحليلات</h1>
          <p className="text-muted-foreground">
            تابع أداء أعمالك وإحصائياتك المفصلة
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 أيام</SelectItem>
            <SelectItem value="30d">30 يوم</SelectItem>
            <SelectItem value="90d">90 يوم</SelectItem>
            <SelectItem value="1y">سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="social">السوشيال ميديا</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي الحجوزات"
              value={data.totalBookings}
              icon={Calendar}
              trend="up"
              trendValue={12}
            />
            <StatCard
              title="إجمالي الإيرادات"
              value={data.revenue}
              icon={DollarSign}
              format="currency"
              trend="up"
              trendValue={8}
            />
            <StatCard
              title="متوسط التقييم"
              value={data.averageRating}
              icon={Star}
              trend="up"
              trendValue={2}
            />
            <StatCard
              title="إجمالي العملاء"
              value={data.totalCustomers}
              icon={Users}
              trend="up"
              trendValue={15}
            />
          </div>

          {/* Performance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  أداء الحجوزات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    حجوزات مكتملة
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {data.completedBookings}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700"
                    >
                      {(
                        (data.completedBookings / data.totalBookings) *
                        100
                      ).toFixed(1)}
                      %
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    حجوزات ملغية
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{data.canceledBookings}</span>
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-700"
                    >
                      {(
                        (data.canceledBookings / data.totalBookings) *
                        100
                      ).toFixed(1)}
                      %
                    </Badge>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      رضا العملاء: {data.customerSatisfaction}%
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${data.customerSatisfaction}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  أوقات الذروة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.peakHours.map(({ hour, bookings }) => (
                    <div
                      key={hour}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {hour}:00 - {hour + 1}:00
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(bookings / Math.max(...data.peakHours.map((p) => p.bookings))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">
                          {bookings}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                الخدمات الأكثر طلباً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topServices.map((service, index) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.count} حجز
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {service.revenue.toLocaleString("ar-SA")} ر.س
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {((service.revenue / data.revenue) * 100).toFixed(1)}%
                        من الإيرادات
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="إيرادات الشهر"
              value={data.monthlyRevenue[data.monthlyRevenue.length - 1]}
              icon={DollarSign}
              format="currency"
              trend="up"
              trendValue={15}
            />
            <StatCard
              title="متوسط الحجز"
              value={Math.round(data.revenue / data.totalBookings)}
              icon={Target}
              format="currency"
            />
            <StatCard
              title="النمو ��لشهري"
              value={Math.round(
                ((data.monthlyRevenue[3] - data.monthlyRevenue[2]) /
                  data.monthlyRevenue[2]) *
                  100,
              )}
              icon={TrendingUp}
              format="percentage"
              trend="up"
              trendValue={8}
            />
          </div>

          {/* Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                تطور الإيرادات الشهرية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    سيتم إضافة الرسوم البيانية قريباً
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          {/* Social Media Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="المنشورات"
              value={data.socialMetrics.postsCount}
              icon={MessageSquare}
              trend="up"
              trendValue={20}
            />
            <StatCard
              title="الإعجابات"
              value={data.socialMetrics.totalLikes}
              icon={Heart}
              trend="up"
              trendValue={35}
            />
            <StatCard
              title="التعليقات"
              value={data.socialMetrics.totalComments}
              icon={MessageSquare}
              trend="up"
              trendValue={18}
            />
            <StatCard
              title="مشاهدات الملف"
              value={data.socialMetrics.profileViews}
              icon={Eye}
              trend="up"
              trendValue={25}
            />
            <StatCard
              title="المتابعين"
              value={data.socialMetrics.followers}
              icon={Users}
              trend="up"
              trendValue={12}
            />
          </div>

          {/* Social Engagement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                معدل التفاعل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">معدل الإعجابات لكل منشور</span>
                  <span className="font-medium">
                    {Math.round(
                      data.socialMetrics.totalLikes /
                        data.socialMetrics.postsCount,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">معدل التعليقات لكل منشور</span>
                  <span className="font-medium">
                    {Math.round(
                      data.socialMetrics.totalComments /
                        data.socialMetrics.postsCount,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">معدل التفاعل الإجمالي</span>
                  <span className="font-medium">
                    {(
                      ((data.socialMetrics.totalLikes +
                        data.socialMetrics.totalComments) /
                        (data.socialMetrics.followers *
                          data.socialMetrics.postsCount)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
