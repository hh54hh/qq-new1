import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  ArrowRight,
  Save,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { User } from "@shared/api";
import { DbBarberAvailability } from "@shared/database";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";

interface WorkingHoursProps {
  user: User;
  onBack: () => void;
}

interface DaySchedule {
  day_of_week: number;
  day_name: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
}

const timeSlots = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

const defaultSchedule: DaySchedule[] = [
  {
    day_of_week: 0,
    day_name: "الأحد",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 1,
    day_name: "الاثنين",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 2,
    day_name: "الثلاثاء",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 3,
    day_name: "الأربعاء",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 4,
    day_name: "الخميس",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 5,
    day_name: "الجمعة",
    is_available: false,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 6,
    day_name: "السبت",
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
  },
];

export default function WorkingHours({ user, onBack }: WorkingHoursProps) {
  const [state, store] = useAppStore();
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadWorkingHours();
  }, []);

  const loadWorkingHours = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getWorkingHours();
      setSchedule(response.schedule);
    } catch (error) {
      console.error("Error loading working hours:", error);
      // Fallback to default schedule
      setSchedule(defaultSchedule);
    } finally {
      setIsLoading(false);
    }
  };

  const [hasChanges, setHasChanges] = useState(false);

  const updateDaySchedule = (
    dayIndex: number,
    updates: Partial<DaySchedule>,
  ) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, ...updates } : day,
      ),
    );
    setHasChanges(true);
  };

  const toggleDayAvailability = (dayIndex: number, isAvailable: boolean) => {
    updateDaySchedule(dayIndex, { is_available: isAvailable });
  };

  const updateWorkingTime = (
    dayIndex: number,
    field: "start_time" | "end_time",
    time: string,
  ) => {
    updateDaySchedule(dayIndex, { [field]: time });
  };

  const copyToAllDays = (dayIndex: number) => {
    const sourceDay = schedule[dayIndex];
    if (confirm(`هل تريد نسخ أوقات ${sourceDay.day_name} لجميع الأيام؟`)) {
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          is_available: sourceDay.is_available,
          start_time: sourceDay.start_time,
          end_time: sourceDay.end_time,
        })),
      );
      setHasChanges(true);
    }
  };

  const applyCommonSchedules = (
    type: "weekdays" | "weekend" | "all_open" | "all_closed",
  ) => {
    let updates: Partial<DaySchedule> = {};

    switch (type) {
      case "weekdays":
        setSchedule((prev) =>
          prev.map((day) => ({
            ...day,
            is_available: day.day_of_week !== 5, // Not Friday
            start_time: "09:00",
            end_time: "18:00",
          })),
        );
        break;
      case "weekend":
        setSchedule((prev) =>
          prev.map((day) => ({
            ...day,
            is_available: day.day_of_week === 5 || day.day_of_week === 6, // Friday & Saturday
            start_time: "10:00",
            end_time: "16:00",
          })),
        );
        break;
      case "all_open":
        setSchedule((prev) =>
          prev.map((day) => ({
            ...day,
            is_available: true,
            start_time: "09:00",
            end_time: "18:00",
          })),
        );
        break;
      case "all_closed":
        setSchedule((prev) =>
          prev.map((day) => ({
            ...day,
            is_available: false,
          })),
        );
        break;
    }
    setHasChanges(true);
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      // Save working hours via API
      await apiClient.saveWorkingHours(schedule);

      setHasChanges(false);

      store.addNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم حفظ أوقات العمل",
        message: "تم تحديث جدولك بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving schedule:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    if (confirm("هل تريد التراجع عن جميع التغييرات؟")) {
      loadWorkingHours();
      setHasChanges(false);
    }
  };

  const getWorkingHoursStats = () => {
    const activeDays = schedule.filter((day) => day.is_available).length;
    const totalHours = schedule.reduce((total, day) => {
      if (!day.is_available || !day.start_time || !day.end_time) return total;
      const start = new Date(`2024-01-01T${day.start_time}`);
      const end = new Date(`2024-01-01T${day.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + (isNaN(hours) ? 0 : hours);
    }, 0);

    return {
      activeDays,
      totalHours: isNaN(totalHours) ? 0 : Math.round(totalHours * 10) / 10,
    };
  };

  const validateTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(`2024-01-01T${startTime}`);
    const end = new Date(`2024-01-01T${endTime}`);
    return end > start;
  };

  const stats = getWorkingHoursStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">أوقات العمل</h1>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={resetChanges}>
                <RotateCcw className="h-4 w-4 mr-1" />
                تراجع
              </Button>
            )}
            <Button
              onClick={saveSchedule}
              disabled={!hasChanges || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-1" />
              {isLoading ? "حفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {stats.activeDays}
              </p>
              <p className="text-sm text-muted-foreground">أيام عمل</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {stats.totalHours}
              </p>
              <p className="text-sm text-muted-foreground">ساعة أسبوعياً</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">جداول سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyCommonSchedules("weekdays")}
              >
                أيام الأسبوع
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyCommonSchedules("weekend")}
              >
                عطلة نهاية الأسبوع
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyCommonSchedules("all_open")}
              >
                فتح جميع الأيام
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyCommonSchedules("all_closed")}
              >
                إغلاق جميع الأيام
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            الجدول الأسبوعي
          </h3>

          {schedule.map((day, index) => (
            <Card key={day.day_of_week} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-foreground">
                        {day.day_name}
                      </h4>
                      {day.is_available ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          مفتوح
                        </Badge>
                      ) : (
                        <Badge variant="secondary">مغلق</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={day.is_available}
                        onCheckedChange={(checked) =>
                          toggleDayAvailability(index, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToAllDays(index)}
                        className="text-xs"
                      >
                        نسخ للكل
                      </Button>
                    </div>
                  </div>

                  {/* Time Settings */}
                  {day.is_available && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">بداية العمل</Label>
                        <Select
                          value={day.start_time}
                          onValueChange={(time) =>
                            updateWorkingTime(index, "start_time", time)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem
                                key={`start-${index}-${time}`}
                                value={time}
                              >
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">نهاية العمل</Label>
                        <Select
                          value={day.end_time}
                          onValueChange={(time) =>
                            updateWorkingTime(index, "end_time", time)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem
                                key={`end-${index}-${time}`}
                                value={time}
                              >
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Validation Warning */}
                  {day.is_available &&
                    !validateTimeRange(day.start_time, day.end_time) && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>وقت النهاية يجب أن يكون بعد وقت البداية</span>
                      </div>
                    )}

                  {/* Working Hours Summary */}
                  {day.is_available &&
                    validateTimeRange(day.start_time, day.end_time) && (
                      <div className="text-sm text-muted-foreground">
                        ساعات العمل: {day.start_time} - {day.end_time} (
                        {(() => {
                          const start = new Date(
                            `2024-01-01T${day.start_time}`,
                          );
                          const end = new Date(`2024-01-01T${day.end_time}`);
                          const hours =
                            (end.getTime() - start.getTime()) /
                            (1000 * 60 * 60);
                          return isNaN(hours)
                            ? "0"
                            : (Math.round(hours * 10) / 10).toString();
                        })()}{" "}
                        ساعات)
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              نصائح
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• يمكن للعملاء حجز المواعيد فقط خلال أوقات العمل المحددة</p>
            <p>• تأكد من ترك وقت كافٍ بين المواعيد للراحة والتنظيف</p>
            <p>• يمكنك تغيير الأوقات في أي وقت حسب احتياجاتك</p>
            <p>• الحجوزات الحالية لن تتأثر بتغيير الأوقات</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
