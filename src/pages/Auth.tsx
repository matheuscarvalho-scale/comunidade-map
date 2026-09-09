import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Flame, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { SEOHead } from "@/components/SEOHead";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

// External URLs for payment flow
const CHECKOUT_URL = "https://pay.hub.la/lCG5QAV4ke50HOqe5kVd";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, loading } = useAuth();
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Detectar tema efetivo
  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(theme === "dark");
      }
    };
    
    checkDarkMode();
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);
    return () => mediaQuery.removeEventListener("change", checkDarkMode);
  }, [theme]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast({
        title: "Erro de validação",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      let message = "Erro ao fazer login";
      if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Por favor, confirme seu email antes de fazer login";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bem-vindo de volta! 👋",
        description: "Login realizado com sucesso.",
      });
      navigate("/", { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-reset-password", {
        body: { email: forgotEmail },
      });
      if (error) throw error;
      toast({
        title: "Email enviado! 📧",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
      setForgotMode(false);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigate("/planos");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEOHead
        title="Entrar"
        description="Acesse sua conta no MAP Acelera. Faça login ou crie sua conta."
        canonical="/auth"
        noIndex
      />
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <h1 className="sr-only">Entrar no MAP Acelera</h1>
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={isDarkMode ? logoMapDark : logoMapLight} 
              alt="MAP Acelera - Comunidade de Empreendedores" 
              className="h-10 w-auto"
            />
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 animate-streak-glow">
              <Flame className="h-4 w-4 text-primary animate-fire" />
            </div>
          </div>
          <p className="text-muted-foreground">
            Sua jornada no e-commerce começa aqui
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <h2 className="sr-only">Acesso à conta</h2>
          <Tabs value="login" className="w-full">
            <CardHeader className="pb-4" />

            <CardContent>
              {/* Login Form */}
              <TabsContent value="login" className="space-y-4">

                {forgotMode ? (
                  <>
                    <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
                    <CardDescription>
                      Digite seu email e enviaremos um link para redefinir sua senha.
                    </CardDescription>
                    <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="pl-10 bg-muted/50"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full rounded-full gap-2" disabled={forgotLoading}>
                        {forgotLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <>Enviar link de redefinição<ArrowRight className="h-4 w-4" /></>
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Voltar ao login
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <CardTitle className="text-xl">Bem-vindo de volta!</CardTitle>
                    <CardDescription>
                      Entre com suas credenciais para acessar a plataforma.
                    </CardDescription>

                    <form onSubmit={handleLogin} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10 bg-muted/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Senha</Label>
                          <button
                            type="button"
                            onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); }}
                            className="text-xs text-primary hover:underline"
                          >
                            Esqueci minha senha
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10 pr-10 bg-muted/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full rounded-full gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <>
                            Entrar
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </TabsContent>

              <p className="pt-6 text-center text-sm text-muted-foreground">
                Sua conta é criada automaticamente após a compra.{" "}
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  className="text-primary hover:underline font-medium"
                >
                  Ver planos
                </button>
              </p>

            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <a href="#" className="text-primary hover:underline">Termos de Uso</a>
          {" "}e{" "}
          <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}
