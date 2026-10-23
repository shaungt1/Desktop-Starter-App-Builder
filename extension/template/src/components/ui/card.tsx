import type * as React from "react";
import { cn } from "@/src/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 text-card-foreground", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
