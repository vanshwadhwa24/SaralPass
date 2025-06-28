import React, { createContext, useContext, useReducer, ReactNode } from "react";

// Types
export interface CrossingData {
  id: number;
  name: string;
  status: "active" | "clear" | "maintenance" | "emergency";
  trainETA: string;
  rerouteActive: boolean;
  avgDelay: string;
  lastUpdated: Date;
  coordinates: { lat: number; lng: number };
  severity: "low" | "medium" | "high" | "critical";
}

export interface AlertData {
  id: number;
  crossing: string;
  type: "train_approaching" | "maintenance" | "emergency" | "system_alert";
  status: "active" | "resolved" | "scheduled" | "pending";
  eta: string;
  timestamp: Date;
  priority: "low" | "medium" | "high" | "critical";
}

export interface RerouteData {
  id: number;
  name: string;
  active: boolean;
  affectedCrossings: string[];
  vehicleCount: number;
  estimatedDelay: string;
  createdAt: Date;
  reason: string;
}

export interface AppState {
  crossings: CrossingData[];
  alerts: AlertData[];
  reroutes: RerouteData[];
  selectedCrossing: number | null;
  isLoading: boolean;
  filters: {
    crossingStatus: string;
    alertType: string;
    timeRange: string;
  };
  stats: {
    activeCrossings: number;
    totalCrossings: number;
    activeReroutes: number;
  };
}

// Initial state
const initialState: AppState = {
  crossings: [
    {
      id: 1,
      name: "Main St & Railway Ave",
      status: "active",
      trainETA: "2 min",
      rerouteActive: true,
      avgDelay: "4.2 min",
      lastUpdated: new Date(),
      coordinates: { lat: 40.7128, lng: -74.006 },
      severity: "high",
    },
    {
      id: 2,
      name: "Oak St Crossing",
      status: "maintenance",
      trainETA: "N/A",
      rerouteActive: true,
      avgDelay: "N/A",
      lastUpdated: new Date(),
      coordinates: { lat: 40.7589, lng: -73.9851 },
      severity: "critical",
    },
    {
      id: 3,
      name: "Industrial Blvd",
      status: "clear",
      trainETA: "45 min",
      rerouteActive: false,
      avgDelay: "0.8 min",
      lastUpdated: new Date(),
      coordinates: { lat: 40.7282, lng: -73.7949 },
      severity: "low",
    },
    {
      id: 4,
      name: "Commerce Way",
      status: "clear",
      trainETA: "1.2 hr",
      rerouteActive: false,
      avgDelay: "1.1 min",
      lastUpdated: new Date(),
      coordinates: { lat: 40.6892, lng: -74.0445 },
      severity: "low",
    },
    {
      id: 5,
      name: "Harbor View Crossing",
      status: "active",
      trainETA: "8 min",
      rerouteActive: true,
      avgDelay: "3.1 min",
      lastUpdated: new Date(),
      coordinates: { lat: 40.7505, lng: -73.9934 },
      severity: "medium",
    },
  ],
  alerts: [
    {
      id: 1,
      crossing: "Main St & Railway Ave",
      type: "train_approaching",
      status: "active",
      eta: "2 min",
      timestamp: new Date(),
      priority: "high",
    },
    {
      id: 2,
      crossing: "Oak St Crossing",
      type: "maintenance",
      status: "scheduled",
      eta: "15 min",
      timestamp: new Date(),
      priority: "medium",
    },
    {
      id: 3,
      crossing: "Industrial Blvd",
      type: "emergency",
      status: "resolved",
      eta: "Completed",
      timestamp: new Date(),
      priority: "critical",
    },
  ],
  reroutes: [
    {
      id: 1,
      name: "Route A - Main St Bypass",
      active: true,
      affectedCrossings: ["Main St & Railway Ave", "Oak St Crossing"],
      vehicleCount: 45,
      estimatedDelay: "3.2 min",
      createdAt: new Date(),
      reason: "Traffic jam detected at crossing - smart reroute activated",
    },
    {
      id: 2,
      name: "Route B - Harbor View Alt",
      active: true,
      affectedCrossings: ["Harbor View Crossing"],
      vehicleCount: 32,
      estimatedDelay: "2.1 min",
      createdAt: new Date(),
      reason: "Heavy traffic jam at Harbor View - AI reroute recommended",
    },
  ],
  selectedCrossing: 1,
  isLoading: false,
  filters: {
    crossingStatus: "all",
    alertType: "all",
    timeRange: "24h",
  },
  stats: {
    activeCrossings: 2,
    totalCrossings: 5,
    activeReroutes: 2,
  },
};

// Action types
export type AppAction =
  | { type: "SET_SELECTED_CROSSING"; payload: number | null }
  | { type: "SET_LOADING"; payload: boolean }
  | {
      type: "UPDATE_CROSSING_STATUS";
      payload: { id: number; status: CrossingData["status"] };
    }
  | { type: "TOGGLE_REROUTE"; payload: { crossingId: number; active: boolean } }
  | {
      type: "CREATE_REROUTE";
      payload: { crossingIds: number[]; reason: string };
    }
  | { type: "DEACTIVATE_REROUTE"; payload: number }
  | { type: "RESOLVE_ALERT"; payload: number }
  | { type: "CREATE_ALERT"; payload: Omit<AlertData, "id" | "timestamp"> }
  | {
      type: "SET_FILTER";
      payload: { key: keyof AppState["filters"]; value: string };
    }
  | { type: "REFRESH_DATA" }
  | { type: "UPDATE_STATS" };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_SELECTED_CROSSING":
      return { ...state, selectedCrossing: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "UPDATE_CROSSING_STATUS":
      return {
        ...state,
        crossings: state.crossings.map((crossing) =>
          crossing.id === action.payload.id
            ? {
                ...crossing,
                status: action.payload.status,
                lastUpdated: new Date(),
              }
            : crossing,
        ),
      };

    case "TOGGLE_REROUTE":
      return {
        ...state,
        crossings: state.crossings.map((crossing) =>
          crossing.id === action.payload.crossingId
            ? { ...crossing, rerouteActive: action.payload.active }
            : crossing,
        ),
      };

    case "CREATE_REROUTE":
      const newReroute: RerouteData = {
        id: Date.now(),
        name: `Vehicle Route ${String.fromCharCode(65 + state.reroutes.length)} - Crossing Bypass`,
        active: true,
        affectedCrossings: action.payload.crossingIds
          .map((id) => state.crossings.find((c) => c.id === id)?.name || "")
          .filter(Boolean),
        vehicleCount: action.payload.crossingIds.length * 25, // Estimated vehicles per crossing
        estimatedDelay: "2.5 min",
        createdAt: new Date(),
        reason: action.payload.reason,
      };
      return {
        ...state,
        reroutes: [...state.reroutes, newReroute],
        stats: {
          ...state.stats,
          activeReroutes: state.stats.activeReroutes + 1,
        },
      };

    case "DEACTIVATE_REROUTE":
      return {
        ...state,
        reroutes: state.reroutes.map((reroute) =>
          reroute.id === action.payload
            ? { ...reroute, active: false }
            : reroute,
        ),
        stats: {
          ...state.stats,
          activeReroutes: Math.max(0, state.stats.activeReroutes - 1),
        },
      };

    case "RESOLVE_ALERT":
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.payload
            ? { ...alert, status: "resolved" }
            : alert,
        ),
      };

    case "CREATE_ALERT":
      const newAlert: AlertData = {
        ...action.payload,
        id: Date.now(),
        timestamp: new Date(),
      };
      return {
        ...state,
        alerts: [newAlert, ...state.alerts],
      };

    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      };

    case "REFRESH_DATA":
      // Simulate data refresh
      return {
        ...state,
        crossings: state.crossings.map((crossing) => ({
          ...crossing,
          lastUpdated: new Date(),
        })),
      };

    case "UPDATE_STATS":
      const activeCrossings = state.crossings.filter(
        (c) => c.status === "active",
      ).length;
      const activeReroutes = state.reroutes.filter((r) => r.active).length;
      return {
        ...state,
        stats: {
          ...state.stats,
          activeCrossings,
          activeReroutes,
        },
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
