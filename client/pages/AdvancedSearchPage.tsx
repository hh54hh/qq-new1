import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowRight,
  Star,
  MapPin,
  Clock,
  Filter,
  X,
  Calendar,
  DollarSign,
  Award,
  Users,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { useLocation } from "@/hooks/use-location";

interface AdvancedSearchPageProps {
  user: User;
  onBack: () => void;
  onSelectBarber: (barber: any) => void;
}

interface SearchFilters {
  query: string;
  minRating: number;
  maxPrice: number;
  radius: number;
  services: string[];
  sortBy: "distance" | "rating" | "price" | "popularity";
  onlyAvailable: boolean;
}

const SERVICES_LIST = [
  "قص شعر",
  "حلاقة ذقن",
  "تصفيف الشعر",
  "حمام كريم",
  "نقش الشعر",
  "صبغة شعر",
  "علاج الشعر",
  "تسريحة عريس",
  "ديكوباج",
  "ماسك للوجه",
];

const SORT_OPTIONS = [
  { value: "distance", label: "الأقرب", icon: MapPin },
  { value: "rating", label: "الأعلى تقييماً", icon: Star },
  { value: "price", label: "الأقل سعراً", icon: DollarSign },
  { value: "popularity", label: "الأكثر شعبية", icon: Users },
];

export default function AdvancedSearchPage({
  user,
  onBack,
  onSelectBarber,
}: AdvancedSearchPageProps) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    minRating: 0,
    maxPrice: 200,
    radius: 50,
    services: [],
    sortBy: "distance",
    onlyAvailable: false,
  });

  const { location: userLocation, isLocationAvailable } = useLocation();

  useEffect(() => {
    // Perform initial search on component mount
    handleSearch();
  }, []);

  const handleSearch = async () => {
    try {
      setIsLoading(true);

      const searchParams = {
        query: filters.query || undefined,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radius: filters.radius,
        minRating: filters.minRating,
        maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
        services: filters.services.length > 0 ? filters.services : undefined,
        sortBy: filters.sortBy,
        onlyAvailable: filters.onlyAvailable,
      };

      const response = await apiClient.advancedSearchBarbers(searchParams);
      setSearchResults(response.barbers || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleService = (service: string) => {
    setFilters((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      minRating: 0,
      maxPrice: 200,
      radius: 50,
      services: [],
      sortBy: "distance",
      onlyAvailable: false,
    });
  };

  const getDistanceText = (distance: number) => {
    if (distance < 1) return `${Math.round(distance * 1000)}م`;
    return `${distance.toFixed(1)}كم`;
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3 w-3",
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-300",
        )}
      />
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 -ml-2"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">البحث المتقدم</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "إخفاء" : "فلاتر"}
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            placeholder="ابحث عن حلاق أو خدمة..."
            className="pr-10 bg-muted/50 border-0 focus-visible:ring-1"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b border-border/50 bg-muted/30 p-4 space-y-4">
          {/* Rating Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">التقييم الأدنى</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[filters.minRating]}
                onValueChange={([value]) => updateFilter("minRating", value)}
                max={5}
                step={0.5}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{filters.minRating}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
              </div>
            </div>
          </div>

          {/* Price Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              السعر الأقصى: {filters.maxPrice} ريال
            </Label>
            <Slider
              value={[filters.maxPrice]}
              onValueChange={([value]) => updateFilter("maxPrice", value)}
              max={500}
              step={10}
              className="flex-1"
            />
          </div>

          {/* Distance Filter */}
          {isLocationAvailable && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                المسافة: {filters.radius} كم
              </Label>
              <Slider
                value={[filters.radius]}
                onValueChange={([value]) => updateFilter("radius", value)}
                max={100}
                step={5}
                className="flex-1"
              />
            </div>
          )}

          {/* Services Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">الخدمات</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES_LIST.map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={service}
                    checked={filters.services.includes(service)}
                    onCheckedChange={() => toggleService(service)}
                  />
                  <Label
                    htmlFor={service}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {service}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ترتيب النتائج</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value: any) => updateFilter("sortBy", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} className="flex-1">
              تطبيق البحث
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
            <p className="text-sm text-muted-foreground text-center">
              جرب تعديل معايير البحث أو المرشحات
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {searchResults.map((barber) => (
              <Card
                key={barber.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectBarber(barber)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={barber.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {barber.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">
                          {barber.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          المستوى {barber.level}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        {getRatingStars(barber.rating || 0)}
                        <span className="text-sm text-muted-foreground mr-1">
                          ({barber.reviews_count || 0})
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {barber.distance && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getDistanceText(barber.distance)}
                          </div>
                        )}
                        {barber.price && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            من {barber.price} ريال
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {barber.level >= 50 ? "محترف" : "مبتدئ"}
                        </div>
                      </div>

                      {barber.services && barber.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {barber.services.slice(0, 3).map((service: any) => (
                            <Badge
                              key={service.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {service.name}
                            </Badge>
                          ))}
                          {barber.services.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{barber.services.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
