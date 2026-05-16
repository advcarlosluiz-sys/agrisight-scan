import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConnection } from "@/lib/use-online";
import { usePendingPhotos } from "@/lib/use-sync-queue";
import { syncNow } from "@/lib/sync-queue";

/**
 * Observa transições offline → online e dispara sincronização automática
 * da fila pendente, com feedback via toast. Montado uma única vez no AppShell.
 */
export function useAutoSync() {
  const { status } = useConnection();
  const pending = usePendingPhotos();
  const prevStatus = useRef(status);
  const running = useRef(false);

  useEffect(() => {
    const wasOffline = prevStatus.current === "offline";
    prevStatus.current = status;

    if (status !== "online") return;
    if (!wasOffline) return;
    if (pending.length === 0) return;
    if (running.current) return;

    running.current = true;
    const total = pending.length;
    const p = syncNow();
    toast.promise(p, {
      loading: `Conexão restaurada — enviando ${total} item${total > 1 ? "s" : ""}…`,
      success: (r) => {
        if (r.falhas === 0 && r.restantes === 0) {
          return `${r.enviados} item${r.enviados !== 1 ? "s" : ""} sincronizado${r.enviados !== 1 ? "s" : ""} automaticamente`;
        }
        const partes: string[] = [];
        if (r.enviados) partes.push(`${r.enviados} enviado${r.enviados !== 1 ? "s" : ""}`);
        if (r.falhas) partes.push(`${r.falhas} com falha`);
        if (r.restantes) partes.push(`${r.restantes} na fila`);
        return partes.join(" · ");
      },
      error: (e) => (e instanceof Error ? e.message : "Falha ao sincronizar"),
    });
    p.finally(() => {
      running.current = false;
    });
  }, [status, pending.length]);
}
