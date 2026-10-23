import { Card, CardDescription, CardTitle } from "@/src/components/ui/card";
import { greetingSetting } from "@/src/lib/settings";
import { useStorageItem } from "@/src/lib/use-storage-item";

/** The side panel: stays open beside the page while the user browses. Replace this content with the real tool. */
export function SidePanelScreen() {
  const [greeting] = useStorageItem(greetingSetting);
  return (
    <main className="flex flex-col gap-3 p-4">
      <Card>
        <CardTitle>__APP_NAME__</CardTitle>
        <CardDescription>{greeting ?? "Loading…"}</CardDescription>
      </Card>
    </main>
  );
}
