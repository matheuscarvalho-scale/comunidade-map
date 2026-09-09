import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, DollarSign, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

const BASE_URL = "https://acelera.mapeducacao.com";

export default function PainelVendedor() {
  const { user } = useAuth();

  const { data: vendedor, isLoading } = useQuery({
    queryKey: ["vendedor-self", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .rpc("get_my_seller_profile")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-self", vendedor?.id],
    queryFn: async () => {
      if (!vendedor?.id) return [];
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("vendedor_id", vendedor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!vendedor?.id,
  });

  const copyLink = async (plano: string) => {
    if (!vendedor) return;
    const link = `${BASE_URL}/v/${vendedor.slug}?plano=${plano}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const copyAllLinks = async () => {
    if (!vendedor) return;
    const links = `📌 Seus links de venda:\n\n🔹 Basic: ${BASE_URL}/v/${vendedor.slug}?plano=basic\n🔹 Pro: ${BASE_URL}/v/${vendedor.slug}?plano=pro\n🔹 Business: ${BASE_URL}/v/${vendedor.slug}?plano=business`;
    await navigator.clipboard.writeText(links);
    toast.success("Todos os links copiados!");
  };

  if (isLoading) return <MainLayout><div className="p-6">Carregando...</div></MainLayout>;
  if (!vendedor) return <Navigate to="/" replace />;

  const vendasPagas = vendas.filter((v: any) => v.status === "pago");
  const totalVendas = vendasPagas.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
  const totalComissao = vendasPagas.reduce((acc: number, v: any) => acc + Number(v.comissao_valor), 0);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Olá, {vendedor.nome}! 👋</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-xl font-bold">{vendasPagas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">R$ {totalVendas.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total</p>
                <p className="text-xl font-bold">R$ {totalComissao.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seus Links de Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["basic", "pro", "business"].map((plano) => (
              <div key={plano} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24 capitalize">{plano}:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {BASE_URL}/v/{vendedor.slug}?plano={plano}
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(plano)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={copyAllLinks}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copiar todos os links
            </Button>
          </CardContent>
        </Card>

        {/* Vendas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suas Vendas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma venda ainda. Compartilhe seus links!
                    </TableCell>
                  </TableRow>
                ) : (
                  vendas.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>{format(new Date(v.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>{v.produto || "—"}</TableCell>
                      <TableCell>R$ {Number(v.valor).toFixed(2)}</TableCell>
                      <TableCell>R$ {Number(v.comissao_valor).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === "pago" ? "default" : "secondary"}>{v.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
