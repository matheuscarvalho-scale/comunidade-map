import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle2, Wallet } from "lucide-react";

interface CashbackStatsCardsProps {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalBalance: number;
}

export function CashbackStatsCards({
  totalPending,
  totalApproved,
  totalPaid,
  totalBalance,
}: CashbackStatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="card-glow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Total
          </CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aprovado + Pago
          </p>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pendente
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">
            {formatCurrency(totalPending)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aguardando análise
          </p>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Aprovado
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(totalApproved)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aguardando pagamento
          </p>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pago
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatCurrency(totalPaid)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Já recebido
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
