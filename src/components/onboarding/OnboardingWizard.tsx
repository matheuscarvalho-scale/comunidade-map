import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useOnboarding, useUpdateOnboarding, useCompleteOnboarding } from "@/hooks/useOnboarding";
import { useProfile } from "@/hooks/useProfile";
import { StepWelcome } from "./steps/StepWelcome";
import { StepPersonalInfo } from "./steps/StepPersonalInfo";
import { StepExperience } from "./steps/StepExperience";
import { StepSalesChannels } from "./steps/StepSalesChannels";
import { StepBusinessTools } from "./steps/StepBusinessTools";
import { StepBusinessProfile } from "./steps/StepBusinessProfile";
import { StepGoals } from "./steps/StepGoals";
import { StepDedication } from "./steps/StepDedication";
import { StepRevenue } from "./steps/StepRevenue";
import { StepAvatar } from "./steps/StepAvatar";
import { StepComplete } from "./steps/StepComplete";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

export interface OnboardingFormData {
  full_name: string;
  whatsapp: string;
  city: string;
  state: string;
  city_state: string;
  experience_level: string;
  business_models: string[];
  main_goal: string;
  weekly_hours: string;
  revenue_goal: string;
  avatar_url?: string;
  sales_channels: string[];
  ecommerce_platform: string;
  sales_channel_other: string;
  uses_erp: boolean | null;
  erp_tools: string[];
  erp_other: string;
  uses_ai: boolean | null;
  ai_tools: string;
  uses_accounting: boolean | null;
  accounting_service: string;
  has_supplier_difficulty: boolean | null;
  supplier_needs: string;
  business_niche: string;
  business_niche_other: string;
  employee_range: string;
  average_ticket: string;
  company: string;
  job_title: string;
  cnpj: string;
}

const TOTAL_STEPS = 10;

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: onboarding } = useOnboarding();
  const { data: profile } = useProfile();
  const updateOnboarding = useUpdateOnboarding();
  const completeOnboarding = useCompleteOnboarding();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    full_name: "",
    whatsapp: "",
    city: "",
    state: "",
    city_state: "",
    experience_level: "",
    business_models: [],
    main_goal: "",
    weekly_hours: "",
    revenue_goal: "",
    sales_channels: [],
    ecommerce_platform: "",
    sales_channel_other: "",
    uses_erp: null,
    erp_tools: [],
    erp_other: "",
    uses_ai: null,
    ai_tools: "",
    uses_accounting: null,
    accounting_service: "",
    has_supplier_difficulty: null,
    supplier_needs: "",
    business_niche: "",
    business_niche_other: "",
    employee_range: "",
    average_ticket: "",
    company: "",
    job_title: "",
    cnpj: "",
  });

  // Load existing data
  useEffect(() => {
    if (onboarding) {
      const step = Math.max(1, onboarding.current_step || 1);
      setCurrentStep(step);
      let city = "";
      let state = "";
      if (onboarding.city_state) {
        const match = onboarding.city_state.match(/^(.+?)\s*[-,]\s*(.+)$/);
        if (match) {
          city = match[1].trim();
          state = match[2].trim();
        } else {
          city = onboarding.city_state;
        }
      }
      setFormData({
        full_name: onboarding.full_name || profile?.name || "",
        whatsapp: onboarding.whatsapp || "",
        city,
        state,
        city_state: onboarding.city_state || "",
        experience_level: onboarding.experience_level || "",
        business_models: onboarding.business_models || [],
        main_goal: onboarding.main_goal || "",
        weekly_hours: onboarding.weekly_hours || "",
        revenue_goal: onboarding.revenue_goal || "",
        sales_channels: onboarding.sales_channels || [],
        ecommerce_platform: onboarding.ecommerce_platform || "",
        sales_channel_other: (onboarding as any).sales_channel_other || "",
        uses_erp: onboarding.uses_erp ?? null,
        erp_tools: onboarding.erp_tools || [],
        erp_other: onboarding.erp_other || "",
        uses_ai: onboarding.uses_ai ?? null,
        ai_tools: onboarding.ai_tools || "",
        uses_accounting: onboarding.uses_accounting ?? null,
        accounting_service: onboarding.accounting_service || "",
        has_supplier_difficulty: onboarding.has_supplier_difficulty ?? null,
        supplier_needs: onboarding.supplier_needs || "",
        business_niche: onboarding.business_niche || "",
        business_niche_other: onboarding.business_niche_other || "",
        employee_range: onboarding.employee_range || "",
        average_ticket: onboarding.average_ticket || "",
        company: (onboarding as any).company || "",
        job_title: (onboarding as any).job_title || "",
        cnpj: (onboarding as any).cnpj || "",
      });
    }
  }, [onboarding, profile]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const updateField = <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    const cityState = formData.city && formData.state
      ? `${formData.city} - ${formData.state}`
      : formData.city || formData.state || "";
    const { city: _c, state: _s, ...rest } = formData;
    await updateOnboarding.mutateAsync({
      ...rest,
      city_state: cityState,
      current_step: currentStep + 1,
    } as any);
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async (avatarUrl?: string) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#BFFF00", "#ffffff", "#00ff88"],
    });

    await completeOnboarding.mutateAsync(avatarUrl);
    setCurrentStep(12);
  };

  const handleFinish = () => {
    navigate("/");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepWelcome onNext={handleNext} />;
      case 2:
        return (
          <StepPersonalInfo
            data={formData}
            updateField={updateField}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <StepExperience
            value={formData.experience_level}
            onChange={(v) => updateField("experience_level", v)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <StepSalesChannels
            salesChannels={formData.sales_channels}
            ecommercePlatform={formData.ecommerce_platform}
            salesChannelOther={formData.sales_channel_other}
            onUpdate={(field, value) => updateField(field as keyof OnboardingFormData, value)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <StepBusinessTools
            usesErp={formData.uses_erp}
            erpTools={formData.erp_tools}
            erpOther={formData.erp_other}
            usesAi={formData.uses_ai}
            aiTools={formData.ai_tools}
            usesAccounting={formData.uses_accounting}
            accountingService={formData.accounting_service}
            hasSupplierDifficulty={formData.has_supplier_difficulty}
            supplierNeeds={formData.supplier_needs}
            onUpdate={(field, value) => updateField(field as keyof OnboardingFormData, value)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <StepBusinessProfile
            company={formData.company}
            jobTitle={formData.job_title}
            cnpj={formData.cnpj}
            businessNiche={formData.business_niche}
            businessNicheOther={formData.business_niche_other}
            employeeRange={formData.employee_range}
            averageTicket={formData.average_ticket}
            onUpdate={(field, value) => updateField(field as keyof OnboardingFormData, value)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <StepGoals
            value={formData.main_goal}
            onChange={(v) => updateField("main_goal", v)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 8:
        return (
          <StepDedication
            value={formData.weekly_hours}
            onChange={(v) => updateField("weekly_hours", v)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 9:
        return (
          <StepRevenue
            value={formData.revenue_goal}
            onChange={(v) => updateField("revenue_goal", v)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 10:
        return (
          <StepAvatar
            onComplete={handleComplete}
            onBack={handleBack}
            isLoading={completeOnboarding.isPending}
          />
        );
      case 11:
      case 12:
        return <StepComplete data={formData} onFinish={handleFinish} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {currentStep <= TOTAL_STEPS && (
        <div className="p-6 border-b border-border">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Etapa {currentStep} de {TOTAL_STEPS}
              </span>
              <span className="text-sm font-medium text-lime">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-muted" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">{renderStep()}</div>
      </div>
    </div>
  );
}
