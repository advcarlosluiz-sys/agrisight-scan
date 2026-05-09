import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Camera, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inspecao/$id/qr")({
  component: QrPage,
});

function QrPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/qr" });
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [setorId, setSetorId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!scanning) return;
    let cancel = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancel || !elRef.current) return;
      const scanner = new Html5Qrcode(elRef.current.id);
      scannerRef.current = scanner as unknown as typeof scannerRef.current;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (text: string) => {
            await lookup(text);
            await scanner.stop();
            scanner.clear();
            setScanning(false);
          },
          () => {},
        );
      } catch {
        toast.error("Não foi possível acessar a câmera");
        setScanning(false);
      }
    })();
    return () => {
      cancel = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [scanning]);

  const lookup = async (code: string) => {
    const { data: insp } = await supabase
      .from("inspecoes")
      .select("canteiro_id")
      .eq("id", id)
      .single();
    if (!insp?.canteiro_id) return toast.error("Inspeção sem canteiro");
    const { data: setor } = await supabase
      .from("setores")
      .select("id, codigo")
      .eq("canteiro_id", insp.canteiro_id)
      .eq("codigo", code.trim().toUpperCase())
      .maybeSingle();
    if (!setor) return toast.error(`Setor "${code}" não encontrado neste canteiro`);
    setCodigo(setor.codigo);
    setSetorId(setor.id);
    toast.success(`Setor ${setor.codigo} identificado`);
  };

  const confirmar = async () => {
    if (!setorId) return;
    setConfirmando(true);
    await supabase.from("inspecoes").update({ setor_id: setorId }).eq("id", id);
    navigate({ to: "/inspecao/$id/setor/$sid", params: { id, sid: setorId } });
  };

  return (
    <AppShell title="Ler QR do Setor" back={`/inspecao/nova`}>
      <div className="space-y-4">
        {!scanning && !setorId && (
          <Button className="h-14 w-full text-base" onClick={() => setScanning(true)}>
            <Camera className="mr-2 h-5 w-5" /> Abrir câmera
          </Button>
        )}

        {scanning && (
          <div className="overflow-hidden rounded-2xl border bg-black">
            <div id="qr-scanner" ref={elRef} className="aspect-square w-full" />
          </div>
        )}

        <div className="rounded-2xl border bg-card p-4">
          <Label className="text-xs text-muted-foreground">Ou digite o código</Label>
          <div className="mt-2 flex gap-2">
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="A1-05"
            />
            <Button variant="secondary" onClick={() => lookup(codigo)} disabled={!codigo}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {setorId && (
          <div className="rounded-2xl border-2 border-success bg-success/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <p className="mt-2 text-sm text-muted-foreground">Setor identificado</p>
            <p className="text-2xl font-bold">{codigo}</p>
            <Button className="mt-4 w-full" onClick={confirmar} disabled={confirmando}>
              Confirmar e continuar
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
