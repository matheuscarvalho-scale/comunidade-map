import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Plan hierarchy for client-side navigation logic only (no prices)
const PLAN_HIERARCHY = ["basic", "pro", "business"];

export interface UpgradeQuote {
  current_plan: string;
  current_plan_label: string;
  current_plan_monthly: number;
  current_plan_annual: number;
  target_plan: string;
  target_plan_label: string;
  target_plan_monthly: number;
  target_plan_annual: number;
  upgrade_amount: number;
  installment_options: { installments: number; installment_value: number; total: number }[];
  subscription_active: boolean;
}

export interface UpgradeResult {
  success: boolean;
  upgrade_id: string;
  current_plan: string;
  new_plan: string;
  current_plan_label: string;
  new_plan_label: string;
  current_plan_value: number;
  new_plan_value: number;
  upgrade_amount: number;
  installments: number;
  installment_value: number;
  asaas_payment_id: string;
  invoice_url: string | null;
  status: string;
}

export interface PlanUpgrade {
  id: string;
  user_id: string;
  current_plan: string;
  new_plan: string;
  current_plan_value: number;
  new_plan_value: number;
  amount_already_paid: number;
  upgrade_amount: number;
  installments: number;
  status: string;
  asaas_payment_id: string | null;
  invoice_url: string | null;
  external_reference: string | null;
  paid_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  webhook_received_at: string | null;
  created_at: string;
  updated_at: string;
}

function normalizePlan(plan: string | null): string {
  if (!plan) return "basic";
  if (plan === "starter") return "basic";
  if (plan === "enterprise") return "business";
  return plan;
}

export function canUpgradeTo(currentPlan: string | null, targetPlan: string): boolean {
  if (!currentPlan) return false;
  const currentIdx = PLAN_HIERARCHY.indexOf(normalizePlan(currentPlan));
  const targetIdx = PLAN_HIERARCHY.indexOf(targetPlan);
  return targetIdx > currentIdx;
}

export function getAvailableUpgrades(currentPlan: string | null): string[] {
  if (!currentPlan) return [];
  return PLAN_HIERARCHY.filter((p) => canUpgradeTo(currentPlan, p));
}

/** Fetch upgrade quote from backend — prices come exclusively from the server */
export function useUpgradeQuote(targetPlan: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["upgrade-quote", user?.id, targetPlan],
    queryFn: async (): Promise<UpgradeQuote> => {
      const { data, error } = await supabase.functions.invoke("get-upgrade-quote", {
        body: { target_plan: targetPlan },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as UpgradeQuote;
    },
    enabled: !!user && !!targetPlan,
  });
}

/** Fetch quotes for all available upgrade targets at once */
export function useAllUpgradeQuotes(currentPlan: string | null) {
  const { user } = useAuth();
  const targets = getAvailableUpgrades(currentPlan);

  return useQuery({
    queryKey: ["upgrade-quotes-all", user?.id, currentPlan],
    queryFn: async (): Promise<Record<string, UpgradeQuote>> => {
      const results: Record<string, UpgradeQuote> = {};
      await Promise.all(
        targets.map(async (plan) => {
          const { data, error } = await supabase.functions.invoke("get-upgrade-quote", {
            body: { target_plan: plan },
          });
          if (!error && !data.error) {
            results[plan] = data as UpgradeQuote;
          }
        })
      );
      return results;
    },
    enabled: !!user && targets.length > 0,
  });
}

export function usePlanUpgrade() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pendingUpgrade = useQuery({
    queryKey: ["pending-upgrade", user?.id],
    queryFn: async (): Promise<PlanUpgrade | null> => {
      const { data, error } = await supabase
        .from("plan_upgrades")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["pending", "payment_created"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PlanUpgrade | null;
    },
    enabled: !!user,
  });

  const upgradeHistory = useQuery({
    queryKey: ["upgrade-history", user?.id],
    queryFn: async (): Promise<PlanUpgrade[]> => {
      const { data, error } = await supabase
        .from("plan_upgrades")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as PlanUpgrade[]) || [];
    },
    enabled: !!user,
  });

  const createUpgrade = useMutation({
    mutationFn: async ({ newPlan, installments }: { newPlan: string; installments: number }): Promise<UpgradeResult> => {
      const { data, error } = await supabase.functions.invoke("create-plan-upgrade", {
        body: { new_plan: newPlan, installments },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao criar upgrade");

      return data as UpgradeResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-upgrade"] });
      queryClient.invalidateQueries({ queryKey: ["upgrade-history"] });
      queryClient.invalidateQueries({ queryKey: ["upgrade-quotes-all"] });
    },
  });

  return {
    pendingUpgrade,
    upgradeHistory,
    createUpgrade,
  };
}
