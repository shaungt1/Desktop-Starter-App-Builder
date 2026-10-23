/**
 * Navigation for the Vite frontend (TanStack Router with hash history, so
 * routes work from the dev server and from files inside the packaged app).
 *
 * Screens and layouts import navigation only from this file. The Next.js
 * frontend replaces it with a version built on next/link, which is how the
 * same layouts and screens run on both frontends.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
  return (
    <Link
      activeOptions={{ exact: true }}
      activeProps={{ className: activeClassName }}
      className={className}
      data-nav={to}
      to={to}
    >
      {children}
    </Link>
  );
}

/** The current route path and a function that moves to another route. */
export function useAppNavigation(): { pathname: string; navigate: (to: string) => void } {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  return { pathname, navigate: (to) => void navigate({ to }) };
}
