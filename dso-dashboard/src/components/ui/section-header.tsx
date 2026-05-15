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
    <div className="flex items-center gap-2.5 mb-3">
      <Icon className={cn("h-4 w-4", iconColor)} />
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground truncate">
          {title}
        </h2>
        {subtitle && (
          <>
            <span className="text-border" aria-hidden>·</span>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </>
        )}
      </div>
    </div>
  );
}
