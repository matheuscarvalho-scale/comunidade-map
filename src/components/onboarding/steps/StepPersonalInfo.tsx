import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, User, Phone, MapPin, Loader2 } from "lucide-react";
import { BRAZILIAN_STATES } from "@/types/networking";
import type { OnboardingFormData } from "../OnboardingWizard";

interface StepPersonalInfoProps {
  data: OnboardingFormData;
  updateField: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

interface IBGECity {
  id: number;
  nome: string;
}

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else if (digits.length <= 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function StepPersonalInfo({
  data,
  updateField,
  onNext,
  onBack,
}: StepPersonalInfoProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const isValid =
    data.full_name.trim().length >= 3 &&
    data.whatsapp.replace(/\D/g, "").length >= 10 &&
    data.city.trim().length >= 2 &&
    data.state.length === 2;

  // Fetch cities from IBGE API when state changes
  useEffect(() => {
    if (!data.state || data.state.length !== 2) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${data.state}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data: IBGECity[]) => {
        setCities(data.map((c) => c.nome));
      })
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [data.state]);

  const handleStateChange = (value: string) => {
    updateField("state", value);
    updateField("city", ""); // Reset city when state changes
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    updateField("whatsapp", formatted);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Informações Pessoais
        </h2>
        <p className="text-muted-foreground">
          Precisamos de algumas informações básicas para seu perfil
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-2">
            <User className="w-4 h-4 text-lime" />
            Nome Completo
          </Label>
          <Input
            id="full_name"
            value={data.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            placeholder="Seu nome completo"
            className="bg-surface border-border focus:border-lime"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-lime" />
            WhatsApp
          </Label>
          <Input
            id="whatsapp"
            value={data.whatsapp}
            onChange={handleWhatsAppChange}
            placeholder="(XX) XXXXX-XXXX"
            className="bg-surface border-border focus:border-lime"
            maxLength={16}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-lime" />
            Localização
          </Label>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Select value={data.state} onValueChange={handleStateChange}>
              <SelectTrigger className="w-[100px] bg-surface border-border">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loadingCities ? (
              <div className="flex items-center gap-2 text-muted-foreground px-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando cidades...</span>
              </div>
            ) : cities.length > 0 ? (
              <Select value={data.city} onValueChange={(v) => updateField("city", v)}>
                <SelectTrigger className="bg-surface border-border">
                  <SelectValue placeholder="Selecione a cidade" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={data.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder={data.state ? "Selecione o estado primeiro" : "Selecione o estado"}
                disabled={!data.state}
                className="bg-surface border-border focus:border-lime"
              />
            )}
          </div>
        </div>
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
          disabled={!isValid}
          className="flex-1 bg-lime text-black hover:bg-lime/90 disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
