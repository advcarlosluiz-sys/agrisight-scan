import { Link, useRouter } from "@tanstack/react-router";
import { Leaf, ArrowLeft, LogOut, Wifi, WifiOff, CloudUpload, Loader2, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConnection } from "@/lib/use-online";
import { Button } from "@/components/ui/button";
import { usePendingPhotos, useSyncQueueState } from "@/lib/use-sync-queue";
import { useAutoSync } from "@/lib/use-auto-sync";
import { useSolicitacoesPendentes } from "@/lib/use-solicitacoes-pendentes";

export function AppShell({
  title,
  back,
  children,
}: {
  title?: string;
  back?: string | true;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { status } = useConnection();
  const online = status !== "offline";
  const pending = usePendingPhotos();
  const { processing } = useSyncQueueState();
  const totalPendentes = pending.length;
  useAutoSync();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          {back ? (
            <button
              onClick={() => (typeof back === "string" ? router.navigate({ to: back }) : router.history.back())}
              className="rounded-full p-1.5 hover:bg-white/10"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="h-6 w-6" />
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">
              {title ?? "Agrobotic Scout AI"}
            </h1>
          </div>
          {totalPendentes > 0 && (
            <Link
              to="/sincronizacao"
              className="relative flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs hover:bg-white/25"
              aria-label={`${totalPendentes} itens pendentes`}
              title="Itens aguardando sincronização"
            >
              <CloudUpload className={`h-3.5 w-3.5 ${processing ? "animate-pulse" : ""}`} />
              <span>{totalPendentes}</span>
            </Link>
          )}
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              status === "online"
                ? "bg-success/20"
                : status === "checking"
                  ? "bg-white/15"
                  : "bg-destructive/30"
            }`}
            title={status === "checking" ? "Verificando…" : online ? "Online" : "Offline"}
          >
            {status === "checking" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : online ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {status === "checking" ? "..." : online ? "Online" : "Offline"}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-white/10"
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/login" });
            }}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
