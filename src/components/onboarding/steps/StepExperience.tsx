import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepExperienceProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const experiences = [
  {
    id: "iniciante",
    label: "Iniciante",
    description: "Ainda não comecei no e-commerce",
    icon: "🌱",
  },
  {
    id: "basico",
    label: "Básico",
    description: "Já fiz algumas vendas online",
    icon: "📦",
  },
  {
    id: "intermediario",
    label: "Intermediário",
    description: "Tenho uma operação ativa",
    icon: "📈",
  },
  {
    id: "avancado",
    label: "Avançado",
    description: "Faturo consistentemente todo mês",
    icon: "🚀",
  },
];

export function StepExperience({ value, onChange, onNext, onBack }: StepExperienceProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Star className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Qual seu nível de experiência com e-commerce?
        </h2>
        <p className="text-muted-foreground">
          Isso nos ajuda a recomendar o conteúdo ideal para você
        </p>
      </div>

      <div className="grid gap-3">
        {experiences.map((exp) => (
          <button
            key={exp.id}
            onClick={() => onChange(exp.id)}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all",
              value === exp.id
                ? "border-lime bg-lime/10"
                : "border-border bg-surface hover:border-lime/50"
            )}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{exp.icon}</span>
              <div>
                <div className="font-semibold text-foreground">{exp.label}</div>
                <div className="text-sm text-muted-foreground">
                  {exp.description}
                </div>
              </div>
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
