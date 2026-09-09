import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Gift, Loader2 } from "lucide-react";
import { useCashback } from "@/hooks/useCashback";

interface Partner {
  id: string;
  name: string;
  discountPercent?: number;
  link: string;
  title: string;
}

interface UseBenefitModalProps {
  partner: Partner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseBenefitModal({ partner, open, onOpenChange }: UseBenefitModalProps) {
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");
  const { registerUsage, isRegistering } = useCashback();

  const handleConfirm = () => {
    if (!partner) return;

    registerUsage(
      {
        partner_id: partner.id,
        partner_name: partner.name,
        discount_percentage: partner.discountPercent || 0,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          // Open partner link in new tab
          window.open(partner.link, "_blank", "noopener,noreferrer");
          // Reset form and close modal
          setEstimatedValue("");
          setNotes("");
          onOpenChange(false);
        },
      }
    );
  };

  if (!partner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Usar Benefício - {partner.name}
          </DialogTitle>
          <DialogDescription>
            {partner.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="estimated-value">
              Valor estimado da compra (R$) - <span className="text-muted-foreground">opcional</span>
            </Label>
            <Input
              id="estimated-value"
              type="number"
              placeholder="Ex: 500.00"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
            {estimatedValue && partner.discountPercent && (
              <p className="text-sm text-primary">
                Economia estimada: R$ {((parseFloat(estimatedValue) * partner.discountPercent) / 100).toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Observações - <span className="text-muted-foreground">opcional</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Compra de créditos para anúncios"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              Ao confirmar, você será redirecionado para o site do parceiro e este uso será registrado no seu histórico de cashback.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegistering}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isRegistering}
            className="gap-2"
          >
            {isRegistering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                Confirmar e Acessar
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
