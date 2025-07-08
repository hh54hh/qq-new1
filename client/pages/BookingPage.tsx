import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Clock,
  Star,
  MapPin,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { User, CreateBookingRequest } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

interface BookingPageProps {
  barber: {
    id: string;
    name: string;
    avatar_url?: string;
    level: number;
    rating: number;
    distance: number;
    price: number;
  };
  onBook: (booking: CreateBookingRequest & { message?: string }) => void;
  onBack: () => void;
}

// Generate available time slots (9 AM to 5 PM, 30-minute intervals)
const generateTimeSlots = (selectedDate: string) => {
  const slots = [];
  const startHour = 9;
  const endHour = 17;
  const currentTime = new Date();
  const isToday = selectedDate === currentTime.toISOString().split("T")[0];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      // Check if this time has already passed today
      let available = true;
      if (isToday) {
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();

        if (
          hour < currentHour ||
          (hour === currentHour && minute <= currentMinute)
        ) {
          available = false; // Time has passed
        } else {
          // Simulate some unavailable slots randomly for future times
          available = Math.random() > 0.2; // 80% availability
        }
      } else {
        // For future dates, simulate some unavailable slots randomly
        available = Math.random() > 0.2; // 80% availability
      }

      slots.push({ time: timeString, available });
    }
  }

  return slots;
};

const nextDays = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i);
  return {
    date: date.toISOString().split("T")[0],
    dayName: date.toLocaleDateString("ar-SA", { weekday: "long" }),
    dayNumber: date.getDate(),
    isToday: i === 0,
  };
});

export default function BookingPage({
  barber,
  onBook,
  onBack,
}: BookingPageProps) {
  const [selectedDate, setSelectedDate] = useState(nextDays[0].date);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isBooked, setIsBooked] = useState(false);
  const [timeSlots, setTimeSlots] = useState(
    generateTimeSlots(nextDays[0].date),
  );
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Load booked time slots for selected date and regenerate time slots
  useEffect(() => {
    setTimeSlots(generateTimeSlots(selectedDate));
    setSelectedTime(null); // Reset selected time when date changes
    loadBookedSlots();
  }, [selectedDate, barber.id]);

  const loadBookedSlots = async () => {
    if (!selectedDate || !barber.id) return;

    try {
      setIsLoadingSlots(true);

      // Get available slots from API
      const slots = await apiClient.getAvailableSlots(barber.id, selectedDate);

      // Extract booked slots
      const bookedSlotTimes = slots
        .filter((slot) => !slot.available)
        .map((slot) => slot.time);
      setBookedSlots(bookedSlotTimes);

      // Update time slots with real availability
      setTimeSlots(slots);
    } catch (error) {
      console.error("Error loading booked slots:", error);
      // Fallback to generated slots if API fails
      const fallbackSlots = generateTimeSlots(selectedDate);
      setTimeSlots(fallbackSlots);
      setBookedSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠";
    if (level >= 51) return "🟡";
    if (level >= 21) return "🔹";
    return "🔸";
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "ذهبي";
    if (level >= 21) return "محترف";
    return "مبتدئ";
  };

  const handleBooking = () => {
    if (!selectedTime) return;

    const bookingData = {
      barber_id: barber.id,
      datetime: `${selectedDate}T${selectedTime}:00.000Z`,
      message: message.trim() || undefined,
    };

    onBook(bookingData);
    setIsBooked(true);
  };

  if (isBooked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              تم إرسال طلب الحجز
            </h2>
            <p className="text-muted-foreground mb-6">
              سيتم إشعارك فور موافقة الح��اق على طلبك
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الحلاق:</span>
                <span className="font-medium">{barber.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">التاريخ:</span>
                <span className="font-medium">
                  {new Date(selectedDate).toLocaleDateString("ar-SA")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الوقت:</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
            </div>
            <Button onClick={onBack} className="w-full">
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">حجز موعد</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Barber Info */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={barber.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {barber.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {barber.name}
                  </h3>
                  <span>{getLevelIcon(barber.level)}</span>
                  <Badge variant="outline" className="text-xs">
                    {getLevelLabel(barber.level)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{barber.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{barber.distance} كم</span>
                  </div>
                  <div className="text-primary font-medium">
                    {barber.price} د.ع
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              اختر التاريخ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {nextDays.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all",
                    selectedDate === day.date
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground hover:bg-muted",
                    day.isToday && "border border-primary",
                  )}
                >
                  <div className="text-xs font-medium">{day.dayName}</div>
                  <div className="text-lg font-bold">{day.dayNumber}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              اختر الوقت
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSlots ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-muted/30 animate-pulse"
                  >
                    <div className="h-6 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "p-3 rounded-lg text-center transition-all",
                      !slot.available
                        ? "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                        : selectedTime === slot.time
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-foreground hover:bg-muted",
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">رسالة للحلاق (اختياري)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل إضافية عن نوع القصة أو التسريحة المطلوبة..."
              className="min-h-[80px] text-right"
              dir="rtl"
            />
          </CardContent>
        </Card>

        {/* Booking Summary */}
        {selectedTime && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ملخص الحجز</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">التاريخ:</span>
                <span className="font-medium">
                  {new Date(selectedDate).toLocaleDateString("ar-SA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الوقت:</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">السعر:</span>
                <span className="font-medium text-primary">
                  {barber.price} د.ع
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <Button
                  onClick={handleBooking}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  تأكيد الحجز
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
