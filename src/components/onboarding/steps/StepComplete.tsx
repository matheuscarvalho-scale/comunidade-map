import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Rocket, User, MapPin, Target, Clock, TrendingUp, Briefcase } from "lucide-react";
import type { OnboardingFormData } from "../OnboardingWizard";

interface StepCompleteProps {
  data: OnboardingFormData;
  onFinish: () => void;
}

const experienceLabels: Record<string, string> = {
  iniciante: "Iniciante",
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const goalLabels: Record<string, string> = {
  "criar-renda": "Criar renda",
  escalar: "Escalar negócio",
  transicao: "Transição de carreira",
  aprender: "Aprender",
  networking: "Networking",
};

const hoursLabels: Record<string, string> = {
  "menos-5h": "< 5h/semana",
  "5-10h": "5-10h/semana",
  "10-20h": "10-20h/semana",
  "mais-20h": "> 20h/semana",
};

const revenueLabels: Record<string, string> = {
  "ate-5k": "Até R$ 5k",
  "5k-20k": "R$ 5k-20k",
  "20k-50k": "R$ 20k-50k",
  "mais-50k": "> R$ 50k",
};

export function StepComplete({ data, onFinish }: StepCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-lime rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-black" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Tudo pronto! 🚀
        </h1>
        <p className="text-lg text-muted-foreground">
          Seu perfil foi configurado com sucesso
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 mb-8"
      >
        <h3 className="font-semibold text-foreground mb-4 text-center">
          Resumo do seu perfil
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Nome:</span>
            <span className="text-foreground font-medium ml-auto">{data.full_name}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Local:</span>
            <span className="text-foreground font-medium ml-auto">{data.city_state}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Briefcase className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Experiência:</span>
            <span className="text-foreground font-medium ml-auto">
              {experienceLabels[data.experience_level] || data.experience_level}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Target className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Objetivo:</span>
            <span className="text-foreground font-medium ml-auto">
              {goalLabels[data.main_goal] || data.main_goal}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Dedicação:</span>
            <span className="text-foreground font-medium ml-auto">
              {hoursLabels[data.weekly_hours] || data.weekly_hours}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <TrendingUp className="w-4 h-4 text-lime shrink-0" />
            <span className="text-muted-foreground">Meta:</span>
            <span className="text-foreground font-medium ml-auto">
              {revenueLabels[data.revenue_goal] || data.revenue_goal}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          onClick={onFinish}
          size="lg"
          className="bg-lime text-black hover:bg-lime/90 px-8"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Acessar meu Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
