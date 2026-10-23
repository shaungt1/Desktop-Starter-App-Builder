/**
 * The app shell for the Konsta UI kit: a native-style navigation bar, the
 * current screen and a bottom tab bar, styled as iOS or Material Design
 * (Android) from the plan's uiTheme. Konsta's dark styles follow the same
 * "dark" class on <html> that the theme setting toggles.
 *
 * Navigation comes from @/lib/navigation, which each frontend (Vite or
 * Next.js) implements, so this layout works unchanged with both.
 */
import { App, Navbar, Page, Tabbar, TabbarLink } from "konsta/react";
import { House, Settings } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/app-identity";
import { useAppNavigation } from "@/lib/navigation";

const NAV_ITEMS = [
  { to: "/", label: "Home", Icon: House },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname, navigate } = useAppNavigation();
  const current = NAV_ITEMS.find((item) => item.to === pathname) ?? NAV_ITEMS[0];
  return (
    <App dark safeAreas theme="__UI_THEME__">
      <MotionConfig reducedMotion="user">
        <Page>
          <Navbar subtitle={current.label} title={APP_NAME} />
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="pb-24"
            initial={{ opacity: 0, x: 12 }}
            key={pathname}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
          <Tabbar className="fixed bottom-0 left-0" icons labels>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <TabbarLink
                active={pathname === to}
                aria-label={label}
                data-nav={to}
                icon={<Icon aria-hidden className="size-6" />}
                key={to}
                label={label}
                onClick={() => navigate(to)}
              />
            ))}
          </Tabbar>
        </Page>
      </MotionConfig>
    </App>
  );
}
