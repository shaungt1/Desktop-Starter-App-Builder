import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/src/components/ui/card";
import { Switch } from "@/src/components/ui/switch";
import { enabledSetting, greetingSetting } from "@/src/lib/settings";
import { useStorageItem } from "@/src/lib/use-storage-item";

/** The options page: edits the same typed settings the popup and content scripts read. */
export function OptionsScreen() {
  const [enabled, setEnabled] = useStorageItem(enabledSetting);
  const [saved, setSaved] = useStorageItem(greetingSetting);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    if (saved !== undefined) {
      setDraft(saved);
    }
  }, [saved]);

  async function save() {
    await setSaved(draft.trim() || "Hello");
    setStatus("Saved");
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">__APP_NAME__ settings</h1>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Enabled</CardTitle>
            <CardDescription>Turn the extension off without uninstalling it.</CardDescription>
          </div>
          <Switch aria-label="Enabled" checked={enabled ?? true} onCheckedChange={(next) => void setEnabled(next)} />
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Greeting
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal"
            value={draft}
            maxLength={200}
            onChange={(event) => {
              setDraft(event.target.value);
              setStatus(undefined);
            }}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={() => void save()}>Save</Button>
          {status ? (
            <span role="status" className="text-sm text-muted-foreground">
              {status}
            </span>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
