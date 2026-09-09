import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Gift,
  Loader2,
  HelpCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Crown,
  Star,
  Rocket,
  Lock,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useCashbackComplete } from "@/hooks/useCashbackComplete";
import { useAuth } from "@/contexts/AuthContext";
import { useExtraBenefits, BENEFIT_TYPE_LABELS, BENEFIT_STATUS_LABELS, BENEFIT_STATUS_COLORS, ExtraBenefitWithProfile } from "@/hooks/useExtraBenefits";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CashbackTransactionTable } from "@/components/cashback/CashbackTransactionTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const planBenefits: Record<string, number> = {
  basic: 2364,
  starter: 2364,
  pro: 4764,
  business: 7164,
  enterprise: 7164,
};

const planLabels: Record<string, string> = {
  basic: "Basic",
  starter: "Basic",
  pro: "Pro",
  business: "Business",
  enterprise: "Business",
};

const planIcons: Record<string, React.ElementType> = {
  basic: Rocket,
  starter: Rocket,
  pro: Star,
  business: Crown,
  enterprise: Crown,
};

interface PlanFeatureSet {
  name: string;
  features: string[];
}

const allPlans: PlanFeatureSet[] = [
  {
    name: "basic",
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
    ],
  },
  {
    name: "pro",
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
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
    name: "business",
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
      "Mentorias em grupo semanais",
      "Webinars exclusivos com especialistas",
      "Grupo VIP no WhatsApp",
      "VIP na próxima edição do MAP Experience",
      "50% off no MAP in Rio",
      "Evento presencial exclusivo 'MAP.IA'",
      "Evento presencial exclusivo 'Precifica MAP'",
      "2 mentorias individuais focadas no seu negócio",
      "1 mentoria por mês com CEOs da MAP (João ou Pedro)",
      "Prioridade em todas as ações da comunidade",
    ],
  },
];

function getUserPlanFeatures(userPlan: string): { included: string[]; locked: string[] } {
  const normalizedPlan = userPlan === "starter" ? "basic" : userPlan === "enterprise" ? "business" : userPlan;
  const userPlanData = allPlans.find((p) => p.name === normalizedPlan);
  const maxPlan = allPlans[allPlans.length - 1]; // business

  const included = userPlanData?.features || [];
  const locked = maxPlan.features.filter((f) => !included.includes(f));

  return { included, locked };
}

export default function MeusBeneficios() {
  const { data: profile } = useProfile();
  const { data: subscription } = useSubscription();
  const { user } = useAuth();
  const { transactions, isLoading } = useCashbackComplete();
  const { data: extraBenefits = [], isLoading: extrasLoading } = useExtraBenefits(user?.id);

  const userPlan = (subscription?.plan || "basic").toLowerCase();
  const initialBalance = planBenefits[userPlan] || 2364;
  const PlanIcon = planIcons[userPlan] || Rocket;

  const totalUsed =
    transactions?.reduce((acc, item) => {
      if (item.cashback_amount && (item.status === "approved" || item.status === "paid" || item.status === "confirmed")) {
        return acc + Number(item.cashback_amount);
      }
      return acc;
    }, 0) || 0;

  const pendingUsage =
    transactions?.reduce((acc, item) => {
      if (item.cashback_amount && item.status === "pending") {
        return acc + Number(item.cashback_amount);
      }
      return acc;
    }, 0) || 0;

  const currentBalance = Math.max(initialBalance - totalUsed, 0);
  const usagePercentage = Math.min((totalUsed / initialBalance) * 100, 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const { included, locked } = getUserPlanFeatures(userPlan);

  const activeExtras = extraBenefits.filter(
    (b) => b.status === "concedido" || b.status === "em_uso" || b.status === "pendente"
  );
  const completedExtras = extraBenefits.filter(
    (b) => b.status === "entregue" || b.status === "expirado" || b.status === "cancelado"
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Meus Benefícios</h1>
            </div>
            <p className="text-muted-foreground">
              Acompanhe todos os benefícios do seu plano {planLabels[userPlan] || "MAP"}
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/parceiros">
              <Gift className="h-5 w-5" />
              Ver Parceiros
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="plano" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plano">Benefícios do Plano</TabsTrigger>
            <TabsTrigger value="extras">
              Extras
              {activeExtras.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeExtras.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saldo">Saldo & Cashback</TabsTrigger>
          </TabsList>

          {/* ========== TAB: Benefícios do Plano ========== */}
          <TabsContent value="plano" className="space-y-6 mt-6">
            {/* Current Plan Card */}
            <Card className="card-glow border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/20">
                    <PlanIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Plano {planLabels[userPlan]}
                    </CardTitle>
                    <CardDescription>
                      Confira tudo que está incluído no seu plano
                    </CardDescription>
                  </div>
                  <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {included.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Locked Features - Upgrade Incentive */}
            {locked.length > 0 && (
              <Card className="border-dashed border-muted-foreground/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-muted">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-muted-foreground">
                        Disponível em planos superiores
                      </CardTitle>
                      <CardDescription>
                        Faça upgrade para desbloquear mais benefícios
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {locked.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg opacity-60">
                        <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link to="/planos">
                      <ArrowRight className="h-4 w-4" />
                      Ver Planos
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== TAB: Extras ========== */}
          <TabsContent value="extras" className="space-y-6 mt-6">
            {extrasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : extraBenefits.length === 0 ? (
              <Card className="card-glow">
                <CardContent className="py-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum benefício extra</h3>
                  <p className="text-muted-foreground">
                    Benefícios extras são concedidos pela equipe MAP em ações especiais.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Active Extras */}
                {activeExtras.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Benefícios Ativos
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeExtras.map((benefit) => (
                        <ExtraBenefitCard key={benefit.id} benefit={benefit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Extras */}
                {completedExtras.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-muted-foreground">Histórico</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {completedExtras.map((benefit) => (
                        <ExtraBenefitCard key={benefit.id} benefit={benefit} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ========== TAB: Saldo & Cashback ========== */}
          <TabsContent value="saldo" className="space-y-6 mt-6">
            {/* Balance Card */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="card-glow border-primary/30 md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Saldo de Benefícios</CardTitle>
                      <CardDescription>
                        Plano {planLabels[userPlan]} — Saldo inicial de {formatCurrency(initialBalance)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(currentBalance)}</p>
                    {pendingUsage > 0 && (
                      <p className="text-sm text-amber-500 mt-2">{formatCurrency(pendingUsage)} em análise</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Benefícios utilizados</span>
                      <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={usagePercentage} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Utilizado: {formatCurrency(totalUsed)}</span>
                      <span>Total: {formatCurrency(initialBalance)}</span>
                    </div>
                  </div>

                  {usagePercentage >= 100 && (
                    <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        🎉 Parabéns! Você utilizou 100% dos seus benefícios!
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="card-glow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Inicial</CardTitle>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(initialBalance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Plano {planLabels[userPlan]}</p>
                  </CardContent>
                </Card>

                <Card className="card-glow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Utilizado</CardTitle>
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(totalUsed)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Em descontos aprovados</p>
                  </CardContent>
                </Card>

                <Card className="card-glow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Restante</CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Disponível para uso</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Usage History */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Histórico de Uso</CardTitle>
                <CardDescription>Descontos utilizados com parceiros MAP</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !transactions || transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum benefício utilizado ainda</h3>
                    <p className="text-muted-foreground mb-4">
                      Acesse nossos parceiros e comece a usar seus benefícios!
                    </p>
                    <Button asChild>
                      <Link to="/parceiros" className="gap-2">
                        <Gift className="h-4 w-4" />
                        Ver Parceiros
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <CashbackTransactionTable transactions={transactions} />
                )}
              </CardContent>
            </Card>

            {/* How it Works */}
            <Card className="card-glow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  <CardTitle>Como funciona o Saldo de Benefícios?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>O que é o saldo de benefícios?</AccordionTrigger>
                    <AccordionContent>
                      O saldo de benefícios representa o valor total em descontos que você tem disponível através dos nossos parceiros. Cada plano oferece um valor diferente: Basic ({formatCurrency(planBenefits.basic)}), Pro ({formatCurrency(planBenefits.pro)}) e Business ({formatCurrency(planBenefits.business)}).
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Como o saldo é consumido?</AccordionTrigger>
                    <AccordionContent>
                      Cada vez que você utiliza um desconto de um parceiro, o valor do desconto é descontado do seu saldo. Por exemplo, se você contrata o Bling com anuidade de R$ 1.000 e tem 10% de desconto, seu saldo reduz R$ 100 (o valor economizado).
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Como utilizar um benefício?</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Acesse a página de <strong>Parceiros</strong></li>
                        <li>Clique em "Usar Benefício" no parceiro desejado</li>
                        <li>Você será direcionado para a página do parceiro</li>
                        <li>Utilize o desconto exclusivo MAP na compra</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger>Posso recuperar 100% da anuidade?</AccordionTrigger>
                    <AccordionContent>
                      Sim! Utilizando os benefícios dos nossos parceiros estrategicamente, é possível recuperar todo o valor investido na sua anuidade. Acompanhe seu progresso nesta página.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold mb-1">Explore nossos parceiros! 🎁</h3>
                <p className="text-muted-foreground">
                  Descubra todos os parceiros do MAP Acelera e maximize seus benefícios.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2">
                <Link to="/parceiros">Ver Parceiros</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function ExtraBenefitCard({ benefit }: { benefit: ExtraBenefitWithProfile }) {
  const statusColor = BENEFIT_STATUS_COLORS[benefit.status] || "";
  const isActive = benefit.status === "concedido" || benefit.status === "em_uso" || benefit.status === "pendente";

  return (
    <Card className={`card-glow ${isActive ? "border-primary/20" : "opacity-70"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-primary shrink-0" />
              <h4 className="font-semibold text-sm truncate">{benefit.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {BENEFIT_TYPE_LABELS[benefit.benefit_type]}
            </p>
            {benefit.description && (
              <p className="text-xs text-muted-foreground/70 line-clamp-2">{benefit.description}</p>
            )}
            {benefit.quantity_granted > 1 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Usado: {benefit.quantity_used}/{benefit.quantity_granted}</span>
                </div>
                <Progress
                  value={(benefit.quantity_used / benefit.quantity_granted) * 100}
                  className="h-1.5"
                />
              </div>
            )}
          </div>
          <Badge className={`text-xs shrink-0 ${statusColor}`}>
            {BENEFIT_STATUS_LABELS[benefit.status]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
