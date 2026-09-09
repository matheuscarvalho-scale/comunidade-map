import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type SecondaryLoginStatus = 'pending' | 'approved' | 'rejected';

export interface SecondaryLoginRequest {
  id: string;
  user_id: string;
  secondary_email: string;
  secondary_name: string;
  relationship: string;
  justification: string | null;
  status: SecondaryLoginStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecondaryLogin {
  id: string;
  primary_user_id: string;
  secondary_user_id: string | null;
  secondary_email: string;
  secondary_name: string;
  relationship: string;
  request_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSecondaryLoginRequest {
  secondary_email: string;
  secondary_name: string;
  relationship: string;
  justification?: string;
}

// Hook to detect if current user is a secondary account
export function useIsSecondaryAccount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-secondary-account", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("secondary_logins")
        .select("id, primary_user_id, secondary_name, relationship")
        .eq("secondary_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data; // null if not secondary, object if secondary
    },
    enabled: !!user?.id,
  });
}

// Hook to fetch organization members for a secondary account
export function useOrganizationMembers(primaryUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["organization-members", primaryUserId],
    queryFn: async () => {
      if (!primaryUserId) return [];

      const { data, error } = await supabase
        .from("secondary_logins")
        .select("id, secondary_email, secondary_name, relationship, created_at, secondary_user_id")
        .eq("primary_user_id", primaryUserId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!primaryUserId,
  });
}

export function useSecondaryLogins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's own requests
  const { data: myRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["secondary-login-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("secondary_login_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        status: item.status as SecondaryLoginStatus
      })) as SecondaryLoginRequest[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's approved secondary logins
  const { data: mySecondaryLogins, isLoading: isLoadingLogins } = useQuery({
    queryKey: ["secondary-logins", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("secondary_logins")
        .select("*")
        .eq("primary_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SecondaryLogin[];
    },
    enabled: !!user?.id,
  });

  // Create new request
  const createRequestMutation = useMutation({
    mutationFn: async (request: CreateSecondaryLoginRequest) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("secondary_login_requests")
        .insert({
          user_id: user.id,
          secondary_email: request.secondary_email,
          secondary_name: request.secondary_name,
          relationship: request.relationship,
          justification: request.justification,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admin about new request — edge function will resolve email/name via service role
      supabase.functions.invoke("notify-secondary-login", {
        body: {
          type: "new_request",
          requestId: data.id,
          primaryUserId: user.id,
          secondaryName: request.secondary_name,
          secondaryEmail: request.secondary_email,
          relationship: request.relationship,
        },
      }).catch(console.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondary-login-requests", user?.id] });
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação será analisada pela equipe.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Não foi possível enviar a solicitação. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error creating secondary login request:", error);
    },
  });

  return {
    myRequests,
    mySecondaryLogins,
    isLoading: isLoadingRequests || isLoadingLogins,
    createRequest: createRequestMutation.mutate,
    isCreating: createRequestMutation.isPending,
  };
}

// Admin hook for managing all requests
export function useAdminSecondaryLogins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all pending requests (admin only)
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ["admin-secondary-login-requests", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_login_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        status: item.status as SecondaryLoginStatus
      })) as SecondaryLoginRequest[];
    },
    enabled: !!user?.id,
  });

  // Fetch all requests (admin only)
  const { data: allRequests, isLoading: isLoadingAll } = useQuery({
    queryKey: ["admin-secondary-login-requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_login_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        status: item.status as SecondaryLoginStatus
      })) as SecondaryLoginRequest[];
    },
    enabled: !!user?.id,
  });

  // Approve request
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // First, get the request details
      const { data: request, error: fetchError } = await supabase
        .from("secondary_login_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { error: updateError } = await supabase
        .from("secondary_login_requests")
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create secondary login entry
      const { error: insertError } = await supabase
        .from("secondary_logins")
        .insert({
          primary_user_id: request.user_id,
          secondary_email: request.secondary_email,
          secondary_name: request.secondary_name,
          relationship: request.relationship,
          request_id: requestId,
          is_active: true,
        });

      if (insertError) throw insertError;

      // Notify member about approval — edge function resolves email/name via service role
      const { error: notifyError } = await supabase.functions.invoke("notify-secondary-login", {
        body: {
          type: "approved",
          requestId,
          primaryUserId: request.user_id,
          secondaryName: request.secondary_name,
          secondaryEmail: request.secondary_email,
          relationship: request.relationship,
        },
      });
      if (notifyError) {
        console.error("notify-secondary-login (approved) failed:", notifyError);
        throw new Error("Aprovação registrada, mas falha ao criar conta/enviar email. Reenvie manualmente.");
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-secondary-login-requests"] });
      toast({
        title: "Solicitação aprovada!",
        description: "O login secundário foi criado e o membro foi notificado por email.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar",
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      });
      console.error("Error approving request:", error);
    },
  });

  // Reject request
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get request details before updating
      const { data: request, error: fetchError } = await supabase
        .from("secondary_login_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("secondary_login_requests")
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Notify member about rejection — edge function resolves email/name via service role
      const { error: notifyError } = await supabase.functions.invoke("notify-secondary-login", {
        body: {
          type: "rejected",
          requestId,
          primaryUserId: request.user_id,
          secondaryName: request.secondary_name,
          secondaryEmail: request.secondary_email,
          relationship: request.relationship,
          rejectionReason: reason,
        },
      });
      if (notifyError) {
        console.error("notify-secondary-login (rejected) failed:", notifyError);
        throw new Error("Rejeição registrada, mas falha ao enviar email.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-secondary-login-requests"] });
      toast({
        title: "Solicitação rejeitada",
        description: "O membro foi notificado por email sobre a rejeição.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      });
      console.error("Error rejecting request:", error);
    },
  });

  return {
    pendingRequests,
    allRequests,
    isLoading: isLoadingPending || isLoadingAll,
    approve: approveMutation.mutate,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,
  };
}
