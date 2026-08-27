import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Refreshes server data whenever an existing route becomes active again.
 * The first focus is skipped because useApiResource already loads on mount.
 */
export function useRefreshOnFocus(refresh: () => void) {
  const hasFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) {
        refresh();
      } else {
        hasFocused.current = true;
      }
    }, [refresh]),
  );
}
