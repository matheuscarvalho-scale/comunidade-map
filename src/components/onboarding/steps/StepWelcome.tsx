import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-lime rounded-3xl flex items-center justify-center shadow-lg shadow-lime/20">
          <span className="text-black font-bold text-5xl">M</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Bem-vindo ao MAP Acelera! 🎉
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Vamos conhecer você para personalizar sua experiência e ajudá-lo a 
          alcançar seus objetivos no e-commerce.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
      >
        <Sparkles className="w-4 h-4 text-lime" />
        <span>Leva menos de 2 minutos</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={onNext}
          size="lg"
          className="bg-lime text-black hover:bg-lime/90 px-8"
        >
          Começar
        </Button>
      </motion.div>
    </div>
  );
}
