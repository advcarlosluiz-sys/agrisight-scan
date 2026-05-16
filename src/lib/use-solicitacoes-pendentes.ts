import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/** Conta solicitações de agrônomo não lidas e atualiza em tempo real. */
export function useSolicitacoesPendentes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["solic-pendentes"],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("solicitacoes_agronomo")
        .select("id", { count: "exact", head: true })
        .eq("lida", false)
        .neq("status", "atendida")
        .neq("status", "cancelada");
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("solic-agronomo")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes_agronomo" },
        () => {
          qc.invalidateQueries({ queryKey: ["solic-pendentes"] });
          qc.invalidateQueries({ queryKey: ["solicitacoes"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return query.data ?? 0;
}
