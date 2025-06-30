import React, { useEffect, useState } from "react";
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

// Helper function to convert minutes to hours and minutes format
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

// Helper to check a crossing for closure
const checkCrossingAlert = async (crossing) => {
  const lat = crossing.geometry?.coordinates?.[1];
  const lon = crossing.geometry?.coordinates?.[0];
  if (lat && lon) {
    try {
      const res = await fetch(`/crossing-alert?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {}
  }
  return { error: 'No data' };
};

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [routeData, setRouteData] = useState<any>(null);
  const [crossings, setCrossings] = useState<any[]>([]);
  const [loadingCrossings, setLoadingCrossings] = useState(false);
  const [crossingsError, setCrossingsError] = useState<string | null>(null);
  const [crossingAlerts, setCrossingAlerts] = useState<Record<string, any>>({});
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [checkedCrossings, setCheckedCrossings] = useState<Record<string, boolean>>({});

  // Fetch up to 5 nearest crossings within 15km of user location
  useEffect(() => {
    const fetchCrossings = async () => {
      setLoadingCrossings(true);
      setCrossingsError(null);
      try {
        // Get user location from localStorage (set by map)
        const locationStr = localStorage.getItem('mapLocationData');
        if (!locationStr) {
          setCrossings([]);
          setLoadingCrossings(false);
          return;
        }
        const location = JSON.parse(locationStr);
        const lat = location.lat;
        const lon = location.lng;
        if (!lat || !lon) {
          setCrossings([]);
          setLoadingCrossings(false);
          return;
        }
        // Fetch from backend
        const res = await fetch(`/crossings/nearby?lat=${lat}&lon=${lon}&radius=15`);
        if (!res.ok) throw new Error('Failed to fetch crossings');
        const data = await res.json();
        setCrossings(data.crossings.slice(0, 5));
      } catch (err: any) {
        setCrossingsError(err.message || 'Error fetching crossings');
        setCrossings([]);
      } finally {
        setLoadingCrossings(false);
      }
    };
    fetchCrossings();
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "REFRESH_DATA" });
      dispatch({ type: "UPDATE_STATS" });
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRouteDataChange = (data: any) => {
    setRouteData(data);
  };

  // Listen for route data from map
  useEffect(() => {
    const checkForRouteData = () => {
      try {
        const storedRoute = localStorage.getItem('mapRouteData');
        if (storedRoute) {
          const parsedRoute = JSON.parse(storedRoute);
          setRouteData(parsedRoute);
        }
      } catch (error) {
        console.error('Error parsing route data:', error);
      }
    };

    // Check immediately
    checkForRouteData();

    // Set up interval to check for new route data
    const interval = setInterval(checkForRouteData, 1000);

    // Listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mapRouteData' && e.newValue) {
        try {
          const parsedRoute = JSON.parse(e.newValue);
          setRouteData(parsedRoute);
        } catch (error) {
          console.error('Error parsing route data from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleRefreshData = () => {
    setLoadingCrossings(true);
    setCrossingsError(null);
    setCrossings([]);
    setCrossingAlerts({});
    setLoadingAlerts(true);

    // Re-fetch user location and crossings
    const fetchCrossings = async () => {
      try {
        const locationStr = localStorage.getItem('mapLocationData');
        if (!locationStr) {
          setCrossings([]);
          setLoadingCrossings(false);
          setLoadingAlerts(false);
          toast.success('Data refreshed successfully.');
          return;
        }
        const location = JSON.parse(locationStr);
        const lat = location.lat;
        const lon = location.lng;
        if (!lat || !lon) {
          setCrossings([]);
          setLoadingCrossings(false);
          setLoadingAlerts(false);
          toast.success('Data refreshed successfully.');
          return;
        }
        const res = await fetch(`/crossings/nearby?lat=${lat}&lon=${lon}&radius=15`);
        if (!res.ok) throw new Error('Failed to fetch crossings');
        const data = await res.json();
        const newCrossings = data.crossings.slice(0, 5);
        setCrossings(newCrossings);

        // Re-fetch live status for each crossing
        const results: Record<string, any> = {};
        await Promise.all(
          newCrossings.map(async (crossing) => {
            const lat = crossing.geometry?.coordinates?.[1];
            const lon = crossing.geometry?.coordinates?.[0];
            if (lat && lon) {
              try {
                const res = await fetch(`/crossing-alert?lat=${lat}&lon=${lon}`);
                if (res.ok) {
                  const data = await res.json();
                  results[crossing.properties?.id || crossing.id] = data;
                } else {
                  results[crossing.properties?.id || crossing.id] = { error: 'No data' };
                }
              } catch {
                results[crossing.properties?.id || crossing.id] = { error: 'No data' };
              }
            }
          })
        );
        setCrossingAlerts(results);
        toast.success('Data refreshed successfully.');
      } catch (err: any) {
        setCrossingsError(err.message || 'Error fetching crossings');
        setCrossings([]);
        setCrossingAlerts({});
        toast.error('Error refreshing data.');
      } finally {
        setLoadingCrossings(false);
        setLoadingAlerts(false);
      }
    };
    fetchCrossings();
  };

  const handleViewCrossingDetails = (crossingId: number) => {
    dispatch({ type: "SET_SELECTED_CROSSING", payload: crossingId });
    toast.info("Viewing crossing information");
  };

  // Progressive checking logic
  useEffect(() => {
    if (!crossings.length) return;
    let cancelled = false;
    setCheckedCrossings({});

    // Check the first crossing immediately
    (async () => {
      const crossing = crossings[0];
      const crossingId = crossing.properties?.id || crossing.id || 0;
      const alert = await checkCrossingAlert(crossing);
      setCrossingAlerts((prev) => ({ ...prev, [crossingId]: alert }));
      setCheckedCrossings((prev) => ({ ...prev, [crossingId]: true }));
      if (alert.willClose) {
        toast.warning(`Train approaching first crossing! ETA: ${alert.eta ? new Date(alert.eta).toLocaleTimeString() : 'Soon'}. Consider rerouting.`);
      }
    })();

    // Check the rest in the background
    crossings.slice(1).forEach((crossing, idx) => {
      const crossingId = crossing.properties?.id || crossing.id || idx + 1;
      setTimeout(async () => {
        if (cancelled) return;
        const alert = await checkCrossingAlert(crossing);
        setCrossingAlerts((prev) => ({ ...prev, [crossingId]: alert }));
        setCheckedCrossings((prev) => ({ ...prev, [crossingId]: true }));
        if (alert.willClose) {
          toast.warning(`Train approaching crossing #${idx + 2}! ETA: ${alert.eta ? new Date(alert.eta).toLocaleTimeString() : 'Soon'}. Consider rerouting.`);
        }
      }, 2000 * (idx + 1)); // 2s delay between each
    });

    return () => { cancelled = true; };
  }, [crossings]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              Your Route Status
            </CardTitle>
            <MapPin className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-900">
              {routeData ? routeData.destinationName : "No data"}
            </div>
            <p className="text-xs text-emerald-600 mb-2">
              {routeData ? "📍 Route from map" : "No route selected"}
            </p>
            <div className="bg-emerald-100 rounded-lg p-2 mt-2">
              <div className="text-xs text-emerald-600 font-medium">
                ETA
              </div>
              <div className="text-xl font-bold text-emerald-900">
                {routeData ? formatDuration(routeData.duration) : "No data"}
              </div>
              {routeData && (
                <div className="text-xs text-emerald-600 mt-1">
                  Distance: {routeData.distance} km
                </div>
              )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crossing Status */}
        <Card className="lg:col-span-3 bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <MapPin className="h-5 w-5 text-indigo-600" />
              Railway Crossings Monitor
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Nearby crossings' status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCrossings ? (
              <div className="text-center text-indigo-600 py-8">Loading crossings...</div>
            ) : crossingsError ? (
              <div className="text-center text-red-600 py-8">{crossingsError}</div>
            ) : crossings.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No crossings found within 15 km of your location.</div>
            ) : (
              <div className="space-y-4">
                {crossings.map((crossing, index) => {
                  const crossingId = crossing.properties?.id || crossing.id || index;
                  const alert = crossingAlerts[crossingId];
                  return (
                    <div key={crossingId}>
                      <div className="space-y-3 p-6 rounded-2xl border border-border bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Header with crossing name and status */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold">
                            {crossing.properties?.name
                              ? crossing.properties.name
                              : `Crossing at (${crossing.geometry?.coordinates?.[1]?.toFixed(5)}, ${crossing.geometry?.coordinates?.[0]?.toFixed(5)})`}
                          </h4>
                          {crossing.status && (
                            <StatusIndicator status={crossing.status as any} size="sm" />
                          )}
                        </div>
                        {!crossing.properties?.name && (
                          <div className="text-xs text-slate-500 mt-2">
                            Lat: {crossing.geometry?.coordinates?.[1]?.toFixed(5)},
                            Lon: {crossing.geometry?.coordinates?.[0]?.toFixed(5)}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50">
                            <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold">
                              ETA
                            </div>
                            <div className="text-2xl font-bold text-blue-900 mt-2">
                              {!checkedCrossings[crossingId] ? (
                                <span className="animate-pulse text-blue-400">Checking...</span>
                              ) : alert && alert.eta ? (
                                new Date(alert.eta).toLocaleTimeString()
                              ) : (
                                'No data'
                              )}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-4 border border-amber-200/50">
                            <div className="text-xs text-amber-600 uppercase tracking-wide font-semibold">
                              Delay
                            </div>
                            <div className="text-2xl font-bold text-amber-900 mt-2">
                              {!checkedCrossings[crossingId] ? (
                                <span className="animate-pulse text-amber-400">Checking...</span>
                              ) : alert && alert.delay ? (
                                `${alert.delay} min`
                              ) : (
                                'No data'
                              )}
                            </div>
                          </div>
                        </div>
                        {/* ETA/Delay info */}
                        <div className="mt-3">
                          {loadingAlerts ? (
                            <span className="text-xs text-blue-600">Checking train status...</span>
                          ) : alert ? (
                            alert.willClose ? (
                              <span className="text-xs text-red-600 font-semibold">Train approaching! ETA: {alert.eta ? new Date(alert.eta).toLocaleTimeString() : 'Soon'}</span>
                            ) : (
                              <span className="text-xs text-green-700">No train expected to close this crossing soon.</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">No data</span>
                          )}
                        </div>
                        {/* Last updated info (if available) */}
                        {crossing.lastUpdated && (
                          <div className="text-xs text-slate-500 text-center pt-3 border-t border-slate-200/60">
                            Last updated: {crossing.lastUpdated.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      {index < crossings.length - 1 && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
