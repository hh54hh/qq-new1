import { User } from "@shared/api";

interface BarberDashboardProps {
  user: User;
  activeTab: string;
  onLogout?: () => void;
}

export default function BarberDashboard({
  user,
  activeTab,
  onLogout,
}: BarberDashboardProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          قيد التطوير
        </h1>
        <p className="text-xl text-muted-foreground">
          نحن نعمل على تحسين التطبيق لتوفير أفضل تجربة ممكنة
        </p>
      </div>
    </div>
  );
}
