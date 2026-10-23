import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardTitle } from "@/src/components/ui/card";

/** The panel injected into the page. It lives in a shadow root, so page styles cannot restyle it. */
export function Overlay() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return null;
  }
  return (
    <Card className="fixed right-4 bottom-4 z-[2147483647] flex w-64 flex-col gap-2 shadow-lg">
      <CardTitle>__APP_NAME__</CardTitle>
      <p className="text-sm">This panel was added to the page by the extension.</p>
      <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
        Close
      </Button>
    </Card>
  );
}
