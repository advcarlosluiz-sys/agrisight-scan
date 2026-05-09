import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  PlayCircle,
  History,
  RefreshCw,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const { data: pendente } = useQuery({
    queryKey: ["pendente"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspecoes")
        .select("id, data_inspecao, setor:setor_id(codigo)")
        .is("status_geral", null)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const items = [
    { to: "/inspecao/nova", params: undefined, icon: PlayCircle, label: "Nova Inspeção", primary: true, sub: undefined as string | undefined },
    {
      to: pendente ? "/inspecao/$id/observacoes" : "/historico",
      params: pendente ? { id: pendente.id } : undefined,
      icon: ClipboardList,
      label: "Continuar Inspeção",
      disabled: !pendente,
      sub: pendente ? `Setor ${(pendente as any).setor?.codigo ?? "—"}` : "Nenhuma pendente",
    },
    { to: "/historico", params: undefined, icon: History, label: "Histórico", sub: undefined as string | undefined },
    { to: "/dashboard", params: undefined, icon: LayoutDashboard, label: "Dashboard", sub: undefined as string | undefined },
    { to: "/configuracoes", params: undefined, icon: Settings, label: "Configurações", sub: undefined as string | undefined },
  ];

  return (
    <AppShell title="Agrobotic Scout AI">
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-elevated">
        <p className="text-xs uppercase tracking-wider opacity-80">Bem-vindo</p>
        <h2 className="text-xl font-semibold">Pronto para inspecionar o campo?</h2>
        <p className="mt-1 text-sm opacity-90">Toque em "Nova Inspeção" para começar.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((it) => (
          <Link
            key={it.label}
            to={it.to as any}
            params={it.params as any}
            className={`group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition active:scale-[0.99] ${(it as any).disabled ? "pointer-events-none opacity-60" : ""} ${(it as any).primary ? "border-primary/30 ring-2 ring-primary/15" : ""}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${(it as any).primary ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
              <it.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{it.label}</div>
              {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
            </div>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => toast.success("Dados sincronizados")}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Sincronizar Dados</div>
            <div className="text-xs text-muted-foreground">Envia inspeções pendentes</div>
          </div>
        </button>
      </div>
    </AppShell>
  );
}
