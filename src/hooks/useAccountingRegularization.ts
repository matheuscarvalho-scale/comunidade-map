import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSecondaryAccount } from "@/hooks/useSecondaryLogins";
import { toast } from "@/hooks/use-toast";

/**
 * Reconfirmação obrigatória: pede a todos os membros se possuem gestão
 * contábil/fiscal e, se sim, qual. Aparece uma única vez por membro
 * (até `accounting_confirmed_at` ser preenchido).
 */
export function useAccountingRegularization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: isSecondary, isLoading: secondaryLoading } = useIsSecondaryAccount();

  const query = useQuery({
    queryKey: ["accounting-regularization", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("uses_accounting, accounting_service, accounting_confirmed_at, completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (payload: { usesAccounting: boolean; accountingService: string }) => {
      if (!user) return;
      // .select() garante que a linha foi realmente gravada — se voltar vazio,
      // lançamos erro e o modal permanece aberto em vez de "salvar" no vazio.
      const { data, error } = await supabase
        .from("user_onboarding")
        .update({
          uses_accounting: payload.usesAccounting,
          accounting_service: payload.usesAccounting ? payload.accountingService.trim() : null,
          accounting_confirmed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("accounting_confirmed_at");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Não foi possível salvar a confirmação de contabilidade.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-regularization"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });


  const isInternalEmail = (user?.email || "").toLowerCase().endsWith("@mapeducacao.com");

  const shouldShow = Boolean(
    !secondaryLoading &&
      !isSecondary &&
      !isInternalEmail &&
      query.data &&
      query.data.completed_at &&
      !query.data.accounting_confirmed_at
  );

  return {
    shouldShow,
    initialUsesAccounting: query.data?.uses_accounting ?? null,
    initialAccountingService: query.data?.accounting_service ?? "",
    save: (usesAccounting: boolean, accountingService: string) =>
      save.mutate({ usesAccounting, accountingService }),
    isSaving: save.isPending,
  };
}
