import { useEffect, useState } from "react";

const PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
const CHECK_INTERVAL_MS = 25_000;
const CHECK_TIMEOUT_MS = 5_000;

export type ConnectionStatus = "online" | "offline" | "checking";

async function checkReachable(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
    const res = await fetch(PING_URL, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/** Mantém o booleano simples para compatibilidade com chamadas existentes. */
export function useOnlineStatus(): boolean {
  const { status } = useConnection();
  return status !== "offline";
}

/** Hook completo com checagem real de alcance ao backend. */
export function useConnection() {
  const [status, setStatus] = useState<ConnectionStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "checking",
  );
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        setLastCheck(Date.now());
        return;
      }
      setStatus((s) => (s === "online" ? s : "checking"));
      const ok = await checkReachable();
      if (cancelled) return;
      setStatus(ok ? "online" : "offline");
      setLastCheck(Date.now());
    };

    const onOnline = () => run();
    const onOffline = () => {
      setStatus("offline");
      setLastCheck(Date.now());
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    void run();
    timer = setInterval(run, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const recheck = async () => {
    setStatus("checking");
    const ok = await checkReachable();
    setStatus(ok ? "online" : "offline");
    setLastCheck(Date.now());
    return ok;
  };

  return { status, lastCheck, recheck };
}
