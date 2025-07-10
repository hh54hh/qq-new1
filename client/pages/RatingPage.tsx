import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Star,
  ArrowRight,
  ThumbsUp,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { User, Booking } from "@shared/api";
import { DbRating } from "@shared/database";
import apiClient from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface RatingPageProps {
  user: User;
  booking?: Booking;
  barberId?: string;
  onBack: () => void;
  onComplete?: () => void;
}

interface RatingFormData {
  stars: number;
  comment: string;
  categories: {
    service_quality: number;
    punctuality: number;
    cleanliness: number;
    communication: number;
  };
}

const ratingCategories = [
  { key: "service_quality", label: "جودة الخدمة", icon: "✂️" },
  { key: "punctuality", label: "الالتزام بالموعد", icon: "⏰" },
  { key: "cleanliness", label: "النظافة", icon: "🧽" },
  { key: "communication", label: "التواصل", icon: "💬" },
];

export default function RatingPage({
  user,
  booking,
  barberId,
  onBack,
  onComplete,
}: RatingPageProps) {
  const [state, store] = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [existingRating, setExistingRating] = useState<DbRating | null>(null);
  const [barberInfo, setBarberInfo] = useState<User | null>(null);
  const [formData, setFormData] = useState<RatingFormData>({
    stars: 0,
    comment: "",
    categories: {
      service_quality: 0,
      punctuality: 0,
      cleanliness: 0,
      communication: 0,
    },
  });

  // Real barber data loaded from API

  useEffect(() => {
    loadBarberInfo();
    checkExistingRating();
  }, []);

  const loadBarberInfo = async () => {
    try {
      const targetBarberId = barberId || booking?.barber_id;
      if (targetBarberId) {
        // Get barber info from barbers list
        const barbersResponse = await apiClient.getBarbers();
        const barber = barbersResponse.barbers?.find(
          (b) => b.id === targetBarberId,
        );
        if (barber) {
          setBarberInfo(barber);
        }
      }
    } catch (error) {
      console.error("Error loading barber info:", error);
      // Keep barberInfo as null on error
    }
  };

  const checkExistingRating = async () => {
    try {
      if (booking) {
        // TODO: Check if rating already exists for this booking
        // const response = await AdvancedApiService.getRatingByBooking(booking.id);
        // setExistingRating(response.data);
      }
    } catch (error) {
      console.error("Error checking existing rating:", error);
    }
  };

  const handleStarClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, stars: rating }));
  };

  const handleCategoryRating = (
    category: keyof RatingFormData["categories"],
    rating: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: rating,
      },
    }));
  };

  const calculateOverallRating = () => {
    if (formData.stars > 0) return formData.stars;

    const categoryRatings = Object.values(formData.categories);
    const validRatings = categoryRatings.filter((rating) => rating > 0);

    if (validRatings.length === 0) return 0;

    return Math.round(
      validRatings.reduce((sum, rating) => sum + rating, 0) /
        validRatings.length,
    );
  };

  const submitRating = async () => {
    const overallRating = calculateOverallRating();
    if (overallRating === 0) {
      alert("يرجى إعطاء تقييم أولاً");
      return;
    }

    setIsLoading(true);
    try {
      const ratingData = {
        customer_id: user.id,
        barber_id: barberId || booking?.barber_id || "",
        booking_id: booking?.id,
        stars: overallRating,
        comment: formData.comment.trim() || undefined,
        // Store category ratings in a custom field or metadata
      };

      // Submit rating via API
      await apiClient.createRating(ratingData);

      // Points are automatically updated in backend via rating creation

      // Add notification for barber
      store.addNotification({
        id: Date.now().toString(),
        type: "new_rating",
        title: "تقييم جديد",
        message: `حصلت على تقييم ${overallRating} نجوم من ${user.name}`,
        data: { rating: overallRating, customer: user.name },
        read: false,
        created_at: new Date().toISOString(),
      });

      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowSuccessDialog(false);
    onComplete?.();
    onBack();
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "���";
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

  const renderStars = (
    rating: number,
    onStarClick?: (rating: number) => void,
    size: "sm" | "md" | "lg" = "md",
  ) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onStarClick?.(star)}
            disabled={!onStarClick}
            className={cn(
              "transition-colors",
              onStarClick && "hover:scale-110 cursor-pointer",
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300",
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  if (existingRating) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">تقييمك</h1>
          </div>
        </div>

        <div className="p-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                شكراً لتقييمك
              </h3>
              <p className="text-muted-foreground mb-4">
                لقد قمت بتقييم هذه الخدمة مسبقاً
              </p>
              <div className="space-y-2">
                {renderStars(existingRating.stars, undefined, "lg")}
                {existingRating.comment && (
                  <p className="text-foreground mt-4">
                    "{existingRating.comment}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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
          <h1 className="text-lg font-bold text-foreground">تقيي�� الخدمة</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Barber Info */}
        {barberInfo && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={barberInfo.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {barberInfo.name ? barberInfo.name.charAt(0) : "ح"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {barberInfo.name}
                    </h3>
                    <span>{getLevelIcon(barberInfo.level)}</span>
                    <Badge
                      variant="outline"
                      className="bg-golden-500/10 text-golden-500 border-golden-500/20"
                    >
                      {getLevelLabel(barberInfo.level)}
                    </Badge>
                  </div>

                  {booking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(booking.datetime).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Rating */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-center">كيف كانت تجربتك؟</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              {renderStars(formData.stars, handleStarClick, "lg")}
            </div>
            <p className="text-sm text-muted-foreground">
              اضغط على النجوم لإعطاء تقييم
            </p>
          </CardContent>
        </Card>

        {/* Category Ratings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>تقييم تفصيلي (اختياري)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratingCategories.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium text-foreground">
                    {category.label}
                  </span>
                </div>
                {renderStars(
                  formData.categories[
                    category.key as keyof RatingFormData["categories"]
                  ],
                  (rating) =>
                    handleCategoryRating(
                      category.key as keyof RatingFormData["categories"],
                      rating,
                    ),
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Comment */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>تعليق (اختياري)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.comment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              placeholder="شاركنا رأيك حول الخدمة..."
              className="text-right min-h-[100px]"
              dir="rtl"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={submitRating}
          disabled={calculateOverallRating() === 0 || isLoading}
          className="w-full bg-primary hover:bg-primary/90"
          size="lg"
        >
          {isLoading ? "جاري إرسال التقييم..." : "إرسال التقييم"}
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-center">
              شكراً لك على التقييم!
            </DialogTitle>
            <DialogDescription className="text-center">
              تم إرسال تقييمك بنجاح. رأيك يساعدنا في تحسين الخدمة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-center mb-2">
                {renderStars(calculateOverallRating(), undefined, "md")}
              </div>
              <p className="text-sm text-foreground">
                تقييمك: {calculateOverallRating()} من 5 نجوم
              </p>
            </div>

            {formData.comment && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-foreground">"{formData.comment}"</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSuccess} className="w-full">
              تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
