"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => undefined;
}

function getServerSnapshot(): null {
  return null;
}

export function usePortalRoot(id: "overlay-root" | "toast-root") {
  const getSnapshot = useCallback(() => document.getElementById(id), [id]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
