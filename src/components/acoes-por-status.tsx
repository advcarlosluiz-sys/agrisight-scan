import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Eye,
  Loader2,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { StatusProcesso } from "@/components/status-processo-badge";
import { cn } from "@/lib/utils";

type Destino =
  | "/inspecao/$id/observacoes"
  | "/inspecao/$id/analisando"
  | "/inspecao/$id/resultado";

const ACOES: Record<
  StatusProcesso,
  { label: string; to: Destino; Icon: LucideIcon; cls: string }
> = {
  em_andamento: {
    label: "Continuar",
    to: "/inspecao/$id/observacoes",
    Icon: ArrowRight,
    cls: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  analisando: {
    label: "Acompanhar análise",
    to: "/inspecao/$id/analisando",
    Icon: Loader2,
    cls: "bg-primary/15 text-primary hover:bg-primary/25",
  },
  concluida: {
    label: "Ver resultado",
    to: "/inspecao/$id/resultado",
    Icon: Eye,
    cls: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400",
  },
  cancelada: {
    label: "Retomar após cancelamento",
    to: "/inspecao/$id/observacoes",
    Icon: RotateCcw,
    cls: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  },
};

export function AcoesPorStatus({
  status,
  inspecaoId,
  size = "sm",
  className,
}: {
  status: StatusProcesso | null | undefined;
  inspecaoId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = ACOES[status ?? "em_andamento"];
  const { Icon } = meta;
  const spin = status === "analisando";
  return (
    <Link
      to={meta.to}
      params={{ id: inspecaoId }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition active:scale-[0.97]",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        meta.cls,
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", spin && "animate-spin")} />
      {meta.label}
    </Link>
  );
}

export function destinoPorStatus(status: StatusProcesso | null | undefined): Destino {
  return ACOES[status ?? "em_andamento"].to;
}
