import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wallet,
  ExternalLink,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PartnerLogo } from "@/components/parceiros/PartnerLogo";
import { CashbackStatus, CashbackTransaction } from "@/hooks/useCashbackComplete";

interface CashbackTransactionTableProps {
  transactions: CashbackTransaction[];
  showUserColumn?: boolean;
}

const statusConfig: Record<CashbackStatus, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  className: string 
}> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle2,
    className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  },
  paid: {
    label: "Pago",
    icon: Wallet,
    className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  },
  expired: {
    label: "Expirado",
    icon: XCircle,
    className: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
  },
};

export function CashbackTransactionTable({ 
  transactions,
  showUserColumn = false 
}: CashbackTransactionTableProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showUserColumn && <TableHead>Membro</TableHead>}
            <TableHead>Parceiro</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor Compra</TableHead>
            <TableHead>% Cashback</TableHead>
            <TableHead>Valor Cashback</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Comprovante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const status = statusConfig[tx.status];
            const StatusIcon = status.icon;
            
            return (
              <TableRow key={tx.id}>
                {showUserColumn && (
                  <TableCell className="font-medium">
                    {tx.user_profile?.name || 'Usuário'}
                  </TableCell>
                )}
                <TableCell>
                  {(() => {
                    const displayName = tx.partner?.name || (tx.partner_name !== "Via Planilha" ? tx.partner_name : null) || tx.partner_name;
                    return (
                      <div className="flex items-center gap-2">
                        <PartnerLogo 
                          name={displayName} 
                          logoUrl={tx.partner?.logo_url || null}
                          className="h-8 w-8"
                        />
                        <span className="font-medium">{displayName}</span>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(tx.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {formatCurrency(tx.purchase_amount || tx.estimated_value)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {(() => {
                      const pct = tx.discount_percentage > 0
                        ? tx.discount_percentage
                        : (tx.purchase_amount && tx.purchase_amount > 0 && tx.cashback_amount
                          ? Math.round((tx.cashback_amount / tx.purchase_amount) * 100)
                          : 0);
                      return `${pct}%`;
                    })()}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  {formatCurrency(tx.cashback_amount)}
                </TableCell>
                <TableCell>
                  <Badge className={status.className}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tx.proof_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={tx.proof_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-1" />
                        Ver
                      </a>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
