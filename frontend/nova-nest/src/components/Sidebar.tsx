import React from "react";
import { BarChart3, Train, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
}

const navigationItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        icon: BarChart3,
        href: "/",
        active: true,
        badge: null,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Traffic Jams",
        icon: Train,
        href: "/crossings",
        active: false,
        badge: "24",
        description: "Railway crossings with detected traffic jams",
      },
      {
        title: "Jam Alerts",
        icon: AlertTriangle,
        href: "/alerts",
        active: false,
        badge: "3",
        description: "Real-time traffic jam alerts at crossings",
      },
      {
        title: "Smart Routes",
        icon: Activity,
        href: "/reroutes",
        active: false,
        badge: "7",
        description: "AI-powered routes avoiding traffic jams",
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      {/* Logo section */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 bg-sidebar-primary rounded-lg">
          <Train className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            RailSentry
          </h1>
          <p className="text-xs text-sidebar-foreground/70">
            Smart Traffic Jam Detection & Rerouting
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-6 text-blue-700">
        <nav className="space-y-6 px-3">
          {navigationItems.map((section, sectionIndex) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div
                    key={item.href}
                    className={cn(
                      "w-full p-3 rounded-lg border",
                      item.active
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-blue-50/50 border-blue-100 hover:bg-blue-50 text-blue-700",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-sidebar-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-sidebar-foreground">
                            {item.title}
                          </span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="bg-sidebar-primary/10 text-sidebar-primary text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-sidebar-foreground/70 mt-1">
                          {(item as any).description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {sectionIndex < navigationItems.length - 1 && (
                <Separator className="mt-4 bg-sidebar-border" />
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};
