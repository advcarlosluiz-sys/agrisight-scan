import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePendingPhotos } from "@/lib/use-sync-queue";

export const FOTOS_MIN_OBRIGATORIO = 1;
export const FOTOS_RECOMENDADO = 3;
export const TIPOS_RECOMENDADO = 2;

export type ValidacaoFotos = {
  ok: boolean;
  nivel: "bloqueio" | "aviso" | null;
  mensagem?: string;
  acao?: "sincronizar";
};

export function useInspecaoFotos(inspecaoId: string) {
  const pendentes = usePendingPhotos(inspecaoId);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fotos-inspecao", inspecaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fotos_inspecao")
        .select("id, tipo_foto")
        .eq("inspecao_id", inspecaoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const fotos = data ?? [];
  const total = fotos.length;
  const tiposDistintos = new Set(fotos.map((f) => f.tipo_foto)).size;
  const pendentesCount = pendentes.length;

  return {
    total,
    tiposDistintos,
    pendentes: pendentesCount,
    loading: isLoading,
    refetch,
    validar(online: boolean): ValidacaoFotos {
      if (pendentesCount > 0) {
        return {
          ok: false,
          nivel: "bloqueio",
          mensagem: `Há ${pendentesCount} foto${pendentesCount > 1 ? "s" : ""} ainda não sincronizada${pendentesCount > 1 ? "s" : ""}. Sincronize antes de analisar.`,
          acao: "sincronizar",
        };
      }
      if (total < FOTOS_MIN_OBRIGATORIO) {
        if (!online) {
          return {
            ok: false,
            nivel: "bloqueio",
            mensagem: "Você está offline e ainda não há fotos enviadas. Capture e sincronize ao menos 1 foto.",
          };
        }
        return {
          ok: false,
          nivel: "bloqueio",
          mensagem: "Adicione ao menos 1 foto da área inspecionada para enviar à IA.",
        };
      }
      if (total < FOTOS_RECOMENDADO || tiposDistintos < TIPOS_RECOMENDADO) {
        return {
          ok: true,
          nivel: "aviso",
          mensagem: `Recomendamos pelo menos ${FOTOS_RECOMENDADO} fotos cobrindo ${TIPOS_RECOMENDADO} tipos diferentes para uma análise mais precisa. Você pode continuar, mas o resultado pode vir degradado.`,
        };
      }
      return { ok: true, nivel: null };
    },
  };
}
