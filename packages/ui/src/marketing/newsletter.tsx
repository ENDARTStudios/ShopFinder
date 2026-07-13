"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Mail } from "lucide-react";

export interface NewsletterProps {
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (email: string) => void | Promise<void>;
  className?: string;
}

export function Newsletter({
  title = "Subscribe to our newsletter",
  description = "Get the latest products, deals, and updates. No spam, unsubscribe anytime.",
  placeholder = "Enter your email",
  submitLabel = "Subscribe",
  onSubmit,
  className
}: NewsletterProps) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      await onSubmit(email);
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message || "Something went wrong");
    }
  };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-6 sm:p-8", className)}>
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="space-y-1.5">
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="pl-8"
              disabled={status === "loading"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {status === "success" && <Check className="mr-1.5 h-4 w-4" />}
            {status === "success" ? "Subscribed!" : submitLabel}
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {status === "success" && <p className="text-xs text-success">Thanks for subscribing!</p>}
      </div>
    </div>
  );
}
