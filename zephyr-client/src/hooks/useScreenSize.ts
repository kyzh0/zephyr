import { useMemo } from "react";
import type { ScreenSize } from "@/components/station/types";

export function useScreenSize(): ScreenSize {
  const bigScreen = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-height: 720px)").matches,
    []
  );

  const tinyScreen = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-height: 530px)").matches,
    []
  );

  const scaling = bigScreen ? 1 : tinyScreen ? 0.5 : 0.65;

  return { bigScreen, tinyScreen, scaling };
}
