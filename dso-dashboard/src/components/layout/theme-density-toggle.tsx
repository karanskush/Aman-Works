"use client";

import { useDashboard, type Density } from "@/context/dashboard-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Moon, Sun, Rows3, Rows2, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";

const DENSITY_OPTIONS: { value: Density; icon: typeof Rows3; label: string }[] = [
  { value: "compact", icon: Rows4, label: "Compact" },
  { value: "default", icon: Rows3, label: "Default" },
  { value: "comfortable", icon: Rows2, label: "Comfortable" },
];

export function ThemeDensityToggle() {
  const { theme, toggleTheme, density, setDensity } = useDashboard();

  return (
    <div className="flex items-center gap-1">
      {/* Density picker */}
      <div className="hidden md:inline-flex items-center rounded-md border border-border bg-card p-0.5">
        {DENSITY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = density === opt.value;
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setDensity(opt.value)}
                  className={cn(
                    "inline-flex h-6 w-7 items-center justify-center rounded transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
                  )}
                  aria-label={`Density: ${opt.label}`}
                  aria-pressed={active}
                >
                  <Icon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{opt.label} density</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Theme */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Switch to {theme === "dark" ? "light" : "dark"} mode
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
