import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inspecao/nova")({
  component: NovaInspecao,
});

function NovaInspecao() {
  const navigate = useNavigate();
  const [produtorId, setProdutorId] = useState<string>("");
  const [propriedadeId, setPropriedadeId] = useState<string>("");
  const [canteiroId, setCanteiroId] = useState<string>("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const { data: produtores } = useQuery({
    queryKey: ["produtores"],
    queryFn: async () => (await supabase.from("produtores").select("id, nome").order("nome")).data ?? [],
  });
  const { data: propriedades } = useQuery({
    queryKey: ["propriedades", produtorId],
    enabled: !!produtorId,
    queryFn: async () =>
      (await supabase.from("propriedades").select("id, nome").eq("produtor_id", produtorId).order("nome")).data ?? [],
  });
  const { data: canteiros } = useQuery({
    queryKey: ["canteiros", propriedadeId],
    enabled: !!propriedadeId,
    queryFn: async () =>
      (await supabase.from("canteiros").select("id, nome, variedade").eq("propriedade_id", propriedadeId).order("nome")).data ?? [],
  });

  // Inspeções recentes — exibidas com badge ao vivo para acompanhar
  // transições (em_andamento → analisando → concluída/cancelada).
  type InspecaoRecente = {
    id: string;
    data_inspecao: string;
    status_processo: StatusProcesso;
    setor: { codigo: string | null } | null;
  };
  const queryClient = useQueryClient();
  const { data: recentes } = useQuery({
    queryKey: ["nova-inspecao-recentes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspecoes")
        .select("id, data_inspecao, status_processo, setor:setor_id(codigo)")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as unknown as InspecaoRecente[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("nova-inspecao-recentes-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspecoes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["nova-inspecao-recentes"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const iniciar = async () => {
    if (!canteiroId) return toast.error("Selecione canteiro");
    setBusy(true);
    try {
      const orgRes = await supabase.rpc("current_org_id");
      const { data: u } = await supabase.auth.getUser();
      const { data: insp, error } = await supabase
        .from("inspecoes")
        .insert({
          organizacao_id: orgRes.data!,
          propriedade_id: propriedadeId,
          canteiro_id: canteiroId,
          vistoriador_id: u.user?.id,
          data_inspecao: data,
        })
        .select()
        .single();
      if (error) throw error;
      navigate({ to: "/inspecao/$id/qr", params: { id: insp.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Nova Inspeção" back="/">
      <div className="space-y-4">
        <Field label="Produtor">
          <Select value={produtorId} onValueChange={(v) => { setProdutorId(v); setPropriedadeId(""); setCanteiroId(""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {produtores?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Propriedade">
          <Select value={propriedadeId} onValueChange={(v) => { setPropriedadeId(v); setCanteiroId(""); }} disabled={!produtorId}>
            <SelectTrigger><SelectValue placeholder={produtorId ? "Selecione..." : "Escolha um produtor antes"} /></SelectTrigger>
            <SelectContent>
              {propriedades?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Canteiro">
          <Select value={canteiroId} onValueChange={setCanteiroId} disabled={!propriedadeId}>
            <SelectTrigger><SelectValue placeholder={propriedadeId ? "Selecione..." : "Escolha uma propriedade antes"} /></SelectTrigger>
            <SelectContent>
              {canteiros?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} {c.variedade ? `· ${c.variedade}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Data da inspeção">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>

        <Button className="h-12 w-full text-base" onClick={iniciar} disabled={busy || !canteiroId}>
          Iniciar Inspeção
        </Button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Inspeções recentes
          </h3>
          <span className="text-[10px] text-muted-foreground">Atualiza em tempo real</span>
        </div>
        {recentes && recentes.length > 0 ? (
          <div className="space-y-2">
            {recentes.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm">
                    Setor {r.setor?.codigo ?? "—"} ·{" "}
                    {new Date(r.data_inspecao).toLocaleDateString("pt-BR")}
                  </p>
                  <StatusProcessoBadge status={r.status_processo} />
                </div>
                <div className="mt-2 flex justify-end">
                  <AcoesPorStatus status={r.status_processo} inspecaoId={r.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não há inspeções recentes.</p>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
