import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-identity";
import { ipc } from "@/lib/ipc";

/** Shown by the remote and exported profiles when their content cannot load. */
export function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-24 text-center">
      <h1 className="font-bold text-2xl">Can't reach {APP_NAME}</h1>
      <p className="text-muted-foreground">Check your internet connection, then try again.</p>
      <Button onClick={() => void ipc.window.reloadContent()}>Try again</Button>
    </div>
  );
}
