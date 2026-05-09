import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CopyFilterLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado", { description: url });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition active:scale-[0.98]",
              className,
            )}
            aria-label="Copiar link do filtro atual (inclui ?filtro=)"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-center">
          Copia a URL atual incluindo o parâmetro <code className="font-mono">?filtro=</code> para compartilhar a mesma seleção.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

