import React, { useState } from "react";
import { Bell, Search, Train, Menu, X, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Find crossing by name
      const crossing = state.crossings.find((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (crossing) {
        dispatch({ type: "SET_SELECTED_CROSSING", payload: crossing.id });
        toast.success(`Found crossing: ${crossing.name}`);
        setSearchQuery("");
      } else {
        toast.error("Crossing not found");
      }
    }
  };

  const activeAlerts = state.alerts.filter(
    (alert) => alert.status === "active",
  );
  const unreadNotifications = activeAlerts.length;

  const handleNotificationClick = (alertId: number) => {
    const alert = state.alerts.find((a) => a.id === alertId);
    if (alert) {
      dispatch({
        type: "SET_SELECTED_CROSSING",
        payload:
          state.crossings.find((c) => c.name === alert.crossing)?.id || null,
      });
      toast.info(`Viewing alert for ${alert.crossing}`);
    }
  };

  const handleMarkAllRead = () => {
    activeAlerts.forEach((alert) => {
      if (alert.status === "active" && alert.type !== "emergency") {
        dispatch({ type: "RESOLVE_ALERT", payload: alert.id });
      }
    });
    toast.success("All non-emergency alerts marked as read");
  };

  const filteredSuggestions = searchQuery.trim()
    ? state.crossings
        .filter((crossing) =>
          crossing.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  const recentSearches = [
    "Main St & Railway Ave",
    "Oak St Crossing",
    "Industrial Blvd",
  ];

  const handleSelectSuggestion = (crossingName: string) => {
    const crossing = state.crossings.find((c) => c.name === crossingName);
    if (crossing) {
      dispatch({ type: "SET_SELECTED_CROSSING", payload: crossing.id });
      toast.success(`Selected: ${crossing.name}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const quickActions = [
    {
      label: "View All Crossings",
      action: () => (window.location.href = "/crossings"),
      icon: MapPin,
    },
    {
      label: "View Active Alerts",
      action: () => (window.location.href = "/alerts"),
      icon: Bell,
    },
    {
      label: "Check Train Schedule",
      action: () => (window.location.href = "/schedule"),
      icon: Clock,
    },
  ];
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {/* Logo and brand */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
              <Train className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RailSentry
              </h1>
              <p className="text-xs text-slate-600">
                Smart Traffic Jam Detection & Rerouting
              </p>
            </div>
          </div>
        </div>

        {/* Search bar with dropdown */}
        {/* Removed search bar from dashboard header */}

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {/* Removed notification bell and dropdown */}
        </div>
      </div>
    </header>
  );
};
