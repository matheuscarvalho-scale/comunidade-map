import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import logoLight from "@/assets/logo-map-light.png";
import logoDark from "@/assets/logo-map-dark.png";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center mb-8">
          <img
            src={theme === "dark" ? logoDark : logoLight}
            alt="MAP Acelera"
            className="h-12"
          />
        </div>

        <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/20 w-fit">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
        <p className="text-muted-foreground">
          Sua assinatura foi ativada com sucesso. Aproveite todos os benefícios do MAP Acelera!
        </p>

        <p className="text-sm text-muted-foreground">
          Redirecionando para o dashboard em{" "}
          <span className="font-bold text-foreground">{countdown}</span> segundos...
        </p>
      </div>
    </div>
  );
}
