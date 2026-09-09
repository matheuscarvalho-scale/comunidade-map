/**
 * IDs de usuários que têm acesso à Dona Olga MESMO sem ter role admin.
 * Usado tanto no guard da rota quanto na exibição do item no sidebar.
 * O backend (edge function notify-make-message) também valida essa lista.
 */
export const DONA_OLGA_EXTRA_USER_IDS: string[] = [
  "44059506-de82-41e6-afd1-39bb3d7589c7", // Rodrigo Ferreira (rodrigoferreira@mapeducacao.com)
];

export function hasDonaOlgaExtraAccess(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return DONA_OLGA_EXTRA_USER_IDS.includes(userId);
}
