import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDedicationProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const dedications = [
  { id: "menos-5h", label: "Menos de 5 horas", icon: "⏰" },
  { id: "5-10h", label: "5 a 10 horas", icon: "🕐" },
  { id: "10-20h", label: "10 a 20 horas", icon: "🕕" },
  { id: "mais-20h", label: "Mais de 20 horas", icon: "🔥" },
];

export function StepDedication({ value, onChange, onNext, onBack }: StepDedicationProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Quanto tempo pode dedicar por semana?
        </h2>
        <p className="text-muted-foreground">
          Isso nos ajuda a definir um ritmo de aprendizado adequado
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {dedications.map((ded) => (
          <button
            key={ded.id}
            onClick={() => onChange(ded.id)}
            className={cn(
              "p-6 rounded-xl border text-center transition-all",
              value === ded.id
                ? "border-lime bg-lime/10"
                : "border-border bg-surface hover:border-lime/50"
            )}
          >
            <span className="text-3xl block mb-2">{ded.icon}</span>
            <span className="font-semibold text-foreground">{ded.label}</span>
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
