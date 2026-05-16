import { X } from "lucide-react";
import type { StatusProcesso } from "@/components/status-processo-badge";

type Filtro = "todos" | StatusProcesso;

const LABELS: Record<Exclude<Filtro, "todos">, string> = {
  em_andamento: "Em andamento",
  analisando: "Analisando",
  concluida: "Concluídas",
  cancelada: "Canceladas",
};

const TONES: Record<Exclude<Filtro, "todos">, string> = {
  em_andamento: "bg-muted text-foreground border-border",
  analisando: "bg-primary/15 text-primary border-primary/40",
  concluida: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
  cancelada: "bg-destructive/15 text-destructive border-destructive/40",
};

export function FiltroStatusIndicador({
  filtro,
  onClear,
}: {
  filtro: Filtro;
  onClear: () => void;
}) {
  if (filtro === "todos") return null;
  return (
    <div
      className={`mb-3 flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${TONES[filtro]}`}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5">
        <span className="opacity-70">Filtro:</span>
        <span>{LABELS[filtro]}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Limpar filtro de status"
        className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium hover:bg-background active:scale-[0.98]"
      >
        <X className="h-3 w-3" />
        Limpar
      </button>
    </div>
  );
}
