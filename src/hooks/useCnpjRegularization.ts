import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSecondaryAccount } from "@/hooks/useSecondaryLogins";

/**
 * Pede o CNPJ para membros que concluíram o onboarding ANTES do campo existir.
 * Contas secundárias não são cobradas (o CNPJ é da empresa titular).
 */
export function useCnpjRegularization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: isSecondary, isLoading: secondaryLoading } = useIsSecondaryAccount();

  const query = useQuery({
    queryKey: ["cnpj-regularization", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("cnpj, completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (cnpj: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("user_onboarding")
        .update({ cnpj })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnpj-regularization"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });

  const isInternalEmail = (user?.email || "").toLowerCase().endsWith("@mapeducacao.com");

  const shouldShow = Boolean(
    !secondaryLoading &&
      !isSecondary &&
      !isInternalEmail &&
      query.data &&
      query.data.completed_at &&
      !(query.data.cnpj || "").trim()
  );

  return {
    shouldShow,
    save: (cnpj: string) => save.mutate(cnpj),
    isSaving: save.isPending,
  };
}
