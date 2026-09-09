import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ExtraBenefitType =
  | "mentoria_individual"
  | "mentoria_individual_pedro"
  | "mentoria_individual_valenca"
  | "vip_extra_map_xp"
  | "outro";

export type ExtraBenefitStatus =
  | "concedido"
  | "pendente"
  | "em_uso"
  | "entregue"
  | "expirado"
  | "cancelado";

export interface ExtraBenefit {
  id: string;
  member_id: string;
  benefit_type: ExtraBenefitType;
  title: string;
  description: string | null;
  quantity_granted: number;
  quantity_used: number;
  status: ExtraBenefitStatus;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const BENEFIT_TYPE_LABELS: Record<ExtraBenefitType, string> = {
  mentoria_individual: "Mentoria Individual",
  mentoria_individual_pedro: "Mentoria Individual (Pedro)",
  mentoria_individual_valenca: "Mentoria Individual (Valença)",
  vip_extra_map_xp: "VIP Extra MAP Experience 2026",
  outro: "Outro",
};

export const BENEFIT_STATUS_LABELS: Record<ExtraBenefitStatus, string> = {
  concedido: "Concedido",
  pendente: "Pendente",
  em_uso: "Em Uso",
  entregue: "Entregue",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const BENEFIT_STATUS_COLORS: Record<ExtraBenefitStatus, string> = {
  concedido: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  em_uso: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  entregue: "bg-muted text-muted-foreground border-border",
  expirado: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelado: "bg-muted text-muted-foreground border-border line-through",
};

export interface ExtraBenefitWithProfile extends ExtraBenefit {
  member_name?: string;
  member_avatar?: string | null;
}

export function useExtraBenefits(memberId?: string) {
  return useQuery({
    queryKey: ["extra-benefits", memberId],
    queryFn: async () => {
      let query = supabase
        .from("extra_benefits")
        .select("*, profiles!extra_benefits_member_id_fkey(name, avatar_url)")
        .order("granted_at", { ascending: false });

      if (memberId) {
        query = query.eq("member_id", memberId);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: fallback, error: err2 } = await supabase
          .from("extra_benefits")
          .select("*")
          .order("granted_at", { ascending: false });
        if (err2) throw err2;
        return (fallback || []) as ExtraBenefitWithProfile[];
      }
      return (data || []).map((d: any) => ({
        ...d,
        member_name: d.profiles?.name || null,
        member_avatar: d.profiles?.avatar_url || null,
        profiles: undefined,
      })) as ExtraBenefitWithProfile[];
    },
  });
}

export function useCreateExtraBenefit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: Omit<ExtraBenefit, "id" | "created_at" | "updated_at" | "granted_by" | "granted_at">
    ) => {
      const { data, error } = await supabase
        .from("extra_benefits")
        .insert({
          ...input,
          granted_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extra-benefits"] });
    },
  });
}

export function useUpdateExtraBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ExtraBenefit> & { id: string }) => {
      // Auto-update status based on quantity usage
      if (updates.quantity_used !== undefined) {
        // Fetch current benefit to check quantity_granted
        const { data: current } = await supabase
          .from("extra_benefits")
          .select("quantity_granted, status")
          .eq("id", id)
          .single();

        if (current) {
          if (updates.quantity_used >= current.quantity_granted && current.status !== "entregue") {
            updates.status = "entregue" as ExtraBenefitStatus;
          } else if (updates.quantity_used < current.quantity_granted && current.status === "entregue") {
            updates.status = "concedido" as ExtraBenefitStatus;
          }
        }
      }

      const { data, error } = await supabase
        .from("extra_benefits")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extra-benefits"] });
    },
  });
}

export function useDeleteExtraBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("extra_benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extra-benefits"] });
    },
  });
}
