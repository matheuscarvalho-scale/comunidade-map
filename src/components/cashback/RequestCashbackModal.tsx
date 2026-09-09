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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLogo } from "@/components/parceiros/PartnerLogo";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  discount_percentage: number | null;
}

interface RequestCashbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    partner_id: string;
    partner_name: string;
    discount_percentage: number;
    purchase_amount: number;
    notes?: string;
    proof_url?: string;
  }) => void;
  uploadProof: (file: File) => Promise<string>;
  isSubmitting: boolean;
}

export function RequestCashbackModal({
  open,
  onOpenChange,
  onSubmit,
  uploadProof,
  isSubmitting,
}: RequestCashbackModalProps) {
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch partners
  const { data: partners } = useQuery({
    queryKey: ["partners-for-cashback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, logo_url, discount_percentage")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Partner[];
    },
  });

  const handlePartnerChange = (partnerId: string) => {
    const partner = partners?.find(p => p.id === partnerId);
    setSelectedPartner(partner || null);
  };

  const cashbackAmount = selectedPartner && purchaseAmount
    ? parseFloat(purchaseAmount) * ((selectedPartner.discount_percentage || 0) / 100)
    : 0;

  const handleSubmit = async () => {
    if (!selectedPartner || !purchaseAmount) return;

    let proofUrl: string | undefined;

    if (proofFile) {
      setIsUploading(true);
      try {
        proofUrl = await uploadProof(proofFile);
      } catch (error) {
        console.error("Error uploading proof:", error);
      }
      setIsUploading(false);
    }

    onSubmit({
      partner_id: selectedPartner.id,
      partner_name: selectedPartner.name,
      discount_percentage: selectedPartner.discount_percentage || 0,
      purchase_amount: parseFloat(purchaseAmount),
      notes: notes || undefined,
      proof_url: proofUrl,
    });

    // Reset form
    setSelectedPartner(null);
    setPurchaseAmount("");
    setNotes("");
    setProofFile(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Solicitar Cashback
          </DialogTitle>
          <DialogDescription>
            Informe os detalhes da sua compra para solicitar o cashback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Partner selection */}
          <div className="space-y-2">
            <Label htmlFor="partner">Parceiro</Label>
            <Select onValueChange={handlePartnerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o parceiro" />
              </SelectTrigger>
              <SelectContent>
                {partners?.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    <div className="flex items-center gap-2">
                      <PartnerLogo 
                        name={partner.name} 
                        logoUrl={partner.logo_url} 
                        className="h-6 w-6"
                      />
                      <span>{partner.name}</span>
                      {partner.discount_percentage && (
                        <span className="text-muted-foreground text-sm">
                          ({partner.discount_percentage}%)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor da Compra (R$)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0,00"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
            />
          </div>

          {/* Cashback preview */}
          {selectedPartner && purchaseAmount && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Cashback estimado</p>
                  <p className="text-sm text-muted-foreground">
                    ({selectedPartner.discount_percentage}% de {formatCurrency(parseFloat(purchaseAmount))})
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(cashbackAmount)}
                </p>
              </div>
            </div>
          )}

          {/* Proof upload */}
          <div className="space-y-2">
            <Label htmlFor="proof">Comprovante da Compra</Label>
            <div className="flex items-center gap-2">
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {proofFile && (
                <span className="text-sm text-green-500">
                  ✓ {proofFile.name.substring(0, 20)}...
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Anexe uma imagem ou PDF do comprovante de compra
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre a compra..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPartner || !purchaseAmount || isSubmitting || isUploading}
          >
            {(isSubmitting || isUploading) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isUploading ? "Enviando comprovante..." : "Solicitar Cashback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
