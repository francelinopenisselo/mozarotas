// ============================================================================
// UNIVERSIDADE PEDAGÓGICA DE MAPUTO — Ensino a Distância
// Disciplina: Inteligência Artificial (2026)
// Trabalho: Aplicação de Conceitos de IA na Optimização de Rotas de Entrega em Maputo
// Autores: Almeida Chiboze, Francelino Penisselo, Safira Vilanculos
// Docente: MSc. Sheila António Sitoe Rangel
// ============================================================================

export type NodeCode =
  | 'SEDE'
  | 'ALM'
  | 'POL'
  | 'SOM'
  | 'MAL'
  | 'XIP'
  | 'MAX'
  | 'HUL'
  | 'AER'
  | 'MAH'
  | 'CDS'
  | 'ZIM'
  | 'MAT';

export type TrafficScenario = 'normal' | 'ponta';
export type RoadType = 'Principal' | 'Urbana';
export type AlgorithmKey = 'ucs' | 'bfs' | 'astar';

export interface LocationNode {
  code: NodeCode;
  name: string;
  lat: number;
  lng: number;
  svgX: number; // Coordenada X (0-1000) fiel à Figura 1 do relatório
  svgY: number; // Coordenada Y (0-1000) fiel à Figura 1 do relatório
  zone: string;
}

export interface RoadEdge {
  source: NodeCode;
  target: NodeCode;
  via: RoadType;
  distanceKm: number;
  normalMin: number;
  pontaMin: number;
  factor: number;
}

export interface SearchStepSnapshot {
  step: number;
  currentNode: NodeCode;
  costG: number;
  heuristicH: number;
  priorityF: number;
  expandedNodes: NodeCode[];
  frontierNodes: { node: NodeCode; f: number; g: number }[];
  pathSoFar: NodeCode[];
}

export interface SearchResult {
  algorithm: AlgorithmKey;
  algorithmName: string;
  found: boolean;
  path: NodeCode[];
  costMin: number;
  distanceKm: number;
  expandedCount: number;
  expandedOrder: NodeCode[];
  steps: SearchStepSnapshot[];
  executionTimeMs: number;
  isOptimal?: boolean;
  excessPercent?: number;
}

export interface MultiStopResult {
  orderedStops: NodeCode[];
  fullPath: NodeCode[];
  totalCostMin: number;
  totalDistanceKm: number;
  totalExpanded: number;
  legs: {
    from: NodeCode;
    to: NodeCode;
    path: NodeCode[];
    costMin: number;
    distanceKm: number;
  }[];
}

// Tabela 4 – Localizações (vértices) do grafo (13 localizações)
export const LOCATIONS: Record<NodeCode, LocationNode> = {
  SEDE: {
    code: 'SEDE',
    name: 'Sede (Baixa)',
    lat: -25.97,
    lng: 32.573,
    svgX: 485,
    svgY: 868,
    zone: 'Centro / Depósito Principal',
  },
  ALM: {
    code: 'ALM',
    name: 'Alto-Maé',
    lat: -25.962,
    lng: 32.581,
    svgX: 581,
    svgY: 771,
    zone: 'Zona Central',
  },
  POL: {
    code: 'POL',
    name: 'Polana',
    lat: -25.966,
    lng: 32.597,
    svgX: 741,
    svgY: 820,
    zone: 'Zona Costeira Sul',
  },
  SOM: {
    code: 'SOM',
    name: 'Sommerschield',
    lat: -25.952,
    lng: 32.596,
    svgX: 725,
    svgY: 643,
    zone: 'Zona Residencial',
  },
  MAL: {
    code: 'MAL',
    name: 'Malhangalene',
    lat: -25.95,
    lng: 32.579,
    svgX: 548,
    svgY: 627,
    zone: 'Zona Central Norte',
  },
  XIP: {
    code: 'XIP',
    name: 'Xipamanine',
    lat: -25.96,
    lng: 32.561,
    svgX: 356,
    svgY: 757,
    zone: 'Corredor Oeste',
  },
  MAX: {
    code: 'MAX',
    name: 'Maxaquene',
    lat: -25.938,
    lng: 32.571,
    svgX: 453,
    svgY: 464,
    zone: 'Zona Intermédia',
  },
  HUL: {
    code: 'HUL',
    name: 'Hulene',
    lat: -25.928,
    lng: 32.548,
    svgX: 260,
    svgY: 334,
    zone: 'Corredor Norte-Oeste',
  },
  AER: {
    code: 'AER',
    name: 'Aeroporto',
    lat: -25.924,
    lng: 32.579,
    svgX: 533,
    svgY: 286,
    zone: 'Corredor Norte',
  },
  MAH: {
    code: 'MAH',
    name: 'Mahotas',
    lat: -25.931,
    lng: 32.614,
    svgX: 774,
    svgY: 381,
    zone: 'Corredor Nordeste',
  },
  CDS: {
    code: 'CDS',
    name: 'Costa do Sol',
    lat: -25.946,
    lng: 32.648,
    svgX: 917,
    svgY: 578,
    zone: 'Zona Costeira Leste',
  },
  ZIM: {
    code: 'ZIM',
    name: 'Zimpeto',
    lat: -25.865,
    lng: 32.565,
    svgX: 388,
    svgY: 111,
    zone: 'Extremo Norte',
  },
  MAT: {
    code: 'MAT',
    name: 'Matola (Fomento)',
    lat: -25.974,
    lng: 32.455,
    svgX: 83,
    svgY: 918,
    zone: 'Extremo Oeste',
  },
};

export const NODE_LIST: LocationNode[] = Object.values(LOCATIONS);

// Tabela 5 – Ligações do grafo: distância e custo (minutos) por cenário (21 ligações)
export const EDGES: RoadEdge[] = [
  { source: 'SEDE', target: 'ALM', via: 'Principal', distanceKm: 1.34, normalMin: 1.79, pontaMin: 3.22, factor: 1.8 },
  { source: 'SEDE', target: 'POL', via: 'Urbana',    distanceKm: 3.08, normalMin: 6.17, pontaMin: 6.17, factor: 1.0 },
  { source: 'SEDE', target: 'XIP', via: 'Urbana',    distanceKm: 2.13, normalMin: 4.26, pontaMin: 4.26, factor: 1.0 },
  { source: 'ALM',  target: 'POL', via: 'Principal', distanceKm: 1.88, normalMin: 2.51, pontaMin: 2.51, factor: 1.0 },
  { source: 'ALM',  target: 'MAL', via: 'Principal', distanceKm: 1.65, normalMin: 2.20, pontaMin: 4.40, factor: 2.0 },
  { source: 'ALM',  target: 'XIP', via: 'Urbana',    distanceKm: 2.00, normalMin: 4.00, pontaMin: 4.00, factor: 1.0 },
  { source: 'ALM',  target: 'MAT', via: 'Principal', distanceKm: 14.26, normalMin: 19.01, pontaMin: 41.82, factor: 2.2 },
  { source: 'XIP',  target: 'MAT', via: 'Principal', distanceKm: 12.43, normalMin: 16.58, pontaMin: 26.53, factor: 1.6 },
  { source: 'POL',  target: 'SOM', via: 'Urbana',    distanceKm: 1.34, normalMin: 2.68, pontaMin: 2.68, factor: 1.0 },
  { source: 'SOM',  target: 'MAL', via: 'Urbana',    distanceKm: 1.65, normalMin: 3.30, pontaMin: 3.30, factor: 1.0 },
  { source: 'POL',  target: 'CDS', via: 'Principal', distanceKm: 6.44, normalMin: 8.59, pontaMin: 14.60, factor: 1.7 },
  { source: 'MAL',  target: 'MAX', via: 'Principal', distanceKm: 1.96, normalMin: 2.61, pontaMin: 2.61, factor: 1.0 },
  { source: 'XIP',  target: 'MAX', via: 'Urbana',    distanceKm: 2.69, normalMin: 5.38, pontaMin: 5.38, factor: 1.0 },
  { source: 'MAX',  target: 'AER', via: 'Principal', distanceKm: 2.31, normalMin: 3.08, pontaMin: 4.62, factor: 1.5 },
  { source: 'MAX',  target: 'HUL', via: 'Urbana',    distanceKm: 2.11, normalMin: 4.22, pontaMin: 4.22, factor: 1.0 },
  { source: 'MAX',  target: 'MAH', via: 'Principal', distanceKm: 6.14, normalMin: 8.18, pontaMin: 8.18, factor: 1.0 },
  { source: 'HUL',  target: 'AER', via: 'Urbana',    distanceKm: 2.80, normalMin: 5.59, pontaMin: 5.59, factor: 1.0 },
  { source: 'HUL',  target: 'ZIM', via: 'Urbana',    distanceKm: 8.39, normalMin: 16.77, pontaMin: 16.77, factor: 1.0 },
  { source: 'AER',  target: 'ZIM', via: 'Principal', distanceKm: 7.27, normalMin: 9.70, pontaMin: 9.70, factor: 1.0 },
  { source: 'AER',  target: 'MAH', via: 'Urbana',    distanceKm: 4.39, normalMin: 8.78, pontaMin: 8.78, factor: 1.0 },
  { source: 'MAH',  target: 'CDS', via: 'Principal', distanceKm: 2.82, normalMin: 3.77, pontaMin: 3.77, factor: 1.0 },
];

export function edgeKey(a: NodeCode, b: NodeCode): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function haversineKm(a: NodeCode, b: NodeCode): number {
  const locA = LOCATIONS[a];
  const locB = LOCATIONS[b];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(locA.lat);
  const lon1 = toRad(locA.lng);
  const lat2 = toRad(locB.lat);
  const lon2 = toRad(locB.lng);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0 * Math.asin(Math.sqrt(s));
}

/**
 * Heurística admissível (Secção 5.2):
 * h(n) = distância em linha recta até ao destino ÷ 50 km/h, em minutos.
 */
export function heuristicMin(node: NodeCode, destination: NodeCode): number {
  if (node === destination) return 0;
  return (haversineKm(node, destination) / 50.0) * 60.0;
}

export interface NeighborEntry {
  neighbor: NodeCode;
  costMin: number;
  distanceKm: number;
  via: RoadType;
  factor: number;
}

export function buildGraph(
  scenario: TrafficScenario,
  blockedEdges: Set<string> = new Set(),
  customMultiplier: number = 1.0
): Record<NodeCode, NeighborEntry[]> {
  const graph: Record<NodeCode, NeighborEntry[]> = {
    SEDE: [],
    ALM: [],
    POL: [],
    SOM: [],
    MAL: [],
    XIP: [],
    MAX: [],
    HUL: [],
    AER: [],
    MAH: [],
    CDS: [],
    ZIM: [],
    MAT: [],
  };

  for (const edge of EDGES) {
    if (blockedEdges.has(edgeKey(edge.source, edge.target))) {
      continue;
    }
    const baseCost = scenario === 'normal' ? edge.normalMin : edge.pontaMin;
    const costMin =
      scenario === 'ponta' && customMultiplier !== 1.0 && edge.factor > 1.0
        ? Number((edge.normalMin * (1 + (edge.factor - 1) * customMultiplier)).toFixed(2))
        : baseCost;

    graph[edge.source].push({
      neighbor: edge.target,
      costMin,
      distanceKm: edge.distanceKm,
      via: edge.via,
      factor: edge.factor,
    });
    graph[edge.target].push({
      neighbor: edge.source,
      costMin,
      distanceKm: edge.distanceKm,
      via: edge.via,
      factor: edge.factor,
    });
  }

  return graph;
}

function reconstructPath(
  parent: Partial<Record<NodeCode, NodeCode | null>>,
  target: NodeCode
): NodeCode[] {
  const path: NodeCode[] = [];
  let curr: NodeCode | null | undefined = target;
  while (curr) {
    path.unshift(curr);
    curr = parent[curr];
  }
  return path;
}

export function calculatePathMetrics(
  graph: Record<NodeCode, NeighborEntry[]>,
  path: NodeCode[]
): { costMin: number; distanceKm: number } {
  let costMin = 0;
  let distanceKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const edge = graph[u]?.find((e) => e.neighbor === v);
    if (edge) {
      costMin += edge.costMin;
      distanceKm += edge.distanceKm;
    }
  }
  return {
    costMin: Number(costMin.toFixed(2)),
    distanceKm: Number(distanceKm.toFixed(2)),
  };
}

/**
 * Busca de Custo Uniforme (Método Principal - Secção 5 e 6.1)
 * Equivalente ao algoritmo de Dijkstra com teste de objectivo na expansão.
 */
export function uniformCostSearch(
  graph: Record<NodeCode, NeighborEntry[]>,
  origin: NodeCode,
  destination: NodeCode
): SearchResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const frontier: { cost: number; node: NodeCode }[] = [{ cost: 0, node: origin }];
  const g: Partial<Record<NodeCode, number>> = { [origin]: 0 };
  const parent: Partial<Record<NodeCode, NodeCode | null>> = { [origin]: null };
  const closed = new Set<NodeCode>();
  const expandedOrder: NodeCode[] = [];
  const steps: SearchStepSnapshot[] = [];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost || a.node.localeCompare(b.node));
    const current = frontier.shift()!;
    const { cost, node } = current;

    if (closed.has(node)) continue;

    // Teste de objectivo ao expandir (exactamente como em rotas_maputo.py na pág. 11)
    if (node === destination) {
      const path = reconstructPath(parent, node);
      const metrics = calculatePathMetrics(graph, path);
      steps.push({
        step: steps.length + 1,
        currentNode: node,
        costG: Number(cost.toFixed(2)),
        heuristicH: 0,
        priorityF: Number(cost.toFixed(2)),
        expandedNodes: [...expandedOrder],
        frontierNodes: frontier.map((f) => ({
          node: f.node,
          f: Number(f.cost.toFixed(2)),
          g: Number(f.cost.toFixed(2)),
        })),
        pathSoFar: path,
      });
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        algorithm: 'ucs',
        algorithmName: 'Busca de Custo Uniforme (Dijkstra)',
        found: true,
        path,
        costMin: metrics.costMin,
        distanceKm: metrics.distanceKm,
        expandedCount: expandedOrder.length,
        expandedOrder,
        steps,
        executionTimeMs: Number((t1 - t0).toFixed(3)),
        isOptimal: true,
        excessPercent: 0,
      };
    }

    closed.add(node);
    expandedOrder.push(node);

    for (const edge of graph[node]) {
      const newCost = cost + edge.costMin;
      if (g[edge.neighbor] === undefined || newCost < g[edge.neighbor]!) {
        g[edge.neighbor] = newCost;
        parent[edge.neighbor] = node;
        frontier.push({ cost: newCost, node: edge.neighbor });
      }
    }

    steps.push({
      step: steps.length + 1,
      currentNode: node,
      costG: Number(cost.toFixed(2)),
      heuristicH: 0,
      priorityF: Number(cost.toFixed(2)),
      expandedNodes: [...expandedOrder],
      frontierNodes: frontier
        .filter((f) => !closed.has(f.node))
        .map((f) => ({
          node: f.node,
          f: Number(f.cost.toFixed(2)),
          g: Number(f.cost.toFixed(2)),
        })),
      pathSoFar: reconstructPath(parent, node),
    });
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    algorithm: 'ucs',
    algorithmName: 'Busca de Custo Uniforme (Dijkstra)',
    found: false,
    path: [],
    costMin: Infinity,
    distanceKm: 0,
    expandedCount: expandedOrder.length,
    expandedOrder,
    steps,
    executionTimeMs: Number((t1 - t0).toFixed(3)),
  };
}

/**
 * Busca em Largura (BFS) — Método de Comparação
 * Minimiza o número de ligações (arestas), ignorando os custos de tempo.
 */
export function breadthFirstSearch(
  graph: Record<NodeCode, NeighborEntry[]>,
  origin: NodeCode,
  destination: NodeCode
): SearchResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const queue: NodeCode[] = [origin];
  const visited = new Set<NodeCode>([origin]);
  const parent: Partial<Record<NodeCode, NodeCode | null>> = { [origin]: null };
  const expandedOrder: NodeCode[] = [];
  const steps: SearchStepSnapshot[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    expandedOrder.push(node);

    const currentPath = reconstructPath(parent, node);
    const currentMetrics = calculatePathMetrics(graph, currentPath);

    if (node === destination) {
      steps.push({
        step: steps.length + 1,
        currentNode: node,
        costG: currentMetrics.costMin,
        heuristicH: 0,
        priorityF: currentPath.length - 1,
        expandedNodes: [...expandedOrder],
        frontierNodes: queue.map((q) => ({
          node: q,
          f: currentPath.length,
          g: 0,
        })),
        pathSoFar: currentPath,
      });
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        algorithm: 'bfs',
        algorithmName: 'Busca em Largura (BFS)',
        found: true,
        path: currentPath,
        costMin: currentMetrics.costMin,
        distanceKm: currentMetrics.distanceKm,
        expandedCount: expandedOrder.length,
        expandedOrder,
        steps,
        executionTimeMs: Number((t1 - t0).toFixed(3)),
      };
    }

    for (const edge of graph[node]) {
      if (!visited.has(edge.neighbor)) {
        visited.add(edge.neighbor);
        parent[edge.neighbor] = node;
        queue.push(edge.neighbor);
      }
    }

    steps.push({
      step: steps.length + 1,
      currentNode: node,
      costG: currentMetrics.costMin,
      heuristicH: 0,
      priorityF: currentPath.length - 1,
      expandedNodes: [...expandedOrder],
      frontierNodes: queue.map((q) => ({
        node: q,
        f: currentPath.length,
        g: 0,
      })),
      pathSoFar: currentPath,
    });
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    algorithm: 'bfs',
    algorithmName: 'Busca em Largura (BFS)',
    found: false,
    path: [],
    costMin: Infinity,
    distanceKm: 0,
    expandedCount: expandedOrder.length,
    expandedOrder,
    steps,
    executionTimeMs: Number((t1 - t0).toFixed(3)),
  };
}

/**
 * Busca A* (A-Estrela) — Método de Comparação Informado
 * Ordena a fronteira por f(n) = g(n) + h(n), com h(n) admissível.
 */
export function aStarSearch(
  graph: Record<NodeCode, NeighborEntry[]>,
  origin: NodeCode,
  destination: NodeCode
): SearchResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const h0 = heuristicMin(origin, destination);
  const frontier: { f: number; g: number; node: NodeCode }[] = [
    { f: h0, g: 0, node: origin },
  ];
  const gScore: Partial<Record<NodeCode, number>> = { [origin]: 0 };
  const parent: Partial<Record<NodeCode, NodeCode | null>> = { [origin]: null };
  const closed = new Set<NodeCode>();
  const expandedOrder: NodeCode[] = [];
  const steps: SearchStepSnapshot[] = [];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.f - b.f || a.g - b.g || a.node.localeCompare(b.node));
    const current = frontier.shift()!;
    const { f, g, node } = current;

    if (closed.has(node)) continue;

    if (node === destination) {
      const path = reconstructPath(parent, node);
      const metrics = calculatePathMetrics(graph, path);
      steps.push({
        step: steps.length + 1,
        currentNode: node,
        costG: Number(g.toFixed(2)),
        heuristicH: 0,
        priorityF: Number(f.toFixed(2)),
        expandedNodes: [...expandedOrder],
        frontierNodes: frontier
          .filter((item) => !closed.has(item.node))
          .map((item) => ({
            node: item.node,
            f: Number(item.f.toFixed(2)),
            g: Number(item.g.toFixed(2)),
          })),
        pathSoFar: path,
      });
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        algorithm: 'astar',
        algorithmName: 'Busca A* (Heurística Haversine)',
        found: true,
        path,
        costMin: metrics.costMin,
        distanceKm: metrics.distanceKm,
        expandedCount: expandedOrder.length,
        expandedOrder,
        steps,
        executionTimeMs: Number((t1 - t0).toFixed(3)),
        isOptimal: true,
        excessPercent: 0,
      };
    }

    closed.add(node);
    expandedOrder.push(node);

    for (const edge of graph[node]) {
      const tentativeG = g + edge.costMin;
      if (
        gScore[edge.neighbor] === undefined ||
        tentativeG < gScore[edge.neighbor]!
      ) {
        gScore[edge.neighbor] = tentativeG;
        parent[edge.neighbor] = node;
        const h = heuristicMin(edge.neighbor, destination);
        frontier.push({
          f: tentativeG + h,
          g: tentativeG,
          node: edge.neighbor,
        });
      }
    }

    const hCurr = heuristicMin(node, destination);
    steps.push({
      step: steps.length + 1,
      currentNode: node,
      costG: Number(g.toFixed(2)),
      heuristicH: Number(hCurr.toFixed(2)),
      priorityF: Number(f.toFixed(2)),
      expandedNodes: [...expandedOrder],
      frontierNodes: frontier
        .filter((item) => !closed.has(item.node))
        .map((item) => ({
          node: item.node,
          f: Number(item.f.toFixed(2)),
          g: Number(item.g.toFixed(2)),
        })),
      pathSoFar: reconstructPath(parent, node),
    });
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    algorithm: 'astar',
    algorithmName: 'Busca A* (Heurística Haversine)',
    found: false,
    path: [],
    costMin: Infinity,
    distanceKm: 0,
    expandedCount: expandedOrder.length,
    expandedOrder,
    steps,
    executionTimeMs: Number((t1 - t0).toFixed(3)),
  };
}

export function compareAllMethods(
  origin: NodeCode,
  destination: NodeCode,
  scenario: TrafficScenario,
  blockedEdges: Set<string> = new Set(),
  customMultiplier: number = 1.0
): Record<AlgorithmKey, SearchResult> {
  const graph = buildGraph(scenario, blockedEdges, customMultiplier);
  const ucs = uniformCostSearch(graph, origin, destination);
  const bfs = breadthFirstSearch(graph, origin, destination);
  const astar = aStarSearch(graph, origin, destination);

  if (ucs.found && bfs.found) {
    bfs.isOptimal = Math.abs(bfs.costMin - ucs.costMin) < 1e-4;
    bfs.excessPercent =
      ucs.costMin > 0
        ? Number((((bfs.costMin - ucs.costMin) / ucs.costMin) * 100).toFixed(1))
        : 0;
  }

  return { ucs, bfs, astar };
}

/**
 * Validação Automática dos 156 pares (Secção 7.4 - Tabela 8 / testes_rotas.py)
 * Compara Busca de Custo Uniforme, A* e BFS com uma implementação independente de Bellman-Ford/Dijkstra.
 */
export interface ValidationSummary {
  scenario: TrafficScenario;
  totalPairs: number;
  ucsOptimalCount: number;
  astarOptimalCount: number;
  bfsOptimalCount: number;
  ucsAvgExpanded: number;
  astarAvgExpanded: number;
  bfsAvgExpanded: number;
  worstBfsCase: {
    origin: NodeCode;
    destination: NodeCode;
    optimalCost: number;
    bfsCost: number;
    excessPercent: number;
  };
}

export function runFullValidation(scenario: TrafficScenario): ValidationSummary {
  const graph = buildGraph(scenario);
  const codes = Object.keys(LOCATIONS) as NodeCode[];
  let totalPairs = 0;
  let ucsOptimalCount = 0;
  let astarOptimalCount = 0;
  let bfsOptimalCount = 0;
  let ucsExpSum = 0;
  let astarExpSum = 0;
  let bfsExpSum = 0;

  let worstBfsCase = {
    origin: 'SEDE' as NodeCode,
    destination: 'MAT' as NodeCode,
    optimalCost: 0,
    bfsCost: 0,
    excessPercent: 0,
  };

  for (const o of codes) {
    // Referência independente (Bellman-Ford a partir de o)
    const refDist: Record<NodeCode, number> = {
      SEDE: Infinity,
      ALM: Infinity,
      POL: Infinity,
      SOM: Infinity,
      MAL: Infinity,
      XIP: Infinity,
      MAX: Infinity,
      HUL: Infinity,
      AER: Infinity,
      MAH: Infinity,
      CDS: Infinity,
      ZIM: Infinity,
      MAT: Infinity,
    };
    refDist[o] = 0;
    for (let i = 0; i < codes.length - 1; i++) {
      for (const u of codes) {
        if (refDist[u] === Infinity) continue;
        for (const edge of graph[u]) {
          if (refDist[u] + edge.costMin < refDist[edge.neighbor]) {
            refDist[edge.neighbor] = refDist[u] + edge.costMin;
          }
        }
      }
    }

    for (const d of codes) {
      if (o === d) continue;
      totalPairs++;
      const ref = Number(refDist[d].toFixed(2));
      const ucs = uniformCostSearch(graph, o, d);
      const astar = aStarSearch(graph, o, d);
      const bfs = breadthFirstSearch(graph, o, d);

      ucsExpSum += ucs.expandedCount;
      astarExpSum += astar.expandedCount;
      bfsExpSum += bfs.expandedCount;

      if (Math.abs(ucs.costMin - ref) < 0.02) ucsOptimalCount++;
      if (Math.abs(astar.costMin - ref) < 0.02) astarOptimalCount++;
      if (Math.abs(bfs.costMin - ref) < 0.02) {
        bfsOptimalCount++;
      } else {
        const excess = ((bfs.costMin - ref) / ref) * 100;
        if (excess > worstBfsCase.excessPercent) {
          worstBfsCase = {
            origin: o,
            destination: d,
            optimalCost: ref,
            bfsCost: bfs.costMin,
            excessPercent: Number(excess.toFixed(1)),
          };
        }
      }
    }
  }

  return {
    scenario,
    totalPairs,
    ucsOptimalCount,
    astarOptimalCount,
    bfsOptimalCount,
    ucsAvgExpanded: Number((ucsExpSum / totalPairs).toFixed(1)),
    astarAvgExpanded: Number((astarExpSum / totalPairs).toFixed(1)),
    bfsAvgExpanded: Number((bfsExpSum / totalPairs).toFixed(1)),
    worstBfsCase,
  };
}

/**
 * Melhoria Futura (Secção 8): Optimização da Sequência de Várias Entregas (TSP exacto no espaço de estados)
 */
export function optimizeMultiDelivery(
  origin: NodeCode,
  stops: NodeCode[],
  returnToOrigin: boolean,
  scenario: TrafficScenario,
  blockedEdges: Set<string> = new Set()
): MultiStopResult | null {
  const uniqueStops = Array.from(new Set(stops.filter((s) => s !== origin)));
  if (uniqueStops.length === 0) return null;

  const graph = buildGraph(scenario, blockedEdges);
  const relevantNodes = [origin, ...uniqueStops];
  const pairResults: Record<string, SearchResult> = {};

  for (const a of relevantNodes) {
    for (const b of relevantNodes) {
      if (a === b) continue;
      const res = uniformCostSearch(graph, a, b);
      if (!res.found) return null;
      pairResults[`${a}->${b}`] = res;
    }
  }

  // Busca de Custo Uniforme no espaço de estados (local_actual, conjunto_visitados)
  let bestOrder: NodeCode[] = [];
  let bestCost = Infinity;

  function permute(curr: NodeCode, remaining: NodeCode[], accOrder: NodeCode[], accCost: number) {
    if (accCost >= bestCost) return;
    if (remaining.length === 0) {
      let finalCost = accCost;
      const finalOrder = [...accOrder];
      if (returnToOrigin) {
        const back = pairResults[`${curr}->${origin}`];
        if (!back) return;
        finalCost += back.costMin;
        finalOrder.push(origin);
      }
      if (finalCost < bestCost) {
        bestCost = finalCost;
        bestOrder = finalOrder;
      }
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i];
      const leg = pairResults[`${curr}->${next}`];
      if (!leg) continue;
      const nextRem = remaining.filter((_, idx) => idx !== i);
      permute(next, nextRem, [...accOrder, next], accCost + leg.costMin);
    }
  }

  permute(origin, uniqueStops, [origin], 0);

  if (bestOrder.length === 0) return null;

  const legs: MultiStopResult['legs'] = [];
  const fullPath: NodeCode[] = [bestOrder[0]];
  let totalDistanceKm = 0;
  let totalExpanded = 0;

  for (let i = 0; i < bestOrder.length - 1; i++) {
    const u = bestOrder[i];
    const v = bestOrder[i + 1];
    const leg = pairResults[`${u}->${v}`];
    legs.push({
      from: u,
      to: v,
      path: leg.path,
      costMin: leg.costMin,
      distanceKm: leg.distanceKm,
    });
    fullPath.push(...leg.path.slice(1));
    totalDistanceKm += leg.distanceKm;
    totalExpanded += leg.expandedCount;
  }

  return {
    orderedStops: bestOrder,
    fullPath,
    totalCostMin: Number(bestCost.toFixed(2)),
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalExpanded,
    legs,
  };
}

// Os 6 Testes Oficiais da Secção 7 (Tabela 7 e Tabela 8)
export const OFFICIAL_TESTS: {
  id: number;
  origin: NodeCode;
  destination: NodeCode;
  scenario: TrafficScenario;
  label: string;
  description: string;
  expectedUcsCost: number;
  expectedDistanceKm: number;
  expectedUcsExpanded: number;
  expectedBfsCost: number;
  expectedBfsExpanded: number;
  expectedAstarCost: number;
  expectedAstarExpanded: number;
}[] = [
  {
    id: 1,
    origin: 'SEDE',
    destination: 'ZIM',
    scenario: 'normal',
    label: 'Teste 1: Sede → Zimpeto (Normal)',
    description: 'Escolhe a via principal por Alto-Maé e Malhangalene (19,38 min). A BFS escolhe Xipamanine (22,42 min).',
    expectedUcsCost: 19.38,
    expectedDistanceKm: 14.53,
    expectedUcsExpanded: 11,
    expectedBfsCost: 22.42,
    expectedBfsExpanded: 13,
    expectedAstarCost: 19.38,
    expectedAstarExpanded: 8,
  },
  {
    id: 2,
    origin: 'SEDE',
    destination: 'ZIM',
    scenario: 'ponta',
    label: 'Teste 2: Sede → Zimpeto (Ponta)',
    description: 'Com Alto-Maé e Malhangalene congestionados, desvia por Xipamanine → Maxaquene → Aeroporto → Zimpeto (23,96 min).',
    expectedUcsCost: 23.96,
    expectedDistanceKm: 14.40,
    expectedUcsExpanded: 11,
    expectedBfsCost: 23.96,
    expectedBfsExpanded: 13,
    expectedAstarCost: 23.96,
    expectedAstarExpanded: 9,
  },
  {
    id: 3,
    origin: 'SEDE',
    destination: 'MAT',
    scenario: 'normal',
    label: 'Teste 3: Sede → Matola (Normal)',
    description: 'Em hora normal, segue pela via principal Sede → Alto-Maé → Matola (20,80 min, 15,60 km).',
    expectedUcsCost: 20.80,
    expectedDistanceKm: 15.60,
    expectedUcsExpanded: 12,
    expectedBfsCost: 20.80,
    expectedBfsExpanded: 6,
    expectedAstarCost: 20.80,
    expectedAstarExpanded: 4,
  },
  {
    id: 4,
    origin: 'SEDE',
    destination: 'MAT',
    scenario: 'ponta',
    label: 'Teste 4: Sede → Matola (Ponta)',
    description: 'Forte congestionamento em Alto-Maé–Matola (f=2,20). Muda para Xipamanine (30,79 min vs 45,04 min na BFS: +46%).',
    expectedUcsCost: 30.79,
    expectedDistanceKm: 14.56,
    expectedUcsExpanded: 12,
    expectedBfsCost: 45.04,
    expectedBfsExpanded: 6,
    expectedAstarCost: 30.79,
    expectedAstarExpanded: 9,
  },
  {
    id: 5,
    origin: 'SEDE',
    destination: 'CDS',
    scenario: 'normal',
    label: 'Teste 5: Sede → Costa do Sol (Normal)',
    description: 'Percurso Sede → Alto-Maé → Polana → Costa do Sol (12,89 min) bate a ligação directa Sede → Polana da BFS (14,76 min).',
    expectedUcsCost: 12.89,
    expectedDistanceKm: 9.66,
    expectedUcsExpanded: 9,
    expectedBfsCost: 14.76,
    expectedBfsExpanded: 8,
    expectedAstarCost: 12.89,
    expectedAstarExpanded: 4,
  },
  {
    id: 6,
    origin: 'SEDE',
    destination: 'CDS',
    scenario: 'ponta',
    label: 'Teste 6: Sede → Costa do Sol (Ponta)',
    description: 'Mantém o percurso por Alto-Maé e Polana, mas o custo sobe de 12,89 para 20,33 min devido ao factor 1,70 em Polana–Costa do Sol.',
    expectedUcsCost: 20.33,
    expectedDistanceKm: 9.66,
    expectedUcsExpanded: 10,
    expectedBfsCost: 20.77,
    expectedBfsExpanded: 8,
    expectedAstarCost: 20.33,
    expectedAstarExpanded: 7,
  },
];

