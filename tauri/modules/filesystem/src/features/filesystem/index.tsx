import { useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RendererFeature } from "../types";

function FilePanel() {
  const [file, setFile] = useState<{ path?: string; name: string; content: string }>({
    name: "untitled.txt",
    content: "",
  });
  const open = useMutation({
    mutationFn: () => invoke<{ path: string; name: string; content: string } | null>("fs_open_text_file"),
    onSuccess: (result) => result && setFile(result),
  });
  const save = useMutation({
    mutationFn: () =>
      invoke<{ path: string; name: string } | null>("fs_save_text_file", {
        request: { path: file.path, suggestedName: file.name, content: file.content },
      }),
    onSuccess: (result) => result && setFile((current) => ({ ...current, ...result })),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button onClick={() => open.mutate()} variant="outline">
          <FolderOpen /> Open
        </Button>
        <Button onClick={() => save.mutate()} variant="outline">
          <Save /> Save
        </Button>
        <span className="truncate text-muted-foreground text-sm">{file.path ?? file.name}</span>
      </div>
      <textarea
        aria-label="File contents"
        className="min-h-32 rounded-md border bg-transparent p-2 font-mono text-sm"
        onChange={(event) => setFile((current) => ({ ...current, content: event.target.value }))}
        value={file.content}
      />
      {(open.isError || save.isError) && (
        <p className="text-destructive text-sm">{(open.error ?? save.error)?.message}</p>
      )}
    </div>
  );
}

export const feature: RendererFeature = {
  id: "filesystem",
  title: "Files",
  description: "Open and save text files through native dialogs.",
  Panel: FilePanel,
};
