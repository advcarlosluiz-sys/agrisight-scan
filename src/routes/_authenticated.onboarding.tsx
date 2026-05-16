import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowRight, Check, Loader2, Sprout, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

// Validação client-side
const orgSchema = z.object({
  nome: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
});
const produtorPropSchema = z.object({
  produtorNome: z.string().trim().min(2, "Nome do produtor obrigatório").max(100),
  produtorTelefone: z.string().trim().max(30).optional().or(z.literal("")),
  propriedadeNome: z.string().trim().min(2, "Nome da propriedade obrigatório").max(100),
  cidade: z.string().trim().max(100).optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
});
const canteiroSchema = z.object({
  canteiroNome: z.string().trim().min(2, "Nome do canteiro obrigatório").max(100),
  variedade: z.string().trim().max(100).optional().or(z.literal("")),
  setorCodigo: z.string().trim().min(1, "Código do setor obrigatório").max(20).regex(/^[A-Za-z0-9_-]+$/, "Apenas letras, números, - e _"),
});

type Passo = 1 | 2 | 3;

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [passo, setPasso] = useState<Passo>(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [orgNome, setOrgNome] = useState("");
  // Step 2
  const [produtorNome, setProdutorNome] = useState("");
  const [produtorTelefone, setProdutorTelefone] = useState("");
  const [propriedadeNome, setPropriedadeNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [propriedadeId, setPropriedadeId] = useState<string | null>(null);
  // Step 3
  const [canteiroNome, setCanteiroNome] = useState("");
  const [variedade, setVariedade] = useState("morango");
  const [setorCodigo, setSetorCodigo] = useState("A01");

  // Carrega org atual e pula etapas já preenchidas
  const { data: orgAtual } = useQuery({
    queryKey: ["onboarding-org"],
    queryFn: async () => {
      const { data } = await supabase.from("organizacoes").select("id, nome").limit(1).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (orgAtual?.nome && !orgNome) setOrgNome(orgAtual.nome);
  }, [orgAtual, orgNome]);

  const salvarOrg = async () => {
    const parsed = orgSchema.safeParse({ nome: orgNome });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!orgAtual?.id) {
      toast.error("Organização não encontrada");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("organizacoes").update({ nome: parsed.data.nome }).eq("id", orgAtual.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setPasso(2);
  };

  const salvarPropriedade = async () => {
    const parsed = produtorPropSchema.safeParse({
      produtorNome, produtorTelefone, propriedadeNome, cidade, estado,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!orgAtual?.id) return toast.error("Organização não encontrada");
    setBusy(true);
    const { data: prod, error: e1 } = await supabase
      .from("produtores")
      .insert({
        organizacao_id: orgAtual.id,
        nome: parsed.data.produtorNome,
        telefone: parsed.data.produtorTelefone || null,
      })
      .select("id")
      .single();
    if (e1 || !prod) { setBusy(false); return toast.error(e1?.message ?? "Erro ao criar produtor"); }

    const { data: prop, error: e2 } = await supabase
      .from("propriedades")
      .insert({
        organizacao_id: orgAtual.id,
        produtor_id: prod.id,
        nome: parsed.data.propriedadeNome,
        cidade: parsed.data.cidade || null,
        estado: (parsed.data.estado || "").toUpperCase() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (e2 || !prop) return toast.error(e2?.message ?? "Erro ao criar propriedade");
    setPropriedadeId(prop.id);
    if (!canteiroNome) setCanteiroNome(`Canteiro de ${parsed.data.propriedadeNome}`);
    setPasso(3);
  };

  const salvarCanteiroEIr = async () => {
    const parsed = canteiroSchema.safeParse({ canteiroNome, variedade, setorCodigo });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!orgAtual?.id || !propriedadeId) return toast.error("Dados incompletos");
    setBusy(true);
    const { data: cant, error: e1 } = await supabase
      .from("canteiros")
      .insert({
        organizacao_id: orgAtual.id,
        propriedade_id: propriedadeId,
        nome: parsed.data.canteiroNome,
        variedade: parsed.data.variedade || null,
        cultura: "morango",
      })
      .select("id")
      .single();
    if (e1 || !cant) { setBusy(false); return toast.error(e1?.message ?? "Erro ao criar canteiro"); }

    const { error: e2 } = await supabase.from("setores").insert({
      organizacao_id: orgAtual.id,
      canteiro_id: cant.id,
      codigo: parsed.data.setorCodigo.toUpperCase(),
      qr_code: parsed.data.setorCodigo.toUpperCase(),
      linha: 1,
      coluna: 1,
    });
    setBusy(false);
    if (e2) return toast.error(e2.message);

    // Marca onboarding como concluído nesta sessão
    try { sessionStorage.setItem("onboarding:done", "1"); } catch {}

    await queryClient.invalidateQueries();
    toast.success("Tudo pronto! Iniciando primeira inspeção…");
    navigate({ to: "/inspecao/nova" });
  };

  return (
    <AppShell title="Bem-vindo" back="/">
      <Cabecalho passo={passo} />

      {passo === 1 && (
        <Cartao
          icon={Building2}
          titulo="Sua organização"
          subtitulo="Confirme o nome que aparecerá nos relatórios."
        >
          <div className="space-y-2">
            <Label htmlFor="org">Nome da organização</Label>
            <Input
              id="org"
              maxLength={100}
              value={orgNome}
              onChange={(e) => setOrgNome(e.target.value)}
              placeholder="Ex: Fazenda Bela Vista"
            />
          </div>
          <BotoesNav
            onAvancar={salvarOrg}
            busy={busy}
            podeAvancar={orgNome.trim().length >= 2}
          />
        </Cartao>
      )}

      {passo === 2 && (
        <Cartao
          icon={MapPin}
          titulo="Primeira propriedade"
          subtitulo="Cadastre o produtor e onde fica a propriedade."
        >
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-nome">Produtor</Label>
              <Input id="prod-nome" maxLength={100} value={produtorNome}
                onChange={(e) => setProdutorNome(e.target.value)} placeholder="Nome do produtor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-tel">Telefone (opcional)</Label>
              <Input id="prod-tel" maxLength={30} value={produtorTelefone}
                onChange={(e) => setProdutorTelefone(e.target.value)} placeholder="(35) 99999-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-nome">Nome da propriedade</Label>
              <Input id="prop-nome" maxLength={100} value={propriedadeNome}
                onChange={(e) => setPropriedadeNome(e.target.value)} placeholder="Ex: Sítio Bela Vista" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" maxLength={100} value={cidade}
                  onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" maxLength={2} value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())} placeholder="MG" />
              </div>
            </div>
          </div>
          <BotoesNav
            onVoltar={() => setPasso(1)}
            onAvancar={salvarPropriedade}
            busy={busy}
            podeAvancar={produtorNome.trim().length >= 2 && propriedadeNome.trim().length >= 2}
          />
        </Cartao>
      )}

      {passo === 3 && (
        <Cartao
          icon={Sprout}
          titulo="Primeiro canteiro"
          subtitulo="Vamos criar um canteiro e um setor inicial para você inspecionar."
        >
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="cant-nome">Nome do canteiro</Label>
              <Input id="cant-nome" maxLength={100} value={canteiroNome}
                onChange={(e) => setCanteiroNome(e.target.value)} placeholder="Ex: Canteiro Norte" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variedade">Variedade (opcional)</Label>
              <Input id="variedade" maxLength={100} value={variedade}
                onChange={(e) => setVariedade(e.target.value)} placeholder="Ex: Albion, San Andreas…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setor">Código do primeiro setor</Label>
              <Input id="setor" maxLength={20} value={setorCodigo}
                onChange={(e) => setSetorCodigo(e.target.value.toUpperCase())} placeholder="A01" />
              <p className="text-xs text-muted-foreground">Você pode adicionar mais setores depois em Configurações.</p>
            </div>
          </div>
          <BotoesNav
            onVoltar={() => setPasso(2)}
            onAvancar={salvarCanteiroEIr}
            busy={busy}
            podeAvancar={canteiroNome.trim().length >= 2 && setorCodigo.trim().length >= 1}
            labelAvancar="Concluir e iniciar inspeção"
          />
        </Cartao>
      )}

      <button
        type="button"
        onClick={() => {
          try { sessionStorage.setItem("onboarding:done", "1"); } catch {}
          navigate({ to: "/" });
        }}
        className="mt-4 block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
      >
        Pular por agora
      </button>
    </AppShell>
  );
}

function Cabecalho({ passo }: { passo: Passo }) {
  const passos = [
    { n: 1, label: "Organização" },
    { n: 2, label: "Propriedade" },
    { n: 3, label: "Canteiro" },
  ];
  return (
    <div className="mb-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-4 text-primary-foreground shadow-elevated">
        <p className="text-xs uppercase tracking-wider opacity-80">Configuração inicial</p>
        <h2 className="text-lg font-semibold">Vamos preparar o app em 3 passos</h2>
      </div>
      <ol className="mt-3 flex items-center gap-2">
        {passos.map((p, i) => {
          const ativo = passo === p.n;
          const concluido = passo > p.n;
          return (
            <li key={p.n} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                  concluido
                    ? "bg-emerald-500 text-white"
                    : ativo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {concluido ? <Check className="h-4 w-4" /> : p.n}
              </div>
              <span className={cn("text-[11px] font-medium", ativo ? "text-foreground" : "text-muted-foreground")}>
                {p.label}
              </span>
              {i < passos.length - 1 && <div className="ml-1 h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Cartao({
  icon: Icon, titulo, subtitulo, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string; subtitulo: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BotoesNav({
  onVoltar, onAvancar, busy, podeAvancar, labelAvancar = "Avançar",
}: {
  onVoltar?: () => void; onAvancar: () => void;
  busy: boolean; podeAvancar: boolean; labelAvancar?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      {onVoltar ? (
        <Button type="button" variant="ghost" onClick={onVoltar} disabled={busy}>
          Voltar
        </Button>
      ) : <span />}
      <Button type="button" onClick={onAvancar} disabled={busy || !podeAvancar}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {labelAvancar}
        {!busy && <ArrowRight className="ml-1 h-4 w-4" />}
      </Button>
    </div>
  );
}
