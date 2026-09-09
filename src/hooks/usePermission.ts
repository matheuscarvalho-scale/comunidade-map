import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePermission = () => {
  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const {
    data: userRoles = [],
    isLoading: isRolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map(ur => ur.role);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const isAdminOrSuperAdmin = userRoles.includes('admin') || userRoles.includes('admin_geral');

  const {
    data: permissions = [],
    isLoading: isPermissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ['permissions', user?.id, userRoles],
    queryFn: async () => {
      if (!user?.id) return [];

      if (isAdminOrSuperAdmin) {
        return ['__all__'];
      }

      if (userRoles.length === 0) return [];

      const { data: rolePerms, error: permsError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role', userRoles);

      if (permsError) throw permsError;
      if (!rolePerms || rolePerms.length === 0) return [];

      const permissionIds = [...new Set(rolePerms.map((rp) => rp.permission_id))];
      console.log('usePermission: permission_ids', permissionIds);

      const { data: permsData, error: namesError } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds);

      if (namesError) throw namesError;

      const finalPermissions = (permsData?.map((p) => p.name) || []) as string[];
      console.log('usePermission: final permissions', finalPermissions);
      return finalPermissions;
    },
    enabled: !!user?.id && !isRolesLoading,
    staleTime: 1000 * 60 * 5,
  });

  const hasPermission = (permissionName: string): boolean => {
    if (!user?.id) return false;
    if (permissions.includes('__all__')) return true;
    return permissions.includes(permissionName);
  };

  return {
    hasPermission,
    permissions,
    isLoading: isUserLoading || (!!user?.id && isRolesLoading) || (!!user?.id && !isRolesLoading && isPermissionsLoading),
    error: userError ?? rolesError ?? permissionsError,
  };
};
