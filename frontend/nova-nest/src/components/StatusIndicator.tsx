import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";

interface StatusIndicatorProps {
  status:
    | "active"
    | "clear"
    | "maintenance"
    | "emergency"
    | "pending"
    | "loading";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-warning text-warning-foreground",
    icon: AlertTriangle,
    pulse: true,
  },
  clear: {
    label: "Clear",
    color: "bg-success text-success-foreground",
    icon: CheckCircle,
    pulse: false,
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-destructive text-destructive-foreground",
    icon: XCircle,
    pulse: false,
  },
  emergency: {
    label: "Emergency",
    color: "bg-destructive text-destructive-foreground",
    icon: AlertTriangle,
    pulse: true,
  },
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: Clock,
    pulse: false,
  },
  loading: {
    label: "Loading",
    color: "bg-muted text-muted-foreground",
    icon: Loader2,
    pulse: false,
  },
};

const sizeConfig = {
  sm: {
    container: "px-2 py-1 text-xs",
    icon: "h-3 w-3",
    dot: "h-2 w-2",
  },
  md: {
    container: "px-3 py-1.5 text-sm",
    icon: "h-4 w-4",
    dot: "h-3 w-3",
  },
  lg: {
    container: "px-4 py-2 text-base",
    icon: "h-5 w-5",
    dot: "h-4 w-4",
  },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = "md",
  showIcon = true,
  showText = true,
  className,
}) => {
  const config = statusConfig[status] || statusConfig.pending; // fallback to pending if status not found
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  if (!showIcon && !showText) {
    // Just show a dot indicator
    return (
      <div
        className={cn(
          "rounded-full",
          config.color,
          sizeStyles.dot,
          config.pulse && "animate-pulse",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.color,
        sizeStyles.container,
        config.pulse && "animate-pulse",
        className,
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            sizeStyles.icon,
            status === "loading" && "animate-spin",
          )}
        />
      )}
      {showText && <span>{config.label}</span>}
    </div>
  );
};

// Dot-only indicator for compact spaces
export const StatusDot: React.FC<
  Pick<StatusIndicatorProps, "status" | "size" | "className">
> = ({ status, size = "md", className }) => (
  <StatusIndicator
    status={status}
    size={size}
    showIcon={false}
    showText={false}
    className={className}
  />
);
