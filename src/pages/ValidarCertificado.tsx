import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Award, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Calendar,
  User,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";
import { SEOHead } from "@/components/SEOHead";

interface CertificateData {
  id: string;
  certificate_number: string;
  user_name: string;
  formation_title: string;
  completed_at: string;
  created_at: string;
}

export default function ValidarCertificado() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [isSearching, setIsSearching] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { theme } = useTheme();

  // Auto-search if code is in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setCode(codeFromUrl);
      handleSearch(codeFromUrl);
    }
  }, [searchParams]);

  const handleSearch = async (searchCode?: string) => {
    const codeToSearch = searchCode || code;
    if (!codeToSearch.trim()) return;
    
    setIsSearching(true);
    setNotFound(false);
    setCertificate(null);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, certificate_number, user_name, formation_title, completed_at, created_at")
        .eq("certificate_number", codeToSearch.trim().toUpperCase())
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCertificate(data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const isDarkMode = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Validar Certificado"
        description="Verifique a autenticidade de um certificado emitido pelo MAP Acelera digitando o código de validação."
        canonical="/validar-certificado"
      />
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={isDarkMode ? logoMapDark : logoMapLight} 
              alt="MAP Acelera - Comunidade de Empreendedores" 
              className="h-8 w-auto"
            />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Award className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Validar Certificado</h1>
            <p className="text-muted-foreground">
              Insira o código do certificado para verificar sua autenticidade
            </p>
          </div>

          {/* Search Card */}
          <h2 className="sr-only">Buscar certificado</h2>
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Código do Certificado</CardTitle>
              <CardDescription>
                O código está localizado na parte inferior do certificado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="Ex: MAP-XXXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="font-mono"
                  />
                  <Button 
                    onClick={() => handleSearch()} 
                    disabled={!code.trim() || isSearching}
                    className="gap-2"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Validar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {hasSearched && (
            <>
              {certificate ? (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-green-500/20">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-500 mb-1">
                          Certificado Válido
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Este certificado é autêntico e foi emitido pelo MAP Acelera.
                        </p>

                        <div className="space-y-3 p-4 rounded-lg bg-card border">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Nome:</span>
                            <span className="font-semibold">{certificate.user_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Formação:</span>
                            <span className="font-semibold">{certificate.formation_title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Concluído em:</span>
                            <span className="font-semibold">
                              {new Date(certificate.completed_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Código:</span>
                            <span className="font-mono font-semibold">{certificate.certificate_number}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : notFound ? (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-destructive/20">
                        <XCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-destructive mb-1">
                          Certificado Não Encontrado
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          O código informado não corresponde a nenhum certificado válido em nosso sistema.
                          Verifique se digitou corretamente.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Os certificados do MAP Acelera são emitidos exclusivamente para membros que 
                concluem 100% das formações disponíveis na plataforma.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
