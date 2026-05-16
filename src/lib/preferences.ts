import { useEffect, useState } from "react";

export interface AppPreferences {
  autoSync: boolean;       // sincronizar automaticamente ao reconectar
  wifiOnly: boolean;       // sincronizar apenas em Wi-Fi
  notifyOnSync: boolean;   // mostrar toasts ao sincronizar
}

const STORAGE_KEY = "agrobotic.preferences.v1";

export const defaultPreferences: AppPreferences = {
  autoSync: true,
  wifiOnly: false,
  notifyOnSync: true,
};

type Listener = (p: AppPreferences) => void;
const listeners = new Set<Listener>();
let current: AppPreferences = load();

function load(): AppPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

function persist(p: AppPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function getPreferences(): AppPreferences {
  return current;
}

export function setPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
  current = { ...current, [key]: value };
  persist(current);
  for (const l of listeners) l(current);
}

export function subscribePreferences(l: Listener) {
  listeners.add(l);
  l(current);
  return () => listeners.delete(l);
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(current);
  useEffect(() => {
    const unsub = subscribePreferences(setPrefs);
    return () => {
      unsub();
    };
  }, []);
  return prefs;
}

/** Conexão Wi-Fi detectada (best-effort; quando indeterminado, retorna null). */
export function isWifiConnection(): boolean | null {
  if (typeof navigator === "undefined") return null;
  const conn = (navigator as unknown as { connection?: { type?: string } }).connection;
  if (!conn || typeof conn.type === "undefined") return null;
  return conn.type === "wifi" || conn.type === "ethernet";
}
