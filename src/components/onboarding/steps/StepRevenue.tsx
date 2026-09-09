import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepRevenueProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const revenueGoals = [
  { id: "ate-5k", label: "Até R$ 5.000", description: "Primeiro dinheiro online" },
  { id: "5k-20k", label: "R$ 5.000 - R$ 20.000", description: "Renda complementar sólida" },
  { id: "20k-50k", label: "R$ 20.000 - R$ 50.000", description: "Negócio em crescimento" },
  { id: "mais-50k", label: "Mais de R$ 50.000", description: "Operação escalada" },
];

export function StepRevenue({ value, onChange, onNext, onBack }: StepRevenueProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Qual sua meta de faturamento por mês para os próximos 12 meses?
        </h2>
        <p className="text-muted-foreground">
          Vamos traçar um plano para você chegar lá
        </p>
      </div>

      <div className="grid gap-3">
        {revenueGoals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onChange(goal.id)}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all",
              value === goal.id
                ? "border-lime bg-lime/10"
                : "border-border bg-surface hover:border-lime/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground text-lg">{goal.label}</div>
                <div className="text-sm text-muted-foreground">{goal.description}</div>
              </div>
              {value === goal.id && (
                <div className="w-6 h-6 rounded-full bg-lime flex items-center justify-center">
                  <span className="text-black text-sm">✓</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-border"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!value}
          className="flex-1 bg-lime text-black hover:bg-lime/90 disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
