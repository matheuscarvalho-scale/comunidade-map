import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { FeatureGate } from "@/components/FeatureGate";
import Auth from "./pages/Auth";
import { GoogleAnalyticsTracker } from "./components/analytics/GoogleAnalyticsTracker";
import { AchievementNotificationWatcher } from "./components/conquistas/AchievementNotificationToast";
import { AiAssistantWidget } from "./components/ai/AiAssistantWidget";
import { HomeRoute } from "./components/HomeRoute";
import { DONA_OLGA_EXTRA_USER_IDS } from "./lib/donaOlgaAccess";


// Lazy-loaded pages
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Mentorias = React.lazy(() => import("./pages/Mentorias"));
const Conquistas = React.lazy(() => import("./pages/Conquistas"));
const ConquistasRanking = React.lazy(() => import("./pages/ConquistasRanking"));
const Recursos = React.lazy(() => import("./pages/Recursos"));
const NetworkingList = React.lazy(() => import("./pages/NetworkingList"));
const MemberProfilePage = React.lazy(() => import("./pages/MemberProfilePage"));
const ConfigureNetworkingProfile = React.lazy(() => import("./pages/ConfigureNetworkingProfile"));
const PerfilCompleto = React.lazy(() => import("./pages/PerfilCompleto"));
const Parceiros = React.lazy(() => import("./pages/Parceiros"));
const AdminParceiros = React.lazy(() => import("./pages/AdminParceiros"));
const MeusBeneficios = React.lazy(() => import("./pages/MeusBeneficios"));
const ValidarCertificado = React.lazy(() => import("./pages/ValidarCertificado"));
const Certificados = React.lazy(() => import("./pages/Certificados"));
const CertificateExample = React.lazy(() => import("./pages/CertificateExample"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));

const Planos = React.lazy(() => import("./pages/Planos"));
const Noticias = React.lazy(() => import("./pages/Noticias"));
const Webinars = React.lazy(() => import("./pages/Webinars"));
const GestaoEquipe = React.lazy(() => import("./pages/GestaoEquipe"));
const AdminLoginsSecundarios = React.lazy(() => import("./pages/AdminLoginsSecundarios"));
const AdminWebhookLogs = React.lazy(() => import("./pages/AdminWebhookLogs"));
const AdminAssinaturas = React.lazy(() => import("./pages/AdminAssinaturas"));
const AdminWebinars = React.lazy(() => import("./pages/AdminWebinars"));
const AdminFormations = React.lazy(() => import("./pages/AdminFormations"));
const AdminFormationDetail = React.lazy(() => import("./pages/AdminFormationDetail"));
const AdminContentTracks = React.lazy(() => import("./pages/AdminContentTracks"));
const AdminContentTrackDetail = React.lazy(() => import("./pages/AdminContentTrackDetail"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SubscriptionExpired = React.lazy(() => import("./pages/SubscriptionExpired"));
const UpgradePlano = React.lazy(() => import("./pages/UpgradePlano"));
const SubscriptionSuccess = React.lazy(() => import("./pages/SubscriptionSuccess"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const FormacoesList = React.lazy(() => import("./pages/FormacoesList"));
const FormationDetail = React.lazy(() => import("./pages/FormationDetail"));
const FormationLessonPlayer = React.lazy(() => import("./pages/FormationLessonPlayer"));
const TrilhaConteudo = React.lazy(() => import("./pages/TrilhaConteudo"));
const TrilhaConteudoDetail = React.lazy(() => import("./pages/TrilhaConteudoDetail"));
const Sugestoes = React.lazy(() => import("./pages/Sugestoes"));
const SugestaoDetalhe = React.lazy(() => import("./pages/SugestaoDetalhe"));
const AdminVendedores = React.lazy(() => import("./pages/AdminVendedores"));
const AdminAnalytics = React.lazy(() => import("./pages/AdminAnalytics"));
const AdminContaAzulAuth = React.lazy(() => import("./pages/AdminContaAzulAuth"));
const VendaPublica = React.lazy(() => import("./pages/VendaPublica"));
const PainelVendedor = React.lazy(() => import("./pages/PainelVendedor"));
const SucessoVenda = React.lazy(() => import("./pages/SucessoVenda"));
const AdminCashback = React.lazy(() => import("./pages/AdminCashback"));
const MeuCashback = React.lazy(() => import("./pages/MeuCashback"));
const AdminDonaOlga = React.lazy(() => import("./pages/AdminDonaOlga"));
const Privacidade = React.lazy(() => import("./pages/Privacidade"));
const Termos = React.lazy(() => import("./pages/Termos"));
const ExcluirConta = React.lazy(() => import("./pages/ExcluirConta"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache curto evita refetch a cada navegação entre páginas (ganho gigante de perceived perf).
      // Queries que precisam estar sempre frescas devem sobrescrever staleTime: 0 individualmente.
      staleTime: 60_000, // 1 min
      gcTime: 5 * 60_000, // 5 min em memória
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="map-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/excluir-conta" element={<ExcluirConta />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/" element={<HomeRoute />} />

              
              {/* Formações */}
              <Route
                path="/formacoes"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="formacoes">
                      <FormacoesList />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formacoes/:id"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="formacoes">
                      <FormationDetail />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formacoes/aula/:id"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="formacoes">
                      <FormationLessonPlayer />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              
              {/* Trilha de Conteúdo */}
              <Route
                path="/trilha-conteudo"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="trilha-conteudo">
                      <TrilhaConteudo />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trilha-conteudo/:id"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="trilha-conteudo">
                      <TrilhaConteudoDetail />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/mentorias"
                element={
                  <ProtectedRoute requiredPermission="mentorship.access">
                    <FeatureGate featureKey="mentorias">
                      <Mentorias />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conquistas"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="conquistas">
                      <Conquistas />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conquistas/ranking"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="conquistas">
                      <ConquistasRanking />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recursos"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="recursos">
                      <Recursos />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/networking"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="networking">
                      <NetworkingList />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/networking/perfil/:id"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="networking">
                      <MemberProfilePage />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/networking/configurar"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="networking">
                      <ConfigureNetworkingProfile />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <PerfilCompleto />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/parceiros"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="parceiros">
                      <Parceiros />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/parceiros"
                element={
                  <ProtectedAdminRoute>
                    <AdminParceiros />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/meus-beneficios"
                element={
                  <ProtectedRoute>
                    <Navigate to="/parceiros?tab=beneficios" replace />
                  </ProtectedRoute>
                }
              />
               <Route
                 path="/certificados"
                 element={
                   <ProtectedRoute>
                     <FeatureGate featureKey="certificados">
                       <Certificados />
                     </FeatureGate>
                   </ProtectedRoute>
                 }
               />
               <Route path="/certificado-exemplo" element={<CertificateExample />} />
               <Route
                 path="/noticias"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="noticias">
                      <Noticias />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/webinars"
                element={
                  <ProtectedRoute requiredPermission="webinars.attend">
                    <FeatureGate featureKey="webinars">
                      <Webinars />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gestao-equipe"
                element={
                  <ProtectedRoute>
                    <GestaoEquipe />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logins-secundarios"
                element={
                  <ProtectedAdminRoute requiredPermission="subscriptions.manage">
                    <AdminLoginsSecundarios />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/webhook-logs"
                element={
                  <ProtectedAdminRoute>
                    <AdminWebhookLogs />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/dona-olga"
                element={
                  <ProtectedAdminRoute
                    allowedRoles={["admin_geral", "admin"]}
                    allowedUserIds={DONA_OLGA_EXTRA_USER_IDS}
                  >
                    <AdminDonaOlga />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/assinaturas"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_financeiro"]} requiredPermission="subscriptions.manage" blockInternalMembers>
                    <AdminAssinaturas />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/webinars"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_conteudo"]}>
                    <AdminWebinars />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/formations"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_conteudo"]}>
                    <AdminFormations />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/formations/:id"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_conteudo"]}>
                    <AdminFormationDetail />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/content-tracks"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_conteudo"]}>
                    <AdminContentTracks />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/content-tracks/:id"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_conteudo"]}>
                    <AdminContentTrackDetail />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/sugestoes"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="sugestoes">
                      <Sugestoes />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sugestoes/:id"
                element={
                  <ProtectedRoute>
                    <FeatureGate featureKey="sugestoes">
                      <SugestaoDetalhe />
                    </FeatureGate>
                  </ProtectedRoute>
                }
              />
              {/* Vendedores */}
              <Route
                path="/admin/vendedores"
                element={
                  <ProtectedAdminRoute>
                    <AdminVendedores />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedAdminRoute requiredPermission="analytics.manage">
                    <AdminAnalytics />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/conta-azul-auth"
                element={
                  <ProtectedAdminRoute allowedRoles={["admin_geral", "admin", "admin_financeiro"]}>
                    <AdminContaAzulAuth />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="/v/:slug" element={<VendaPublica />} />
              <Route
                path="/vendedor"
                element={
                  <ProtectedRoute>
                    <PainelVendedor />
                  </ProtectedRoute>
                }
              />
              <Route path="/sucesso-venda" element={<SucessoVenda />} />
              <Route path="/validar-certificado" element={<ValidarCertificado />} />
              <Route
                path="/upgrade"
                element={
                  <ProtectedRoute>
                    <UpgradePlano />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assinatura-expirada"
                element={
                  <ProtectedRoute skipSubscriptionCheck>
                    <SubscriptionExpired />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <GoogleAnalyticsTracker />
            <AchievementNotificationWatcher />
            <AiAssistantWidget />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
