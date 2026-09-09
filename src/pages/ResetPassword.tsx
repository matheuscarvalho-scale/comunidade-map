import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-provider";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Verifica se é uma sessão de recuperação — via query param (mais confiável)
  // ou via hash do Supabase (fallback)
  const hasRecoveryParam = window.location.search.includes("mode=recovery");
  const hasRecoveryHash = window.location.hash.includes("type=recovery");
  const [isRecovery, setIsRecovery] = useState(hasRecoveryParam || hasRecoveryHash);
  const [authChecked, setAuthChecked] = useState(hasRecoveryParam || hasRecoveryHash);

  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(theme === "dark");
      }
    };
    checkDarkMode();
  }, [theme]);

  useEffect(() => {
    // Escuta o evento de recuperação de senha
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        // SIGNED_IN também pode ser disparado em sessões de recovery
        if (event === "PASSWORD_RECOVERY" || hasRecoveryParam || hasRecoveryHash) {
          setIsRecovery(true);
        }
      }
      setAuthChecked(true);
    });

    // Aguarda o evento por até 3 segundos antes de mostrar "inválido"
    const timeout = setTimeout(() => {
      setAuthChecked(true);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível redefinir a senha. Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Senha redefinida! ✅", description: "Sua senha foi atualizada com sucesso." });
      navigate("/", { replace: true });
    }
  };

  // Ainda aguardando resposta do servidor de auth
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in text-center">
          <img src={isDarkMode ? logoMapDark : logoMapLight} alt="MAP Acelera logo" className="h-10 w-auto mx-auto" />
          <h1 className="sr-only">Redefinir Senha</h1>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <h2 className="sr-only">Status do link</h2>
              <CardTitle>Link inválido</CardTitle>
              <CardDescription>Este link de redefinição é inválido ou expirou.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full rounded-full">
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <img src={isDarkMode ? logoMapDark : logoMapLight} alt="MAP Acelera logo" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Redefinir Senha</h1>
          <p className="text-muted-foreground">Defina sua nova senha</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <h2 className="sr-only">Formulário de nova senha</h2>
            <CardTitle className="text-xl">Nova Senha</CardTitle>
            <CardDescription>Digite sua nova senha abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-muted/50"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Redefinir Senha
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
