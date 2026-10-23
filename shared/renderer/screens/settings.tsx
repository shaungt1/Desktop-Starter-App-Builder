import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";

const MODES: readonly ThemeMode[] = ["system", "light", "dark"];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const theme = useQuery({ queryKey: ["theme"], queryFn: getThemeMode });
  const setTheme = useMutation({
    mutationFn: setThemeMode,
    onSuccess: (result) => queryClient.setQueryData(["theme"], result.mode),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-bold text-2xl">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Follow the operating system or force light or dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="flex gap-2">
            <legend className="sr-only">Theme</legend>
            {MODES.map((mode) => (
              <Button
                aria-pressed={theme.data === mode}
                key={mode}
                onClick={() => setTheme.mutate(mode)}
                variant={theme.data === mode ? "default" : "outline"}
              >
                {mode[0]?.toUpperCase()}
                {mode.slice(1)}
              </Button>
            ))}
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
