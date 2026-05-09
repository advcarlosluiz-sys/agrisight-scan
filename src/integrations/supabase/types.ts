export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analises_ia: {
        Row: {
          acoes_recomendadas: Json | null
          confianca: number | null
          created_at: string
          hipoteses_agronomicas: Json | null
          id: string
          inspecao_id: string
          justificativa: string | null
          modelo_ia: string | null
          necessidade_agronomo: boolean | null
          organizacao_id: string
          prioridade: string | null
          problemas_detectados: Json | null
          resposta_completa: Json | null
          risco: Database["public"]["Enums"]["risco_nivel"] | null
          status_geral: Database["public"]["Enums"]["status_geral"] | null
        }
        Insert: {
          acoes_recomendadas?: Json | null
          confianca?: number | null
          created_at?: string
          hipoteses_agronomicas?: Json | null
          id?: string
          inspecao_id: string
          justificativa?: string | null
          modelo_ia?: string | null
          necessidade_agronomo?: boolean | null
          organizacao_id: string
          prioridade?: string | null
          problemas_detectados?: Json | null
          resposta_completa?: Json | null
          risco?: Database["public"]["Enums"]["risco_nivel"] | null
          status_geral?: Database["public"]["Enums"]["status_geral"] | null
        }
        Update: {
          acoes_recomendadas?: Json | null
          confianca?: number | null
          created_at?: string
          hipoteses_agronomicas?: Json | null
          id?: string
          inspecao_id?: string
          justificativa?: string | null
          modelo_ia?: string | null
          necessidade_agronomo?: boolean | null
          organizacao_id?: string
          prioridade?: string | null
          problemas_detectados?: Json | null
          resposta_completa?: Json | null
          risco?: Database["public"]["Enums"]["risco_nivel"] | null
          status_geral?: Database["public"]["Enums"]["status_geral"] | null
        }
        Relationships: [
          {
            foreignKeyName: "analises_ia_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_ia_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      canteiros: {
        Row: {
          area_m2: number | null
          created_at: string
          cultura: string
          id: string
          nome: string
          observacoes: string | null
          organizacao_id: string
          propriedade_id: string
          variedade: string | null
        }
        Insert: {
          area_m2?: number | null
          created_at?: string
          cultura?: string
          id?: string
          nome: string
          observacoes?: string | null
          organizacao_id: string
          propriedade_id: string
          variedade?: string | null
        }
        Update: {
          area_m2?: number | null
          created_at?: string
          cultura?: string
          id?: string
          nome?: string
          observacoes?: string | null
          organizacao_id?: string
          propriedade_id?: string
          variedade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canteiros_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canteiros_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_inspecao: {
        Row: {
          created_at: string
          id: string
          inspecao_id: string
          legenda: string | null
          organizacao_id: string
          storage_path: string
          tipo_foto: Database["public"]["Enums"]["tipo_foto"]
        }
        Insert: {
          created_at?: string
          id?: string
          inspecao_id: string
          legenda?: string | null
          organizacao_id: string
          storage_path: string
          tipo_foto: Database["public"]["Enums"]["tipo_foto"]
        }
        Update: {
          created_at?: string
          id?: string
          inspecao_id?: string
          legenda?: string | null
          organizacao_id?: string
          storage_path?: string
          tipo_foto?: Database["public"]["Enums"]["tipo_foto"]
        }
        Relationships: [
          {
            foreignKeyName: "fotos_inspecao_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_inspecao_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecoes: {
        Row: {
          canteiro_id: string | null
          created_at: string
          data_inspecao: string
          folhas_manchadas: boolean | null
          frutos_maduros: boolean | null
          id: string
          luminosidade: number | null
          mato_alto: boolean | null
          observacao_manual: string | null
          organizacao_id: string
          plantas_fracas: boolean | null
          plastico_rasgado: boolean | null
          poucos_frutos: boolean | null
          pragas_visiveis: boolean | null
          propriedade_id: string | null
          risco: Database["public"]["Enums"]["risco_nivel"] | null
          setor_id: string | null
          solo_encharcado: boolean | null
          solo_seco: boolean | null
          status_geral: Database["public"]["Enums"]["status_geral"] | null
          temperatura: number | null
          umidade: number | null
          vistoriador_id: string | null
        }
        Insert: {
          canteiro_id?: string | null
          created_at?: string
          data_inspecao?: string
          folhas_manchadas?: boolean | null
          frutos_maduros?: boolean | null
          id?: string
          luminosidade?: number | null
          mato_alto?: boolean | null
          observacao_manual?: string | null
          organizacao_id: string
          plantas_fracas?: boolean | null
          plastico_rasgado?: boolean | null
          poucos_frutos?: boolean | null
          pragas_visiveis?: boolean | null
          propriedade_id?: string | null
          risco?: Database["public"]["Enums"]["risco_nivel"] | null
          setor_id?: string | null
          solo_encharcado?: boolean | null
          solo_seco?: boolean | null
          status_geral?: Database["public"]["Enums"]["status_geral"] | null
          temperatura?: number | null
          umidade?: number | null
          vistoriador_id?: string | null
        }
        Update: {
          canteiro_id?: string | null
          created_at?: string
          data_inspecao?: string
          folhas_manchadas?: boolean | null
          frutos_maduros?: boolean | null
          id?: string
          luminosidade?: number | null
          mato_alto?: boolean | null
          observacao_manual?: string | null
          organizacao_id?: string
          plantas_fracas?: boolean | null
          plastico_rasgado?: boolean | null
          poucos_frutos?: boolean | null
          pragas_visiveis?: boolean | null
          propriedade_id?: string | null
          risco?: Database["public"]["Enums"]["risco_nivel"] | null
          setor_id?: string | null
          solo_encharcado?: boolean | null
          solo_seco?: boolean | null
          status_geral?: Database["public"]["Enums"]["status_geral"] | null
          temperatura?: number | null
          umidade?: number | null
          vistoriador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspecoes_canteiro_id_fkey"
            columns: ["canteiro_id"]
            isOneToOne: false
            referencedRelation: "canteiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      perfis: {
        Row: {
          created_at: string
          id: string
          nome: string
          organizacao_id: string
          papel: Database["public"]["Enums"]["papel_perfil"]
          telefone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          nome: string
          organizacao_id: string
          papel?: Database["public"]["Enums"]["papel_perfil"]
          telefone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          organizacao_id?: string
          papel?: Database["public"]["Enums"]["papel_perfil"]
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtores: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          organizacao_id: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organizacao_id: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organizacao_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtores_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      propriedades: {
        Row: {
          cidade: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          organizacao_id: string
          produtor_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          organizacao_id: string
          produtor_id: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          organizacao_id?: string
          produtor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "propriedades_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propriedades_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          canteiro_id: string | null
          created_at: string
          id: string
          organizacao_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          propriedade_id: string | null
          resumo: Json | null
          storage_path: string | null
          titulo: string
        }
        Insert: {
          canteiro_id?: string | null
          created_at?: string
          id?: string
          organizacao_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          propriedade_id?: string | null
          resumo?: Json | null
          storage_path?: string | null
          titulo: string
        }
        Update: {
          canteiro_id?: string | null
          created_at?: string
          id?: string
          organizacao_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          propriedade_id?: string | null
          resumo?: Json | null
          storage_path?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_canteiro_id_fkey"
            columns: ["canteiro_id"]
            isOneToOne: false
            referencedRelation: "canteiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          canteiro_id: string
          codigo: string
          coluna: number | null
          created_at: string
          id: string
          linha: number | null
          organizacao_id: string
          qr_code: string | null
          status_atual: Database["public"]["Enums"]["status_geral"] | null
        }
        Insert: {
          canteiro_id: string
          codigo: string
          coluna?: number | null
          created_at?: string
          id?: string
          linha?: number | null
          organizacao_id: string
          qr_code?: string | null
          status_atual?: Database["public"]["Enums"]["status_geral"] | null
        }
        Update: {
          canteiro_id?: string
          codigo?: string
          coluna?: number | null
          created_at?: string
          id?: string
          linha?: number | null
          organizacao_id?: string
          qr_code?: string | null
          status_atual?: Database["public"]["Enums"]["status_geral"] | null
        }
        Relationships: [
          {
            foreignKeyName: "setores_canteiro_id_fkey"
            columns: ["canteiro_id"]
            isOneToOne: false
            referencedRelation: "canteiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_recomendadas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          inspecao_id: string | null
          organizacao_id: string
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          setor_id: string | null
          status: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          inspecao_id?: string | null
          organizacao_id: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          setor_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          inspecao_id?: string | null
          organizacao_id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          setor_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_recomendadas_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_recomendadas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_recomendadas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_demo_data: { Args: never; Returns: undefined }
      current_org_id: { Args: never; Returns: string }
    }
    Enums: {
      papel_perfil: "admin" | "agronomo" | "vistoriador"
      prioridade_tarefa: "baixa" | "media" | "alta" | "urgente"
      risco_nivel: "baixo" | "medio" | "alto"
      status_geral: "normal" | "atencao" | "critico"
      status_tarefa: "pendente" | "em_andamento" | "concluida" | "cancelada"
      tipo_foto: "geral" | "plantas" | "folhas" | "frutos" | "solo" | "plastico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      papel_perfil: ["admin", "agronomo", "vistoriador"],
      prioridade_tarefa: ["baixa", "media", "alta", "urgente"],
      risco_nivel: ["baixo", "medio", "alto"],
      status_geral: ["normal", "atencao", "critico"],
      status_tarefa: ["pendente", "em_andamento", "concluida", "cancelada"],
      tipo_foto: ["geral", "plantas", "folhas", "frutos", "solo", "plastico"],
    },
  },
} as const
