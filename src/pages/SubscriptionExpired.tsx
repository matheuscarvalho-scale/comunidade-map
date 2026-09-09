import { AlertTriangle, Mail, ArrowRight, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription, getPlanDisplayName, getStatusDisplayInfo } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import logoLight from "@/assets/logo-map-light.png";
import logoDark from "@/assets/logo-map-dark.png";

export default function SubscriptionExpired() {
  const { data: subscription } = useSubscription();
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const statusInfo = getStatusDisplayInfo(subscription?.status || "expired");
  const planName = getPlanDisplayName(subscription?.plan || null);

  const handleRenewal = () => {
    navigate("/planos");
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={theme === "dark" ? logoDark : logoLight} 
            alt="MAP Acelera" 
            className="h-12"
          />
        </div>

        {/* Main Card */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/20">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Assinatura Expirada</CardTitle>
            <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 mt-2`}>
              {statusInfo.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Sua assinatura expirou. Renove agora para continuar acessando 
              todos os conteúdos e benefícios do MAP Acelera.
            </p>

            {subscription?.endDate && (
              <p className="text-sm text-muted-foreground">
                Data de expiração: {" "}
                <strong className="text-foreground">
                  {new Date(subscription.endDate).toLocaleDateString("pt-BR")}
                </strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Benefits reminder */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h4 className="font-medium text-sm">O que você está perdendo:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                Acesso às formações e trilhas de conteúdo
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                Mentorias ao vivo semanais
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                Descontos exclusivos com parceiros
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                Networking com outros sellers
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Renewal CTA + WhatsApp Support */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1 gap-2"
            size="lg"
            onClick={handleRenewal}
            data-ga="subscription-expired-renew"
            aria-label="Ver planos e renovar assinatura"
          >
            Ver Planos e Renovar
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
            onClick={() => {
              const message = "Olá! Minha assinatura no MAP Acelera expirou e gostaria de ajuda do suporte.";
              const url = `https://api.whatsapp.com/send/?phone=5522992739203&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            data-ga="subscription-expired-whatsapp-support"
            aria-label="Falar com suporte no WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            Suporte
          </Button>
        </div>

        {/* Support */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Precisa de ajuda?
          </p>
          <a 
            href="mailto:contato@mapeducacao.com" 
            className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
          >
            <Mail className="h-4 w-4" />
            contato@mapeducacao.com
          </a>
        </div>

        {/* Logout Button */}
        <Button 
          variant="ghost" 
          className="w-full gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
