import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition active:scale-[0.98]",
        className,
      )}
      aria-label="Copiar link do filtro atual"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
