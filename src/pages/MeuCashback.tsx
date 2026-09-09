import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  Plus,
  Gift,
  Loader2,
  Wallet,
  HelpCircle,
  Filter
} from "lucide-react";
import { useCashbackComplete, CashbackStatus } from "@/hooks/useCashbackComplete";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CashbackStatsCards } from "@/components/cashback/CashbackStatsCards";
import { CashbackTransactionTable } from "@/components/cashback/CashbackTransactionTable";
import { RequestCashbackModal } from "@/components/cashback/RequestCashbackModal";

export default function MeuCashback() {
  const [statusFilter, setStatusFilter] = useState<"all" | CashbackStatus>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { 
    transactions,
    isLoading, 
    totalPending,
    totalApproved,
    totalPaid,
    totalBalance,
    requestCashback,
    isRequesting,
    uploadProof,
  } = useCashbackComplete();

  const { data: profile } = useProfile();
  const { data: subscription } = useSubscription();

  // Annual fee based on user's subscription plan
  const planFees: Record<string, number> = {
    starter: 2364,
    pro: 4764,
    enterprise: 7164,
  };
  const annualFee = planFees[(subscription?.plan || "starter").toLowerCase()] || 2364;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Progress towards annual fee recovery
  const totalRecovered = totalApproved + totalPaid;
  const progressPercentage = Math.min((totalRecovered / annualFee) * 100, 100);
  const remainingToRecover = Math.max(annualFee - totalRecovered, 0);

  // Filter transactions
  const filteredTransactions = transactions?.filter(tx => {
    if (statusFilter === "all") return true;
    return tx.status === statusFilter;
  }) || [];

  const handleRequestCashback = (data: Parameters<typeof requestCashback>[0]) => {
    requestCashback(data);
    setIsModalOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Coins className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Meu Cashback</h1>
            </div>
            <p className="text-muted-foreground">
              Acompanhe e solicite cashback das suas compras com parceiros MAP
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Solicitar Cashback
          </Button>
        </div>

        {/* Stats Cards */}
        <CashbackStatsCards
          totalPending={totalPending}
          totalApproved={totalApproved}
          totalPaid={totalPaid}
          totalBalance={totalBalance}
        />

        {/* Progress Card */}
        <Card className="card-glow border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Recuperação da Anuidade</CardTitle>
                <CardDescription>
                  Acompanhe quanto você já recuperou da sua anuidade de {formatCurrency(annualFee)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-primary">{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-500" />
                <span>Recuperado: <span className="font-semibold text-green-500">{formatCurrency(totalRecovered)}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span>Falta: <span className="font-semibold text-primary">{formatCurrency(remainingToRecover)}</span></span>
              </div>
            </div>
            {progressPercentage >= 100 && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  🎉 Parabéns! Você já recuperou 100% da sua anuidade!
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Histórico de Solicitações</CardTitle>
                <CardDescription>
                  Todas as suas solicitações de cashback
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-6">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  Aprovados
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  Pagos
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  Rejeitados
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredTransactions || filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {statusFilter === "all" 
                    ? "Nenhuma solicitação ainda" 
                    : `Nenhuma solicitação ${statusFilter}`
                  }
                </h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter === "all" 
                    ? "Faça uma compra com um parceiro e solicite seu cashback!"
                    : "Altere o filtro para ver outras solicitações"
                  }
                </p>
                {statusFilter === "all" && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Solicitar Cashback
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/parceiros" className="gap-2">
                        <Gift className="h-4 w-4" />
                        Ver Parceiros
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <CashbackTransactionTable transactions={filteredTransactions} />
            )}
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <HelpCircle className="h-6 w-6 text-primary" />
              <CardTitle>Como funciona o Cashback?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>O que é o programa de cashback?</AccordionTrigger>
                <AccordionContent>
                  O programa de cashback do MAP Acelera permite que você recupere parte do valor investido na sua anuidade através de benefícios exclusivos oferecidos por nossos parceiros. Cada vez que você faz uma compra com um parceiro, pode solicitar o cashback correspondente.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Como solicitar cashback?</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Faça uma compra com um dos nossos <strong>Parceiros</strong></li>
                    <li>Clique em "Solicitar Cashback" nesta página</li>
                    <li>Selecione o parceiro e informe o valor da compra</li>
                    <li>Anexe o comprovante da compra (nota fiscal ou recibo)</li>
                    <li>Aguarde a aprovação da equipe MAP</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Quanto tempo leva para aprovar?</AccordionTrigger>
                <AccordionContent>
                  O tempo de análise é de até 7 dias úteis após o envio da solicitação. Você será notificado quando o status mudar. Após aprovado, o pagamento é realizado na próxima rodada de pagamentos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Qual o percentual de cashback?</AccordionTrigger>
                <AccordionContent>
                  O percentual varia de acordo com cada parceiro, geralmente entre 5% e 20% do valor da compra. Você pode ver o percentual exato na página de Parceiros antes de fazer a compra.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold mb-1">
                  Conheça nossos parceiros! 🎁
                </h3>
                <p className="text-muted-foreground">
                  Explore todos os parceiros do MAP Acelera e aproveite os benefícios exclusivos.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2">
                <Link to="/parceiros">
                  Ver Parceiros
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Modal */}
      <RequestCashbackModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleRequestCashback}
        uploadProof={uploadProof}
        isSubmitting={isRequesting}
      />
    </MainLayout>
  );
}
