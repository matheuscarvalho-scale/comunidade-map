import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  FileText,
  Download,
  Loader2,
  Share2,
  Linkedin,
  Twitter,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { useFormations } from "@/hooks/useFormations";
import { useCertificates, useGenerateCertificate } from "@/hooks/useCertificates";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Certificados() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: formations, isLoading: formationsLoading, refetch: refetchFormations } = useFormations();
  const { data: certificates, isLoading: certificatesLoading, refetch: refetchCertificates } = useCertificates();
  const generateCertificate = useGenerateCertificate();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchFormations(), refetchCertificates()]);
    setIsRefreshing(false);
  };

  const handleDownloadCertificate = async (formationId: string) => {
    generateCertificate.mutate(formationId);
  };

  // Check if a formation has a certificate
  const getCertificateForFormation = (formationId: string) => {
    return certificates?.find(c => c.formation_id === formationId);
  };

  const copyValidationLink = (code: string) => {
    const url = `${window.location.origin}/validar-certificado?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Link copiado!",
      description: "O link de validação foi copiado para a área de transferência.",
    });
  };

  const shareOnLinkedIn = (cert: { formation_title: string; certificate_number: string }) => {
    const url = `${window.location.origin}/validar-certificado?code=${cert.certificate_number}`;
    const text = `🎓 Acabei de concluir a formação "${cert.formation_title}" no MAP Acelera! Validar certificado: ${url}`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const shareOnTwitter = (cert: { formation_title: string; certificate_number: string }) => {
    const url = `${window.location.origin}/validar-certificado?code=${cert.certificate_number}`;
    const text = `🎓 Acabei de concluir a formação "${cert.formation_title}" na @ComunidadeMAP! #marketplace #ecommerce`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const isLoading = formationsLoading || certificatesLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Seus Certificados</h1>
          </div>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e acesse seus certificados de conclusão
          </p>
        </div>

        {/* Progress Section */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Progresso das Formações
            </CardTitle>
            <CardDescription>
              Complete as formações para desbloquear seus certificados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !formations || formations.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma formação encontrada
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/formacoes">Explorar Formações</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formations.filter(f => !(f as any).is_coming_soon).map(formation => {
                  const progress = formation.progressPercent || 0;
                  const isComplete = progress === 100;
                  const existingCert = getCertificateForFormation(formation.id);
                  
                  return (
                    <div 
                      key={formation.id} 
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link to={`/formacoes/${formation.id}`} className="font-medium hover:text-primary truncate">
                            {formation.title}
                          </Link>
                          {isComplete && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Certificado disponível
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formation.completedLessons || 0} de {formation.totalLessons || 0} aulas
                        </p>
                      </div>
                      <div className="w-full sm:w-40 flex-shrink-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className={isComplete ? "text-primary font-semibold" : ""}>
                            {progress}%
                          </span>
                        </div>
                        <Progress 
                          value={progress} 
                          className={`h-2 ${isComplete ? "[&>div]:bg-primary" : ""}`} 
                        />
                      </div>
                      {isComplete && (
                        <Button
                          size="sm"
                          className="gap-2 shrink-0"
                          onClick={() => handleDownloadCertificate(formation.id)}
                          disabled={generateCertificate.isPending}
                        >
                          {generateCertificate.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : existingCert ? (
                            <Download className="h-4 w-4" />
                          ) : (
                            <Award className="h-4 w-4" />
                          )}
                          {existingCert ? "Baixar" : "Gerar Certificado"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates Section */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Certificados Emitidos
                </CardTitle>
                <CardDescription>
                  {!certificates || certificates.length === 0 
                    ? "Nenhum certificado disponível" 
                    : `${certificates.length} certificado(s) disponível(eis)`
                  }
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
                data-ga="Atualizar Certificados"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {certificatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !certificates || certificates.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum certificado disponível ainda</p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Complete uma formação para receber seu certificado. Seus certificados aparecerão aqui assim que você concluir 100% de uma formação.
                </p>
                <Button variant="outline" className="mt-6" asChild>
                  <Link to="/formacoes">Ver Formações Disponíveis</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map(cert => (
                  <Card key={cert.id} className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/20">
                          <Award className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{cert.formation_title}</h3>
                          <p className="text-sm text-muted-foreground">{cert.user_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Concluído em {new Date(cert.completed_at).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {cert.certificate_number}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleDownloadCertificate(cert.formation_id)}
                          disabled={generateCertificate.isPending}
                          data-ga={`Baixar Certificado - ${cert.formation_title}`}
                        >
                          {generateCertificate.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Baixar
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2" data-ga={`Compartilhar Certificado - ${cert.formation_title}`}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => shareOnLinkedIn(cert)}>
                              <Linkedin className="h-4 w-4 mr-2" />
                              LinkedIn
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareOnTwitter(cert)}>
                              <Twitter className="h-4 w-4 mr-2" />
                              Twitter / X
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyValidationLink(cert.certificate_number)}>
                              {copiedCode === cert.certificate_number ? (
                                <Check className="h-4 w-4 mr-2" />
                              ) : (
                                <Copy className="h-4 w-4 mr-2" />
                              )}
                              Copiar link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validation Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Validação de Certificados</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Qualquer pessoa pode validar a autenticidade do seu certificado usando o código único.
                </p>
                <Button variant="outline" size="sm" asChild data-ga="Acessar página de validação">
                  <Link to="/validar-certificado">
                    Acessar página de validação
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
