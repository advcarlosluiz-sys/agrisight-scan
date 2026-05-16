import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export type StatusProcesso = "em_andamento" | "analisando" | "concluida" | "cancelada";

const META: Record<
  StatusProcesso,
  { label: string; cls: string; Icon: typeof Clock; spin?: boolean }
> = {
  em_andamento: {
    label: "Em andamento",
    cls: "bg-muted text-foreground",
    Icon: Clock,
  },
  analisando: {
    label: "Analisando",
    cls: "bg-primary/15 text-primary",
    Icon: Loader2,
    spin: true,
  },
  concluida: {
    label: "Concluída",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  cancelada: {
    label: "Cancelada",
    cls: "bg-destructive/15 text-destructive",
    Icon: XCircle,
  },
};

export function StatusProcessoBadge({
  status,
  className,
}: {
  status: StatusProcesso | null | undefined;
  className?: string;
}) {
  const meta = META[status ?? "em_andamento"];
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.cls,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", meta.spin && "animate-spin")} />
      {meta.label}
    </span>
  );
}

/** Hook que assina realtime para o status_processo de uma inspeção. */
export function useStatusProcesso(inspecaoId: string) {
  const [status, setStatus] = useState<StatusProcesso | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("inspecoes")
      .select("status_processo")
      .eq("id", inspecaoId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo && data) setStatus(data.status_processo as StatusProcesso);
      });

    const channel = supabase
      .channel(`insp-status-${inspecaoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inspecoes",
          filter: `id=eq.${inspecaoId}`,
        },
        (payload) => {
          const novo = (payload.new as { status_processo?: StatusProcesso })
            ?.status_processo;
          if (novo) setStatus(novo);
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, [inspecaoId]);

  return status;
}

/**
 * Redireciona automaticamente para a tela de análise quando o
 * status_processo da inspeção é "analisando". Permite retomar o
 * acompanhamento após um reload em qualquer página do fluxo.
 */
export function useRedirectIfAnalisando(inspecaoId: string) {
  const status = useStatusProcesso(inspecaoId);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (status !== "analisando") return;
    if (pathname.endsWith("/analisando")) return;
    navigate({ to: "/inspecao/$id/analisando", params: { id: inspecaoId }, replace: true });
  }, [status, pathname, inspecaoId, navigate]);

  return status;
}
