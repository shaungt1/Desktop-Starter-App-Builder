/** Home screen for the Konsta UI kit: runtime details as a native-style list, then each module's panel. */
import { useQuery } from "@tanstack/react-query";
import { Block, BlockTitle, Card, List, ListItem } from "konsta/react";
import { features } from "@/features/registry";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-identity";
import { ipc } from "@/lib/ipc";

export function HomePage() {
  const info = useQuery({ queryKey: ["app", "info"], queryFn: () => ipc.app.info() });

  return (
    <>
      <Block>
        <h1 className="font-bold text-2xl">{APP_NAME}</h1>
        <p className="opacity-70">{APP_DESCRIPTION}</p>
      </Block>

      <BlockTitle>Runtime</BlockTitle>
      {info.isPending && <Block>Connecting…</Block>}
      {info.isError && <Block className="text-red-600">IPC unavailable: {info.error.message}</Block>}
      {info.data && (
        <List inset strong>
          <ListItem after={<span data-testid="app-version">{info.data.version}</span>} title="Version" />
          <ListItem after={`${info.data.platform} / ${info.data.arch}`} title="Platform" />
          <ListItem after={info.data.tauri} title="Tauri" />
          <ListItem after={info.data.profile} title="Profile" />
        </List>
      )}
      <Block className="text-sm opacity-60">Reported by the Rust core through a command.</Block>

      {features.map(({ id, title, description, Panel }) => (
        <Card data-feature={id} header={title} key={id}>
          <p className="pb-3 text-sm opacity-70">{description}</p>
          <Panel />
        </Card>
      ))}
    </>
  );
}
