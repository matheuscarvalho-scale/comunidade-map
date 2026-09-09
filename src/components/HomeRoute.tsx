import { Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FeatureGate } from "@/components/FeatureGate";

// Public landing eagerly imported (fast first paint / SEO LCP)
import LandingPage from "@/pages/LandingPage";

// Dashboard stays lazy so it only loads for authenticated users
const Dashboard = lazy(() => import("@/pages/Dashboard"));

/**
 * Route handler for `/`.
 * - Unauthenticated visitors (including Googlebot) see the public LandingPage
 *   so the homepage has indexable content.
 * - Authenticated members see the Dashboard (with subscription/permission gates).
 */
export function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-lime" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <ProtectedRoute>
      <FeatureGate featureKey="dashboard">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-lime" />
            </div>
          }
        >
          <Dashboard />
        </Suspense>
      </FeatureGate>
    </ProtectedRoute>
  );
}
