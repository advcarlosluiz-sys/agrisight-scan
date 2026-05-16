import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const FEEDBACK_MS = 2000;

export function CopyFilterLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending reset on unmount so the button doesn't try to flip state
  // after it's gone (avoids stuck "Copiado" if remounted quickly).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado para a área de transferência", {
        description: url,
        duration: FEEDBACK_MS,
        id: "copy-filter-link",
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, FEEDBACK_MS);
    } catch {
      toast.error("Não foi possível copiar o link", { id: "copy-filter-link" });
      setCopied(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-live="polite"
            aria-label={
              copied
                ? "Link copiado para a área de transferência"
                : "Copiar link do filtro atual (inclui ?filtro=)"
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition active:scale-[0.98]",
              copied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-card text-foreground",
              className,
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-center">
          Copia a URL atual incluindo o parâmetro <code className="font-mono">?filtro=</code> para compartilhar a mesma seleção.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


