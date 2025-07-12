import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Star,
  Clock,
  Heart,
  Search,
  Filter,
  Users,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { User, CreateBookingRequest } from "@shared/api";
import {
  ServiceCategory,
  getServiceCategoryConfig,
  getUserDisplayRole,
} from "@shared/service-categories";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { getBarberCache, CachedBarber } from "@/lib/barber-cache";
import { getUltraFastBarberCache } from "@/lib/ultra-fast-barber-cache";
import { BarberSkeletonGrid } from "@/components/BarberSkeleton";
import { UltraFastSkeletonGrid } from "@/components/UltraFastSkeleton";
import { useLocation } from "@/hooks/use-location";

interface ServiceProvidersPageProps {
  user: User;
  category: ServiceCategory;
  onBack: () => void;
  onProviderSelect: (provider: any) => void;
  onBookingRequest: (provider: any) => void;
}

export default function ServiceProvidersPage({
  user,
  category,
  onBack,
  onProviderSelect,
  onBookingRequest,
}: ServiceProvidersPageProps) {
  const [state, store] = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [allProviders, setAllProviders] = useState<CachedBarber[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<CachedBarber[]>(
    [],
  );
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersFromCache, setProvidersFromCache] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    location: userLocation,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useLocation();
  const categoryConfig = getServiceCategoryConfig(category);

  // Ultra-fast provider loading (reusing barber loading logic for now)
  const loadProvidersUltraFast = async () => {
    const startTime = performance.now();
    console.log(`ULTRA-FAST ${category} loading initiated for user:`, user?.id);

    if (!user?.id) {
      console.error("No user ID provided");
      setProvidersLoading(false);
      return;
    }

    try {
      setShowSkeletons(true);
      const ultraCache = await getUltraFastBarberCache(user.id);

      // Get providers from cache
      const cacheResult = await ultraCache.getInstantBarbers();
      const cachedProviders = cacheResult.barbers;
      console.log(
        `✅ ULTRA-FAST: Loaded ${cachedProviders.length} ${category} providers from cache`,
      );

      if (cachedProviders.length > 0) {
        // Filter by category if needed (for now, only barbers are available)
        const categoryProviders = cachedProviders.filter((provider) => {
          // For barber category, show all barbers (legacy and new)
          if (category === "barber") {
            return (
              provider.role === "barber" ||
              provider.service_category === "barber"
            );
          }
          // For other categories, only show providers with matching service_category
          return provider.service_category === category;
        });

        setAllProviders(categoryProviders);
        setFilteredProviders(categoryProviders);
        setProvidersFromCache(true);

        // Background refresh using preload
        setTimeout(async () => {
          try {
            console.log(`🔄 Background refresh for ${category} providers...`);
            await ultraCache.preloadOnLogin();
            const refreshResult = await ultraCache.getInstantBarbers();
            const refreshedProviders = refreshResult.barbers;
            const refreshedCategoryProviders = refreshedProviders.filter(
              (provider) => {
                if (category === "barber") {
                  return (
                    provider.role === "barber" ||
                    provider.service_category === "barber"
                  );
                }
                return provider.service_category === category;
              },
            );

            setAllProviders(refreshedCategoryProviders);
            setFilteredProviders(refreshedCategoryProviders);
            console.log(`✅ Background refresh completed for ${category}`);
          } catch (error) {
            console.warn(
              `⚠️ Background refresh failed for ${category}:`,
              error,
            );
          }
        }, 1000);
      } else {
        // No cache, force refresh using preload
        console.log(`📱 No cache found for ${category}, forcing refresh...`);
        await ultraCache.preloadOnLogin();
        const freshResult = await ultraCache.getInstantBarbers();
        const freshProviders = freshResult.barbers;
        const freshCategoryProviders = freshProviders.filter((provider) => {
          if (category === "barber") {
            return (
              provider.role === "barber" ||
              provider.service_category === "barber"
            );
          }
          return provider.service_category === category;
        });

        setAllProviders(freshCategoryProviders);
        setFilteredProviders(freshCategoryProviders);
      }

      const endTime = performance.now();
      console.log(
        `⚡ ULTRA-FAST ${category} loading completed in ${(endTime - startTime).toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(`❌ Error loading ${category} providers:`, error);
      setAllProviders([]);
      setFilteredProviders([]);
    } finally {
      setProvidersLoading(false);
      setShowSkeletons(false);
    }
  };

  useEffect(() => {
    loadProvidersUltraFast();
  }, [user?.id, category]);

  // Search and filter logic
  useEffect(() => {
    if (!allProviders.length) return;

    const filtered = allProviders.filter((provider) => {
      const matchesSearch = provider.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setFilteredProviders(filtered);
    }, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [searchQuery, allProviders]);

  const handleProviderClick = (provider: CachedBarber) => {
    onProviderSelect(provider);
  };

  const handleBookProvider = (provider: CachedBarber) => {
    onBookingRequest(provider);
  };

  const handleFollowProvider = async (providerId: string) => {
    try {
      await apiClient.followUser(providerId);

      // Update local state
      setAllProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? { ...provider, isFollowed: true }
            : provider,
        ),
      );
      setFilteredProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? { ...provider, isFollowed: true }
            : provider,
        ),
      );

      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "تمت المتابعة",
        message: `بدأت بمتابعة ${filteredProviders.find((p) => p.id === providerId)?.name}`,
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error following provider:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "متاح":
        return "bg-green-100 text-green-700 border-green-200";
      case "مشغول":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "غير متاح":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}م`;
    }
    return `${distance.toFixed(1)}كم`;
  };

  if (providersLoading && showSkeletons) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoryConfig.icon}</span>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                {categoryConfig.nameAr}
              </h1>
            </div>
          </div>
        </div>
        <UltraFastSkeletonGrid />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              {categoryConfig.nameAr}
            </h1>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`ابحث في ${categoryConfig.nameAr}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 text-right"
            dir="rtl"
          />
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredProviders.length} م�� {categoryConfig.nameAr}
            {filteredProviders.length !== 1 ? "ين" : ""}
            {searchQuery && ` • نتائج البحث عن "${searchQuery}"`}
          </p>
          {providersFromCache && (
            <Badge variant="outline" className="text-xs">
              بيانات محفوظة
            </Badge>
          )}
        </div>

        {/* Providers Grid */}
        {filteredProviders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredProviders.map((provider) => (
              <Card
                key={provider.id}
                className="border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      onClick={() => handleProviderClick(provider)}
                    >
                      <AvatarImage src={provider.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {provider.name
                          ? provider.name.charAt(0)
                          : categoryConfig.icon}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                          onClick={() => handleProviderClick(provider)}
                        >
                          {provider.name}
                        </h4>
                        <span className="text-sm">
                          {getLevelIcon(provider.level)}
                        </span>
                        {provider.is_verified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {getUserDisplayRole(provider, category)}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{provider.rating}</span>
                        </div>
                        {provider.distance && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{formatDistance(provider.distance)}</span>
                          </div>
                        )}
                        <Badge
                          className={cn(
                            "text-xs",
                            getStatusColor(provider.status),
                          )}
                        >
                          {provider.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-xs"
                          onClick={() => handleBookProvider(provider)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          احجز
                        </Button>
                        {!provider.isFollowed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-3"
                            onClick={() => handleFollowProvider(provider.id)}
                          >
                            <Heart className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">{categoryConfig.icon}</div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery
                  ? "لا توجد نتائج"
                  : `لا يوجد ${categoryConfig.nameAr}ين متاحين`}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? `لم نجد أي ${categoryConfig.nameAr} يطابق "${searchQuery}"`
                  : `سنقوم بإضافة ${categoryConfig.nameAr}ين في هذه المنطقة قريباً`}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  مسح البحث
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
