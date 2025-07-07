import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Star,
  ArrowRight,
  Target,
  Award,
  Zap,
} from "lucide-react";
import { User } from "@shared/api";
import apiClient from "@/lib/api";
import AdvancedApiService from "@/lib/api";

interface AnalyticsDashboardProps {
  user: User;
  onBack: () => void;
}

interface AnalyticsData {
  overview: {
    totalBookings: number;
    completedBookings: number;
    totalRevenue: number;
    averageRating: number;
    responseTime: number; // in minutes
    completionRate: number;
    newCustomers: number;
    repeatCustomers: number;
  };
  trends: {
    bookings: { date: string; count: number; revenue: number }[];
    ratings: { date: string; average: number; count: number }[];
  };
  topServices: {
    name: string;
    bookings: number;
    revenue: number;
    growth: number;
  }[];
  peakHours: { hour: number; bookings: number }[];
  monthlyGoals: {
    bookings: { target: number; current: number };
    revenue: { target: number; current: number };
    rating: { target: number; current: number };
  };
}

const periodOptions = [
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "quarter", label: "هذا الربع" },
  { value: "year", label: "هذا العام" },
];

export default function AnalyticsDashboard({
  user,
  onBack,
}: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: {
      totalBookings: 156,
      completedBookings: 142,
      totalRevenue: 4250000,
      averageRating: 4.7,
      responseTime: 12,
      completionRate: 91,
      newCustomers: 23,
      repeatCustomers: 119,
    },
    trends: {
      bookings: [
        { date: "2024-01-01", count: 12, revenue: 300000 },
        { date: "2024-01-02", count: 15, revenue: 375000 },
        { date: "2024-01-03", count: 8, revenue: 200000 },
        { date: "2024-01-04", count: 18, revenue: 450000 },
        { date: "2024-01-05", count: 22, revenue: 550000 },
      ],
      ratings: [
        { date: "2024-01-01", average: 4.5, count: 10 },
        { date: "2024-01-02", average: 4.8, count: 12 },
        { date: "2024-01-03", average: 4.6, count: 8 },
        { date: "2024-01-04", average: 4.9, count: 15 },
        { date: "2024-01-05", average: 4.7, count: 18 },
      ],
    },
    topServices: [
      { name: "قص شعر عادي", bookings: 45, revenue: 1125000, growth: 12 },
      { name: "حلاقة لحية", bookings: 32, revenue: 480000, growth: 8 },
      { name: "تصفيف مناسبات", bookings: 18, revenue: 900000, growth: 25 },
      { name: "قص أطفال", bookings: 28, revenue: 420000, growth: -5 },
    ],
    peakHours: [
      { hour: 9, bookings: 5 },
      { hour: 10, bookings: 12 },
      { hour: 11, bookings: 18 },
      { hour: 12, bookings: 15 },
      { hour: 13, bookings: 8 },
      { hour: 14, bookings: 22 },
      { hour: 15, bookings: 25 },
      { hour: 16, bookings: 20 },
      { hour: 17, bookings: 16 },
      { hour: 18, bookings: 10 },
    ],
    monthlyGoals: {
      bookings: { target: 200, current: 156 },
      revenue: { target: 5000000, current: 4250000 },
      rating: { target: 4.8, current: 4.7 },
    },
  });

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getBarberAnalytics(
        selectedPeriod,
        user.id,
      );
      setAnalyticsData(response.analytics);
    } catch (error) {
      console.error("Error loading analytics:", error);
      // Keep mock data on error
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return (amount / 1000).toLocaleString("ar-SA") + " ألف د.ع";
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-500";
    if (growth < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">التحليلات</h1>
          </div>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="performance">الأداء</TabsTrigger>
            <TabsTrigger value="goals">الأهداف</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        إجمالي الحجوزات
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {analyticsData.overview.totalBookings}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        إجمالي الإيرادات
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(analyticsData.overview.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        متوسط التقييم
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {analyticsData.overview.averageRating}
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        معدل الإكمال
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercentage(
                          analyticsData.overview.completionRate,
                        )}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Services */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  أفضل الخدمات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.topServices.map((service, index) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">
                          {service.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.bookings} حجز •{" "}
                          {formatCurrency(service.revenue)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 ${getGrowthColor(service.growth)}`}
                    >
                      {getGrowthIcon(service.growth)}
                      <span className="text-sm font-medium">
                        {Math.abs(service.growth)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>وقت الاستجابة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      متوسط الرد
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      {analyticsData.overview.responseTime} دقيقة
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    أسرع من 80% من الحلاقين
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>العملاء</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">
                        {analyticsData.overview.newCustomers}
                      </p>
                      <p className="text-sm text-muted-foreground">عملاء جدد</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">
                        {analyticsData.overview.repeatCustomers}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        عملاء متكررين
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Peak Hours */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  ساعات الذروة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.peakHours
                    .sort((a, b) => b.bookings - a.bookings)
                    .slice(0, 5)
                    .map((hour) => (
                      <div
                        key={hour.hour}
                        className="flex items-center justify-between"
                      >
                        <span className="text-foreground">
                          {hour.hour}:00 - {hour.hour + 1}:00
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(hour.bookings / 25) * 100}
                            className="h-2 w-20"
                          />
                          <span className="text-sm text-muted-foreground w-8">
                            {hour.bookings}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6 mt-6">
            {/* Monthly Goals */}
            <div className="space-y-4">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    هدف الحجوزات الشهرية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        {analyticsData.monthlyGoals.bookings.current} من{" "}
                        {analyticsData.monthlyGoals.bookings.target}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(
                          calculateProgress(
                            analyticsData.monthlyGoals.bookings.current,
                            analyticsData.monthlyGoals.bookings.target,
                          ),
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={calculateProgress(
                        analyticsData.monthlyGoals.bookings.current,
                        analyticsData.monthlyGoals.bookings.target,
                      )}
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    هدف الإيرادات الشهرية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        {formatCurrency(
                          analyticsData.monthlyGoals.revenue.current,
                        )}{" "}
                        من{" "}
                        {formatCurrency(
                          analyticsData.monthlyGoals.revenue.target,
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(
                          calculateProgress(
                            analyticsData.monthlyGoals.revenue.current,
                            analyticsData.monthlyGoals.revenue.target,
                          ),
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={calculateProgress(
                        analyticsData.monthlyGoals.revenue.current,
                        analyticsData.monthlyGoals.revenue.target,
                      )}
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    هدف التقييم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        {analyticsData.monthlyGoals.rating.current} من{" "}
                        {analyticsData.monthlyGoals.rating.target} نجوم
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(
                          (analyticsData.monthlyGoals.rating.current /
                            analyticsData.monthlyGoals.rating.target) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.monthlyGoals.rating.current /
                          analyticsData.monthlyGoals.rating.target) *
                        100
                      }
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievement Badges */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  الإنجازات هذا الشهر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-golden-500/10 rounded-lg">
                    <Zap className="h-8 w-8 text-golden-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      استجابة سريعة
                    </p>
                    <p className="text-xs text-muted-foreground">
                      رد سريع على 95% من الطلبات
                    </p>
                  </div>

                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      عملاء مميزون
                    </p>
                    <p className="text-xs text-muted-foreground">
                      أكثر من 20 عميل جديد
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
