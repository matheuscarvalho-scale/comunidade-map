import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type CashbackStatus = 'pending' | 'confirmed' | 'expired' | 'approved' | 'paid' | 'rejected';

export interface CashbackTransaction {
  id: string;
  user_id: string;
  partner_id: string | null;
  partner_name: string;
  discount_percentage: number;
  estimated_value: number | null;
  purchase_amount: number | null;
  cashback_amount: number | null;
  usage_date: string;
  status: CashbackStatus;
  notes: string | null;
  proof_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: {
    name: string;
    avatar_url: string | null;
  };
  partner?: {
    name: string;
    logo_url: string | null;
    discount_percentage: number | null;
  };
}

export interface CreateCashbackRequest {
  partner_id: string;
  partner_name: string;
  discount_percentage: number;
  purchase_amount: number;
  notes?: string;
  proof_url?: string;
}

export function useCashbackComplete() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // User's own cashback transactions
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["cashback-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cashback_usage")
        .select(`
          *,
          partner:partners(name, logo_url, discount_percentage)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        status: item.status as CashbackStatus,
        partner: item.partner as CashbackTransaction['partner']
      })) as CashbackTransaction[];
    },
    enabled: !!user?.id,
  });

  // Request new cashback
  const requestCashbackMutation = useMutation({
    mutationFn: async (request: CreateCashbackRequest) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const cashback_amount = request.purchase_amount * (request.discount_percentage / 100);

      const { data, error } = await supabase
        .from("cashback_usage")
        .insert({
          user_id: user.id,
          partner_id: request.partner_id,
          partner_name: request.partner_name,
          discount_percentage: request.discount_percentage,
          estimated_value: request.purchase_amount,
          purchase_amount: request.purchase_amount,
          cashback_amount: cashback_amount,
          notes: request.notes,
          proof_url: request.proof_url,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashback-transactions", user?.id] });
      toast({
        title: "Cashback solicitado!",
        description: "Sua solicitação foi enviada e está em análise.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao solicitar",
        description: "Não foi possível registrar a solicitação de cashback.",
        variant: "destructive",
      });
      console.error("Error requesting cashback:", error);
    },
  });

  // Upload proof file
  const uploadProof = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("Usuário não autenticado");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('cashback-proofs')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('cashback-proofs')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  // Calculate totals
  const totalPending = transactions?.reduce((acc, item) => {
    if (item.cashback_amount && (item.status === 'pending' || item.status === 'confirmed')) {
      return acc + Number(item.cashback_amount);
    }
    return acc;
  }, 0) || 0;

  const totalApproved = transactions?.reduce((acc, item) => {
    if (item.cashback_amount && item.status === 'approved') {
      return acc + Number(item.cashback_amount);
    }
    return acc;
  }, 0) || 0;

  const totalPaid = transactions?.reduce((acc, item) => {
    if (item.cashback_amount && item.status === 'paid') {
      return acc + Number(item.cashback_amount);
    }
    return acc;
  }, 0) || 0;

  const totalBalance = totalApproved + totalPaid;

  return {
    transactions,
    isLoading,
    error,
    requestCashback: requestCashbackMutation.mutate,
    isRequesting: requestCashbackMutation.isPending,
    uploadProof,
    totalPending,
    totalApproved,
    totalPaid,
    totalBalance,
  };
}

// Admin hook for managing all cashback requests
export function useAdminCashback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // All cashback transactions (admin only)
  const { data: allTransactions, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-cashback-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cashback_usage")
        .select(`
          *,
          partner:partners(name, logo_url, discount_percentage)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        status: item.status as CashbackStatus,
        partner: item.partner as CashbackTransaction['partner']
      })) as CashbackTransaction[];
    },
  });

  // Get user profiles separately
  const { data: profiles } = useQuery({
    queryKey: ["admin-cashback-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url");

      if (error) throw error;
      return data;
    },
  });

  // Merge profiles with transactions
  const transactionsWithProfiles = allTransactions?.map(tx => ({
    ...tx,
    user_profile: profiles?.find(p => p.user_id === tx.user_id) || { name: 'Usuário', avatar_url: null }
  }));

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approved_by 
    }: { 
      id: string; 
      status: CashbackStatus; 
      approved_by?: string 
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'approved' || status === 'rejected' || status === 'paid') {
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("cashback_usage")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cashback-transactions"] });
      
      const statusLabels: Record<string, string> = {
        approved: 'aprovado',
        rejected: 'rejeitado',
        paid: 'marcado como pago',
        pending: 'voltou para pendente'
      };
      
      toast({
        title: "Status atualizado!",
        description: `Cashback ${statusLabels[variables.status] || 'atualizado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      console.error("Error updating cashback status:", error);
    },
  });

  // Stats
  const stats = {
    pending: allTransactions?.filter(t => t.status === 'pending' || t.status === 'confirmed').length || 0,
    approved: allTransactions?.filter(t => t.status === 'approved').length || 0,
    paid: allTransactions?.filter(t => t.status === 'paid').length || 0,
    rejected: allTransactions?.filter(t => t.status === 'rejected').length || 0,
    totalValue: allTransactions?.reduce((acc, t) => acc + (Number(t.cashback_amount) || 0), 0) || 0,
    pendingValue: allTransactions?.filter(t => t.status === 'pending' || t.status === 'confirmed')
      .reduce((acc, t) => acc + (Number(t.cashback_amount) || 0), 0) || 0,
  };

  return {
    transactions: transactionsWithProfiles,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    stats,
  };
}
