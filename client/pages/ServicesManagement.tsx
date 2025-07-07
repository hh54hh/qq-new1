import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Scissors,
  ArrowRight,
} from "lucide-react";
import { User } from "@shared/api";
import { DbBarberService } from "@shared/database";
import apiClient from "@/lib/api";
import { useAppStore } from "@/lib/store";

interface ServicesManagementProps {
  user: User;
  onBack: () => void;
}

interface ServiceFormData {
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
}

const serviceCategories = [
  "قص شعر",
  "حلاقة لحية",
  "تصفيف",
  "علاج",
  "مناسبات",
  "أطفال",
  "��قليدي",
  "أخرى",
];

const durationOptions = [
  { value: 15, label: "15 دقيقة" },
  { value: 30, label: "30 دقيقة" },
  { value: 45, label: "45 دقيقة" },
  { value: 60, label: "ساعة" },
  { value: 90, label: "سا��ة ونصف" },
  { value: 120, label: "ساعتان" },
];

export default function ServicesManagement({
  user,
  onBack,
}: ServicesManagementProps) {
  const [state, store] = useAppStore();
  const [services, setServices] = useState<
    (DbBarberService & { category?: string })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<DbBarberService | null>(
    null,
  );
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    price: 0,
    duration_minutes: 30,
    category: "قص شعر",
    is_active: true,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      // Load services from API
      const response = await apiClient.getBarberServices();
      setServices(response.services);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (editingService) {
        // Update existing service
        const response = await apiClient.updateService(
          editingService.id,
          formData,
        );
        if (response.success) {
          setServices((prev) =>
            prev.map((s) =>
              s.id === editingService.id ? response.service : s,
            ),
          );
        }
      } else {
        // Create new service
        const response = await apiClient.createService(formData);
        if (response.success) {
          setServices((prev) => [...prev, response.service]);
        }
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: 0,
        duration_minutes: 30,
        category: "قص شعر",
        is_active: true,
      });
      setEditingService(null);

      // Add success notification
      store.addNotification({
        id: Date.now().toString(),
        type: "success",
        title: editingService ? "تم تحديث الخدمة" : "تم إضافة خدمة جديدة",
        message: editingService
          ? "تم تحديث الخدمة بنجاح"
          : "تم إضافة الخدمة الجديدة بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
      setShowDialog(false);

      // Update user points
      if (!editingService) {
        const updatedUser = { ...user, points: user.points + 2 };
        store.setUser(updatedUser);
      }
    } catch (error) {
      console.error("Error saving service:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (service: DbBarberService & { category?: string }) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price,
      duration_minutes: service.duration_minutes,
      category: service.category || "قص شعر",
      is_active: service.is_active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm("هل أنت م��أكد من حذف هذه الخدمة؟")) {
      try {
        const response = await apiClient.deleteService(serviceId);
        if (response.success) {
          setServices((prev) => prev.filter((s) => s.id !== serviceId));

          store.addNotification({
            id: Date.now().toString(),
            type: "success",
            title: "تم حذف الخدمة",
            message: "تم حذف الخدمة بنجاح",
            data: null,
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error deleting service:", error);
        store.addNotification({
          id: Date.now().toString(),
          type: "error",
          title: "خطأ في الحذف",
          message: "حدث خطأ أثناء حذف الخدمة",
          data: null,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  const toggleServiceStatus = async (serviceId: string, isActive: boolean) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, is_active: isActive } : s)),
    );
  };

  const formatPrice = (price: number) => {
    return (price / 1000).toLocaleString("ar-SA") + " ألف د.ع";
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "قص شعر": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "حلاقة لحية": "bg-green-500/10 text-green-500 border-green-500/20",
      تصفيف: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      علاج: "bg-red-500/10 text-red-500 border-red-500/20",
      مناسبات: "bg-golden-500/10 text-golden-500 border-golden-500/20",
      أطفال: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      تقليدي: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
    return (
      colors[category] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
    );
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
            <h1 className="text-lg font-bold text-foreground">إدارة الخدمات</h1>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setEditingService(null);
                  setFormData({
                    name: "",
                    description: "",
                    price: 0,
                    duration_minutes: 30,
                    category: "قص شعر",
                    is_active: true,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                إضافة خدمة
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? "تعديل خدمة" : "إضافة خدمة جديدة"}
                </DialogTitle>
                <DialogDescription>
                  أضف خدمة جديدة إلى قائمة خدماتك المتاحة
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الخدمة</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="مثال: قص شعر عادي"
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">الفئة</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر (د.ع)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: Number(e.target.value),
                        }))
                      }
                      placeholder="25000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">المدة</Label>
                    <Select
                      value={formData.duration_minutes.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration_minutes: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="وصف تفصيلي للخدمة..."
                    className="text-right min-h-[80px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="active">متاح لل��جز</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.name || isLoading}
                >
                  {isLoading
                    ? "جاري الحفظ..."
                    : editingService
                      ? "تحديث"
                      : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <Scissors className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {services.length}
              </p>
              <p className="text-sm text-muted-foreground">إجمالي الخدمات</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {services.filter((s) => s.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">خدمات نشطة</p>
            </CardContent>
          </Card>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            قائمة الخدمات
          </h3>

          {services.map((service) => (
            <Card key={service.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-foreground">
                        {service.name}
                      </h4>
                      <Badge
                        className={getCategoryColor(service.category || "")}
                      >
                        {service.category}
                      </Badge>
                      {!service.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          غير نشط
                        </Badge>
                      )}
                    </div>

                    {service.description && (
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-500">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatPrice(service.price)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration_minutes} دقيقة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={(checked) =>
                        toggleServiceStatus(service.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(service.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {services.length === 0 && !isLoading && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  لا توجد خدمات بعد
                </h3>
                <p className="text-muted-foreground mb-4">
                  أضف خدماتك الأولى لتبدأ في استقبال الحجوزات
                </p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة خدمة جديدة
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
