import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Cfg,
});

function Cfg() {
  const { user, signOut } = useAuth();
  const { data: perfil } = useQuery({
    queryKey: ["perfil"],
    queryFn: async () =>
      (await supabase.from("perfis").select("nome, papel, organizacao:organizacao_id(nome)").eq("id", user!.id).single()).data,
  });
  return (
    <AppShell title="Configurações" back="/">
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs uppercase text-muted-foreground">Conta</p>
        <p className="font-semibold">{(perfil as any)?.nome ?? user?.email}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">Papel: <span className="capitalize">{(perfil as any)?.papel}</span></p>
        <p className="text-xs text-muted-foreground">Organização: {(perfil as any)?.organizacao?.nome}</p>
      </div>
      <Button variant="destructive" className="mt-4 w-full" onClick={() => signOut()}>Sair</Button>
    </AppShell>
  );
}
