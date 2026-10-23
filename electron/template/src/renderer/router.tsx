/**
 * Screens and navigation. Hash-based history works both from the dev server
 * and from files on disk in the packaged app.
 */
import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HomePage } from "@/screens/home";
import { OfflinePage } from "@/screens/offline";
import { SettingsPage } from "@/screens/settings";

/** Wraps every screen except the offline screen in the app shell. */
function LayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const rootRoute = createRootRoute();
const layoutRoute = createRoute({ getParentRoute: () => rootRoute, id: "layout", component: LayoutRoute });
const homeRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/", component: HomePage });
const settingsRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/settings", component: SettingsPage });
const offlineRoute = createRoute({ getParentRoute: () => rootRoute, path: "/offline", component: OfflinePage });

const routeTree = rootRoute.addChildren([layoutRoute.addChildren([homeRoute, settingsRoute]), offlineRoute]);

export const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
