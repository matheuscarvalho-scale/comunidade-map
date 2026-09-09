import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepBusinessProfileProps {
  company: string;
  jobTitle: string;
  cnpj: string;
  businessNiche: string;
  businessNicheOther: string;
  employeeRange: string;
  averageTicket: string;
  onUpdate: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const nicheOptions = [
  "Acessórios",
  "Alimentos e Bebidas",
  "Automotivo",
  "Beleza e Cuidados Pessoais",
  "Casa e Decoração",
  "Casa, Mesa e Banho",
  "Eletrônicos",
  "Lazer",
  "Móveis",
  "Saúde e Bem Estar",
  "Vestuário",
  "Outros",
];

const employeeOptions = [
  "1 (só eu)",
  "2 a 5",
  "6 a 10",
  "11 a 20",
  "21 a 50",
  "51 a 100",
  "Acima de 100",
];

const ticketOptions = [
  "R$0-10.000",
  "R$10.001-50.000",
  "R$50.001-100.000",
  "R$100.001-200.000",
  "R$200.001-500.000",
  "R$500.001-1.000.000",
  "Acima de R$1.000.000",
];

const conditionReveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.3 },
};

export function StepBusinessProfile({
  company,
  jobTitle,
  cnpj,
  businessNiche,
  businessNicheOther,
  employeeRange,
  averageTicket,
  onUpdate,
  onNext,
  onBack,
}: StepBusinessProfileProps) {
  const showNicheOther = businessNiche === "Outros";

  const formatCnpj = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const cnpjDigits = (cnpj || "").replace(/\D/g, "");
  const isValidCnpj = cnpjDigits.length === 14;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Briefcase className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Perfil do Negócio
        </h2>
        <p className="text-muted-foreground">
          Nos conte mais sobre sua empresa
        </p>
      </div>

      {/* Company */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Nome da empresa
        </label>
        <Input
          placeholder="Ex: Minha Loja LTDA"
          value={company}
          onChange={(e) => onUpdate("company", e.target.value)}
          className="bg-surface border-border"
        />
      </div>

      {/* CNPJ */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          CNPJ <span className="text-lime">*</span>
        </label>
        <Input
          placeholder="00.000.000/0000-00"
          value={cnpj}
          inputMode="numeric"
          maxLength={18}
          onChange={(e) => onUpdate("cnpj", formatCnpj(e.target.value))}
          className="bg-surface border-border"
        />
        {cnpj && !isValidCnpj && (
          <p className="text-xs text-destructive">CNPJ deve ter 14 dígitos.</p>
        )}
      </div>



      {/* Job Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Seu cargo
        </label>
        <Input
          placeholder="Ex: CEO, Sócio, Gerente de E-commerce"
          value={jobTitle}
          onChange={(e) => onUpdate("job_title", e.target.value)}
          className="bg-surface border-border"
        />
      </div>

      {/* Niche */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Setor de atuação
        </label>
        <Select
          value={businessNiche}
          onValueChange={(v) => {
            onUpdate("business_niche", v);
            if (v !== "Outros") onUpdate("business_niche_other", "");
          }}
        >
          <SelectTrigger className="bg-surface border-border">
            <SelectValue placeholder="Selecione seu nicho" />
          </SelectTrigger>
          <SelectContent>
            {nicheOptions.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AnimatePresence>
          {showNicheOther && (
            <motion.div {...conditionReveal} className="pt-1">
              <Input
                placeholder="Qual seu nicho?"
                value={businessNicheOther}
                onChange={(e) => onUpdate("business_niche_other", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Employee Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Número de funcionários
        </label>
        <Select value={employeeRange} onValueChange={(v) => onUpdate("employee_range", v)}>
          <SelectTrigger className="bg-surface border-border">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {employeeOptions.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Average Ticket */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Faixa de Faturamento Mensal
        </label>
        <Select value={averageTicket} onValueChange={(v) => onUpdate("average_ticket", v)}>
          <SelectTrigger className="bg-surface border-border">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {ticketOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1 border-border">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={
            !isValidCnpj ||
            !businessNiche ||
            !employeeRange ||
            !averageTicket ||
            (businessNiche === "Outros" && !businessNicheOther.trim())
          }
          className="flex-1 bg-lime text-black hover:bg-lime/90 disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
