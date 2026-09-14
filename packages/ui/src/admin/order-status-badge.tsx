"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Home,
  XCircle,
  RefreshCcw,
  DollarSign
} from "lucide-react";

/**
 * OrderStatusBadge — visual indicator for OrderStatus domain type.
 *
 * Domain link: @workspace/domain/order OrderStatus.
 */

export type OrderStatus =
  "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

const CONFIG: Record<OrderStatus, { icon: React.ReactNode; label: string; className: string }> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    label: "Pending",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground"
  },
  confirmed: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Confirmed",
    className: "border-info/30 bg-info/10 text-info"
  },
  paid: {
    icon: <DollarSign className="h-3 w-3" />,
    label: "Paid",
    className: "border-success/30 bg-success/10 text-success"
  },
  shipped: {
    icon: <Truck className="h-3 w-3" />,
    label: "Shipped",
    className: "border-info/30 bg-info/10 text-info"
  },
  delivered: {
    icon: <Home className="h-3 w-3" />,
    label: "Delivered",
    className: "border-success/30 bg-success/10 text-success"
  },
  cancelled: {
    icon: <XCircle className="h-3 w-3" />,
    label: "Cancelled",
    className: "border-destructive/30 bg-destructive/10 text-destructive"
  },
  refunded: {
    icon: <RefreshCcw className="h-3 w-3" />,
    label: "Refunded",
    className: "border-warning/30 bg-warning/10 text-warning"
  }
};

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", cfg.className, className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}
