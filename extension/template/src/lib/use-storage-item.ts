import { useCallback, useEffect, useState } from "react";
import type { WxtStorageItem } from "wxt/utils/storage";

/**
 * Reads a storage item into React state and keeps it current: the value updates
 * when any part of the extension (another popup, the options page, the background)
 * changes it. Returns the value (undefined until the first read) and a setter.
 */
export function useStorageItem<T>(
  item: WxtStorageItem<T, Record<string, unknown>>,
): [T | undefined, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let active = true;
    item.getValue().then((current) => {
      if (active) {
        setValue(current);
      }
    });
    const stop = item.watch((next) => setValue(next));
    return () => {
      active = false;
      stop();
    };
  }, [item]);

  const update = useCallback((next: T) => item.setValue(next), [item]);
  return [value, update];
}
