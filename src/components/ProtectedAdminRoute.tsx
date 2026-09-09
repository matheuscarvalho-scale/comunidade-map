import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/contexts/AuthContext";
import { isBlockedFromAdmin } from "@/lib/internalMembers";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  /**
   * Lista de roles administrativas que podem acessar a rota.
   * Por padrão aceita admin_geral, admin, admin_financeiro e admin_conteudo.
   */
  allowedRoles?: Array<
    "admin_geral" | "admin" | "admin_financeiro" | "admin_conteudo"
  >;
  /**
   * Permissão opcional para rotas operacionais que não exigem role admin.
   */
  requiredPermission?: string;
  /**
   * Lista opcional de user_ids que têm acesso à rota mesmo sem role admin
   * ou permissão. Usado para liberar rotas pontuais a usuários específicos.
   */
  allowedUserIds?: string[];
  /**
   * Quando true, bloqueia o acesso para usuários listados em
   * INTERNAL_MEMBER_USER_IDS (membros internos que não podem
   * acessar gestão de assinaturas mesmo que tenham roles admin).
   */
  blockInternalMembers?: boolean;
}

export function ProtectedAdminRoute({
  children,
  allowedRoles = ["admin_geral", "admin", "admin_financeiro", "admin_conteudo"],
  requiredPermission,
  allowedUserIds,
  blockInternalMembers = false,
}: ProtectedAdminRouteProps) {
  return (
    <ProtectedRoute>
      <AdminRoleGate
        allowedRoles={allowedRoles}
        requiredPermission={requiredPermission}
        allowedUserIds={allowedUserIds}
        blockInternalMembers={blockInternalMembers}
      >
        {children}
      </AdminRoleGate>
    </ProtectedRoute>
  );
}

function AdminRoleGate({
  children,
  allowedRoles,
  requiredPermission,
  allowedUserIds,
  blockInternalMembers,
}: {
  children: React.ReactNode;
  allowedRoles: ProtectedAdminRouteProps["allowedRoles"];
  requiredPermission?: string;
  allowedUserIds?: string[];
  blockInternalMembers?: boolean;
}) {
  const { user } = useAuth();
  const { hasRole, isLoading: roleLoading } = useRole();
  const { hasPermission, isLoading: permissionLoading } = usePermission();

  if (roleLoading || permissionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-lime" />
          <p className="text-muted-foreground">Verificando permissões…</p>
        </div>
      </div>
    );
  }

  // Bloqueia membros internos de rotas sensíveis (ex: gestão de assinaturas)
  if (blockInternalMembers && isBlockedFromAdmin(user?.id)) {
    return <Navigate to="/" replace />;
  }

  const hasAllowedRole = !!allowedRoles && hasRole(allowedRoles as any);
  const hasRequiredPermission = !!requiredPermission && hasPermission(requiredPermission);
  const isExplicitlyAllowedUser = !!allowedUserIds && !!user?.id && allowedUserIds.includes(user.id);

  if (!hasAllowedRole && !hasRequiredPermission && !isExplicitlyAllowedUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
