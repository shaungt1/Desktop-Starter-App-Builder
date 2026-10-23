import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RendererFeature } from "../types";
import { notesRepository } from "./notes-repository";

function NotesPanel() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => notesRepository.list() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes"] });
  const create = useMutation({
    mutationFn: (value: string) => notesRepository.create(value),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: number) => notesRepository.remove(id), onSuccess: refresh });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim()) {
      create.mutate(title.trim());
      setTitle("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form className="flex items-end gap-2" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="note-title">New note</Label>
          <Input id="note-title" maxLength={200} onChange={(event) => setTitle(event.target.value)} value={title} />
        </div>
        <Button disabled={!title.trim() || create.isPending} type="submit">
          Add
        </Button>
      </form>
      <ul className="flex flex-col divide-y rounded-md border">
        {notes.data?.length === 0 && <li className="p-3 text-muted-foreground text-sm">No notes yet.</li>}
        {notes.data?.map((note) => (
          <li className="flex items-center justify-between p-3 text-sm" key={note.id}>
            <span>{note.title}</span>
            <Button
              aria-label={`Delete ${note.title}`}
              onClick={() => remove.mutate(note.id)}
              size="icon"
              variant="ghost"
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const feature: RendererFeature = {
  id: "database",
  title: "Local database",
  description: "Notes stored in SQLite inside the app data folder.",
  Panel: NotesPanel,
};
