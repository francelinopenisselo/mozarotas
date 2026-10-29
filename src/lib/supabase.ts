import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NodeCode, TrafficScenario } from './rotas-maputo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith('http');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface SimulationRecord {
  id: string;
  origin: NodeCode;
  destination: NodeCode;
  scenario: TrafficScenario;
  blocked_edges: string[];
  ucs_path: NodeCode[];
  ucs_cost_min: number;
  ucs_distance_km: number;
  ucs_expanded: number;
  bfs_path: NodeCode[];
  bfs_cost_min: number;
  bfs_distance_km: number;
  bfs_expanded: number;
  astar_path: NodeCode[];
  astar_cost_min: number;
  astar_distance_km: number;
  astar_expanded: number;
  notes?: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'up_maputo_ia_rotas_simulations_v1';

const DEFAULT_RECORDS: SimulationRecord[] = [
  {
    id: 'official-test-1',
    origin: 'SEDE',
    destination: 'ZIM',
    scenario: 'normal',
    blocked_edges: [],
    ucs_path: ['SEDE', 'ALM', 'MAL', 'MAX', 'AER', 'ZIM'],
    ucs_cost_min: 19.38,
    ucs_distance_km: 14.53,
    ucs_expanded: 11,
    bfs_path: ['SEDE', 'XIP', 'MAX', 'AER', 'ZIM'],
    bfs_cost_min: 22.42,
    bfs_distance_km: 14.4,
    bfs_expanded: 13,
    astar_path: ['SEDE', 'ALM', 'MAL', 'MAX', 'AER', 'ZIM'],
    astar_cost_min: 19.38,
    astar_distance_km: 14.53,
    astar_expanded: 8,
    notes: 'Teste Oficial 1 (Tabela 7/8): Sede → Zimpeto em hora normal',
    created_at: '2026-10-29T18:00:00.000Z',
  },
  {
    id: 'official-test-2',
    origin: 'SEDE',
    destination: 'ZIM',
    scenario: 'ponta',
    blocked_edges: [],
    ucs_path: ['SEDE', 'XIP', 'MAX', 'AER', 'ZIM'],
    ucs_cost_min: 23.96,
    ucs_distance_km: 14.4,
    ucs_expanded: 11,
    bfs_path: ['SEDE', 'XIP', 'MAX', 'AER', 'ZIM'],
    bfs_cost_min: 23.96,
    bfs_distance_km: 14.4,
    bfs_expanded: 13,
    astar_path: ['SEDE', 'XIP', 'MAX', 'AER', 'ZIM'],
    astar_cost_min: 23.96,
    astar_distance_km: 14.4,
    astar_expanded: 9,
    notes: 'Teste Oficial 2 (Tabela 7/8): Sede → Zimpeto na hora de ponta',
    created_at: '2026-10-29T18:05:00.000Z',
  },
  {
    id: 'official-test-4',
    origin: 'SEDE',
    destination: 'MAT',
    scenario: 'ponta',
    blocked_edges: [],
    ucs_path: ['SEDE', 'XIP', 'MAT'],
    ucs_cost_min: 30.79,
    ucs_distance_km: 14.56,
    ucs_expanded: 12,
    bfs_path: ['SEDE', 'ALM', 'MAT'],
    bfs_cost_min: 45.04,
    bfs_distance_km: 15.6,
    bfs_expanded: 6,
    astar_path: ['SEDE', 'XIP', 'MAT'],
    astar_cost_min: 30.79,
    astar_distance_km: 14.56,
    astar_expanded: 9,
    notes: 'Teste Oficial 4 (Tabela 7/8): Sede → Matola na hora de ponta (BFS +46% mais lento)',
    created_at: '2026-10-29T18:10:00.000Z',
  },
];

export async function fetchSimulations(): Promise<{
  data: SimulationRecord[];
  source: 'supabase' | 'local';
}> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('route_simulations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        return { data: data as SimulationRecord[], source: 'supabase' };
      }
    } catch {
      // Fallback para armazenamento local se a tabela ainda não tiver sido criada
    }
  }

  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        return { data: JSON.parse(raw), source: 'local' };
      } catch {
        // Ignorar erro de parse
      }
    }
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_RECORDS));
  }

  return { data: DEFAULT_RECORDS, source: 'local' };
}

export async function saveSimulation(
  payload: Omit<SimulationRecord, 'id' | 'created_at'>
): Promise<{ record: SimulationRecord; source: 'supabase' | 'local' }> {
  const newRecord: SimulationRecord = {
    ...payload,
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sim-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('route_simulations')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return { record: data as SimulationRecord, source: 'supabase' };
      }
    } catch {
      // Fallback local
    }
  }

  if (typeof window !== 'undefined') {
    const current = await fetchSimulations();
    const updated = [newRecord, ...current.data].slice(0, 30);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  return { record: newRecord, source: 'local' };
}

