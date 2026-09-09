import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CURRENT_TERMS_VERSION = "3.1";

export interface OnboardingData {
  id: string;
  user_id: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
  current_step: number;
  completed_at: string | null;
  full_name: string | null;
  whatsapp: string | null;
  city_state: string | null;
  experience_level: string | null;
  business_models: string[] | null;
  main_goal: string | null;
  weekly_hours: string | null;
  revenue_goal: string | null;
  sales_channels: string[] | null;
  ecommerce_platform: string | null;
  uses_erp: boolean | null;
  erp_tools: string[] | null;
  erp_other: string | null;
  uses_ai: boolean | null;
  ai_tools: string | null;
  uses_accounting: boolean | null;
  accounting_service: string | null;
  has_supplier_difficulty: boolean | null;
  supplier_needs: string | null;
  business_niche: string | null;
  business_niche_other: string | null;
  employee_range: string | null;
  average_ticket: string | null;
  company: string | null;
  job_title: string | null;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnboarding() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingData | null;
    },
    enabled: !!user,
  });
}

export function useCreateOnboarding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_onboarding")
        .insert({ user_id: user.id, current_step: 0 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useAcceptTerms() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc('accept_terms', {
        version_text: CURRENT_TERMS_VERSION,
        user_agent_text: navigator.userAgent
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useUpdateOnboarding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<OnboardingData>) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_onboarding")
        .update(data)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (avatarUrl?: string) => {
      if (!user) throw new Error("Not authenticated");

      // Get onboarding data to sync with profile
      const { data: onboardingData } = await supabase
        .from("user_onboarding")
        .select("full_name, city_state, experience_level, company, job_title")
        .eq("user_id", user.id)
        .single();

      // Complete onboarding
      const { error: onboardingError } = await supabase
        .from("user_onboarding")
        .update({
          current_step: 12,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (onboardingError) throw onboardingError;

      // Sync onboarding data to profile (name, location, experience)
      const profileUpdate: Record<string, string | null> = {};
      if (onboardingData?.full_name) profileUpdate.name = onboardingData.full_name;
      if (onboardingData?.city_state) {
        profileUpdate.location = onboardingData.city_state;
        const match = onboardingData.city_state.match(/^(.+?)\s*[-,]\s*(.+)$/);
        if (match) {
          profileUpdate.location_city = match[1].trim();
          profileUpdate.location_state = match[2].trim();
        }
      }
      if (onboardingData?.experience_level) profileUpdate.experience_level = onboardingData.experience_level;
      if ((onboardingData as any)?.company) profileUpdate.company = (onboardingData as any).company;
      if ((onboardingData as any)?.job_title) profileUpdate.job_title = (onboardingData as any).job_title;
      if (avatarUrl) profileUpdate.avatar_url = avatarUrl;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", user.id);

        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
