import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";
import type { RendererFeature } from "../types";

function BackgroundPanel() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["background"],
    queryFn: () => ipc.background.status(),
    refetchInterval: 10_000,
  });
  const setLogin = useMutation({
    mutationFn: (enabled: boolean) => ipc.background.setLaunchAtLogin({ enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["background"] }),
  });

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Worker: {status.data?.workerRunning ? "running" : "stopped"}
        {status.data?.heartbeat && ` · ${status.data.heartbeat.ticks} heartbeats`}
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
  description: "Tray icon, start at login and a worker process that runs while the window is closed.",
  Panel: BackgroundPanel,
};
