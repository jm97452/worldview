import type { AisDisruptionEvent, AisDensityZone, AisDisruptionType } from '@/types';
import { API_URLS } from '@/config';

type RawDisruption = Partial<AisDisruptionEvent> & {
  type?: AisDisruptionType | string;
  severity?: 'low' | 'elevated' | 'high' | string;
  lat?: number | string;
  lon?: number | string;
  changePct?: number | string;
  windowHours?: number | string;
};

type RawDensity = Partial<AisDensityZone> & {
  lat?: number | string;
  lon?: number | string;
  intensity?: number | string;
  deltaPct?: number | string;
  shipsPerDay?: number | string;
};

interface AisSignalResponse {
  disruptions?: RawDisruption[];
  density?: RawDensity[];
}

const VALID_SEVERITIES = new Set(['low', 'elevated', 'high']);
const VALID_TYPES = new Set(['gap_spike', 'chokepoint_congestion']);

const toNumber = (value: number | string | undefined, fallback = 0): number => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? num : fallback;
};

const normalizeDisruption = (event: RawDisruption, index: number): AisDisruptionEvent | null => {
  if (!event) return null;
  const type = VALID_TYPES.has(String(event.type)) ? (event.type as AisDisruptionType) : undefined;
  if (!type) return null;

  const severity = VALID_SEVERITIES.has(String(event.severity))
    ? (event.severity as 'low' | 'elevated' | 'high')
    : 'low';

  const lat = toNumber(event.lat, NaN);
  const lon = toNumber(event.lon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const changePct = toNumber(event.changePct, 0);
  const windowHours = Math.max(1, toNumber(event.windowHours, 1));

  return {
    id: event.id || `ais-disruption-${index}`,
    name: event.name || 'AIS Disruption',
    type,
    lat,
    lon,
    severity,
    changePct,
    windowHours,
    darkShips: event.darkShips ? toNumber(event.darkShips, 0) : undefined,
    vesselCount: event.vesselCount ? toNumber(event.vesselCount, 0) : undefined,
    region: event.region,
    description: event.description || 'AIS anomaly detected from aggregated vessel telemetry.',
  };
};

const normalizeDensity = (zone: RawDensity, index: number): AisDensityZone | null => {
  if (!zone) return null;
  const lat = toNumber(zone.lat, NaN);
  const lon = toNumber(zone.lon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const intensity = Math.min(Math.max(toNumber(zone.intensity, 0), 0), 1);
  return {
    id: zone.id || `ais-density-${index}`,
    name: zone.name || 'AIS Density',
    lat,
    lon,
    intensity,
    deltaPct: toNumber(zone.deltaPct, 0),
    shipsPerDay: zone.shipsPerDay ? toNumber(zone.shipsPerDay, 0) : undefined,
    note: zone.note,
  };
};

export async function fetchAisSignals(): Promise<{ disruptions: AisDisruptionEvent[]; density: AisDensityZone[] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(API_URLS.aisSignals, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`AIS feed error: ${response.status}`);
    }
    const data = (await response.json()) as AisSignalResponse;

    const disruptions = (data.disruptions || [])
      .map(normalizeDisruption)
      .filter((event): event is AisDisruptionEvent => event !== null);

    const density = (data.density || [])
      .map(normalizeDensity)
      .filter((zone): zone is AisDensityZone => zone !== null);

    return { disruptions, density };
  } catch (error) {
    console.warn('Failed to fetch AIS signals:', error);
    return { disruptions: [], density: [] };
  } finally {
    clearTimeout(timeout);
  }
}
