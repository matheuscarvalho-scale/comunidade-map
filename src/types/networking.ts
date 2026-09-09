export interface MemberProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  niche: string | null;
  location: string | null;
  location_state: string | null;
  location_city: string | null;
  experience_level: string | null;
  website_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  is_public: boolean;
  company?: string | null;
  job_title?: string | null;
  industry?: string | null;
  total_points: number;
  streak: number;
  created_at: string;
  specialties?: string[] | null;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export interface MemberMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: MemberProfile;
  receiver?: MemberProfile;
}

export interface Conversation {
  partnerId: string;
  partner: MemberProfile;
  lastMessage: MemberMessage;
  unreadCount: number;
}

export const NICHE_OPTIONS = [
  { value: "amazon", label: "Amazon", color: "bg-orange-500" },
  { value: "mercado-livre", label: "Mercado Livre", color: "bg-yellow-500" },
  { value: "shopee", label: "Shopee", color: "bg-red-500" },
  { value: "dropshipping", label: "Dropshipping", color: "bg-blue-500" },
  { value: "tiktok-shop", label: "TikTok Shop", color: "bg-pink-500" },
  { value: "outro", label: "Outro", color: "bg-gray-500" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "expert", label: "Expert" },
] as const;

export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

export function getNicheLabel(value: string | null): string {
  const niche = NICHE_OPTIONS.find(n => n.value === value);
  return niche?.label || "Outro";
}

export function getNicheColor(value: string | null): string {
  const niche = NICHE_OPTIONS.find(n => n.value === value);
  return niche?.color || "bg-gray-500";
}

export function getExperienceLabel(value: string | null): string {
  const exp = EXPERIENCE_OPTIONS.find(e => e.value === value);
  return exp?.label || "Iniciante";
}
