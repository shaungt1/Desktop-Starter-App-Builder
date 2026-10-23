/**
 * Screens and navigation. Hash-based history keeps routing inside the
 * single index.html Tauri serves.
 */
import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HomePage } from "@/screens/home";
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

const routeTree = rootRoute.addChildren([layoutRoute.addChildren([homeRoute, settingsRoute])]);

export const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
