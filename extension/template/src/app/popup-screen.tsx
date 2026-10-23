import { PanelRight, Settings } from "lucide-react";
import { useState } from "react";
import { browser } from "wxt/browser";
import { Button } from "@/src/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/src/components/ui/card";
import { Switch } from "@/src/components/ui/switch";
import { sendMessage } from "@/src/lib/messaging";
import { enabledSetting, greetingSetting } from "@/src/lib/settings";
import { canOpenSidePanel, openSidePanel } from "@/src/lib/side-panel";
import { useStorageItem } from "@/src/lib/use-storage-item";

/** The toolbar popup: a status switch, the saved greeting, and a round trip to the background worker. */
export function PopupScreen() {
  const [enabled, setEnabled] = useStorageItem(enabledSetting);
  const [greeting] = useStorageItem(greetingSetting);
  const [reply, setReply] = useState<string>();
  const [error, setError] = useState<string>();

  async function ping() {
    setError(undefined);
    try {
      const response = await sendMessage("ping", { text: greeting ?? "" });
      setReply(response.reply);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <main className="flex w-80 flex-col gap-3 p-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>__APP_NAME__</CardTitle>
            <CardDescription>{greeting ?? "Loading…"}</CardDescription>
          </div>
          <Switch
            aria-label="Enable the extension"
            checked={enabled ?? true}
            onCheckedChange={(next) => void setEnabled(next)}
          />
        </div>
        <Button onClick={() => void ping()}>Ask the background worker</Button>
        {reply ? (
          <p data-testid="reply" className="text-sm">
            {reply}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </Card>
      {canOpenSidePanel() ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void openSidePanel().then(() => {
              window.close();
            })
          }
        >
          <PanelRight className="size-4" /> Open side panel
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => void browser.runtime.openOptionsPage()}>
        <Settings className="size-4" /> Settings
      </Button>
    </main>
  );
}
