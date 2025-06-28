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
        <div className="flex-1 max-w-md mx-4">
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search crossings, find jam-free routes..."
                  className="pl-10 pr-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch(e);
                      setIsSearchOpen(false);
                    }
                  }}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Prevent closing when clicking inside the popover
                if (e.currentTarget.contains(e.target as Node)) {
                  e.preventDefault();
                }
              }}
            >
              <div
                className="p-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Search</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {/* Search Results */}
                {filteredSuggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Crossings</h4>
                    <div className="space-y-1">
                      {filteredSuggestions.map((crossing) => (
                        <Button
                          key={crossing.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-auto p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSuggestion(crossing.name);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <div className="text-left">
                              <div className="text-sm">{crossing.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {crossing.status} • Next train:{" "}
                                {crossing.trainETA}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Searches */}
                {!searchQuery && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Recent Searches
                    </h4>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSuggestion(search);
                          }}
                        >
                          <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                          {search}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {!searchQuery && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                    <div className="space-y-1">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.action();
                            setIsSearchOpen(false);
                          }}
                        >
                          <action.icon className="h-3 w-3 mr-2 text-muted-foreground" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {searchQuery && filteredSuggestions.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    No crossings found for "{searchQuery}"
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
                <span className="sr-only">View notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-3">
                <DropdownMenuLabel className="p-0">
                  Notifications
                </DropdownMenuLabel>
                {activeAlerts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="h-auto p-1 text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              {activeAlerts.length > 0 ? (
                activeAlerts.slice(0, 5).map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="flex flex-col items-start space-y-2 p-4 cursor-pointer"
                    onClick={() => handleNotificationClick(alert.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          alert.priority === "critical"
                            ? "bg-destructive"
                            : alert.priority === "high"
                              ? "bg-warning"
                              : alert.priority === "medium"
                                ? "bg-info"
                                : "bg-success"
                        }`}
                      ></div>
                      <span className="font-medium text-sm">
                        {alert.type === "train_approaching"
                          ? "Train approaching"
                          : alert.type === "maintenance"
                            ? "Maintenance"
                            : alert.type === "emergency"
                              ? "Emergency"
                              : "System alert"}{" "}
                        - {alert.crossing}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {alert.eta}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Priority: {alert.priority}
                    </p>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No active notifications
                </div>
              )}
              {activeAlerts.length > 5 && (
                <DropdownMenuItem
                  className="text-center text-sm text-muted-foreground"
                  onClick={() => (window.location.href = "/alerts")}
                >
                  View all {activeAlerts.length} notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
