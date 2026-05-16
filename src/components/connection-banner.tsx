import { CloudOff, Loader2, RefreshCw, Wifi } from "lucide-react";
import { useConnection } from "@/lib/use-online";
import { usePendingPhotos } from "@/lib/use-sync-queue";
import { scheduleProcess } from "@/lib/sync-queue";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function ConnectionBanner() {
  const { status, recheck } = useConnection();
  const pendentes = usePendingPhotos();
  const [checking, setChecking] = useState(false);

  const handleRecheck = async () => {
    setChecking(true);
    const ok = await recheck();
    if (ok) scheduleProcess(0);
    setChecking(false);
  };

  if (status === "checking") {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verificando conexão…
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <div className="flex items-start gap-2">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Você está offline</p>
            <p className="mt-0.5 text-xs text-destructive/90">
              Pode continuar inspecionando: fotos e observações ficam salvas no
              aparelho e enviadas automaticamente ao reconectar.
            </p>
            {pendentes.length > 0 && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {pendentes.length} foto{pendentes.length > 1 ? "s" : ""} aguardando
                envio.
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={handleRecheck}
                disabled={checking}
                className="inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Tentar novamente
              </button>
              {pendentes.length > 0 && (
                <Link
                  to="/sincronizacao"
                  className="text-xs font-medium text-destructive underline underline-offset-2"
                >
                  Ver fila
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendentes.length > 0) {
    return (
      <Link
        to="/sincronizacao"
        className="mb-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground"
      >
        <Wifi className="h-3.5 w-3.5" />
        <span className="flex-1">
          Online · sincronizando {pendentes.length} item
          {pendentes.length > 1 ? "s" : ""}…
        </span>
      </Link>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-xs text-success">
      <Wifi className="h-3.5 w-3.5" />
      Online · tudo sincronizado
    </div>
  );
}
