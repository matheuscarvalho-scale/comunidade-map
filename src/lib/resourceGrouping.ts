import type { Resource } from "@/hooks/useResources";

export interface MarketplaceGroup {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  resources: Resource[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchPlatform(normalized: string): string | null {
  if (normalized.includes('webinar') || normalized.includes('web inar')) return 'webinars';
  if (normalized.includes('mentoria')) return 'mentorias';
  if (normalized.includes('aula')) return 'aulas';
  if (normalized.includes('tiktok') || normalized.includes('tik tok') || normalized.includes('tik_tok')) return 'tiktok';
  if (normalized.includes('amazon') || normalized.includes('fba') || normalized.includes('buy box') || normalized.includes('buy_box') || normalized.includes('sponsored')) return 'amazon';
  if (normalized.includes('mercado livre') || normalized.includes('mercado_livre') || normalized.includes('mercadolivre')) return 'mercadolivre';
  if (normalized.includes('shopee')) return 'shopee';
  if (normalized.includes('shein')) return 'shein';
  return null;
}

function detectPlatform(resource: Resource): string {
  // The category field alone is the authoritative signal when it clearly names a
  // platform \u2014 check it first so a title/description that happens to mention a
  // different platform (e.g. a "Webinar ..." recording filed under category
  // "Mentorias") doesn't win over the real category.
  const byCategory = matchPlatform(normalize(resource.category ?? ''));
  if (byCategory) return byCategory;

  const normalized = normalize(`${resource.title} ${resource.category ?? ''} ${resource.description ?? ''}`);
  return matchPlatform(normalized) ?? 'outros';
}

const platformConfig: Record<string, Omit<MarketplaceGroup, 'key' | 'resources'>> = {
  webinars: {
    title: 'Webinars',
    subtitle: 'Materiais e gravações dos webinars',
    icon: '🎥',
    accentColor: 'bg-primary/5 border-primary/20',
  },
  aulas: {
    title: 'Aulas',
    subtitle: 'Aulas e conteúdos formativos',
    icon: '🎓',
    accentColor: 'bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10',
  },
  mentorias: {
    title: 'Mentorias',
    subtitle: 'Materiais e gravações de mentorias',
    icon: '🧠',
    accentColor: 'bg-purple-500/5 border-purple-500/20 dark:bg-purple-500/10',
  },
  amazon: {
    title: 'Amazon',
    subtitle: 'Guias, estratégias de Ads e operação FBA',
    icon: '📦',
    accentColor: 'bg-orange-500/5 border-orange-500/20 dark:bg-orange-500/10',
  },
  tiktok: {
    title: 'TikTok Shop',
    subtitle: 'Fundamentos, criativos e estratégias de venda',
    icon: '🎵',
    accentColor: 'bg-pink-500/5 border-pink-500/20 dark:bg-pink-500/10',
  },
  mercadolivre: {
    title: 'Mercado Livre',
    subtitle: 'Anúncios, logística e performance',
    icon: '🤝',
    accentColor: 'bg-yellow-500/5 border-yellow-500/20 dark:bg-yellow-500/10',
  },
  shopee: {
    title: 'Shopee',
    subtitle: 'Estratégias e ferramentas para Shopee',
    icon: '🛒',
    accentColor: 'bg-orange-600/5 border-orange-600/20 dark:bg-orange-600/10',
  },
  shein: {
    title: 'Shein',
    subtitle: 'Materiais para vender na Shein',
    icon: '👗',
    accentColor: 'bg-slate-500/5 border-slate-500/20 dark:bg-slate-500/10',
  },
  outros: {
    title: 'Outros Recursos',
    subtitle: 'Gestão, marketing e ferramentas gerais',
    icon: '📁',
    accentColor: 'bg-primary/5 border-primary/20',
  },
};

const platformOrder = ['webinars', 'aulas', 'mentorias', 'amazon', 'tiktok', 'mercadolivre', 'shopee', 'shein', 'outros'];

export function groupResourcesByPlatform(resources: Resource[]): MarketplaceGroup[] {
  const groups: Record<string, Resource[]> = {};

  for (const resource of resources) {
    const platform = detectPlatform(resource);
    if (!groups[platform]) groups[platform] = [];
    groups[platform].push(resource);
  }

  // Sort resources within each group by title (numeric prefix)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { numeric: true }));
  }

  return platformOrder
    .filter(key => groups[key]?.length)
    .map(key => ({
      key,
      ...platformConfig[key],
      resources: groups[key],
    }));
}
