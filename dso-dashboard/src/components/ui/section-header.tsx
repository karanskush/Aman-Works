import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconColor?: string;
}

export function SectionHeader({ icon: Icon, title, subtitle, iconColor = "text-accent-blue" }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("p-2 rounded-xl bg-accent-blue/10", iconColor === "text-accent-green" && "bg-accent-green/10", iconColor === "text-accent-amber" && "bg-accent-amber/10", iconColor === "text-accent-purple" && "bg-accent-purple/10")}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
