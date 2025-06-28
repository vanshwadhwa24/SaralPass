import React, { useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  MapPin,
  Train,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusIndicator } from "./StatusIndicator";
import { MapView } from "./MapView";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

// Status mapping for the StatusIndicator component
const mapAlertStatus = (status: string) => {
  switch (status) {
    case "resolved":
      return "clear";
    case "scheduled":
      return "pending";
    case "train_approaching":
      return "active";
    default:
      return status as any;
  }
};

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "REFRESH_DATA" });
      dispatch({ type: "UPDATE_STATS" });
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefreshData = () => {
    dispatch({ type: "SET_LOADING", payload: true });

    // Show loading state
    toast.info("Refreshing all data...", { duration: 1000 });

    setTimeout(() => {
      // Refresh all data sources
      dispatch({ type: "REFRESH_DATA" });
      dispatch({ type: "UPDATE_STATS" });

      // Simulate auto-updating alerts based on crossing status
      const activeCrossings = state.crossings.filter(
        (c) => c.status === "active",
      );

      // Auto-resolve old alerts and create new ones based on current status
      state.alerts.forEach((alert) => {
        if (
          alert.status === "active" &&
          !activeCrossings.some((c) => c.name === alert.crossing)
        ) {
          dispatch({ type: "RESOLVE_ALERT", payload: alert.id });
        }
      });

      // Create new alerts for newly active crossings
      activeCrossings.forEach((crossing) => {
        const existingAlert = state.alerts.find(
          (a) => a.crossing === crossing.name && a.status === "active",
        );

        if (!existingAlert) {
          dispatch({
            type: "CREATE_ALERT",
            payload: {
              crossing: crossing.name,
              type: "train_approaching" as any,
              status: "active" as any,
              eta: crossing.trainETA,
              priority:
                crossing.severity === "critical"
                  ? "critical"
                  : crossing.severity === "high"
                    ? "high"
                    : ("medium" as any),
            },
          });
        }
      });

      dispatch({ type: "SET_LOADING", payload: false });

      const refreshedData = {
        crossings: state.crossings.length,
        activeAlerts: state.alerts.filter((a) => a.status === "active").length,
        timestamp: new Date().toLocaleTimeString(),
      };

      toast.success("Traffic jam detection updated", {
        description: `Scanned ${refreshedData.crossings} crossings for traffic jams and updated ${refreshedData.activeAlerts} alerts at ${refreshedData.timestamp}`,
      });

      console.log("🔄 Data Refresh Complete:", refreshedData);
    }, 1500);
  };

  const handleViewCrossingDetails = (crossingId: number) => {
    dispatch({ type: "SET_SELECTED_CROSSING", payload: crossingId });
    toast.info("Viewing crossing information");
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Jam-Free Routes
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {state.reroutes.filter((r) => r.active).length}
            </div>
            <p className="text-xs text-purple-600">
              Smart routes avoiding traffic jams
            </p>
            <div className="mt-3 space-y-1">
              {state.reroutes
                .filter((r) => r.active)
                .slice(0, 2)
                .map((route) => (
                  <div
                    key={route.id}
                    className="text-xs text-purple-700 bg-purple-100 rounded px-2 py-1"
                  >
                    {route.name} - Saves {route.estimatedDelay}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              Your Route Status
            </CardTitle>
            <MapPin className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-900">
              {state.selectedCrossing
                ? state.crossings.find((c) => c.id === state.selectedCrossing)
                    ?.name || "Main St & Railway Ave"
                : "Main St & Railway Ave"}
            </div>
            <p className="text-xs text-emerald-600 mb-2">
              {state.selectedCrossing &&
              state.crossings.find((c) => c.id === state.selectedCrossing)
                ?.status === "active"
                ? "⚠️ Traffic jam detected - reroute recommended"
                : "✅ Clear route ahead"}
            </p>
            <div className="bg-emerald-100 rounded-lg p-2 mt-2">
              <div className="text-xs text-emerald-600 font-medium">
                {state.selectedCrossing &&
                state.crossings.find((c) => c.id === state.selectedCrossing)
                  ?.status === "active"
                  ? "Time to Clear"
                  : "Next Train"}
              </div>
              <div className="text-xl font-bold text-emerald-900">
                {state.selectedCrossing
                  ? state.crossings.find((c) => c.id === state.selectedCrossing)
                      ?.trainETA || "2 min"
                  : "2 min"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              System Status
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">Live</div>
            <p className="text-xs text-blue-600">Real-time monitoring active</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-700">
                All systems operational
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={handleRefreshData}
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Map View */}
      <MapView />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-rose-50 to-pink-100 border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <Activity className="h-5 w-5 text-rose-600" />
              Traffic Jam Alerts
            </CardTitle>
            <CardDescription className="text-rose-600">
              Real-time traffic jam detection at railway crossings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between space-y-0"
              >
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none">
                    {alert.crossing}
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusIndicator
                      status={mapAlertStatus(alert.status)}
                      size="sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      {alert.eta}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {state.alerts.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No active alerts
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crossing Status */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <MapPin className="h-5 w-5 text-indigo-600" />
              Traffic Jam Monitor
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Live traffic jam detection and smart rerouting recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {state.crossings.map((crossing, index) => (
                <div key={crossing.id}>
                  <div className="space-y-3 p-6 rounded-2xl border border-border bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                    {/* Header with crossing name and status */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold">
                        {crossing.name}
                      </h4>
                      <StatusIndicator
                        status={crossing.status as any}
                        size="sm"
                      />
                    </div>

                    {/* Train timing information - prominently displayed */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50">
                        <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold">
                          Next Train
                        </div>
                        <div className="text-2xl font-bold text-blue-900 mt-2">
                          {crossing.trainETA}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-4 border border-amber-200/50">
                        <div className="text-xs text-amber-600 uppercase tracking-wide font-semibold">
                          Expected Delay
                        </div>
                        <div className="text-2xl font-bold text-amber-900 mt-2">
                          {crossing.avgDelay}
                        </div>
                      </div>
                    </div>

                    {/* Last updated info */}
                    <div className="text-xs text-slate-500 text-center pt-3 border-t border-slate-200/60">
                      Last updated: {crossing.lastUpdated.toLocaleTimeString()}
                    </div>
                  </div>
                  {index < state.crossings.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
