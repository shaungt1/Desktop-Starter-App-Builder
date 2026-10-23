import { useMutation, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import type { RendererFeature } from "../types";

interface UpdateCheck {
  configured: boolean;
  available: boolean;
  currentVersion: string;
  version: string | null;
  notes: string | null;
}

function UpdatePanel() {
  const check = useQuery({
    queryKey: ["update"],
    queryFn: () => invoke<UpdateCheck>("update_check"),
    enabled: false,
  });
  const install = useMutation({ mutationFn: () => invoke<void>("update_install") });

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <Button disabled={check.isFetching} onClick={() => void check.refetch()} variant="outline">
          {check.isFetching ? "Checking…" : "Check for updates"}
        </Button>
        {check.data?.available && (
          <Button disabled={install.isPending} onClick={() => install.mutate()}>
            Install {check.data.version} and restart
          </Button>
        )}
      </div>
      {check.data && !check.data.configured && <p>Updates are not configured (set endpoint and pubkey).</p>}
      {check.data?.configured && !check.data.available && <p>{check.data.currentVersion} is the latest version.</p>}
      {(check.isError || install.isError) && <p className="text-destructive">{String(check.error ?? install.error)}</p>}
    </div>
  );
}

export const feature: RendererFeature = {
  id: "auto-update",
  title: "Updates",
  description: "Signed updates, verified before they are installed.",
  Panel: UpdatePanel,
};
