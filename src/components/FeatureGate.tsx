import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { usePermission } from "@/hooks/usePermission";
import { useRole } from "@/hooks/useRole";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, Construction } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Context to pass admin bar to page layouts
interface FeatureGateContextType {
  adminBar: ReactNode | null;
}

const FeatureGateContext = createContext<FeatureGateContextType>({ adminBar: null });

export function useFeatureGateAdminBar() {
  return useContext(FeatureGateContext).adminBar;
}

// Map feature keys to their corresponding manage permission
const FEATURE_PERMISSION_MAP: Record<string, string> = {
  formacoes: "formations.manage",
  "trilha-conteudo": "formations.manage",
  webinars: "webinars.manage",
  mentorias: "mentorias.manage",
};

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
}

export function FeatureGate({ featureKey, children }: FeatureGateProps) {
  const { isEnabled, toggleMutation, toggles } = useFeatureToggles();
  const { hasPermission, isLoading: permissionLoading } = usePermission();
  const { hasRole, isLoading: roleLoading } = useRole();
  const { toast } = useToast();
  const isModuleAdmin = hasRole(["admin_geral", "admin", "admin_conteudo"]);
  const managePermission = FEATURE_PERMISSION_MAP[featureKey];
  const canManage = isModuleAdmin || (managePermission ? hasPermission(managePermission) : false);
  const serverEnabled = isEnabled(featureKey);
  const toggle = toggles.find((t) => t.feature_key === featureKey);

  // Local state for immediate UI feedback
  const [localEnabled, setLocalEnabled] = useState(serverEnabled);

  // Sync local state when server data changes
  useEffect(() => {
    setLocalEnabled(serverEnabled);
  }, [serverEnabled]);

  const handleToggle = () => {
    const newValue = !localEnabled;
    setLocalEnabled(newValue);
    toggleMutation.mutate(
      { featureKey, enabled: newValue },
      {
        onSuccess: () => {
          toast({
            title: newValue ? "Funcionalidade ativada ✅" : "Funcionalidade desativada 🔒",
            description: `"${toggle?.label || featureKey}" ${newValue ? "está visível" : "aparece como 'Em breve'"} para os membros.`,
          });
        },
        onError: () => {
          // Revert on error
          setLocalEnabled(!newValue);
          toast({
            title: "Erro ao atualizar",
            description: "Não foi possível alterar a visibilidade. Tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Admin toggle bar
  const adminBar = canManage && toggle ? (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2.5 mb-4">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={localEnabled ? "default" : "secondary"} className="text-xs">
          {localEnabled ? "Ativo" : "Desativado"}
        </Badge>
        <span className="text-muted-foreground">
          Visibilidade para membros
        </span>
      </div>
      <Switch
        checked={localEnabled}
        onCheckedChange={handleToggle}
        disabled={toggleMutation.isPending}
      />
    </div>
  ) : null;

  // Wait for permissions and role to load before deciding
  if (permissionLoading || roleLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  // If disabled and user can't manage, show "em breve"
  if (!localEnabled && !canManage) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center animate-fade-in">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Construction className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Em breve</h1>
          <p className="text-muted-foreground max-w-md text-lg">
            Essa funcionalidade está sendo preparada e será liberada em breve. Fique ligado!
          </p>
          <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Disponível em breve</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <FeatureGateContext.Provider value={{ adminBar }}>
      {children}
    </FeatureGateContext.Provider>
  );
}
