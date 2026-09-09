import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import logoLight from "@/assets/logo-map-light.png";

export default function SucessoVenda() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead
        title="Compra confirmada"
        description="Sua compra no MAP Acelera foi confirmada. Siga as instruções enviadas por e-mail para acessar a plataforma."
        canonical="/sucesso-venda"
        noIndex
      />
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <img src={logoLight} alt="MAP Acelera logo" className="h-10 mx-auto" />
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Compra realizada! 🎉</h1>
            <p className="text-muted-foreground">
              Obrigado pela sua compra! Você receberá um e-mail com as instruções de acesso em breve.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/auth">Acessar a plataforma</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
