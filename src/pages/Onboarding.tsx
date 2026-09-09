import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding, useCreateOnboarding, useCompleteOnboarding, CURRENT_TERMS_VERSION } from "@/hooks/useOnboarding";
import { useIsSecondaryAccount } from "@/hooks/useSecondaryLogins";
import { TermsModal } from "@/components/onboarding/TermsModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: onboarding, isLoading: onboardingLoading } = useOnboarding();
  const { data: isSecondary, isLoading: secondaryLoading } = useIsSecondaryAccount();
  const createOnboarding = useCreateOnboarding();
  const completeOnboarding = useCompleteOnboarding();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if onboarding is complete AND terms accepted
  useEffect(() => {
    if (onboarding?.completed_at && onboarding.terms_version === CURRENT_TERMS_VERSION) {
      navigate("/", { replace: true });
    }
  }, [onboarding, navigate]);

  // Create onboarding record if it doesn't exist
  useEffect(() => {
    if (user && !onboardingLoading && !onboarding && !createOnboarding.isPending) {
      createOnboarding.mutate();
    }
  }, [user, onboardingLoading, onboarding, createOnboarding]);

  // Secondary members only accept the terms — they never go through the onboarding wizard.
  // Once the terms are accepted, auto-complete their onboarding so ProtectedRoute lets them in
  // and the redirect effect above sends them straight to the platform.
  useEffect(() => {
    if (
      onboarding?.terms_accepted_at &&
      onboarding.terms_version === CURRENT_TERMS_VERSION &&
      !onboarding.completed_at &&
      isSecondary &&
      !completeOnboarding.isPending
    ) {
      completeOnboarding.mutate(undefined);
    }
  }, [onboarding, isSecondary, completeOnboarding]);

  if (authLoading || onboardingLoading || !onboarding) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  // Show terms if not accepted OR if the accepted version is outdated (reaceite)
  if (!onboarding.terms_accepted_at || onboarding.terms_version !== CURRENT_TERMS_VERSION) {
    return <TermsModal />;
  }

  // Already completed onboarding (reaceite de termos): the effect above redirects to "/".
  // Render a loader instead of the wizard so an existing member never re-enters the steps.
  if (onboarding.completed_at) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  // Secondary members skip the wizard entirely: show a loader while we detect the account
  // type and auto-complete their onboarding (redirect to "/" handled by the effect above).
  if (secondaryLoading || isSecondary) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  // Show onboarding wizard (new primary members only)
  return <OnboardingWizard />;
}
