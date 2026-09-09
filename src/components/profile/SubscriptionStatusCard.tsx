import { CreditCard, Calendar, AlertTriangle, Clock, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription, getPlanDisplayName, getStatusDisplayInfo } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export function SubscriptionStatusCard() {
  const { data: subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const statusInfo = getStatusDisplayInfo(subscription.status);
  const planName = getPlanDisplayName(subscription.plan);
  
  const showRenewalWarning = 
    subscription.daysRemaining !== null && 
    subscription.daysRemaining <= 30 &&
    subscription.status !== "expired";

  const handleRenewal = () => {
    navigate("/planos");
  };

  // Calculate progress (days used / 365)
  const totalDays = 365;
  const daysUsed = subscription.daysRemaining !== null 
    ? Math.max(0, totalDays - subscription.daysRemaining)
    : 0;
  const progressPercent = Math.min(100, (daysUsed / totalDays) * 100);

  return (
    <Card className={`border-border/50 ${showRenewalWarning ? "border-yellow-500/50" : ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Minha Assinatura
          </div>
          <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plano</span>
          <span className="font-medium">{planName}</span>
        </div>

        {/* Dates */}
        {subscription.startDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Início</span>
            <span className="text-sm">
              {new Date(subscription.startDate).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}

        {subscription.endDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Validade</span>
            <span className={`text-sm ${subscription.isExpired ? "text-destructive" : ""}`}>
              {new Date(subscription.endDate).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}

        {/* Days Remaining */}
        {subscription.daysRemaining !== null && subscription.daysRemaining > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Dias restantes
                </span>
                <span className={`font-medium ${subscription.daysRemaining <= 30 ? "text-yellow-500" : ""}`}>
                  {subscription.daysRemaining} dias
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </>
        )}

        {/* Warning */}
        {showRenewalWarning && (
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">
                Sua assinatura expira em {subscription.daysRemaining} dias
              </p>
              <p className="text-muted-foreground mt-1">
                Renove agora para não perder o acesso.
              </p>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {subscription.isExpired && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">
                Sua assinatura expirou
              </p>
              <p className="text-muted-foreground mt-1">
                Renove agora para recuperar o acesso completo.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {subscription.isExpired || showRenewalWarning ? (
          <Button 
            className="w-full gap-2" 
            variant="default"
            onClick={() => navigate("/planos")}
          >
            <Calendar className="h-4 w-4" />
            {subscription.isExpired ? "Ver Planos e Renovar" : "Renovar Assinatura"}
          </Button>
        ) : subscription.plan !== "business" && subscription.plan !== "enterprise" ? (
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={() => navigate("/upgrade")}
          >
            <ArrowUp className="h-4 w-4" />
            Fazer Upgrade
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
