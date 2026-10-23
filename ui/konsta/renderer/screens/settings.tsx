/** Settings screen for the Konsta UI kit: appearance as a native-style segmented control. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Block, BlockTitle, Segmented, SegmentedButton } from "konsta/react";
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
    <>
      <Block>
        <h1 className="font-bold text-2xl">Settings</h1>
      </Block>
      <BlockTitle>Appearance</BlockTitle>
      <Block strong inset>
        <Segmented rounded strong>
          {MODES.map((mode) => (
            <SegmentedButton
              active={theme.data === mode}
              aria-pressed={theme.data === mode}
              key={mode}
              onClick={() => setTheme.mutate(mode)}
            >
              {mode[0]?.toUpperCase()}
              {mode.slice(1)}
            </SegmentedButton>
          ))}
        </Segmented>
      </Block>
    </>
  );
}
