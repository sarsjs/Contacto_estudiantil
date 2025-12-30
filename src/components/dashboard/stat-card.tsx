import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  color?: "primary" | "success" | "warning" | "error" | "info";
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-foreground tracking-tighter">{value}</h3>
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
        )}

        {/* Subtle background icon */}
        <Icon className="absolute -right-2 -bottom-2 h-16 w-16 text-muted/20 -rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
      </CardContent>
    </Card>
  );
}
