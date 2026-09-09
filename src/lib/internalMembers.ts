/**
 * IDs de membros internos da MAP que NUNCA devem aparecer/acessar
 * gestão de assinaturas, analytics, etc. Compartilhado entre o filtro
 * de listas (AdminAssinaturas) e o guard de rotas (ProtectedAdminRoute).
 */
export const INTERNAL_MEMBER_USER_IDS: string[] = [
  "430cdde2-f2e4-49c8-8c96-f0c649519f00", // adm@mapeducacao.com (conta administrativa)
  "1894fbbc-eb90-45f3-9abb-c67065393c31",
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e",
  "9747c48e-ab50-4d33-82f6-36e8a4d94398",
  "69add853-127c-411d-8f68-2051f278e84c",
  "297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf",
  "634f99e0-131b-481c-816d-c14301568fe7",
  // Removidos manualmente da gestão de assinaturas
  "b7783f1f-5e44-46ad-b1f9-17fe451d0689", // José Arthur Freitas (membro interno)
  "7a68fe88-1dec-4fec-af54-a9deed5e634e", // Filipe Tardin Teixeira (reembolsado)
  "628785b5-36c9-4516-bf27-bea300165f1f", // Renzo Lima (membro interno)
  "498b0eb2-e4d4-418c-96ca-062d25675049", // Diego Sayegh (membro interno)
  "44059506-de82-41e6-afd1-39bb3d7589c7", // Rodrigo Ferreira (membro interno)
  "36c7c50e-a909-426f-8a9b-6f4c4849406d", // editor@mapeducacao.com (membro interno)
  "ea125ab3-0740-4840-b325-63e9b042ccea", // teste@mapeducacao.com (conta de teste interna antiga)
  "f86279a9-1566-4216-a947-78159a50ab7f", // teste@mapeducacao.com (conta de teste interna)
  "a50bc15b-d755-4d14-bc71-337df80f361b", // fernanda@mapeducacao.com (membro interno)

];

/**
 * Subset de membros internos que NÃO podem acessar rotas administrativas
 * sensíveis (ex: gestão de assinaturas). Contas administrativas como
 * adm@mapeducacao.com NÃO entram aqui — elas precisam gerenciar.
 */
/**
 * IDs que NÃO devem ser bloqueados das rotas admin sensíveis,
 * mesmo estando na lista de membros internos. Ex: contas administrativas
 * e CS (Bruno Mesquita) que precisam gerenciar assinaturas.
 */
const ADMIN_ALLOWED_INTERNAL_IDS = new Set<string>([
  "430cdde2-f2e4-49c8-8c96-f0c649519f00", // adm@mapeducacao.com
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e", // Bruno Mesquita (CS)
  "634f99e0-131b-481c-816d-c14301568fe7", // Ingrid Medeiros (CX)
  "498b0eb2-e4d4-418c-96ca-062d25675049", // Diego Sayegh (admin)
]);

export const BLOCKED_FROM_ADMIN_USER_IDS: string[] = INTERNAL_MEMBER_USER_IDS.filter(
  (id) => !ADMIN_ALLOWED_INTERNAL_IDS.has(id),
);

export function isInternalMember(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return INTERNAL_MEMBER_USER_IDS.includes(userId);
}

export function isBlockedFromAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return BLOCKED_FROM_ADMIN_USER_IDS.includes(userId);
}
