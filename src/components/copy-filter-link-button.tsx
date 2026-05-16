import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const FEEDBACK_MS = 2000;
const TOAST_MS = 8000;

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

  const copyViaTextarea = (text: string): boolean => {
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Keep it off-screen but selectable; readOnly avoids mobile keyboard popup.
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    const previousActive = document.activeElement as HTMLElement | null;
    let ok = false;
    try {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    } finally {
      document.body.removeChild(textarea);
      // Restore focus so the user's keyboard context isn't lost.
      previousActive?.focus?.();
    }
    return ok;
  };

  const onClick = async () => {
    const url = window.location.href;
    const markCopied = () => {
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
    };

    // 1) Modern async Clipboard API (requires secure context + permission).
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        markCopied();
        return;
      } catch {
        // fall through to legacy fallback
      }
    }

    // 2) Legacy fallback via temporary selection (works on http://, older
    //    browsers, and inside iframes that block the async API).
    if (copyViaTextarea(url)) {
      markCopied();
      return;
    }

    // 3) Final failure — surface a clear error.
    toast.error("Não foi possível copiar o link", {
      description: "Copie manualmente da barra de endereço.",
      id: "copy-filter-link",
    });
    setCopied(false);
  };


  // Native <button> already triggers onClick on Enter and Space; we keep the
  // default behavior and only add explicit handling to prevent page scroll on
  // Space while the button is focused.
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      void onClick();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            onKeyDown={onKeyDown}
            aria-label={
              copied
                ? "Link copiado para a área de transferência"
                : "Copiar link do filtro atual, incluindo o status selecionado"
            }
            aria-pressed={copied}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition active:scale-[0.98]",
              // Visible keyboard focus indicator (WCAG 2.4.7) using design tokens.
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              copied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
              className,
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copied ? "Link copiado!" : "Copiar link"}</span>
            {/* Live region for screen readers — announces the copy result. */}
            <span className="sr-only" role="status" aria-live="polite">
              {copied ? "Link copiado para a área de transferência" : ""}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-center">
          Copia a URL atual incluindo o parâmetro <code className="font-mono">?filtro=</code> para compartilhar a mesma seleção.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


