import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { usePendingPhotos, useSyncQueueState } from "@/lib/use-sync-queue";
import {
  deletePendingPhoto,
  retryAllPendingPhotos,
  retryPendingPhoto,
  scheduleProcess,
} from "@/lib/sync-queue";
import { useOnlineStatus } from "@/lib/use-online";
import {
  CloudOff,
  CloudUpload,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sincronizacao")({
  component: SincronizacaoPage,
});

function SincronizacaoPage() {
  const items = usePendingPhotos();
  const { processing } = useSyncQueueState();
  const online = useOnlineStatus();

  const pendentes = items.filter((i) => i.status === "pendente").length;
  const enviando = items.filter((i) => i.status === "enviando").length;
  const erros = items.filter((i) => i.status === "erro").length;

  const sincronizarAgora = () => {
    if (!online) {
      toast.error("Você está offline");
      return;
    }
    scheduleProcess(0);
    toast.success("Sincronização iniciada");
  };

  const tentarTodos = async () => {
    await retryAllPendingPhotos();
    toast.success("Reagendados para envio");
  };

  return (
    <AppShell title="Sincronização" back="/">
      <div className="mb-3 rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}
          >
            {online ? <CloudUpload className="h-6 w-6" /> : <CloudOff className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {online ? "Conectado" : "Sem conexão"}
            </p>
            <p className="text-xs text-muted-foreground">
              {items.length === 0
                ? "Nenhum item pendente"
                : `${items.length} item${items.length > 1 ? "s" : ""} na fila`}
            </p>
          </div>
          {processing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Pendentes" value={pendentes} />
          <Stat label="Enviando" value={enviando} accent="primary" />
          <Stat label="Erros" value={erros} accent="destructive" />
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={sincronizarAgora}
            disabled={!online || processing || items.length === 0}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${processing ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
          {erros > 0 && (
            <Button size="sm" variant="outline" onClick={tentarTodos}>
              Tentar tudo
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Tudo sincronizado.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-3 shadow-card">
              <div className="flex items-start gap-2">
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.tipo_foto} · inspeção {item.inspecao_id.slice(0, 8)}
                  </p>
                  {item.last_error && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-destructive">
                      {item.last_error}
                    </p>
                  )}
                  {item.attempts > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Tentativas: {item.attempts}
                      {item.status === "pendente" && item.next_attempt_at > Date.now() && (
                        <> · próxima em {Math.ceil((item.next_attempt_at - Date.now()) / 1000)}s</>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {item.status !== "enviando" && (
                    <button
                      type="button"
                      onClick={() => retryPendingPhoto(item.id)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      aria-label="Tentar agora"
                      title="Tentar agora"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePendingPhoto(item.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                    title="Remover da fila"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "destructive";
}) {
  const cls =
    accent === "primary"
      ? "text-primary"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/50 py-2">
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: "pendente" | "enviando" | "erro" }) {
  if (status === "enviando") return <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />;
  if (status === "erro") return <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />;
  return <CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />;
}
