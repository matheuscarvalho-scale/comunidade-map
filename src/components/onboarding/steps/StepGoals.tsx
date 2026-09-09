import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepGoalsProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const goals = [
  { id: "criar-renda", label: "Criar uma fonte de renda", icon: "💰" },
  { id: "escalar", label: "Escalar meu negócio atual", icon: "📈" },
  { id: "transicao", label: "Transição de carreira", icon: "🔄" },
  { id: "aprender", label: "Aprender e me desenvolver", icon: "📚" },
  { id: "networking", label: "Networking e conexões", icon: "🤝" },
];

export function StepGoals({ value, onChange, onNext, onBack }: StepGoalsProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Target className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Qual seu principal objetivo?
        </h2>
        <p className="text-muted-foreground">
          Escolha o que mais te motiva a estar aqui
        </p>
      </div>

      <div className="grid gap-3">
        {goals.map((goal) => (
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
            <div className="flex items-center gap-4">
              <span className="text-2xl">{goal.icon}</span>
              <span className="font-semibold text-foreground">{goal.label}</span>
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
