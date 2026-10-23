import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";
import type { RendererFeature } from "../types";

function SignInPanel() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["auth", "status"], queryFn: () => ipc.authOidc.status() });
  const update = (data: Awaited<ReturnType<typeof ipc.authOidc.status>>) =>
    queryClient.setQueryData(["auth", "status"], data);
  const signIn = useMutation({ mutationFn: () => ipc.authOidc.signIn(), onSuccess: update });
  const signOut = useMutation({ mutationFn: () => ipc.authOidc.signOut(), onSuccess: update });

  if (status.data?.signedIn) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          Signed in as <strong>{status.data.user?.email ?? status.data.user?.name ?? status.data.user?.sub}</strong>
        </p>
        <Button onClick={() => signOut.mutate()} variant="outline">
          <LogOut /> Sign out
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start" disabled={signIn.isPending} onClick={() => signIn.mutate()}>
        <LogIn /> {signIn.isPending ? "Waiting for your browser…" : "Sign in"}
      </Button>
      {signIn.isError && <p className="text-destructive text-sm">{signIn.error.message}</p>}
    </div>
  );
}

export const feature: RendererFeature = {
  id: "auth-oidc",
  title: "Account",
  description: "Sign in through your browser; the app receives the result through its own link scheme.",
  Panel: SignInPanel,
};
