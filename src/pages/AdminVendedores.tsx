import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Check, Users, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

const BASE_URL = "https://acelera.mapeducacao.com";

function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminVendedores() {
  const { data: isAdmin, isLoading: adminLoading } = useAdmin();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [pixChave, setPixChave] = useState("");
  const [comissao, setComissao] = useState("20");

  // Filter state
  const [filterVendedor, setFilterVendedor] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: vendedores = [], isLoading: vendedoresLoading } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendedores").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendas").select("*, vendedores(nome, slug)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  const createVendedor = useMutation({
    mutationFn: async () => {
      const slug = generateSlug(nome);
      const { error } = await supabase.from("vendedores").insert({
        nome,
        email,
        slug,
        pix_chave: pixChave,
        comissao_percent: parseInt(comissao) || 20,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      setNome("");
      setEmail("");
      setPixChave("");
      setComissao("20");
      toast.success("Vendedor cadastrado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar vendedor");
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const { error } = await supabase
        .from("vendedores")
        .update({ status: currentStatus === "ativo" ? "inativo" : "ativo" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      toast.success("Status atualizado!");
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Link copiado!");
  };

  const copyAllLinks = async (slug: string) => {
    const links = `📌 Links de venda:\n\n🔹 Starter: ${BASE_URL}/v/${slug}?plano=starter\n🔹 Pro: ${BASE_URL}/v/${slug}?plano=pro\n🔹 Enterprise: ${BASE_URL}/v/${slug}?plano=enterprise`;
    await navigator.clipboard.writeText(links);
    toast.success("Todos os links copiados!");
  };

  const getVendedorStats = (vendedorId: string) => {
    const vendedorVendas = vendas.filter((v: any) => v.vendedor_id === vendedorId && v.status === "pago");
    const totalVendas = vendedorVendas.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
    const totalComissao = vendedorVendas.reduce((acc: number, v: any) => acc + Number(v.comissao_valor), 0);
    return { count: vendedorVendas.length, totalVendas, totalComissao };
  };

  // Filtered vendas
  const filteredVendas = vendas.filter((v: any) => {
    if (filterVendedor !== "all" && v.vendedor_id !== filterVendedor) return false;
    if (filterDateFrom && new Date(v.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(v.created_at) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const totalGeralVendas = filteredVendas.filter((v: any) => v.status === "pago").reduce((acc: number, v: any) => acc + Number(v.valor), 0);
  const totalGeralComissao = filteredVendas.filter((v: any) => v.status === "pago").reduce((acc: number, v: any) => acc + Number(v.comissao_valor), 0);

  if (adminLoading) return <MainLayout><div className="p-6">Carregando...</div></MainLayout>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Vendedores</h1>

        <Tabs defaultValue="vendedores">
          <TabsList>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            <TabsTrigger value="vendas">Vendas e Comissões</TabsTrigger>
          </TabsList>

          <TabsContent value="vendedores" className="space-y-6 mt-4">
            {/* Formulário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cadastrar Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do vendedor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input value={pixChave} onChange={(e) => setPixChave(e.target.value)} placeholder="Chave PIX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Comissão %</Label>
                    <Input value={comissao} onChange={(e) => setComissao(e.target.value)} type="number" min="0" max="100" />
                  </div>
                </div>
                <Button className="mt-4" onClick={() => createVendedor.mutate()} disabled={!nome || !email || createVendedor.isPending}>
                  {createVendedor.isPending ? "Cadastrando..." : "Cadastrar Vendedor"}
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Vendedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendedoresLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : vendedores.length === 0 ? (
                <p className="text-muted-foreground">Nenhum vendedor cadastrado.</p>
              ) : (
                vendedores.map((v: any) => {
                  const stats = getVendedorStats(v.id);
                  return (
                    <Card key={v.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{v.nome}</h3>
                            <p className="text-sm text-muted-foreground">{v.email}</p>
                          </div>
                          <Badge
                            variant={v.status === "ativo" ? "default" : "destructive"}
                            className="cursor-pointer"
                            onClick={() => toggleStatus.mutate({ id: v.id, currentStatus: v.status })}
                          >
                            {v.status}
                          </Badge>
                        </div>

                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{stats.count} vendas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>R$ {stats.totalVendas.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>R$ {stats.totalComissao.toFixed(2)} ({v.comissao_percent}%)</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {["basic", "pro", "business"].map((plano) => {
                            const link = `${BASE_URL}/v/${v.slug}?plano=${plano}`;
                            const linkId = `${v.id}-${plano}`;
                            return (
                              <div key={plano} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-20 capitalize">{plano}:</span>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded flex-1 truncate">{link}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(link, linkId)}
                                >
                                  {copiedId === linkId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            );
                          })}
                        </div>

                        <Button variant="outline" size="sm" className="w-full" onClick={() => copyAllLinks(v.slug)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Copiar todos os links
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="vendas" className="space-y-4 mt-4">
            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {vendedores.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>De</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Até</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Totais */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold text-primary">R$ {totalGeralVendas.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Comissões</p>
                  <p className="text-2xl font-bold text-primary">R$ {totalGeralComissao.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma venda encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendas.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell>{format(new Date(v.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell>{(v as any).vendedores?.nome || "—"}</TableCell>
                          <TableCell>{v.produto || "—"}</TableCell>
                          <TableCell>R$ {Number(v.valor).toFixed(2)}</TableCell>
                          <TableCell>R$ {Number(v.comissao_valor).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={v.status === "pago" ? "default" : "secondary"}>
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
