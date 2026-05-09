import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Persists a search-param filter in sessionStorage so it survives in-app
 * navigations that don't carry the search params (e.g. clicking a nav link
 * back to the page from elsewhere). Browser-level back/forward already
 * restores via history; this covers the rest.
 */
export function usePersistedFilter<T extends string>(
  storageKey: string,
  current: T,
  defaultValue: T,
  navigateFrom: string,
) {
  const navigate = useNavigate({ from: navigateFrom });
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (current === defaultValue) {
      const saved = sessionStorage.getItem(storageKey) as T | null;
      if (saved && saved !== defaultValue) {
        navigate({ search: { filtro: saved } as never, replace: true });
        return;
      }
    }
    sessionStorage.setItem(storageKey, current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restored.current) sessionStorage.setItem(storageKey, current);
  }, [storageKey, current]);
}
