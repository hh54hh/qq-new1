export type ServiceCategory =
  | "barber"
  | "doctor"
  | "engineer"
  | "teacher"
  | "chef";

export interface ServiceCategoryConfig {
  id: ServiceCategory;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
  fields: {
    profession: string;
    specialization?: string;
    workplace?: string;
  };
}

export const SERVICE_CATEGORIES: Record<
  ServiceCategory,
  ServiceCategoryConfig
> = {
  barber: {
    id: "barber",
    nameAr: "حلاق",
    nameEn: "Barber",
    icon: "✂️",
    color: "from-amber-500 to-orange-600",
    gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    description: "خدمات الحلاقة و��لعناية بالشعر",
    fields: {
      profession: "حلاق",
      specialization: "حلاقة كلاسيكية، حلاقة عصرية، تشذيب اللحية",
      workplace: "صالون حلاقة",
    },
  },
  doctor: {
    id: "doctor",
    nameAr: "طبيب",
    nameEn: "Doctor",
    icon: "🩺",
    color: "from-blue-500 to-cyan-600",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    description: "الخدمات الطبية والرعاية الصحية",
    fields: {
      profession: "طبيب",
      specialization: "طب عام، أسنان، جلدية، أطفال",
      workplace: "مستشفى، عيادة خاصة",
    },
  },
  engineer: {
    id: "engineer",
    nameAr: "مهندس",
    nameEn: "Engineer",
    icon: "⚙️",
    color: "from-green-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-green-500 to-emerald-600",
    description: "الخدمات الهندسية والتقنية",
    fields: {
      profession: "مهندس",
      specialization: "مدني، كهرباء، ميكانيكا، برمجيات",
      workplace: "شركة هندسية، مكتب استشاري",
    },
  },
  teacher: {
    id: "teacher",
    nameAr: "معلم",
    nameEn: "Teacher",
    icon: "📚",
    color: "from-purple-500 to-violet-600",
    gradient: "bg-gradient-to-br from-purple-500 to-violet-600",
    description: "الخدمات التعليمية والتدريس",
    fields: {
      profession: "معلم",
      specialization: "رياضيات، علوم، لغة عربية، إنجليزية",
      workplace: "مدرسة، مركز تعليمي",
    },
  },
  chef: {
    id: "chef",
    nameAr: "طباخ",
    nameEn: "Chef",
    icon: "👨‍🍳",
    color: "from-red-500 to-pink-600",
    gradient: "bg-gradient-to-br from-red-500 to-pink-600",
    description: "خدمات الطبخ والضيافة",
    fields: {
      profession: "طباخ",
      specialization: "مأكولات شرقية، غربية، حلويات",
      workplace: "مطعم، فندق، منزل",
    },
  },
};

export const getServiceCategoryConfig = (
  category: ServiceCategory,
): ServiceCategoryConfig => {
  return SERVICE_CATEGORIES[category];
};

export const getAllServiceCategories = (): ServiceCategoryConfig[] => {
  return Object.values(SERVICE_CATEGORIES);
};

export const getServiceCategoryName = (category: ServiceCategory): string => {
  return SERVICE_CATEGORIES[category]?.nameAr || category;
};

export const getServiceCategoryIcon = (category: ServiceCategory): string => {
  return SERVICE_CATEGORIES[category]?.icon || "👤";
};

export const getServiceCategoryColor = (category: ServiceCategory): string => {
  return SERVICE_CATEGORIES[category]?.color || "from-gray-500 to-gray-600";
};

// Map legacy barber role to new service category system
export const mapUserRoleToServiceCategory = (role: string): ServiceCategory => {
  switch (role) {
    case "barber":
      return "barber";
    default:
      return "barber"; // Default fallback
  }
};

// Get user's display role based on service category
export const getUserDisplayRole = (
  user: User,
  serviceCategory?: ServiceCategory,
): string => {
  // If user has service_category field, use it
  if ("service_category" in user && user.service_category) {
    return getServiceCategoryName(user.service_category as ServiceCategory);
  }

  // If serviceCategory is provided, use it
  if (serviceCategory) {
    return getServiceCategoryName(serviceCategory);
  }

  // Fallback to legacy role mapping
  switch (user.role) {
    case "barber":
      return "حلاق";
    case "customer":
      return "زبون";
    case "admin":
      return "مدير";
    default:
      return user.role;
  }
};
