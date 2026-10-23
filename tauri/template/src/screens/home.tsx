import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { features } from "@/features/registry";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-identity";
import { ipc } from "@/lib/ipc";

export function HomePage() {
  const info = useQuery({ queryKey: ["app", "info"], queryFn: () => ipc.app.info() });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl">{APP_NAME}</h1>
        <p className="text-muted-foreground">{APP_DESCRIPTION}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Reported by the Rust core through a command.</CardDescription>
        </CardHeader>
        <CardContent>
          {info.isPending && <p className="text-sm">Connecting…</p>}
          {info.isError && <p className="text-destructive text-sm">IPC unavailable: {info.error.message}</p>}
          {info.data && (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Version</dt>
              <dd data-testid="app-version">{info.data.version}</dd>
              <dt className="text-muted-foreground">Platform</dt>
              <dd>
                {info.data.platform} / {info.data.arch}
              </dd>
              <dt className="text-muted-foreground">Tauri</dt>
              <dd>{info.data.tauri}</dd>
              <dt className="text-muted-foreground">Profile</dt>
              <dd>
                <Badge variant="secondary">{info.data.profile}</Badge>
              </dd>
            </dl>
          )}
        </CardContent>
      </Card>

      {features.map(({ id, title, description, Panel }) => (
        <Card data-feature={id} key={id}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Panel />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
