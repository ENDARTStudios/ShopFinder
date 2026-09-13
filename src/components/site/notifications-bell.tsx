/**
 * ShopFinder — Notifications bell (REC-005).
 *
 * Polls /api/admin/notifications every 30s, displays a bell icon with a red
 * badge for unread count, and a dropdown listing recent notifications.
 * Read state persisted in localStorage (shopfinder:read-notifications).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, AlertCircle, AlertTriangle, Info, CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Notification {
  id: string;
  type: "pipeline_failed" | "product_review" | "low_confidence";
  severity: "info" | "warning" | "error";
  message: string;
  timestamp: string;
  link?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  counts: { error: number; warning: number; info: number };
}

const STORAGE_KEY = "shopfinder:read-notifications";
const POLL_INTERVAL_MS = 30_000;

function readReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((s): s is string => typeof s === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writeReadSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  const arr = Array.from(set).slice(-200);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore quota errors
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function severityIcon(sev: Notification["severity"]) {
  switch (sev) {
    case "error": return <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
    default: return <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />;
  }
}

export function NotificationsBell() {
  const [data, setData] = React.useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [readSet, setReadSet] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setReadSet(readReadSet());
  }, []);

  const fetchOnce = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as NotificationsResponse;
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  const unread = React.useMemo(() => {
    if (!data) return [] as Notification[];
    return data.notifications.filter((n) => !readSet.has(n.id));
  }, [data, readSet]);

  const unreadCount = unread.length;

  const markAllRead = () => {
    if (!data) return;
    const next = new Set(readSet);
    for (const n of data.notifications) next.add(n.id);
    setReadSet(next);
    writeReadSet(next);
  };

  const markOneRead = (id: string) => {
    const next = new Set(readSet);
    next.add(id);
    setReadSet(next);
    writeReadSet(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notifications {data && `(${data.total})`}
          </span>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
              <CheckCheck className="h-3 w-3" aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center px-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading...
            </div>
          ) : !data || data.notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {data.notifications.map((n) => {
                const isUnread = !readSet.has(n.id);
                return (
                  <li key={n.id} className={`relative px-3 py-2.5 ${isUnread ? "bg-emerald-500/5" : ""}`}>
                    {isUnread && <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">{severityIcon(n.severity)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold leading-snug">{n.message}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelative(n.timestamp)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {n.link && (
                            <Link href={n.link} onClick={() => { markOneRead(n.id); setOpen(false); }} className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                              View →
                            </Link>
                          )}
                          {isUnread && (
                            <button type="button" onClick={() => markOneRead(n.id)} className="text-[10px] text-muted-foreground hover:text-foreground">
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
