import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, Loader2, ListIcon, Copy, FlaskConical } from "lucide-react";

interface ContaAzulService {
  id: string;
  nome: string;
  codigo?: string;
  valor?: number;
  situacao?: string;
}


const CONTAAZUL_CLIENT_ID = "6nnhba2ursqn3vk41sqojjq41q";
const REDIRECT_URI = "https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/conta-azul-oauth-callback";
const AUTH_URL = `https://auth.contaazul.com/login?redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CONTAAZUL_CLIENT_ID}&scope=openid+profile+aws.cognito.signin.user.admin&response_type=code`;

export default function AdminContaAzulAuth() {
  const [searchParams] = useSearchParams();
  const [tokenStatus, setTokenStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ContaAzulService[] | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [testingEmission, setTestingEmission] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any> | null>(null);

  async function testEmission(live = false) {
    if (live) {
      const ok = window.confirm(
        "⚠️ Isso vai CRIAR uma venda REAL na Conta Azul (plano Basic Anual R$ 2.364,00) com cliente fictício 'TESTE INTEGRACAO - DELETAR'. Você precisará deletar manualmente depois.\n\nConfirmar?"
      );
      if (!ok) return;
    }
    setTestingEmission(true);
    setTestResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("conta-azul-test-emission", {
        method: "POST",
        body: live ? { plan: "basic_anual", live: true } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResults(data?.results ?? {});
      const allOk = Object.values(data?.results ?? {}).every((r: any) => r?.success === true);
      if (live && allOk) toast.success("✅ Venda real criada na Conta Azul — confira no painel!");
      else if (allOk) toast.success("Todos os planos passaram na simulação ✅");
      else toast.warning("Concluído com avisos — confira detalhes abaixo");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "desconhecido"));
    } finally {
      setTestingEmission(false);
    }
  }

  async function loadServices() {
    setLoadingServices(true);
    try {
      const path = serviceSearch ? `?search=${encodeURIComponent(serviceSearch)}` : "";
      const { data, error } = await supabase.functions.invoke(`conta-azul-list-services${path}`, {
        method: "GET",
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ` - ${data.details}` : ""));
      setServices(data?.services ?? []);
      toast.success(`${data?.services?.length ?? 0} serviços carregados`);
    } catch (err: any) {
      toast.error("Erro ao listar serviços: " + (err.message || "desconhecido"));
    } finally {
      setLoadingServices(false);
    }
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("UUID copiado!");
  }


  useEffect(() => {
    // Check URL params for success/error
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "true") {
      toast.success("Conta Azul conectada com sucesso!");
    }
    if (error) {
      toast.error(`Erro na conexão: ${error}`);
    }
    checkTokenStatus();
  }, [searchParams]);

  async function checkTokenStatus() {
    setTokenStatus("loading");
    // Never select refresh_token / access_token in the browser.
    const { data, error } = await supabase
      .from("conta_azul_tokens")
      .select("expires_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setTokenStatus("disconnected");
      return;
    }

    setExpiresAt(data.expires_at);
    setTokenStatus("connected");
  }

  async function handleRefreshToken() {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("conta-azul-oauth-callback", {
        method: "POST",
      });
      if (error) throw error;
      toast.success("Token renovado com sucesso!");
      await checkTokenStatus();
    } catch (err: any) {
      toast.error("Erro ao renovar token: " + (err.message || "Erro desconhecido"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Integração Conta Azul</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conexão OAuth2
              {tokenStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {tokenStatus === "connected" && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </Badge>
              )}
              {tokenStatus === "disconnected" && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" /> Desconectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Conecte sua conta da Conta Azul para emissão automática de NFe e registro de vendas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expiresAt && (
              <p className="text-sm text-muted-foreground">
                Token expira em:{" "}
                <span className="font-mono">
                  {new Date(expiresAt).toLocaleString("pt-BR")}
                </span>
              </p>
            )}

            <div className="flex gap-3">
              <Button asChild data-ga="conta-azul-connect" aria-label="Conectar ou reconectar Conta Azul">
                <a href={AUTH_URL}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {tokenStatus === "connected" ? "Reconectar" : "Conectar Conta Azul"}
                </a>
              </Button>

              {tokenStatus === "connected" && (
                <Button variant="outline" onClick={handleRefreshToken} disabled={refreshing} data-ga="conta-azul-refresh-token" aria-label="Renovar token Conta Azul">
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Renovar Token
                </Button>
              )}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted text-sm text-muted-foreground space-y-2">
              <p><strong>Como funciona:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Clique em "Conectar Conta Azul" para autorizar o acesso</li>
                <li>Você será redirecionado para a Conta Azul para fazer login</li>
                <li>Após autorizar, você voltará aqui automaticamente</li>
                <li>Os tokens serão salvos e usados para emitir NFe automaticamente</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" /> Listar Serviços (UUIDs)
            </CardTitle>
            <CardDescription>
              Busque os serviços cadastrados no Conta Azul e copie os UUIDs (Basic, Pro, Business).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome (opcional, ex: MAP Acelera)"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
              <Button onClick={loadServices} disabled={loadingServices} data-ga="conta-azul-list-services" aria-label="Listar serviços do Conta Azul">
                {loadingServices ? <Loader2 className="h-4 w-4 animate-spin" /> : "Listar"}
              </Button>
            </div>

            {services && services.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
            )}

            {services && services.length > 0 && (
              <div className="border rounded-lg divide-y">
                {services.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{s.id}</div>
                      {s.valor != null && (
                        <div className="text-xs text-muted-foreground">R$ {Number(s.valor).toFixed(2)}</div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyId(s.id)}>
                      <Copy className="h-3 w-3 mr-1" /> Copiar UUID
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Testar emissão de NFe (Dry Run)
            </CardTitle>
            <CardDescription>
              Simula a emissão dos 4 planos validando UUIDs e token OAuth — <strong>sem criar venda real</strong> na Conta Azul.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => testEmission(false)}
                disabled={testingEmission || tokenStatus !== "connected"}
                data-ga="conta-azul-test-emission-dry"
                aria-label="Testar emissão de NFe para todos os planos (dry run)"
              >
                {testingEmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                Testar emissão (dry run, todos os planos)
              </Button>
              <Button
                variant="destructive"
                onClick={() => testEmission(true)}
                disabled={testingEmission || tokenStatus !== "connected"}
                data-ga="conta-azul-test-emission-live"
                aria-label="Testar emissão REAL de NFe Basic Anual"
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Testar REAL (Basic Anual R$ 2.364)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Dry run:</strong> só valida UUIDs/token, não envia nada. <strong>REAL:</strong> cria cliente + venda de verdade na Conta Azul — você precisa deletar depois manualmente.
            </p>

            {testResults && (
              <div className="border rounded-lg divide-y">
                {Object.entries(testResults).map(([key, r]: [string, any]) => (
                  <div key={key} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{r.label || key}</div>
                      {r.success ? (
                        <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>
                      ) : (
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falha</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Plano: <span className="font-mono">{r.plan}</span> · Valor: R$ {Number(r.amount_brl ?? 0).toFixed(2)}</div>
                      <div>Service UUID: <span className="font-mono">{r.service_uuid || "—"}</span></div>
                      <div>Token OAuth: {r.oauth_token_ok ? "✅" : `❌ ${r.oauth_token_error || ""}`}</div>
                      {r.would_create_new_service && (
                        <div className="text-yellow-500">⚠️ Tentaria criar serviço novo (risco do erro 400)</div>
                      )}
                      {Array.isArray(r.warnings) && r.warnings.length > 0 && (
                        <ul className="list-disc list-inside text-yellow-500">
                          {r.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
