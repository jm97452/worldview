import type { PanelConfig, MapLayers } from '@/types';

// Panel order optimized for tech/AI analysis workflow:
// Row 1: AI/Tech news and trends
// Row 2: Market signals and funding activity
// Row 3: Community feeds and developer news
export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Tech Map', enabled: true, priority: 1 },
  ai: { name: 'AI/ML News', enabled: true, priority: 1 },
  tech: { name: 'Technology', enabled: true, priority: 1 },
  startups: { name: 'Startups & VC', enabled: true, priority: 1 },
  'live-news': { name: 'Tech Headlines', enabled: true, priority: 1 },
  security: { name: 'Cybersecurity', enabled: true, priority: 1 },
  policy: { name: 'AI Policy & Regulation', enabled: true, priority: 1 },
  layoffs: { name: 'Layoffs Tracker', enabled: true, priority: 1 },
  markets: { name: 'Tech Stocks', enabled: true, priority: 2 },
  finance: { name: 'Financial News', enabled: true, priority: 2 },
  crypto: { name: 'Crypto', enabled: true, priority: 2 },
  hardware: { name: 'Semiconductors & Hardware', enabled: true, priority: 2 },
  cloud: { name: 'Cloud & Infrastructure', enabled: true, priority: 2 },
  dev: { name: 'Developer Community', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  // Infrastructure
  cables: true,
  outages: true,

  // Tech/AI layers
  datacenters: true,
  techCompanies: true,
  aiLabs: true,
  startupEcosystems: true,

  // Market & research
  techStocks: false,
  arxivPapers: false,
  hackernews: false,
  githubTrending: false,

  // Generic
  weather: false,
  natural: true,
  countries: false,
};

// Mobile-specific defaults: minimal layers for better usability
// Only essential layers: tech companies, AI labs, datacenters, outages
export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  // Infrastructure
  cables: false,
  outages: true,

  // Tech/AI layers
  datacenters: true,
  techCompanies: true,
  aiLabs: false,
  startupEcosystems: false,

  // Market & research
  techStocks: false,
  arxivPapers: false,
  hackernews: false,
  githubTrending: false,

  // Generic
  weather: false,
  natural: true,
  countries: false,
};

export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'worldmonitor-panels',
  monitors: 'worldmonitor-monitors',
  mapLayers: 'worldmonitor-layers',
} as const;
