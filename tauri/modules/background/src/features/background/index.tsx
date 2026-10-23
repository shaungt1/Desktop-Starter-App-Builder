import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { RendererFeature } from "../types";

interface BackgroundStatus {
  workerRunning: boolean;
  heartbeats: number;
  launchAtLogin: boolean | null;
}

function BackgroundPanel() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["background"],
    queryFn: () => invoke<BackgroundStatus>("background_status"),
  });
  const setLogin = useMutation({
    mutationFn: (enabled: boolean) => invoke<boolean>("background_set_launch_at_login", { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["background"] }),
  });

  useEffect(() => {
    const unlisten = listen<number>("background://heartbeat", () => {
      void queryClient.invalidateQueries({ queryKey: ["background"] });
    });
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [queryClient]);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Worker: {status.data?.workerRunning ? "running" : "stopped"}
        {status.data && ` · ${status.data.heartbeats} heartbeats`}
      </p>
      {status.data?.launchAtLogin !== null && status.data?.launchAtLogin !== undefined && (
        <Button className="self-start" onClick={() => setLogin.mutate(!status.data?.launchAtLogin)} variant="outline">
          {status.data.launchAtLogin ? "Don't start at login" : "Start at login"}
        </Button>
      )}
      <p className="text-muted-foreground">Closing the window keeps the app in the tray. Use the tray menu to quit.</p>
    </div>
  );
}

export const feature: RendererFeature = {
  id: "background",
  title: "Background",
  description: "Tray icon, start at login and a task that runs while the window is closed.",
  Panel: BackgroundPanel,
};
