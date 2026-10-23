/**
 * The app shell: a navigation rail and the current screen. The screen fades
 * in on every route change (Motion), and animation is switched off for people
 * who ask their operating system to reduce motion.
 *
 * Navigation comes from @/lib/navigation, which each frontend (Vite or
 * Next.js) implements, so this layout works unchanged with both.
 */
import { House, Settings } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/app-identity";
import { NavLink, useAppNavigation } from "@/lib/navigation";

const NAV_ITEMS = [
  { to: "/", label: "Home", Icon: House },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useAppNavigation();
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full">
        <nav aria-label="Main" className="flex w-52 shrink-0 flex-col gap-1 border-r bg-muted/40 p-3">
          <p className="px-2 pb-3 font-semibold text-sm">{APP_NAME}</p>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              activeClassName="bg-accent text-accent-foreground"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              key={to}
              to={to}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 8 }}
            key={pathname}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
