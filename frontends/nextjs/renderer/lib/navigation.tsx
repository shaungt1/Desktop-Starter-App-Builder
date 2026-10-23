"use client";
/**
 * Navigation for the Next.js frontend (App Router with next/link).
 *
 * Screens and layouts import navigation only from this file. The Vite
 * frontend has a version with the same exports built on TanStack Router,
 * which is how the same layouts and screens run on both frontends.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavLinkProps {
  /** Route path, for example "/" or "/settings". */
  to: string;
  className?: string;
  /** Extra classes applied while this route is the current one. */
  activeClassName?: string;
  children: ReactNode;
}

/** A link to an app route that is styled as active when that route is shown. */
export function NavLink({ to, className, activeClassName, children }: NavLinkProps) {
  const active = usePathname() === to;
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      data-nav={to}
      href={to}
    >
      {children}
    </Link>
  );
}

/** The current route path and a function that moves to another route. */
export function useAppNavigation(): { pathname: string; navigate: (to: string) => void } {
  const pathname = usePathname();
  const router = useRouter();
  return { pathname, navigate: (to) => router.push(to) };
}
