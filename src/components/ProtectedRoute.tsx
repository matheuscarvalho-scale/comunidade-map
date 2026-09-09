import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding, CURRENT_TERMS_VERSION } from "@/hooks/useOnboarding";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermission } from "@/hooks/usePermission";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipSubscriptionCheck?: boolean;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, skipSubscriptionCheck = false, requiredPermission }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: onboarding, isLoading: onboardingLoading } = useOnboarding();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { hasPermission, isLoading: permissionLoading } = usePermission();
  const location = useLocation();

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-lime" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while checking onboarding status
  // Only block on first load (no cached data)
  if (onboardingLoading && !onboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-lime" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not completed OR terms mismatch (and not already on onboarding page)
  if (location.pathname !== "/onboarding") {
    if (!onboarding || !onboarding.completed_at || onboarding.terms_version !== CURRENT_TERMS_VERSION) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Subscription check runs in background — never block UI with a loader.
  // The redirect below only fires once data arrives and confirms expiration.

  // Redirect to subscription expired page IMMEDIATELY if subscription is expired
  // But allow access to /perfil and /assinatura-expirada so user can renew
  if (
    !skipSubscriptionCheck && 
    subscription && 
    !subscription.canAccess && 
    location.pathname !== "/assinatura-expirada" &&
    location.pathname !== "/perfil"
  ) {
    return <Navigate to="/assinatura-expirada" replace />;
  }

  // Check required permission
  if (requiredPermission) {
    if (permissionLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-lime" />
            <p className="text-muted-foreground">Verificando permissões...</p>
          </div>
        </div>
      );
    }
    if (!hasPermission(requiredPermission)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}