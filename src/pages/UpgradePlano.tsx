import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import {
  ArrowUp, CheckCircle2, Crown, Flame,
  Loader2, MessageCircle, Rocket, Shield, Star,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSubscription, getPlanDisplayName } from "@/hooks/useSubscription";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";

const WHATSAPP_NUMBER = "5522992739203";
const PLAN_HIERARCHY = ["basic", "pro", "business"];

const plans = [
  {
    id: "basic",
    name: "Basic",
    priceMonthly: "197",
    icon: Rocket,
    highlight: false,
    badge: null,
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: "497",
    icon: Star,
    highlight: true,
    badge: "MAIS POPULAR",
    features: [
      "Tudo do Basic +",
      "Mentorias em grupo semanais",
      "Webinars exclusivos com especialistas",
      "Grupo VIP no WhatsApp",
      "VIP na próxima edição do MAP Experience",
      "50% off no MAP in Rio",
      "Evento presencial exclusivo 'MAP.IA'",
      "Evento presencial exclusivo 'Precifica MAP'",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: "997",
    icon: Crown,
    highlight: false,
    badge: "PREMIUM",
    features: [
      "Tudo do Pro +",
      "2 mentorias individuais focadas no seu negócio",
      "1 mentoria por mês com CEOs da MAP (João ou Pedro)",
      "Prioridade em todas as ações da comunidade",
    ],
  },
];

function normalizePlan(plan: string | null): string {
  if (!plan) return "basic";
  if (plan === "starter") return "basic";
  if (plan === "enterprise") return "business";
  return plan;
}

export default function UpgradePlano() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: subscription, isLoading } = useSubscription();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const currentPlan = normalizePlan(subscription?.plan || null);
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
  const isMaxPlan = currentPlan === "business";

  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(theme === "dark");
      }
    };
    checkDarkMode();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);
    return () => mediaQuery.removeEventListener("change", checkDarkMode);
  }, [theme]);

  const handleUpgradeClick = (targetPlanName: string) => {
    const currentDisplay = getPlanDisplayName(currentPlan);
    const message = `Olá! Sou membro do plano ${currentDisplay} e quero fazer upgrade para o plano ${targetPlanName}.`;
    const url = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
    window.open(url, "_blank");
  };

  const getPlanStatus = (planId: string) => {
    if (planId === currentPlan) return "current";
    if (PLAN_HIERARCHY.indexOf(planId) > currentIndex) return "upgradeable";
    return "lower";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Upgrade de Plano"
        description="Faça upgrade do seu plano MAP Acelera"
        canonical="/upgrade"
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={isDarkMode ? logoMapDark : logoMapLight} alt="MAP" className="h-8 w-auto" />
          </button>
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-full">
            Voltar ao painel
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-6">
            <ArrowUp className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Upgrade de Plano</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ lineHeight: "1.1" }}>
            {isMaxPlan ? (
              <>Você está no plano <span className="text-primary">máximo</span></>
            ) : (
              <>Evolua seu <span className="text-primary">plano</span></>
            )}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {isMaxPlan
              ? "Você já possui acesso completo a todos os benefícios do MAP Acelera. Aproveite!"
              : "Escolha o plano ideal para desbloquear mais benefícios. Clique no plano desejado para falar com nossa equipe."
            }
          </p>
        </div>
      </section>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        /* Plans Grid */
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const status = getPlanStatus(plan.id);
                const isCurrent = status === "current";
                const isLower = status === "lower";
                const isUpgradeable = status === "upgradeable";

                return (
                  <div key={plan.id} className="flex flex-col">
                    {!plan.highlight && <div className="h-[36px] hidden md:block" />}
                    <Card
                      className={`relative overflow-hidden transition-all duration-300 flex flex-col flex-1 ${
                        isCurrent
                          ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                          : isLower
                          ? "border-border/30 bg-card/30 opacity-60"
                          : isUpgradeable
                          ? "border-border/50 bg-card/50 hover:border-primary/50 hover:scale-[1.02] cursor-pointer"
                          : "border-border/50 bg-card/50"
                      }`}
                      onClick={isUpgradeable ? () => handleUpgradeClick(plan.name) : undefined}
                    >
                      {/* Badge area */}
                      {(plan.badge || isCurrent) && (
                        <div className={`px-6 py-2 ${plan.highlight || isCurrent ? "" : "pt-6"}`}>
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground">
                              <Shield className="h-3 w-3" />
                              Seu plano atual
                            </span>
                          ) : plan.badge ? (
                            <span
                              className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                plan.highlight
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {plan.badge}
                            </span>
                          ) : null}
                        </div>
                      )}

                      <CardContent className="p-8 flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isCurrent
                                ? "bg-primary/20"
                                : isLower
                                ? "bg-muted/50"
                                : plan.highlight
                                ? "bg-primary/20"
                                : "bg-muted"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isCurrent || plan.highlight ? "text-primary" : isLower ? "text-muted-foreground/50" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-muted-foreground">R$</span>
                            <span className={`text-5xl font-bold ${isCurrent || plan.highlight ? "text-primary" : ""}`}>
                              {plan.priceMonthly}
                            </span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Assinatura anual</p>
                        </div>

                        <div className="space-y-3 mb-8 flex-1">
                          {plan.features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <CheckCircle2
                                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                  isLower ? "text-muted-foreground/40" : "text-primary"
                                }`}
                              />
                              <span className={`text-sm ${isLower ? "text-muted-foreground/60" : ""}`}>{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        {isCurrent && (
                          <Button
                            size="lg"
                            disabled
                            className="w-full rounded-full gap-2 text-base py-6 bg-primary/20 text-primary cursor-default"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Plano ativo
                          </Button>
                        )}
                        {isLower && (
                          <Button
                            size="lg"
                            disabled
                            className="w-full rounded-full gap-2 text-base py-6 bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                          >
                            Incluído no seu plano
                          </Button>
                        )}
                        {isUpgradeable && (
                          <Button
                            size="lg"
                            className="w-full rounded-full gap-2 text-base py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradeClick(plan.name);
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                            Fazer upgrade para {plan.name}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              O upgrade é uma cobrança complementar. Seu parcelamento anterior continua normalmente.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={isDarkMode ? logoMapDark : logoMapLight} alt="MAP" className="h-6 w-auto" />
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">© 2024 MAP Educação. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
