import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Route,
  Maximize2,
  Layers,
  Navigation,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export const MapView: React.FC = () => {
  const { state, dispatch } = useApp();
  const [mapView, setMapView] = useState<"satellite" | "street" | "traffic">(
    "street",
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const handleCrossingClick = (crossingId: number) => {
    dispatch({ type: "SET_SELECTED_CROSSING", payload: crossingId });
    toast.info("Crossing selected");
  };

  const handleExpandMap = () => {
    // Create a fullscreen modal effect
    const mapElement = document.querySelector(".map-container");
    if (mapElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        toast.info("Exited fullscreen mode");
      } else {
        mapElement
          .requestFullscreen()
          .then(() => {
            toast.success("Map expanded to fullscreen");
          })
          .catch(() => {
            toast.info("Fullscreen not supported - opening in new window");
            window.open("/map", "_blank", "width=1200,height=800");
          });
      }
    }
  };

  const handleRefreshMap = () => {
    dispatch({ type: "REFRESH_DATA" });
    dispatch({ type: "UPDATE_STATS" });
    toast.success("Map data refreshed - latest crossing status updated");
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    const filteredCount =
      newFilter === "all"
        ? state.crossings.length
        : state.crossings.filter((c) => c.status === newFilter).length;
    toast.info(`Showing ${filteredCount} crossings with status: ${newFilter}`);
  };

  const handleMapViewChange = (newView: "satellite" | "street" | "traffic") => {
    setMapView(newView);
    toast.success(`Map view changed to ${newView} mode`);

    // Simulate different map styling based on view
    const mapContainer = document.querySelector(".map-background");
    if (mapContainer) {
      mapContainer.className = `map-background absolute inset-0 opacity-20 ${
        newView === "satellite"
          ? "satellite-view"
          : newView === "traffic"
            ? "traffic-view"
            : "street-view"
      }`;
    }
  };

  const filteredCrossings = state.crossings.filter((crossing) => {
    if (filterStatus === "all") return true;
    return crossing.status === filterStatus;
  });

  return (
    <Card className="h-[500px] bg-gradient-to-br from-green-50 to-teal-100 border-green-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Navigation className="h-5 w-5 text-green-600" />
            Live Traffic Jam Detection Map
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-28 h-8">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mapView} onValueChange={handleMapViewChange}>
              <SelectTrigger className="w-28 h-8">
                <Layers className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="street">Street</SelectItem>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="traffic">Traffic</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefreshMap}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExpandMap}>
              <Maximize2 className="h-3 w-3 mr-1" />
              Expand
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="map-container relative h-[400px] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden">
          {/* Mock map background with subtle grid pattern */}
          <div
            className={`map-background absolute inset-0 opacity-20 ${
              mapView === "satellite"
                ? "bg-gradient-to-br from-green-100 to-brown-100"
                : mapView === "traffic"
                  ? "bg-gradient-to-br from-red-50 to-yellow-50"
                  : "bg-gradient-to-br from-blue-50 to-blue-100"
            }`}
          >
            <div
              className={
                'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23cbd5e1" fill-opacity="0.3"%3E%3Ccircle cx="20" cy="20" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')] opacity-50'
              }
            ></div>
          </div>

          {/* Railway lines */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <pattern
                id="railway-pattern"
                patternUnits="userSpaceOnUse"
                width="8"
                height="4"
              >
                <rect width="8" height="2" fill="#64748b" opacity="0.7" />
                <rect y="2" width="8" height="2" fill="transparent" />
              </pattern>
            </defs>
            {/* Main railway line */}
            <path
              d="M30 80 Q150 120 270 160 T490 220"
              stroke="url(#railway-pattern)"
              strokeWidth="5"
              fill="none"
            />
            {/* Secondary railway line */}
            <path
              d="M80 40 Q200 80 320 120 T540 180"
              stroke="url(#railway-pattern)"
              strokeWidth="5"
              fill="none"
            />
          </svg>

          {/* Crossing markers */}
          {filteredCrossings.map((crossing, index) => (
            <TooltipProvider key={crossing.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 ${
                      state.selectedCrossing === crossing.id
                        ? "scale-125 z-10"
                        : ""
                    }`}
                    style={{
                      left: `${15 + index * 16}%`,
                      top: `${25 + Math.sin(index * 0.8) * 15}%`,
                    }}
                    onClick={() => handleCrossingClick(crossing.id)}
                  >
                    <div className="relative">
                      <div
                        className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all ${
                          crossing.status === "active"
                            ? "bg-warning animate-pulse"
                            : crossing.status === "maintenance"
                              ? "bg-destructive"
                              : "bg-success"
                        }`}
                      >
                        <MapPin className="h-3 w-3 text-white" />
                      </div>
                      {crossing.rerouteActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-info rounded-full border border-white">
                          <Route className="h-1.5 w-1.5 text-white m-0.5" />
                        </div>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-center">
                    <p className="font-medium text-xs">{crossing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {crossing.status} • ETA: {crossing.trainETA}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          {/* Legend */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-lg p-2 shadow-lg">
            <div className="text-xs font-medium mb-1">Status</div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-success rounded-full"></div>
                <span className="text-xs">Clear</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-warning rounded-full"></div>
                <span className="text-xs">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-destructive rounded-full"></div>
                <span className="text-xs">Maintenance</span>
              </div>
            </div>
          </div>

          {/* Selected crossing info */}
          {state.selectedCrossing && (
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg max-w-56">
              {(() => {
                const selected = state.crossings.find(
                  (c) => c.id === state.selectedCrossing,
                );
                return selected ? (
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{selected.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          selected.status === "active"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : selected.status === "maintenance"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : selected.status === "emergency"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-success/10 text-success border-success/20"
                        }`}
                      >
                        {selected.status}
                      </Badge>
                      {selected.rerouteActive && (
                        <Badge
                          variant="outline"
                          className="text-xs text-info border-info/50"
                        >
                          <Route className="h-2 w-2 mr-1" />
                          Reroute
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground">Next train:</div>
                      <div className="font-medium">{selected.trainETA}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground">Severity:</div>
                      <div
                        className={`font-medium capitalize ${
                          selected.severity === "critical"
                            ? "text-destructive"
                            : selected.severity === "high"
                              ? "text-warning"
                              : selected.severity === "medium"
                                ? "text-info"
                                : "text-success"
                        }`}
                      >
                        {selected.severity}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
