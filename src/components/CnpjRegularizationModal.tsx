import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onSave: (cnpj: string) => void;
  saving?: boolean;
}

function formatCnpj(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function CnpjRegularizationModal({ open, onSave, saving }: Props) {
  const [cnpj, setCnpj] = useState("");
  const digits = cnpj.replace(/\D/g, "");
  const isValid = digits.length === 14;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md bg-card border-border [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-lime" />
          </div>
          <DialogTitle className="text-xl">Regularize seu CNPJ</DialogTitle>
          <DialogDescription className="pt-1">
O CNPJ passou a ser obrigatório no cadastro. Preencha o CNPJ da sua empresa para continuar — você só precisa fazer isso uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="cnpj-regularizacao">
            CNPJ
          </label>
          <Input
            id="cnpj-regularizacao"
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            maxLength={18}
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            className="bg-surface border-border"
          />
          {cnpj && !isValid && (
            <p className="text-xs text-destructive">CNPJ deve ter 14 dígitos.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            onClick={() => onSave(cnpj)}
            disabled={!isValid || saving}
            className="gap-1.5 bg-lime text-black hover:bg-lime/90"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
