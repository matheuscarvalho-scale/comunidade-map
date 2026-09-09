import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type CashbackStatus = 'pending' | 'confirmed' | 'expired';

export interface CashbackUsage {
  id: string;
  user_id: string;
  partner_id: string | null;
  partner_name: string;
  discount_percentage: number;
  estimated_value: number | null;
  usage_date: string;
  status: CashbackStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCashbackUsage {
  partner_id: string;
  partner_name: string;
  discount_percentage: number;
  estimated_value?: number;
  notes?: string;
}

export function useCashback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cashbackHistory, isLoading, error } = useQuery({
    queryKey: ["cashback-usage", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cashback_usage")
        .select("*")
        .eq("user_id", user.id)
        .order("usage_date", { ascending: false });

      if (error) throw error;
      
      // Cast the status field to our typed enum
      return (data || []).map(item => ({
        ...item,
        status: item.status as CashbackStatus
      })) as CashbackUsage[];
    },
    enabled: !!user?.id,
  });

  const registerUsageMutation = useMutation({
    mutationFn: async (usage: CreateCashbackUsage) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cashback_usage")
        .insert({
          user_id: user.id,
          partner_id: usage.partner_id,
          partner_name: usage.partner_name,
          discount_percentage: usage.discount_percentage,
          estimated_value: usage.estimated_value,
          notes: usage.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashback-usage", user?.id] });
      toast({
        title: "Benefício registrado!",
        description: "Seu uso do benefício foi registrado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar o uso do benefício.",
        variant: "destructive",
      });
      console.error("Error registering cashback usage:", error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CashbackStatus }) => {
      const { data, error } = await supabase
        .from("cashback_usage")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashback-usage", user?.id] });
    },
  });

  // Calculate totals
  const totalSavings = cashbackHistory?.reduce((acc, item) => {
    if (item.estimated_value && item.status !== 'expired') {
      return acc + Number(item.estimated_value);
    }
    return acc;
  }, 0) || 0;

  const confirmedSavings = cashbackHistory?.reduce((acc, item) => {
    if (item.estimated_value && item.status === 'confirmed') {
      return acc + Number(item.estimated_value);
    }
    return acc;
  }, 0) || 0;

  const pendingCount = cashbackHistory?.filter(item => item.status === 'pending').length || 0;

  return {
    cashbackHistory,
    isLoading,
    error,
    registerUsage: registerUsageMutation.mutate,
    isRegistering: registerUsageMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    totalSavings,
    confirmedSavings,
    pendingCount,
  };
}
