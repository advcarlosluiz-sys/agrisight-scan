import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  LogOut,
  MapPin,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  setPreference,
  usePreferences,
  isWifiConnection,
} from "@/lib/preferences";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Cfg,
});

type PermissionState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

function useBrowserPermission(name: PermissionName) {
  const [state, setState] = useState<PermissionState>("unknown");
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      setState("unsupported");
      return;
    }
    let status: PermissionStatus | null = null;
    let cancelled = false;
    navigator.permissions
      .query({ name })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setState(s.state as PermissionState);
        s.onchange = () => setState(s.state as PermissionState);
      })
      .catch(() => setState("unsupported"));
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, [name]);
  return state;
}

function Cfg() {
  const { user, signOut } = useAuth();
  const prefs = usePreferences();

  const { data: perfil } = useQuery({
    queryKey: ["perfil", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("perfis")
          .select("nome, papel, organizacao_id, organizacao:organizacao_id(id, nome)")
          .eq("id", user!.id)
          .single()
      ).data,
  });

  const { data: organizacoes } = useQuery({
    queryKey: ["organizacoes-disponiveis"],
    queryFn: async () =>
      (await supabase.from("organizacoes").select("id, nome").order("nome")).data ?? [],
  });

  const cameraState = useBrowserPermission("camera" as PermissionName);
  const geoState = useBrowserPermission("geolocation" as PermissionName);
  const notifState: PermissionState =
    typeof Notification === "undefined"
      ? "unsupported"
      : (Notification.permission as PermissionState);

  const orgAtual = (perfil as { organizacao_id?: string } | null)?.organizacao_id ?? "";
  const papel = (perfil as { papel?: string } | null)?.papel ?? "vistoriador";
  const isAdmin = papel === "admin";

  const wifi = isWifiConnection();

  return (
    <AppShell title="Configurações" back="/">
      {/* Conta */}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conta</p>
        <p className="mt-1 font-semibold">
          {(perfil as { nome?: string } | null)?.nome ?? user?.email}
        </p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div className="mt-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-xs">
            Papel: <span className="font-medium capitalize">{papel}</span>
          </span>
        </div>
      </section>

      {/* Organização */}
      <section className="mt-4 rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Organização
          </p>
        </div>
        <Label className="mt-2 block text-xs text-muted-foreground" htmlFor="org-select">
          Organização ativa
        </Label>
        <Select
          value={orgAtual}
          onValueChange={(v) => {
            if (v !== orgAtual) {
              toast.message("Apenas administradores podem trocar a organização ativa", {
                description: "Sua conta está vinculada a esta organização.",
              });
            }
          }}
          disabled={!organizacoes || organizacoes.length <= 1}
        >
          <SelectTrigger id="org-select" className="mt-1 w-full">
            <SelectValue placeholder="Selecione a organização" />
          </SelectTrigger>
          <SelectContent>
            {(organizacoes ?? []).map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(!organizacoes || organizacoes.length <= 1) && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Você participa de apenas uma organização. Convide colegas para colaborar.
          </p>
        )}
      </section>

      {/* Preferências de Sincronização */}
      <section className="mt-4 rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sincronização
        </p>

        <PrefRow
          icon={<Wifi className="h-4 w-4" />}
          title="Sincronização automática"
          description="Envia a fila assim que reconectar à internet."
          checked={prefs.autoSync}
          onChange={(v) => setPreference("autoSync", v)}
        />

        <PrefRow
          icon={<Wifi className="h-4 w-4" />}
          title="Apenas Wi-Fi"
          description={
            wifi === null
              ? "Quando ativo, evita envios em dados móveis sempre que possível."
              : wifi
                ? "Conexão Wi-Fi/Ethernet detectada agora."
                : "Conexão móvel detectada agora — envios automáticos ficarão pausados."
          }
          checked={prefs.wifiOnly}
          onChange={(v) => setPreference("wifiOnly", v)}
        />

        <PrefRow
          icon={<Bell className="h-4 w-4" />}
          title="Notificações de sincronização"
          description="Exibir avisos quando a fila for enviada."
          checked={prefs.notifyOnSync}
          onChange={(v) => setPreference("notifyOnSync", v)}
        />
      </section>

      {/* Permissões */}
      <section className="mt-4 rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Permissões do dispositivo
        </p>

        <PermRow
          icon={<Camera className="h-4 w-4" />}
          title="Câmera"
          description="Usada para registrar fotos das inspeções."
          state={cameraState}
          onRequest={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              stream.getTracks().forEach((t) => t.stop());
              toast.success("Permissão de câmera concedida");
            } catch {
              toast.error("Permissão de câmera negada");
            }
          }}
        />

        <PermRow
          icon={<MapPin className="h-4 w-4" />}
          title="Localização"
          description="Registrar o local da propriedade durante a inspeção."
          state={geoState}
          onRequest={() => {
            navigator.geolocation.getCurrentPosition(
              () => toast.success("Permissão de localização concedida"),
              () => toast.error("Permissão de localização negada"),
              { timeout: 10_000 },
            );
          }}
        />

        <PermRow
          icon={<Bell className="h-4 w-4" />}
          title="Notificações"
          description="Avisos sobre sincronização e novas tarefas."
          state={notifState}
          onRequest={async () => {
            if (typeof Notification === "undefined") {
              toast.error("Notificações não são suportadas neste dispositivo");
              return;
            }
            const r = await Notification.requestPermission();
            if (r === "granted") toast.success("Notificações ativadas");
            else toast.error("Notificações não foram permitidas");
          }}
        />

        {!isAdmin && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Algumas configurações da organização exigem perfil de administrador.
          </p>
        )}
      </section>

      <Button variant="destructive" className="mt-6 w-full" onClick={() => signOut()}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </AppShell>
  );
}

function PrefRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 flex items-start gap-3 border-t pt-3 first:mt-2 first:border-t-0 first:pt-2">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function PermRow({
  icon,
  title,
  description,
  state,
  onRequest,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: PermissionState;
  onRequest: () => void | Promise<void>;
}) {
  const label =
    state === "granted"
      ? "Concedida"
      : state === "denied"
        ? "Negada"
        : state === "prompt"
          ? "Pendente"
          : state === "unsupported"
            ? "Não suportada"
            : "—";
  const color =
    state === "granted"
      ? "bg-success/15 text-success"
      : state === "denied"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <div className="mt-3 flex items-start gap-3 border-t pt-3 first:mt-2 first:border-t-0 first:pt-2">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
          {label}
        </span>
      </div>
      <Button
        size="sm"
        variant={state === "granted" ? "outline" : "default"}
        onClick={onRequest}
        disabled={state === "unsupported"}
      >
        {state === "granted" ? "Revisar" : "Permitir"}
      </Button>
    </div>
  );
}
