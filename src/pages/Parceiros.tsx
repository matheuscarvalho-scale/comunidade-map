import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Gift,
  Search,
  Percent,
  Star,
  Sparkles,
  Wallet,
  Loader2,
  Settings,
  ExternalLink,
  HelpCircle,
  TrendingDown,
  History,
} from "lucide-react";
import { PartnerLogo } from "@/components/parceiros/PartnerLogo";
import { CashbackTransactionTable } from "@/components/cashback/CashbackTransactionTable";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useCashbackComplete } from "@/hooks/useCashbackComplete";
import { trackBenefitClick, extractUtmCampaign, extractUtmSource, extractUtmMedium, deriveBenefitType } from "@/lib/analytics";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  discount_percentage: number | null;
  discount_description: string | null;
  description: string | null;
  website_url: string | null;
}

const planBenefits: Record<string, number> = {
  basic: 2364,
  starter: 2364, // legacy
  pro: 4764,
  business: 7164,
  enterprise: 7164, // legacy
};

const planLabels: Record<string, string> = {
  basic: "Basic",
  starter: "Basic", // legacy
  pro: "Pro",
  business: "Business",
  enterprise: "Business", // legacy
};

export default function Parceiros() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [showHistory, setShowHistory] = useState(false);

  const { data: profile } = useProfile();
  const { data: subscription } = useSubscription();
  const { transactions } = useCashbackComplete();
  const userPlan = (subscription?.plan || "basic").toLowerCase();
  const initialBalance = planBenefits[userPlan] || 2364;

  const totalUsed = transactions?.reduce((acc, item) => {
    if (item.cashback_amount && (item.status === 'approved' || item.status === 'paid' || item.status === 'confirmed')) {
      return acc + Number(item.cashback_amount);
    }
    return acc;
  }, 0) || 0;

  const currentBalance = Math.max(initialBalance - totalUsed, 0);
  const usagePercentage = Math.min((totalUsed / initialBalance) * 100, 100);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) return false;
      return data;
    },
    enabled: !!user,
  });

  const { data: dbPartners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Partner[];
    },
  });

  // Partners hidden from the public partner list
  const HIDDEN_PARTNERS = ["amazon", "tiktok shop"];
  // Partners that redirect to Malu da MAP via WhatsApp
  const EXCLUSIVE_PARTNERS = ["amazon", "tiktok shop"];
  // Partners with disabled "Usar Benefício" button (coming soon)
  const DISABLED_PARTNERS: string[] = [];
  const MALU_WHATSAPP_URL = "https://wa.me/5522974045352?text=Ol%C3%A1%20Malu!%20Vim%20pela%20plataforma%20MAP%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20benef%C3%ADcios%20exclusivos.";

  const filteredPartners = dbPartners.filter(partner => {
    const isHidden = HIDDEN_PARTNERS.includes(partner.name.toLowerCase());
    if (isHidden) return false;

    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (partner.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    if (partnerFilter === "all") return matchesSearch;
    if (partnerFilter === "discounts") return matchesSearch && partner.discount_percentage && partner.discount_percentage > 0;
    if (partnerFilter === "exclusive") return matchesSearch && !partner.discount_percentage;
    return matchesSearch;
  });


  const isExclusivePartner = (partnerName: string) => {
    return EXCLUSIVE_PARTNERS.includes(partnerName.toLowerCase());
  };

  const isDisabledPartner = (partnerName: string) => {
    return DISABLED_PARTNERS.includes(partnerName.toLowerCase());
  };

  const handleUseBenefit = async (partner: Partner) => {
    trackBenefitClick({
      partner_name: partner.name,
      benefit_type: deriveBenefitType(partner.discount_percentage),
      user_plan: userPlan,
      utm_campaign: extractUtmCampaign(partner.website_url),
    });

    // Save click to partner_clicks table
    if (user) {
      const { error } = await supabase.from("partner_clicks").insert({
        user_id: user.id,
        user_email: user.email || "",
        user_name: profile?.name || "",
        user_plan: userPlan,
        partner_name: partner.name,
        benefit_type: deriveBenefitType(partner.discount_percentage),
        utm_source: extractUtmSource(partner.website_url),
        utm_medium: extractUtmMedium(partner.website_url),
        utm_campaign: extractUtmCampaign(partner.website_url),
      });
      if (error) {
        console.error("Error saving partner click:", error);
      } else {
        toast.success("Clique registrado com sucesso!");
      }
    }

    // Exclusive partners redirect to Malu da MAP on WhatsApp
    if (isExclusivePartner(partner.name)) {
      window.open(MALU_WHATSAPP_URL, "_blank", "noopener,noreferrer");
    } else {
      window.open(partner.website_url || "#", "_blank", "noopener,noreferrer");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <MainLayout>
      <SEOHead
        title="Parceiros e Benefícios"
        description="Acesse descontos, cashback e benefícios exclusivos com parceiros estratégicos do MAP Acelera."
        canonical="/parceiros"
        noIndex
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Parceiros e Benefícios</h1>
            </div>
            <p className="text-muted-foreground">
              Acesse ofertas exclusivas e acompanhe seu saldo de benefícios
            </p>
          </div>
          {isAdmin && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin/parceiros">
                <Settings className="h-4 w-4" />
                Gerenciar
              </Link>
            </Button>
          )}
        </div>

        {/* Benefits Balance Banner with Progress Bar */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-6 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-primary mb-1">
                  Recupere 100% da sua anuidade! 💰
                </h3>
                <p className="text-muted-foreground">
                  Seu plano oferece até{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(initialBalance)}
                  </span>{" "}
                  em benefícios exclusivos com nossos parceiros.
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary/20 text-primary border-primary/30">
                {formatCurrency(currentBalance)} disponível
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Benefícios utilizados</span>
                <span className="font-medium text-primary">{usagePercentage.toFixed(1)}%</span>
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

            {/* Ver Histórico Button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4" />
                Ver Histórico de Uso
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Uso de Benefícios
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 min-h-0">
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum benefício utilizado ainda</h3>
                  <p className="text-muted-foreground">
                    Utilize os benefícios dos parceiros para ver seu histórico aqui.
                  </p>
                </div>
              ) : (
                <CashbackTransactionTable transactions={transactions} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar parceiros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Partner Filter Tabs */}
        <Tabs value={partnerFilter} onValueChange={setPartnerFilter}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Gift className="h-4 w-4" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2">
              <Percent className="h-4 w-4" />
              Descontos
            </TabsTrigger>
            <TabsTrigger value="exclusive" className="gap-2">
              <Star className="h-4 w-4" />
              Exclusivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value={partnerFilter} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPartners.length === 0 ? (
              <Card className="card-glow">
                <CardContent className="py-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum parceiro encontrado</p>
                  <p className="text-muted-foreground">
                    Tente buscar com outros termos
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPartners.map((partner) => {
                  const hasDiscount = partner.discount_percentage && partner.discount_percentage > 0;
                  
                  return (
                    <Card key={partner.id} className="card-glow hover:border-primary/50 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <PartnerLogo 
                              name={partner.name} 
                              logoUrl={partner.logo_url} 
                            />
                            <div>
                              <CardTitle className="text-lg">{partner.name}</CardTitle>
                              <Badge 
                                variant={hasDiscount ? "default" : "secondary"}
                                className={hasDiscount 
                                  ? "bg-primary/20 text-primary border-primary/30 mt-1" 
                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 mt-1"
                                }
                              >
                                {hasDiscount 
                                  ? `Desconto ${partner.discount_percentage}%`
                                  : "✨ Exclusivo"
                                }
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-1">{partner.discount_description}</h4>
                          <CardDescription>{partner.description}</CardDescription>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs">
                            {partner.category || "Geral"}
                          </Badge>
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleUseBenefit(partner)}
                            disabled={isDisabledPartner(partner.name)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            {isDisabledPartner(partner.name) ? "Em breve" : "Usar Benefício"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
                  O saldo de benefícios representa o valor total em descontos que você tem disponível através dos nossos parceiros. Cada plano oferece um valor diferente: Starter ({formatCurrency(planBenefits.starter)}), Pro ({formatCurrency(planBenefits.pro)}) e Enterprise ({formatCurrency(planBenefits.enterprise)}).
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
                    <li>Encontre o parceiro desejado na lista acima</li>
                    <li>Clique em "Usar Benefício" no parceiro desejado</li>
                    <li>Você será direcionado para a página do parceiro</li>
                    <li>Utilize o desconto exclusivo MAP na compra</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Posso recuperar 100% da anuidade?</AccordionTrigger>
                <AccordionContent>
                  Sim! Utilizando os benefícios dos nossos parceiros estrategicamente, é possível recuperar todo o valor investido na sua anuidade. Acompanhe seu progresso na barra acima.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
