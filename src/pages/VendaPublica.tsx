import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Star, Zap, Crown } from "lucide-react";
import logoLight from "@/assets/logo-map-light.png";
import { SEOHead } from "@/components/SEOHead";

const ASAAS_CHECKOUT_URLS: Record<string, string> = {
  basic: "https://www.asaas.com/c/dhtbdza10mrsr4yr",
  pro: "https://www.asaas.com/c/iocelk9h7cy6af6h",
  business: "https://www.asaas.com/c/h0ds9bv342h3y6rj",
};

const PLANOS = [
  {
    key: "basic",
    nome: "Basic",
    preco: "R$ 197",
    periodo: "/mês",
    icon: Zap,
    destaque: false,
    badge: null,
  },
  {
    key: "pro",
    nome: "Pro",
    preco: "R$ 497",
    periodo: "/mês",
    icon: Star,
    destaque: true,
    badge: "Mais Popular",
  },
  {
    key: "business",
    nome: "Business",
    preco: "R$ 997",
    periodo: "/mês",
    icon: Crown,
    destaque: false,
    badge: "Melhor Custo",
  },
];

export default function VendaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const planoParam = searchParams.get("plano");

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se veio com plano na URL, redirecionar direto para checkout Asaas
    if (planoParam && ["basic", "pro", "business"].includes(planoParam)) {
      const checkoutUrl = ASAAS_CHECKOUT_URLS[planoParam];
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    }
  }, [planoParam]);

  async function handleCheckout(plano: string) {
    setCheckoutLoading(plano);
    const checkoutUrl = ASAAS_CHECKOUT_URLS[plano];
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Assine o MAP Acelera"
        description="Escolha entre Basic, Pro ou Business e acelere seus resultados em marketplaces com a comunidade MAP Acelera."
        canonical={slug ? `/v/${slug}` : "/v"}
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <img src={logoLight} alt="MAP Acelera - Comunidade de Empreendedores" className="h-12 mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Assine o MAP Acelera - Acelere seu E-commerce
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para você e comece sua jornada de crescimento em marketplaces.
          </p>
        </div>

        {/* Planos */}
        <h2 className="sr-only">Planos disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANOS.map((plano) => {
            const Icon = plano.icon;
            return (
              <Card
                key={plano.key}
                className={`relative overflow-hidden transition-all hover:scale-[1.02] ${
                  plano.destaque ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plano.badge && (
                  <div className="absolute top-3 right-3">
                    <Badge variant={plano.destaque ? "default" : "secondary"}>
                      {plano.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plano.nome}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <span className="text-4xl font-bold">{plano.preco}</span>
                    <span className="text-muted-foreground">{plano.periodo}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plano.destaque ? "default" : "outline"}
                    onClick={() => handleCheckout(plano.key)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === plano.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Assinar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
