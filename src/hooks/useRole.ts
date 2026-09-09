import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin_geral' | 'admin' | 'admin_financeiro' | 'admin_conteudo' | 'starter' | 'pro' | 'enterprise' | 'automacao' | 'cx' | 'comercial' | 'marketing';

// C6: Role priority order - highest privilege first
const ROLE_PRIORITY: AppRole[] = [
  'admin_geral', 'admin', 'admin_financeiro', 'admin_conteudo',
  'cx', 'comercial', 'marketing', 'automacao',
  'enterprise', 'pro', 'starter',
];

export const useRole = () => {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: userRole = null, isLoading, error } = useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetch ALL roles for this user
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Return highest-priority role
      const roles = data.map(r => r.role as AppRole);
      for (const priority of ROLE_PRIORITY) {
        if (roles.includes(priority)) return priority;
      }
      
      return roles[0];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const hasRole = (roleName: AppRole | AppRole[]): boolean => {
    if (!user?.id || !userRole) return false;
    
    if (Array.isArray(roleName)) {
      return roleName.includes(userRole);
    }
    
    return userRole === roleName;
  };

  return { userRole, hasRole, isLoading, error };
};
