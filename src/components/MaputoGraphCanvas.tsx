'use client';

import React, { useState } from 'react';
import {
  EDGES,
  LOCATIONS,
  NODE_LIST,
  NodeCode,
  TrafficScenario,
  edgeKey,
  SearchStepSnapshot,
} from '@/lib/rotas-maputo';
import { Lock, Unlock, Compass, Flame, CheckCircle2, Info } from 'lucide-react';

interface MaputoGraphCanvasProps {
  origin: NodeCode;
  destination: NodeCode;
  scenario: TrafficScenario;
  activePath: NodeCode[];
  comparisonPath?: NodeCode[];
  comparisonLabel?: string;
  expandedNodes: NodeCode[];
  currentStepSnapshot?: SearchStepSnapshot | null;
  blockedEdges: Set<string>;
  customMultiplier: number;
  onSelectNode: (code: NodeCode, role?: 'origin' | 'destination') => void;
  onToggleEdgeBlock: (key: string) => void;
}

export default function MaputoGraphCanvas({
  origin,
  destination,
  scenario,
  activePath,
  comparisonPath = [],
  comparisonLabel = 'BFS',
  expandedNodes,
  currentStepSnapshot,
  blockedEdges,
  customMultiplier,
  onSelectNode,
  onToggleEdgeBlock,
}: MaputoGraphCanvasProps) {
  const [selectionMode, setSelectionMode] = useState<'origin' | 'destination'>('destination');
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeCode | null>(null);

  const activeEdgesSet = new Set<string>();
  const pathToRender = currentStepSnapshot ? currentStepSnapshot.pathSoFar : activePath;
  for (let i = 0; i < pathToRender.length - 1; i++) {
    activeEdgesSet.add(edgeKey(pathToRender[i], pathToRender[i + 1]));
  }

  const comparisonEdgesSet = new Set<string>();
  for (let i = 0; i < comparisonPath.length - 1; i++) {
    comparisonEdgesSet.add(edgeKey(comparisonPath[i], comparisonPath[i + 1]));
  }

  const expandedSet = new Set<NodeCode>(
    currentStepSnapshot ? currentStepSnapshot.expandedNodes : expandedNodes
  );

  const frontierSet = new Set<NodeCode>(
    currentStepSnapshot ? currentStepSnapshot.frontierNodes.map((f) => f.node) : []
  );

  const handleNodeClick = (code: NodeCode) => {
    onSelectNode(code, selectionMode);
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl overflow-hidden">
      {/* Barra Superior do Mapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/75 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Rede Viária Simplificada de Maputo (Grafo Ponderado: 13 Vértices, 21 Ligações)
            </h3>
            <p className="text-xs text-slate-400">
              Clique num vértice para definir{' '}
              <span className="text-emerald-400 font-medium">
                {selectionMode === 'origin' ? 'Origem' : 'Destino'}
              </span>{' '}
              ou clique numa ligação para bloquear/desbloquear a via.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectionMode('origin')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                selectionMode === 'origin'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clicar = Origem ({origin})
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode('destination')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                selectionMode === 'destination'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clicar = Destino ({destination})
            </button>
          </div>

          {blockedEdges.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300">
              <Lock className="h-3 w-3" />
              {blockedEdges.size} via(s) cortada(s)
            </span>
          )}
        </div>
      </div>

      {/* Área Gráfica SVG Fiel à Figura 1 / 2a / 2b do Relatório */}
      <div className="relative w-full aspect-[16/11] min-h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {/* Grelha de Coordenadas Subtil */}
        <svg
          viewBox="0 0 1000 1000"
          className="h-full w-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="maputo-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="rgba(148, 163, 184, 0.06)"
                strokeWidth="1"
              />
            </pattern>
            <filter id="glow-route" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="1000" height="1000" fill="url(#maputo-grid)" />

          {/* Contorno estilizado da Baía de Maputo (Sudeste) */}
          <path
            d="M 460 950 Q 620 910 780 860 Q 900 720 960 550 L 1000 550 L 1000 1000 L 460 1000 Z"
            fill="rgba(14, 116, 144, 0.07)"
            stroke="rgba(56, 189, 248, 0.14)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <text
            x="855"
            y="890"
            fill="rgba(56, 189, 248, 0.25)"
            fontSize="16"
            fontWeight="600"
            letterSpacing="2"
          >
            BAÍA DE MAPUTO
          </text>

          {/* Arestas (21 Ligações da Tabela 5) */}
          {EDGES.map((edge) => {
            const u = LOCATIONS[edge.source];
            const v = LOCATIONS[edge.target];
            const key = edgeKey(edge.source, edge.target);
            const isBlocked = blockedEdges.has(key);
            const isActive = activeEdgesSet.has(key);
            const isComp = comparisonEdgesSet.has(key) && !isActive;
            const isHovered = hoveredEdge === key;
            const isCongested = scenario === 'ponta' && edge.factor > 1.0;

            const baseCost = scenario === 'normal' ? edge.normalMin : edge.pontaMin;
            const cost =
              scenario === 'ponta' && customMultiplier !== 1.0 && edge.factor > 1.0
                ? Number((edge.normalMin * (1 + (edge.factor - 1) * customMultiplier)).toFixed(2))
                : baseCost;

            const midX = (u.svgX + v.svgX) / 2;
            const midY = (u.svgY + v.svgY) / 2;

            let strokeColor = edge.via === 'Principal' ? '#475569' : '#334155';
            let strokeWidth = edge.via === 'Principal' ? 3.5 : 2.2;
            let dashArray = edge.via === 'Urbana' ? '1 0' : 'none';

            if (isCongested && !isActive && !isBlocked) {
              strokeColor = '#f59e0b';
              strokeWidth = 3.5;
            }
            if (isComp) {
              strokeColor = '#a855f7';
              strokeWidth = 4.5;
              dashArray = '8 6';
            }
            if (isActive) {
              strokeColor = '#ef4444'; // Vermelho exactamente como nas Figuras 2a e 2b do relatório
              strokeWidth = 6.5;
              dashArray = 'none';
            }
            if (isBlocked) {
              strokeColor = '#f43f5e';
              strokeWidth = 3;
              dashArray = '6 6';
            }
            if (isHovered) {
              strokeWidth += 2;
            }

            return (
              <g
                key={key}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredEdge(key)}
                onMouseLeave={() => setHoveredEdge(null)}
                onClick={() => onToggleEdgeBlock(key)}
              >
                {/* Linha invisível mais larga para facilitar o clique */}
                <line
                  x1={u.svgX}
                  y1={u.svgY}
                  x2={v.svgX}
                  y2={v.svgY}
                  stroke="transparent"
                  strokeWidth="18"
                />

                {/* Linha principal da estrada */}
                <line
                  x1={u.svgX}
                  y1={u.svgY}
                  x2={v.svgX}
                  y2={v.svgY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  filter={isActive ? 'url(#glow-route)' : undefined}
                />

                {/* Rótulo de custo em minutos no meio da aresta (como na Figura 1) */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="23"
                    rx="6"
                    fill={
                      isBlocked
                        ? '#881337'
                        : isActive
                        ? '#ef4444'
                        : isComp
                        ? '#6b21a8'
                        : isCongested
                        ? '#451a03'
                        : '#0f172a'
                    }
                    stroke={
                      isActive
                        ? '#fca5a5'
                        : isCongested
                        ? '#f59e0b'
                        : '#334155'
                    }
                    strokeWidth="1.2"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={
                      isBlocked
                        ? '#fda4af'
                        : isActive
                        ? '#ffffff'
                        : isCongested
                        ? '#fcd34d'
                        : '#cbd5e1'
                    }
                    fontSize="11.5"
                    fontWeight={isActive || isCongested ? '700' : '600'}
                  >
                    {isBlocked ? 'CORTADA' : `${cost.toFixed(1)}m`}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Vértices (13 Localizações da Tabela 4) */}
          {NODE_LIST.map((node) => {
            const isOrigin = node.code === origin;
            const isDest = node.code === destination;
            const isInPath = pathToRender.includes(node.code);
            const isExpanded = expandedSet.has(node.code);
            const isFrontier = frontierSet.has(node.code);
            const isCurrentStep = currentStepSnapshot?.currentNode === node.code;
            const isHovered = hoveredNode === node.code;

            let fill = '#1d4ed8'; // Azul padrão como na Figura 1
            let ringColor = '#60a5fa';
            let radius = 15;

            if (isExpanded) {
              fill = '#0284c7';
              ringColor = '#38bdf8';
            }
            if (isFrontier) {
              fill = '#d97706';
              ringColor = '#fbbf24';
            }
            if (isInPath) {
              fill = '#dc2626';
              ringColor = '#f87171';
              radius = 17;
            }
            if (isOrigin) {
              fill = '#10b981';
              ringColor = '#6ee7b7';
              radius = 19;
            }
            if (isDest) {
              fill = '#f59e0b';
              ringColor = '#fde68a';
              radius = 19;
            }
            if (isCurrentStep) {
              fill = '#ec4899';
              ringColor = '#f472b6';
              radius = 21;
            }

            const pathIndex = pathToRender.indexOf(node.code);

            return (
              <g
                key={node.code}
                transform={`translate(${node.svgX}, ${node.svgY})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.code)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.code)}
              >
                {/* Halo exterior para origem/destino/passo actual */}
                {(isOrigin || isDest || isCurrentStep || isHovered) && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={isFrontier ? '4 4' : undefined}
                    opacity="0.75"
                  />
                )}

                {/* Círculo do Vértice */}
                <circle
                  r={radius}
                  fill={fill}
                  stroke={ringColor}
                  strokeWidth="2.5"
                />

                {/* Código dentro do nó */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="800"
                >
                  {node.code}
                </text>

                {/* Ordem no percurso */}
                {pathIndex >= 0 && (
                  <g transform={`translate(${radius - 2}, ${-radius + 2})`}>
                    <circle r="9" fill="#0f172a" stroke={ringColor} strokeWidth="1.5" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {pathIndex + 1}
                    </text>
                  </g>
                )}

                {/* Nome da Localização por baixo do nó (como na Figura 1) */}
                <g transform="translate(0, 29)">
                  <rect
                    x={-(node.name.length * 4.1 + 10)}
                    y="-10"
                    width={node.name.length * 8.2 + 20}
                    height="20"
                    rx="5"
                    fill="rgba(2, 6, 23, 0.85)"
                    stroke={isInPath ? 'rgba(248, 113, 113, 0.45)' : 'rgba(51, 65, 85, 0.6)'}
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isInPath ? '#fecaca' : '#f1f5f9'}
                    fontSize="12"
                    fontWeight={isInPath || isOrigin || isDest ? '700' : '500'}
                  >
                    {node.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Flutuante de Ligação ou Nó */}
        {hoveredEdge && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2.5 text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {(() => {
              const edge = EDGES.find((e) => edgeKey(e.source, e.target) === hoveredEdge);
              if (!edge) return null;
              const isBlocked = blockedEdges.has(hoveredEdge);
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span>
                      {LOCATIONS[edge.source].name} ↔ {LOCATIONS[edge.target].name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        edge.via === 'Principal'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Via {edge.via}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>Distância: {edge.distanceKm.toFixed(2)} km</span>
                    <span>Normal: {edge.normalMin.toFixed(2)} min</span>
                    <span className="text-amber-300">
                      Ponta: {edge.pontaMin.toFixed(2)} min (f={edge.factor.toFixed(2)})
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-0.5">
                    {isBlocked ? (
                      <>
                        <Unlock className="h-3 w-3" /> Clique para reabrir esta ligação
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Clique para simular corte/bloqueio de via
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {hoveredNode && !hoveredEdge && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2.5 text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {(() => {
              const loc = LOCATIONS[hoveredNode];
              return (
                <div className="space-y-1">
                  <div className="font-semibold text-white">
                    [{loc.code}] {loc.name} — <span className="text-sky-400">{loc.zone}</span>
                  </div>
                  <div className="text-slate-400">
                    Coordenadas aprox.: ({loc.lat.toFixed(3)}°, {loc.lng.toFixed(3)}°)
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    Clique para definir como {selectionMode === 'origin' ? 'Origem' : 'Destino'}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Legenda do Grafo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-900/60 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300/40" />
            Origem ({LOCATIONS[origin].name})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-300/40" />
            Destino ({LOCATIONS[destination].name})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-red-500" />
            Percurso Seleccionado (Figura 2)
          </span>
          {comparisonPath.length > 1 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-5 border-b-2 border-dashed border-purple-400" />
              Alternativa {comparisonLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-sky-600" />
            Nó Expandido ({expandedSet.size})
          </span>
          {scenario === 'ponta' && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Via com factor de ponta (f &gt; 1)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Info className="h-3.5 w-3.5 text-sky-400" />
          <span>d(u,v) = 1,25 × haversine(u,v) | t(u,v) = d / vel × 60 × f</span>
        </div>
      </div>
    </div>
  );
}

