import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Star, MapPin } from "lucide-react";
import { User } from "@shared/api";
import {
  ServiceCategory,
  getAllServiceCategories,
  getServiceCategoryConfig,
} from "@shared/service-categories";
import { cn } from "@/lib/utils";

interface ServicesPageProps {
  user: User;
  onCategorySelect: (category: ServiceCategory) => void;
  onBack?: () => void;
}

export default function ServicesPage({
  user,
  onCategorySelect,
  onBack,
}: ServicesPageProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);

  const serviceCategories = getAllServiceCategories();

  const handleCategoryClick = (category: ServiceCategory) => {
    setSelectedCategory(category);
    onCategorySelect(category);
  };

  if (selectedCategory) {
    // This will be handled by parent component routing
    return null;
  }

  return (
    <div className="w-full max-w-full overflow-hidden p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          اختر نوع الخدمة
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          تصفح جميع مقدمي الخدمات حسب التخصص
        </p>
      </div>

      {/* Service Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {serviceCategories.map((category) => {
          const config = getServiceCategoryConfig(category.id);

          return (
            <Card
              key={category.id}
              className="border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-200 cursor-pointer group hover:border-primary/20 hover:shadow-lg"
              onClick={() => handleCategoryClick(category.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                      config.gradient,
                      "text-white shadow-lg",
                    )}
                  >
                    {config.icon}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {config.nameAr}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                {/* Category Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {category.id === "barber" ? "12" : "قريباً"} مقدم خدمة
                      </span>
                    </div>
                    {category.id === "barber" && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-muted-foreground">4.8</span>
                      </div>
                    )}
                  </div>

                  {category.id === "barber" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      متاح
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      قريباً
                    </Badge>
                  )}
                </div>

                {/* Specializations Preview */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">التخصصات:</span>{" "}
                    {config.fields.specialization}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-golden-500/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <h4 className="font-semibold text-foreground mb-2">
            خدمات أكثر قريباً!
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            نعمل على إضافة المزيد من أنواع الخدمات لتلبية احتياجاتك
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <MapPin className="h-3 w-3" />
            <span>في منطقتك</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-card/30 rounded-lg">
          <p className="text-lg font-bold text-primary">12</p>
          <p className="text-xs text-muted-foreground">مقدم خدمة</p>
        </div>
        <div className="p-3 bg-card/30 rounded-lg">
          <p className="text-lg font-bold text-primary">4.8</p>
          <p className="text-xs text-muted-foreground">تقييم عام</p>
        </div>
        <div className="p-3 bg-card/30 rounded-lg">
          <p className="text-lg font-bold text-primary">24/7</p>
          <p className="text-xs text-muted-foreground">خدمة متاحة</p>
        </div>
      </div>
    </div>
  );
}
