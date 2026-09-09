import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useCreateExtraBenefit,
  useUpdateExtraBenefit,
  BENEFIT_TYPE_LABELS,
  BENEFIT_STATUS_LABELS,
  type ExtraBenefit,
  type ExtraBenefitType,
  type ExtraBenefitStatus,
} from "@/hooks/useExtraBenefits";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benefit?: ExtraBenefit | null;
  memberId?: string;
}

const benefitTypes = Object.keys(BENEFIT_TYPE_LABELS) as ExtraBenefitType[];
const benefitStatuses = Object.keys(BENEFIT_STATUS_LABELS) as ExtraBenefitStatus[];

interface ProfileResult {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

export function ExtraBenefitFormModal({ open, onOpenChange, benefit, memberId }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateExtraBenefit();
  const updateMutation = useUpdateExtraBenefit();
  const isEditing = !!benefit;

  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<ProfileResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<ExtraBenefitType[]>([]);
  const [typeQuantities, setTypeQuantities] = useState<Partial<Record<ExtraBenefitType, number>>>({});
  const [outroTitle, setOutroTitle] = useState("");
  const [status, setStatus] = useState<ExtraBenefitStatus>("concedido");

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["profile-search", memberSearch],
    queryFn: async () => {
      if (memberSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .ilike("name", `%${memberSearch}%`)
        .limit(8);
      if (error) throw error;
      return (data || []) as ProfileResult[];
    },
    enabled: memberSearch.length >= 2 && !selectedMember,
  });

  useEffect(() => {
    if (benefit) {
      setSelectedTypes([benefit.benefit_type]);
      setTypeQuantities({ [benefit.benefit_type]: benefit.quantity_granted });
      setOutroTitle(benefit.benefit_type === "outro" ? benefit.title || "" : "");
      setStatus(benefit.status);
      setSelectedMember({ user_id: benefit.member_id, name: "", avatar_url: null });
      setMemberSearch("");
    } else {
      setSelectedTypes([]);
      setTypeQuantities({});
      setOutroTitle("");
      setStatus("concedido");
      setSelectedMember(memberId ? { user_id: memberId, name: "", avatar_url: null } : null);
      setMemberSearch("");
    }
  }, [benefit, memberId, open]);

  const toggleType = (type: ExtraBenefitType) => {
    if (isEditing) {
      setSelectedTypes([type]);
      setTypeQuantities({ [type]: typeQuantities[type] || 1 });
      return;
    }
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        const next = prev.filter((t) => t !== type);
        const newQ = { ...typeQuantities };
        delete newQ[type];
        setTypeQuantities(newQ);
        return next;
      }
      setTypeQuantities((q) => ({ ...q, [type]: 1 }));
      return [...prev, type];
    });
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      toast({ title: "Erro", description: "Selecione um membro", variant: "destructive" });
      return;
    }
    if (selectedTypes.length === 0) {
      toast({ title: "Erro", description: "Selecione ao menos um tipo", variant: "destructive" });
      return;
    }
    if (selectedTypes.includes("outro") && !outroTitle.trim()) {
      toast({ title: "Erro", description: "Especifique qual é o benefício 'Outro'", variant: "destructive" });
      return;
    }

    const titleFor = (t: ExtraBenefitType) =>
      t === "outro" ? outroTitle.trim() : BENEFIT_TYPE_LABELS[t];

    try {
      if (isEditing) {
        const type = selectedTypes[0];
        await updateMutation.mutateAsync({
          id: benefit!.id,
          member_id: selectedMember.user_id,
          benefit_type: type,
          title: titleFor(type),
          quantity_granted: typeQuantities[type] || 1,
          status,
        });
        toast({ title: "Benefício atualizado com sucesso" });
      } else {
        for (const type of selectedTypes) {
          await createMutation.mutateAsync({
            member_id: selectedMember.user_id,
            benefit_type: type,
            title: titleFor(type),
            description: null,
            quantity_granted: typeQuantities[type] || 1,
            quantity_used: 0,
            status,
            expires_at: null,
            source: null,
            notes: null,
          });
        }
        toast({
          title: selectedTypes.length > 1
            ? `${selectedTypes.length} benefícios criados com sucesso`
            : "Benefício criado com sucesso",
        });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Benefício Extra" : "Novo Benefício Extra"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Member Search */}
          {!memberId && (
            <div className="space-y-2">
              <Label>Membro</Label>
              {selectedMember && selectedMember.name ? (
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={selectedMember.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {selectedMember.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1">{selectedMember.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMember(null); setMemberSearch(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setShowResults(true); }}
                    onFocus={() => setShowResults(true)}
                    placeholder="Buscar membro por nome..."
                  />
                  {showResults && memberSearch.length >= 2 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searching ? (
                        <div className="p-3 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">Nenhum membro encontrado</div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.user_id}
                            type="button"
                            className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => {
                              setSelectedMember(p);
                              setShowResults(false);
                              setMemberSearch("");
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={p.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {p.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{p.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Benefit Types with per-type quantity */}
          <div className="space-y-2">
            <Label>{isEditing ? "Tipo" : "Tipos (selecione um ou mais)"}</Label>
            {isEditing ? (
              <Select value={selectedTypes[0]} onValueChange={(v) => {
                const t = v as ExtraBenefitType;
                setSelectedTypes([t]);
                setTypeQuantities((q) => ({ ...q, [t]: q[t] || 1 }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {benefitTypes.map((t) => (
                    <SelectItem key={t} value={t}>{BENEFIT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                {benefitTypes.map((t) => {
                  const isSelected = selectedTypes.includes(t);
                  return (
                    <div key={t}>
                      <label
                        className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors text-sm ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleType(t)}
                        />
                        {BENEFIT_TYPE_LABELS[t]}
                      </label>
                      <div className="ml-8 mt-1 flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Quantidade:</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setTypeQuantities((q) => ({ ...q, [t]: Math.max(1, (q[t] || 1) - 1) }))
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            className="h-7 w-16 text-xs text-center"
                            value={typeQuantities[t] || 1}
                            onChange={(e) =>
                              setTypeQuantities((q) => ({ ...q, [t]: parseInt(e.target.value) || 1 }))
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setTypeQuantities((q) => ({ ...q, [t]: (q[t] || 1) + 1 }))
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isEditing && selectedTypes[0] && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Quantidade:</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setTypeQuantities((q) => ({ ...q, [selectedTypes[0]]: Math.max(1, (q[selectedTypes[0]] || 1) - 1) }))
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-16 text-xs text-center"
                    value={typeQuantities[selectedTypes[0]] || 1}
                    onChange={(e) =>
                      setTypeQuantities((q) => ({ ...q, [selectedTypes[0]]: parseInt(e.target.value) || 1 }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setTypeQuantities((q) => ({ ...q, [selectedTypes[0]]: (q[selectedTypes[0]] || 1) + 1 }))
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            )}
            {!isEditing && selectedTypes.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {selectedTypes.length} tipos selecionados — será criado 1 benefício para cada tipo
              </p>
            )}
          </div>

          {/* Outro - especificar título */}
          {selectedTypes.includes("outro") && (
            <div className="space-y-2">
              <Label>Especifique qual é o benefício "Outro"</Label>
              <Input
                value={outroTitle}
                onChange={(e) => setOutroTitle(e.target.value)}
                placeholder="Ex: Acesso a evento exclusivo, brinde, consultoria..."
                maxLength={120}
              />
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ExtraBenefitStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {benefitStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{BENEFIT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : isEditing ? "Salvar" : selectedTypes.length > 1 ? `Criar ${selectedTypes.length} benefícios` : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
