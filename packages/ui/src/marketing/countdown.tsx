"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CountdownProps {
  targetDate: Date | string;
  label?: string;
  className?: string;
  onComplete?: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function Countdown({ targetDate, label, className, onComplete }: CountdownProps) {
  const target = React.useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const [remaining, setRemaining] = React.useState(() => target - Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      const diff = target - Date.now();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, onComplete]);

  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const units =
    days > 0
      ? [
          { v: days, l: "Days" },
          { v: hours, l: "Hrs" },
          { v: minutes, l: "Min" },
          { v: seconds, l: "Sec" }
        ]
      : [
          { v: hours, l: "Hrs" },
          { v: minutes, l: "Min" },
          { v: seconds, l: "Sec" }
        ];

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
      <div className="flex gap-2">
        {units.map((u) => (
          <div
            key={u.l}
            className="flex min-w-[3rem] flex-col items-center rounded-lg border bg-background p-2"
          >
            <span className="text-2xl font-bold tabular-nums">{pad(u.v)}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {u.l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
