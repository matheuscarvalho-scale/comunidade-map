import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StepBusinessToolsProps {
  usesErp: boolean | null;
  erpTools: string[];
  erpOther: string;
  usesAi: boolean | null;
  aiTools: string;
  usesAccounting: boolean | null;
  accountingService: string;
  hasSupplierDifficulty: boolean | null;
  supplierNeeds: string;
  onUpdate: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const erpOptions = [
  { id: "bling", label: "Bling" },
  { id: "tiny", label: "Olist/Tiny" },
  { id: "anymarket", label: "Anymarket" },
  { id: "upseller", label: "Upseller" },
  { id: "base", label: "Base" },
  { id: "outros", label: "Outros" },
];

function YesNoSelector({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-3">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            onClick={() => onChange(opt)}
            className={cn(
              "flex-1 p-3 rounded-xl border text-center font-medium transition-all",
              value === opt
                ? "border-lime bg-lime/10 text-foreground"
                : "border-border bg-surface hover:border-lime/50 text-muted-foreground"
            )}
          >
            {opt ? "Sim" : "Não"}
          </button>
        ))}
      </div>
    </div>
  );
}

const conditionReveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.3 },
};

export function StepBusinessTools({
  usesErp,
  erpTools,
  erpOther,
  usesAi,
  aiTools,
  usesAccounting,
  accountingService,
  hasSupplierDifficulty,
  supplierNeeds,
  onUpdate,
  onNext,
  onBack,
}: StepBusinessToolsProps) {
  const toggleErpTool = (id: string) => {
    const updated = erpTools.includes(id)
      ? erpTools.filter((v) => v !== id)
      : [...erpTools, id];
    onUpdate("erp_tools", updated);
    if (id === "outros" && erpTools.includes(id)) {
      onUpdate("erp_other", "");
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wrench className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Ferramentas e Serviços
        </h2>
        <p className="text-muted-foreground">
          Nos ajude a entender sua operação
        </p>
      </div>

      {/* ERP */}
      <div className="space-y-3">
        <YesNoSelector
          label="Usa integrador ou ERP?"
          value={usesErp}
          onChange={(v) => {
            onUpdate("uses_erp", v);
            if (!v) {
              onUpdate("erp_tools", []);
              onUpdate("erp_other", "");
            }
          }}
        />
        <AnimatePresence>
          {usesErp && (
            <motion.div {...conditionReveal} className="space-y-2 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                {erpOptions.map((erp) => {
                  const isSelected = erpTools.includes(erp.id);
                  return (
                    <button
                      key={erp.id}
                      onClick={() => toggleErpTool(erp.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-lime bg-lime/10"
                          : "border-border bg-surface hover:border-lime/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          className="border-lime data-[state=checked]:bg-lime data-[state=checked]:text-black"
                        />
                        <span className="text-sm font-medium text-foreground">{erp.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {erpTools.includes("outros") && (
                  <motion.div {...conditionReveal}>
                    <Input
                      placeholder="Qual integrador/ERP?"
                      value={erpOther}
                      onChange={(e) => onUpdate("erp_other", e.target.value)}
                      className="bg-surface border-border"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI */}
      <div className="space-y-3">
        <YesNoSelector
          label="Usa Inteligência Artificial na operação?"
          value={usesAi}
          onChange={(v) => {
            onUpdate("uses_ai", v);
            if (!v) onUpdate("ai_tools", "");
          }}
        />
        <AnimatePresence>
          {usesAi && (
            <motion.div {...conditionReveal} className="pt-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Se sim, quais?</label>
              <Input
                placeholder="Ex: ChatGPT, Gemini, ferramenta de precificação com IA..."
                value={aiTools}
                onChange={(e) => onUpdate("ai_tools", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accounting */}
      <div className="space-y-3">
        <YesNoSelector
          label="Possui gestão contábil e fiscal / BPO financeiro?"
          value={usesAccounting}
          onChange={(v) => {
            onUpdate("uses_accounting", v);
            if (!v) onUpdate("accounting_service", "");
          }}
        />
        <AnimatePresence>
          {usesAccounting && (
            <motion.div {...conditionReveal} className="pt-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Qual?</label>
              <Input
                placeholder="Ex: nome do escritório contábil ou plataforma BPO..."
                value={accountingService}
                onChange={(e) => onUpdate("accounting_service", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suppliers */}
      <div className="space-y-3">
        <YesNoSelector
          label="Tem dificuldade de encontrar fornecedores ou insumos?"
          value={hasSupplierDifficulty}
          onChange={(v) => {
            onUpdate("has_supplier_difficulty", v);
            if (!v) onUpdate("supplier_needs", "");
          }}
        />
        <AnimatePresence>
          {hasSupplierDifficulty && (
            <motion.div {...conditionReveal} className="pt-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Se sim, quais?</label>
              <Input
                placeholder="Ex: embalagens, etiquetas de envio, insumos específicos..."
                value={supplierNeeds}
                onChange={(e) => onUpdate("supplier_needs", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1 border-border">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={
            usesErp === null ||
            usesAi === null ||
            usesAccounting === null ||
            hasSupplierDifficulty === null ||
            (usesErp && erpTools.length === 0) ||
            (usesErp && erpTools.includes("outros") && !erpOther.trim()) ||
            (usesAi === true && !aiTools.trim()) ||
            (usesAccounting === true && !accountingService.trim()) ||
            (hasSupplierDifficulty === true && !supplierNeeds.trim())
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
