import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persists a search-param filter across navigations and devices.
 *
 * - sessionStorage: fast local cache for in-app navigation and back/forward.
 * - perfis.filtro_status_preferido: per-user persistence so the preferred
 *   filter follows the user across devices/logins.
 */
export function usePersistedFilter<T extends string>(
  storageKey: string,
  current: T,
  defaultValue: T,
  navigateFrom: string,
) {
  const navigate = useNavigate({ from: navigateFrom });
  const restored = useRef(false);
  const lastSynced = useRef<T | null>(null);

  // Restore on mount: prefer URL, then sessionStorage, then user profile.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const urlHasFiltro =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("filtro");

    const applyRestored = (value: T) => {
      if (!value || value === defaultValue) return false;
      navigate({
        search: ((prev: Record<string, unknown>) => ({ ...prev, filtro: value })) as never,
        replace: true,
      });
      return true;
    };

    if (urlHasFiltro) {
      sessionStorage.setItem(storageKey, current);
      lastSynced.current = current;
      return;
    }

    if (current === defaultValue) {
      const saved = sessionStorage.getItem(storageKey) as T | null;
      if (saved && saved !== defaultValue) {
        applyRestored(saved);
        return;
      }
      // Fall back to per-user preference stored in the profile.
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;
        const { data } = await supabase
          .from("perfis")
          .select("filtro_status_preferido")
          .eq("id", userId)
          .maybeSingle();
        const remote = (data?.filtro_status_preferido as T | undefined) ?? null;
        if (remote && remote !== defaultValue) {
          sessionStorage.setItem(storageKey, remote);
          lastSynced.current = remote;
          // Only apply if user hasn't manually changed it meanwhile.
          const stillUrlEmpty = !new URLSearchParams(window.location.search).has("filtro");
          if (stillUrlEmpty) applyRestored(remote);
        }
      })();
      return;
    }

    sessionStorage.setItem(storageKey, current);
    lastSynced.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist changes to sessionStorage (fast) and the user profile (cross-device).
  useEffect(() => {
    if (!restored.current) return;
    sessionStorage.setItem(storageKey, current);
    if (lastSynced.current === current) return;
    lastSynced.current = current;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      await supabase
        .from("perfis")
        .update({ filtro_status_preferido: current })
        .eq("id", userId);
    })();
  }, [storageKey, current]);

  // Sync local cache with URL on browser back/forward.
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = (params.get("filtro") as T | null) ?? defaultValue;
      sessionStorage.setItem(storageKey, fromUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [storageKey, defaultValue]);
}
