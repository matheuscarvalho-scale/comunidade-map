import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGate = ({ permission, children, fallback = null }: PermissionGateProps) => {
  const { hasPermission, isLoading } = usePermission();

  // Enquanto carrega, não mostra nada (ou pode mostrar um skeleton)
  if (isLoading) {
    return null;
  }

  // Se tem permissão, renderiza children
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // Se não tem permissão, renderiza fallback
  return <>{fallback}</>;
};
