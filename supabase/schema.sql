-- =============================================================================
-- UNIVERSIDADE PEDAGÓGICA DE MAPUTO — Inteligência Artificial (2026)
-- Optimização de Rotas de Entrega em Maputo (Busca de Custo Uniforme, BFS e A*)
-- Autores: Almeida Chiboze, Francelino Penisselo, Safira Vilanculos
-- Docente: MSc. Sheila António Sitoe Rangel
-- =============================================================================

-- 1. Tabela de Localizações (Vértices do Grafo - Tabela 4 do Trabalho)
CREATE TABLE IF NOT EXISTS public.locations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  svg_x DOUBLE PRECISION NOT NULL,
  svg_y DOUBLE PRECISION NOT NULL,
  zone TEXT NOT NULL DEFAULT 'Urbana',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Ligações (Arestas do Grafo - Tabela 5 do Trabalho)
CREATE TABLE IF NOT EXISTS public.edges (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL REFERENCES public.locations(code) ON DELETE CASCADE,
  target TEXT NOT NULL REFERENCES public.locations(code) ON DELETE CASCADE,
  road_type TEXT NOT NULL CHECK (road_type IN ('Principal', 'Urbana')),
  distance_km NUMERIC(6,2) NOT NULL,
  cost_normal_min NUMERIC(6,2) NOT NULL,
  cost_peak_min NUMERIC(6,2) NOT NULL,
  congestion_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  UNIQUE(source, target)
);

-- 3. Tabela de Histórico de Simulações / Pesquisas Executadas na App Web
CREATE TABLE IF NOT EXISTS public.route_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin TEXT NOT NULL REFERENCES public.locations(code),
  destination TEXT NOT NULL REFERENCES public.locations(code),
  scenario TEXT NOT NULL CHECK (scenario IN ('normal', 'ponta')),
  blocked_edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  ucs_path JSONB NOT NULL,
  ucs_cost_min NUMERIC(6,2) NOT NULL,
  ucs_distance_km NUMERIC(6,2) NOT NULL,
  ucs_expanded INTEGER NOT NULL,
  bfs_path JSONB NOT NULL,
  bfs_cost_min NUMERIC(6,2) NOT NULL,
  bfs_distance_km NUMERIC(6,2) NOT NULL,
  bfs_expanded INTEGER NOT NULL,
  astar_path JSONB NOT NULL,
  astar_cost_min NUMERIC(6,2) NOT NULL,
  astar_distance_km NUMERIC(6,2) NOT NULL,
  astar_expanded INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activar Row Level Security (RLS) com acesso público para leitura e registo académico
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de localizações"
  ON public.locations FOR SELECT USING (true);

CREATE POLICY "Permitir leitura pública de ligações"
  ON public.edges FOR SELECT USING (true);

CREATE POLICY "Permitir leitura pública de simulações"
  ON public.route_simulations FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de simulações"
  ON public.route_simulations FOR INSERT WITH CHECK (true);

-- Dados Iniciais: Tabela 4 (13 Localizações de Maputo e Matola)
INSERT INTO public.locations (code, name, lat, lng, svg_x, svg_y, zone) VALUES
  ('SEDE', 'Sede (Baixa)',      -25.9700, 32.5730, 485, 868, 'Centro / Depósito'),
  ('ALM',  'Alto-Maé',          -25.9620, 32.5810, 581, 771, 'Zona Central'),
  ('POL',  'Polana',            -25.9660, 32.5970, 741, 820, 'Zona Costeira Sul'),
  ('SOM',  'Sommerschield',     -25.9520, 32.5960, 725, 643, 'Zona Residencial'),
  ('MAL',  'Malhangalene',      -25.9500, 32.5790, 548, 627, 'Zona Central Norte'),
  ('XIP',  'Xipamanine',        -25.9600, 32.5610, 356, 757, 'Corredor Oeste'),
  ('MAX',  'Maxaquene',         -25.9380, 32.5710, 453, 464, 'Zona Intermédia'),
  ('HUL',  'Hulene',            -25.9280, 32.5480, 260, 334, 'Corredor Norte-Oeste'),
  ('AER',  'Aeroporto',         -25.9240, 32.5790, 533, 286, 'Corredor Norte'),
  ('MAH',  'Mahotas',           -25.9310, 32.6140, 774, 381, 'Corredor Nordeste'),
  ('CDS',  'Costa do Sol',      -25.9460, 32.6480, 917, 578, 'Zona Costeira Leste'),
  ('ZIM',  'Zimpeto',           -25.8650, 32.5650, 388, 111, 'Extremo Norte'),
  ('MAT',  'Matola (Fomento)',  -25.9740, 32.4550,  83, 918, 'Extremo Oeste')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  svg_x = EXCLUDED.svg_x,
  svg_y = EXCLUDED.svg_y,
  zone = EXCLUDED.zone;

-- Dados Iniciais: Tabela 5 (21 Ligações Ponderadas da Rede Viária)
INSERT INTO public.edges (source, target, road_type, distance_km, cost_normal_min, cost_peak_min, congestion_factor) VALUES
  ('SEDE', 'ALM', 'Principal',  1.34,  1.79,  3.22, 1.80),
  ('SEDE', 'POL', 'Urbana',     3.08,  6.17,  6.17, 1.00),
  ('SEDE', 'XIP', 'Urbana',     2.13,  4.26,  4.26, 1.00),
  ('ALM',  'POL', 'Principal',  1.88,  2.51,  2.51, 1.00),
  ('ALM',  'MAL', 'Principal',  1.65,  2.20,  4.40, 2.00),
  ('ALM',  'XIP', 'Urbana',     2.00,  4.00,  4.00, 1.00),
  ('ALM',  'MAT', 'Principal', 14.26, 19.01, 41.82, 2.20),
  ('XIP',  'MAT', 'Principal', 12.43, 16.58, 26.53, 1.60),
  ('POL',  'SOM', 'Urbana',     1.34,  2.68,  2.68, 1.00),
  ('SOM',  'MAL', 'Urbana',     1.65,  3.30,  3.30, 1.00),
  ('POL',  'CDS', 'Principal',  6.44,  8.59, 14.60, 1.70),
  ('MAL',  'MAX', 'Principal',  1.96,  2.61,  2.61, 1.00),
  ('XIP',  'MAX', 'Urbana',     2.69,  5.38,  5.38, 1.00),
  ('MAX',  'AER', 'Principal',  2.31,  3.08,  4.62, 1.50),
  ('MAX',  'HUL', 'Urbana',     2.11,  4.22,  4.22, 1.00),
  ('MAX',  'MAH', 'Principal',  6.14,  8.18,  8.18, 1.00),
  ('HUL',  'AER', 'Urbana',     2.80,  5.59,  5.59, 1.00),
  ('HUL',  'ZIM', 'Urbana',     8.39, 16.77, 16.77, 1.00),
  ('AER',  'ZIM', 'Principal',  7.27,  9.70,  9.70, 1.00),
  ('AER',  'MAH', 'Urbana',     4.39,  8.78,  8.78, 1.00),
  ('MAH',  'CDS', 'Principal',  2.82,  3.77,  3.77, 1.00)
ON CONFLICT (source, target) DO UPDATE SET
  road_type = EXCLUDED.road_type,
  distance_km = EXCLUDED.distance_km,
  cost_normal_min = EXCLUDED.cost_normal_min,
  cost_peak_min = EXCLUDED.cost_peak_min,
  congestion_factor = EXCLUDED.congestion_factor;

-- Dados Iniciais: Os 6 Testes Oficiais da Secção 7 (Tabela 7 e Tabela 8)
INSERT INTO public.route_simulations (
  origin, destination, scenario, blocked_edges,
  ucs_path, ucs_cost_min, ucs_distance_km, ucs_expanded,
  bfs_path, bfs_cost_min, bfs_distance_km, bfs_expanded,
  astar_path, astar_cost_min, astar_distance_km, astar_expanded,
  notes
) VALUES
  (
    'SEDE', 'ZIM', 'normal', '[]'::jsonb,
    '["SEDE","ALM","MAL","MAX","AER","ZIM"]'::jsonb, 19.38, 14.53, 11,
    '["SEDE","XIP","MAX","AER","ZIM"]'::jsonb, 22.42, 14.40, 13,
    '["SEDE","ALM","MAL","MAX","AER","ZIM"]'::jsonb, 19.38, 14.53, 8,
    'Teste 1 Oficial (Tabela 7/8): Zimpeto em hora normal — via principal por Alto-Maé e Malhangalene'
  ),
  (
    'SEDE', 'ZIM', 'ponta', '[]'::jsonb,
    '["SEDE","XIP","MAX","AER","ZIM"]'::jsonb, 23.96, 14.40, 11,
    '["SEDE","XIP","MAX","AER","ZIM"]'::jsonb, 23.96, 14.40, 13,
    '["SEDE","XIP","MAX","AER","ZIM"]'::jsonb, 23.96, 14.40, 9,
    'Teste 2 Oficial (Tabela 7/8): Zimpeto na hora de ponta — desvio por Xipamanine devido ao congestionamento'
  ),
  (
    'SEDE', 'MAT', 'normal', '[]'::jsonb,
    '["SEDE","ALM","MAT"]'::jsonb, 20.80, 15.60, 12,
    '["SEDE","ALM","MAT"]'::jsonb, 20.80, 15.60, 6,
    '["SEDE","ALM","MAT"]'::jsonb, 20.80, 15.60, 4,
    'Teste 3 Oficial (Tabela 7/8): Matola (Fomento) em hora normal — via Alto-Maé'
  ),
  (
    'SEDE', 'MAT', 'ponta', '[]'::jsonb,
    '["SEDE","XIP","MAT"]'::jsonb, 30.79, 14.56, 12,
    '["SEDE","ALM","MAT"]'::jsonb, 45.04, 15.60, 6,
    '["SEDE","XIP","MAT"]'::jsonb, 30.79, 14.56, 9,
    'Teste 4 Oficial (Tabela 7/8): Matola (Fomento) na hora de ponta — BFS falha por +46.3% ao ignorar custos'
  ),
  (
    'SEDE', 'CDS', 'normal', '[]'::jsonb,
    '["SEDE","ALM","POL","CDS"]'::jsonb, 12.89, 9.66, 9,
    '["SEDE","POL","CDS"]'::jsonb, 14.76, 9.52, 8,
    '["SEDE","ALM","POL","CDS"]'::jsonb, 12.89, 9.66, 4,
    'Teste 5 Oficial (Tabela 7/8): Costa do Sol em hora normal — via Alto-Maé e Polana'
  ),
  (
    'SEDE', 'CDS', 'ponta', '[]'::jsonb,
    '["SEDE","ALM","POL","CDS"]'::jsonb, 20.33, 9.66, 10,
    '["SEDE","POL","CDS"]'::jsonb, 20.77, 9.52, 8,
    '["SEDE","ALM","POL","CDS"]'::jsonb, 20.33, 9.66, 7,
    'Teste 6 Oficial (Tabela 7/8): Costa do Sol na hora de ponta — percurso mantém-se mas custo sobe para 20.33 min'
  );

