import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Detects an invalid raw `filtro` URL param (anything outside `validValues`),
 * shows a toast, and strips it from the URL so the route falls back to "todos".
 *
 * Runs once per mount per invalid value. Safe with `zodValidator(fallback(...))`
 * which silently coerces — we read the raw URL before the coercion.
 */
export function useInvalidFiltroToast(validValues: readonly string[]) {
  const warned = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("filtro")) return;
    const raw = params.get("filtro") ?? "";
    if (validValues.includes(raw)) return;
    if (warned.current === raw) return;
    warned.current = raw;

    toast.error("Filtro inválido", {
      description: `"${raw}" não é um status reconhecido. Mostrando todas as inspeções.`,
    });

    params.delete("filtro");
    const qs = params.toString();
    const newUrl =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(window.history.state, "", newUrl);
  }, [validValues]);
}
