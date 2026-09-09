import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepBusinessModelProps {
  values: string[];
  onChange: (values: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const businessModels = [
  { id: "loja-propria", label: "Loja própria", icon: "🏪" },
  { id: "dropshipping-nacional", label: "Dropshipping Nacional", icon: "🇧🇷" },
  { id: "dropshipping-internacional", label: "Dropshipping Internacional", icon: "🌍" },
  { id: "marketplaces", label: "Marketplaces", icon: "🛒" },
  { id: "social-commerce", label: "Social Commerce", icon: "📱" },
  { id: "marca-propria", label: "Marca própria", icon: "✨" },
];

export function StepBusinessModel({ values, onChange, onNext, onBack }: StepBusinessModelProps) {
  const toggleModel = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Briefcase className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Qual modelo você trabalha ou pretende trabalhar?
        </h2>
        <p className="text-muted-foreground">
          Selecione todos que se aplicam
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {businessModels.map((model) => {
          const isSelected = values.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                isSelected
                  ? "border-lime bg-lime/10"
                  : "border-border bg-surface hover:border-lime/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  className="border-lime data-[state=checked]:bg-lime data-[state=checked]:text-black"
                />
                <span className="text-xl">{model.icon}</span>
                <span className="font-medium text-foreground">{model.label}</span>
              </div>
            </button>
          );
        })}
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
          disabled={values.length === 0}
          className="flex-1 bg-lime text-black hover:bg-lime/90 disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
