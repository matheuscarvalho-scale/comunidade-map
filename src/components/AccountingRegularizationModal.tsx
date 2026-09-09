import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  initialUsesAccounting?: boolean | null;
  initialAccountingService?: string;
  onSave: (usesAccounting: boolean, accountingService: string) => void;
  saving?: boolean;
}

export function AccountingRegularizationModal({
  open,
  initialUsesAccounting = null,
  initialAccountingService = "",
  onSave,
  saving,
}: Props) {
  const [uses, setUses] = useState<boolean | null>(initialUsesAccounting);
  const [service, setService] = useState(initialAccountingService);

  const isValid = uses === false || (uses === true && service.trim().length >= 2);

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
            <Calculator className="h-5 w-5 text-lime" />
          </div>
          <DialogTitle className="text-xl">Confirme sua gestão contábil</DialogTitle>
          <DialogDescription className="pt-1">
            Precisamos atualizar essa informação no seu cadastro. Você possui gestão contábil e fiscal
            (contador ou BPO financeiro)? Leva menos de um minuto e só será pedido uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={uses === true ? "default" : "outline"}
              className={uses === true ? "bg-lime text-black hover:bg-lime/90" : ""}
              onClick={() => setUses(true)}
              aria-label="Sim, tenho contabilidade"
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={uses === false ? "default" : "outline"}
              className={uses === false ? "bg-lime text-black hover:bg-lime/90" : ""}
              onClick={() => {
                setUses(false);
                setService("");
              }}
              aria-label="Não tenho contabilidade"
            >
              Não
            </Button>
          </div>

          {uses === true && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="accounting-service">
                Qual?
              </label>
              <Input
                id="accounting-service"
                placeholder="Ex: nome do escritório contábil ou plataforma BPO..."
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="bg-surface border-border"
              />
              {service.trim().length > 0 && service.trim().length < 2 && (
                <p className="text-xs text-destructive">Informe o nome do serviço.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            onClick={() => onSave(uses === true, service)}
            disabled={!isValid || saving}
            className="gap-1.5 bg-lime text-black hover:bg-lime/90"
            data-ga="accounting-regularization-save"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
