"use client";
/**
 * Client-side providers shared by every route: the data cache, the saved
 * theme and the app shell. Runs only in the window, never at build time.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { initTheme } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  useEffect(() => {
    void initTheme();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>{children}</AppLayout>
    </QueryClientProvider>
  );
}
