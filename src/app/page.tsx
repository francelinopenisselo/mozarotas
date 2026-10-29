'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  AlgorithmKey,
  EDGES,
  LOCATIONS,
  NODE_LIST,
  NodeCode,
  OFFICIAL_TESTS,
  TrafficScenario,
  compareAllMethods,
  edgeKey,
  optimizeMultiDelivery,
  runFullValidation,
} from '@/lib/rotas-maputo';
import {
  SimulationRecord,
  fetchSimulations,
  isSupabaseConfigured,
  saveSimulation,
} from '@/lib/supabase';
import MaputoGraphCanvas from '@/components/MaputoGraphCanvas';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Database,
  FastForward,
  FileCode2,
  Flame,
  GitBranch,
  Globe,
  Layers,
  MapPin,
  Navigation,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  SkipBack,
  SkipForward,
  Sliders,
  Sun,
  Table as TableIcon,
  Truck,
  Zap,
} from 'lucide-react';

type ActiveTab =
  | 'simulador'
  | 'testes'
  | 'multi-entregas'
  | 'teoria-codigo'
  | 'cloud-deploy';

export default function HomePage() {
  // Estado principal do Simulador
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulador');
  const [origin, setOrigin] = useState<NodeCode>('SEDE');
  const [destination, setDestination] = useState<NodeCode>('ZIM');
  const [scenario, setScenario] = useState<TrafficScenario>('normal');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmKey>('ucs');
  const [showComparisonOnMap, setShowComparisonOnMap] = useState<boolean>(true);
  const [blockedEdges, setBlockedEdges] = useState<Set<string>>(new Set());
  const [customMultiplier, setCustomMultiplier] = useState<number>(1.0);

  // Estado do reprodutor passo-a-passo da fronteira
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [isPlayingSteps, setIsPlayingSteps] = useState<boolean>(false);

  // Estado Multi-Entregas (Melhoria Futura Secção 8)
  const [multiStops, setMultiStops] = useState<NodeCode[]>(['ALM', 'POL', 'CDS', 'ZIM']);
  const [returnToSede, setReturnToSede] = useState<boolean>(true);

  // Estado Supabase / Histórico de Simulações
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [storageSource, setStorageSource] = useState<'supabase' | 'local'>('local');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Cálculo reactivo dos 3 algoritmos (UCS, BFS, A*)
  const results = useMemo(() => {
    return compareAllMethods(
      origin,
      destination,
      scenario,
      blockedEdges,
      customMultiplier
    );
  }, [origin, destination, scenario, blockedEdges, customMultiplier]);

  const activeResult = results[selectedAlgo];

  // Validação automática dos 156 pares (Secção 7.4)
  const validationNormal = useMemo(() => runFullValidation('normal'), []);
  const validationPonta = useMemo(() => runFullValidation('ponta'), []);

  // Multi-Entregas (TSP no grafo)
  const multiStopResult = useMemo(() => {
    return optimizeMultiDelivery(
      origin,
      multiStops,
      returnToSede,
      scenario,
      blockedEdges
    );
  }, [origin, multiStops, returnToSede, scenario, blockedEdges]);

  // Carregar histórico de simulações (Supabase ou Local)
  useEffect(() => {
    fetchSimulations().then((res) => {
      setSimulations(res.data);
      setStorageSource(res.source);
    });
  }, []);

  // Reset do reprodutor passo a passo quando mudam os parâmetros
  useEffect(() => {
    setStepIndex(null);
    setIsPlayingSteps(false);
  }, [origin, destination, scenario, selectedAlgo, blockedEdges, customMultiplier]);

  // Temporizador de reprodução passo-a-passo
  useEffect(() => {
    if (!isPlayingSteps) return;
    const totalSteps = activeResult.steps.length;
    if (totalSteps === 0) {
      setIsPlayingSteps(false);
      return;
    }
    const timer = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= totalSteps) {
          setIsPlayingSteps(false);
          return totalSteps - 1;
        }
        return next;
      });
    }, 650);
    return () => clearInterval(timer);
  }, [isPlayingSteps, activeResult.steps.length]);

  const currentStepSnapshot =
    stepIndex !== null && activeResult.steps[stepIndex]
      ? activeResult.steps[stepIndex]
      : null;

  const handleSelectNodeOnMap = (code: NodeCode, role?: 'origin' | 'destination') => {
    if (role === 'origin') {
      if (code === destination) setDestination(origin);
      setOrigin(code);
    } else {
      if (code === origin) setOrigin(destination);
      setDestination(code);
    }
  };

  const handleToggleEdgeBlock = (key: string) => {
    setBlockedEdges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLoadOfficialTest = (test: (typeof OFFICIAL_TESTS)[number]) => {
    setOrigin(test.origin);
    setDestination(test.destination);
    setScenario(test.scenario);
    setBlockedEdges(new Set());
    setCustomMultiplier(1.0);
    setSelectedAlgo('ucs');
    setActiveTab('simulador');
  };

  const handleSaveCurrentSimulation = async () => {
    if (!results.ucs.found) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await saveSimulation({
        origin,
        destination,
        scenario,
        blocked_edges: Array.from(blockedEdges),
        ucs_path: results.ucs.path,
        ucs_cost_min: results.ucs.costMin,
        ucs_distance_km: results.ucs.distanceKm,
        ucs_expanded: results.ucs.expandedCount,
        bfs_path: results.bfs.path,
        bfs_cost_min: results.bfs.costMin,
        bfs_distance_km: results.bfs.distanceKm,
        bfs_expanded: results.bfs.expandedCount,
        astar_path: results.astar.path,
        astar_cost_min: results.astar.costMin,
        astar_distance_km: results.astar.distanceKm,
        astar_expanded: results.astar.expandedCount,
        notes: `Simulação ${LOCATIONS[origin].name} → ${LOCATIONS[destination].name} (${scenario})`,
      });
      const updated = await fetchSimulations();
      setSimulations(updated.data);
      setStorageSource(res.source);
      setSaveFeedback(
        res.source === 'supabase'
          ? 'Guardado na base de dados Supabase!'
          : 'Guardado no histórico local (pronto para sincronizar com Supabase)!'
      );
      setTimeout(() => setSaveFeedback(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMultiStopNode = (code: NodeCode) => {
    if (code === origin) return;
    setMultiStops((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Cabeçalho Institucional e Académico */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-900/40">
                <Route className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    Universidade Pedagógica de Maputo • IA 2026
                  </span>
                  <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                    Busca de Custo Uniforme • BFS • A*
                  </span>
                </div>
                <h1 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
                  Optimização de Rotas de Entrega em Maputo
                </h1>
                <p className="text-xs text-slate-400">
                  Autores:{' '}
                  <span className="text-slate-200 font-medium">
                    Almeida Chiboze, Francelino Penisselo &amp; Safira Vilanculos
                  </span>{' '}
                  • Docente:{' '}
                  <span className="text-slate-200 font-medium">
                    MSc. Sheila António Sitoe Rangel
                  </span>
                </p>
              </div>
            </div>

            {/* Estado de Ligação Cloud (Vercel + Supabase + GitHub) */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  isSupabaseConfigured
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>
                  {isSupabaseConfigured
                    ? 'Supabase Conectado'
                    : 'Supabase Ready (Modo Local Activo)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('cloud-deploy')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition"
              >
                <Globe className="h-3.5 w-3.5 text-sky-400" />
                <span>Vercel + Supabase + GitHub</span>
              </button>
            </div>
          </div>

          {/* Navegação por Separadores */}
          <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-3">
            {[
              {
                id: 'simulador',
                label: 'Simulador & Grafo Interactivo',
                icon: Navigation,
              },
              {
                id: 'testes',
                label: 'Testes Oficiais (Secção 7) & Validação 156 Pares',
                icon: ShieldCheck,
              },
              {
                id: 'multi-entregas',
                label: 'Multi-Entregas TSP (Melhoria Secção 8)',
                icon: Truck,
              },
              {
                id: 'teoria-codigo',
                label: 'Formulação PEAS, Tabelas & Código Python',
                icon: BookOpen,
              },
              {
                id: 'cloud-deploy',
                label: 'Base de Dados Supabase & Deploy Vercel',
                icon: Database,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                      : 'bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* ===================================================================
            TAB 1: SIMULADOR & GRAFO INTERACTIVO
           =================================================================== */}
        {activeTab === 'simulador' && (
          <div className="space-y-6">
            {/* Atalhos Rápidos para os 6 Testes Oficiais do Relatório */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cenários de Teste do Relatório (Secção 7.2 e 7.3 — Tabelas 7 e 8)
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Clique num teste para carregar imediatamente no grafo:
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
                {OFFICIAL_TESTS.map((test) => {
                  const isCurrent =
                    origin === test.origin &&
                    destination === test.destination &&
                    scenario === test.scenario &&
                    blockedEdges.size === 0;
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => handleLoadOfficialTest(test)}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-950/50'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-emerald-400">
                          Teste {test.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            test.scenario === 'normal'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {test.scenario === 'normal' ? 'Normal' : 'Ponta'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white truncate">
                        {LOCATIONS[test.origin].code} → {LOCATIONS[test.destination].name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{test.expectedUcsCost.toFixed(2)} min</span>
                        <span>{test.expectedDistanceKm.toFixed(2)} km</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grelha Principal: Painel de Controlo (Esquerda) + Grafo (Direita) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Coluna Esquerda: Controlos do Agente e Comparação de Algoritmos */}
              <div className="space-y-5 lg:col-span-5">
                {/* Cartão de Sensores do Agente (PEAS) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-white">
                        Parâmetros de Entrada (Sensores PEAS)
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOrigin(destination);
                        setDestination(origin);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
                      title="Inverter Origem e Destino"
                    >
                      <RefreshCw className="h-3 w-3" /> Inverter
                    </button>
                  </div>

                  {/* Selectores de Origem e Destino */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Estado Inicial (Origem)
                      </label>
                      <select
                        value={origin}
                        onChange={(e) => {
                          const val = e.target.value as NodeCode;
                          if (val === destination) setDestination(origin);
                          setOrigin(val);
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {NODE_LIST.map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            [{loc.code}] {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Estado Objectivo (Destino)
                      </label>
                      <select
                        value={destination}
                        onChange={(e) => {
                          const val = e.target.value as NodeCode;
                          if (val === origin) setOrigin(destination);
                          setDestination(val);
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
                      >
                        {NODE_LIST.map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            [{loc.code}] {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cenário de Trânsito: Hora Normal vs Hora de Ponta */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Cenário de Trânsito (Custos das Ligações)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setScenario('normal');
                          setCustomMultiplier(1.0);
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          scenario === 'normal'
                            ? 'border-sky-500 bg-sky-500/15 text-sky-200 shadow-sm'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sun className="h-4 w-4 text-sky-400" />
                        <span>Hora Normal (f = 1,0)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScenario('ponta')}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          scenario === 'ponta'
                            ? 'border-amber-500 bg-amber-500/15 text-amber-200 shadow-sm'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Flame className="h-4 w-4 text-amber-400" />
                        <span>Hora de Ponta (f &gt; 1)</span>
                      </button>
                    </div>
                  </div>

                  {/* Intensidade de Congestionamento Contínua (Melhoria Secção 8) */}
                  {scenario === 'ponta' && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-amber-300">
                          Factor de Intensidade na Hora de Ponta:
                        </span>
                        <span className="font-bold text-amber-200">
                          {Math.round(customMultiplier * 100)}% do factor padrão
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={customMultiplier}
                        onChange={(e) => setCustomMultiplier(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Trânsito moderado (0.5x)</span>
                        <button
                          type="button"
                          onClick={() => setCustomMultiplier(1.0)}
                          className="text-amber-400 underline"
                        >
                          Padrão do Relatório (1.0x)
                        </button>
                        <span>Ponta severa (2.0x)</span>
                      </div>
                    </div>
                  )}

                  {/* Selecção do Método Principal a Destacar no Mapa */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-400">
                        Método de Busca Destacado no Grafo:
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showComparisonOnMap}
                          onChange={(e) => setShowComparisonOnMap(e.target.checked)}
                          className="rounded accent-purple-500"
                        />
                        <span>Sobrepor BFS a tracejado</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'ucs', label: 'Custo Uniforme', badge: 'Principal' },
                          { key: 'astar', label: 'Busca A*', badge: 'Heurística' },
                          { key: 'bfs', label: 'Largura (BFS)', badge: 'Menos Arestas' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setSelectedAlgo(m.key)}
                          className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                            selectedAlgo === m.key
                              ? 'border-emerald-500 bg-emerald-500/15 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xs font-bold">{m.label}</span>
                          <span className="mt-0.5 text-[10px] text-emerald-400">
                            {m.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Acções: Guardar no Supabase e Limpar Bloqueios */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSaving || !results.ucs.found}
                      onClick={handleSaveCurrentSimulation}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50 transition"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>
                        {isSaving
                          ? 'A guardar...'
                          : 'Guardar Simulação (Supabase / Histórico)'}
                      </span>
                    </button>

                    {blockedEdges.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setBlockedEdges(new Set())}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Desbloquear Vias ({blockedEdges.size})</span>
                      </button>
                    )}
                  </div>

                  {saveFeedback && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{saveFeedback}</span>
                    </div>
                  )}
                </div>

                {/* Cartão de Resultado e Comparação Directa dos 3 Métodos */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-white">
                        Comparação de Desempenho (Secção 7.3)
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {LOCATIONS[origin].code} → {LOCATIONS[destination].code} ({scenario})
                    </span>
                  </div>

                  {!activeResult.found ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-rose-300">
                          Sem Solução Possível!
                        </div>
                        <p className="mt-1">
                          Todas as ligações possíveis entre {LOCATIONS[origin].name} e{' '}
                          {LOCATIONS[destination].name} encontram-se bloqueadas. Clique nas
                          ligações a tracejado vermelho para reabri-las.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Percurso Seleccionado Passo a Passo */}
                      <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-400">
                            {activeResult.algorithmName}
                          </span>
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            {activeResult.costMin.toFixed(2)} min •{' '}
                            {activeResult.distanceKm.toFixed(2)} km
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {activeResult.path.map((code, idx) => (
                            <React.Fragment key={`${code}-${idx}`}>
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                                  idx === 0
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : idx === activeResult.path.length - 1
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-200'
                                }`}
                              >
                                <span className="text-[10px] opacity-75">{idx + 1}.</span>
                                {LOCATIONS[code].name}
                              </span>
                              {idx < activeResult.path.length - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Tabela Comparativa dos 3 Métodos (UCS vs BFS vs A*) */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2 font-medium">Método</th>
                              <th className="py-2 font-medium text-right">Custo (min)</th>
                              <th className="py-2 font-medium text-right">Dist. (km)</th>
                              <th className="py-2 font-medium text-right">Expandidos</th>
                              <th className="py-2 font-medium text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(
                              [
                                { key: 'ucs', label: 'Custo Uniforme', res: results.ucs },
                                { key: 'bfs', label: 'Largura (BFS)', res: results.bfs },
                                { key: 'astar', label: 'Busca A*', res: results.astar },
                              ] as const
                            ).map(({ key, label, res }) => {
                              const isSelected = selectedAlgo === key;
                              const isSuboptimal =
                                key === 'bfs' &&
                                res.found &&
                                results.ucs.found &&
                                res.costMin > results.ucs.costMin + 0.01;
                              return (
                                <tr
                                  key={key}
                                  onClick={() => setSelectedAlgo(key)}
                                  className={`cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-emerald-500/10 font-semibold text-white'
                                      : 'text-slate-300 hover:bg-slate-800/50'
                                  }`}
                                >
                                  <td className="py-2.5 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`h-2 w-2 rounded-full ${
                                          key === 'ucs'
                                            ? 'bg-emerald-400'
                                            : key === 'astar'
                                            ? 'bg-sky-400'
                                            : 'bg-purple-400'
                                        }`}
                                      />
                                      <span>{label}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-right font-mono">
                                    {res.costMin.toFixed(2)}
                                    {isSuboptimal ? ' *' : ''}
                                  </td>
                                  <td className="py-2.5 text-right font-mono">
                                    {res.distanceKm.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 text-right font-mono">
                                    ({res.expandedCount})
                                  </td>
                                  <td className="py-2.5 text-right">
                                    {isSuboptimal ? (
                                      <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                        +{res.excessPercent}% lento
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                        Óptimo
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        * Nota (Tabela 8): O asterisco (*) indica que o percurso devolvido pela
                        BFS tem custo superior ao óptimo por minimizar apenas o número de
                        ligações. A Busca A* encontra sempre o custo óptimo expandindo menos ou
                        igual número de estados ({results.astar.expandedCount} vs{' '}
                        {results.ucs.expandedCount}).
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Grafo Interactivo + Simulador Passo a Passo da Fronteira */}
              <div className="space-y-5 lg:col-span-7">
                <MaputoGraphCanvas
                  origin={origin}
                  destination={destination}
                  scenario={scenario}
                  activePath={activeResult.path}
                  comparisonPath={
                    showComparisonOnMap &&
                    results.bfs.found &&
                    selectedAlgo !== 'bfs'
                      ? results.bfs.path
                      : []
                  }
                  comparisonLabel="BFS (Menos Ligações)"
                  expandedNodes={activeResult.expandedOrder}
                  currentStepSnapshot={currentStepSnapshot}
                  blockedEdges={blockedEdges}
                  customMultiplier={customMultiplier}
                  onSelectNode={handleSelectNodeOnMap}
                  onToggleEdgeBlock={handleToggleEdgeBlock}
                />

                {/* Simulador Passo-a-Passo da Fila de Prioridade / Fronteira */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-sky-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Inspecção Passo-a-Passo da Expansão de Estados ({activeResult.algorithmName})
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingSteps(false);
                          setStepIndex(0);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-slate-300 hover:text-white"
                        title="Primeiro passo"
                      >
                        <SkipBack className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPlayingSteps((p) => !p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition"
                      >
                        {isPlayingSteps ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> Simular Expansão
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingSteps(false);
                          setStepIndex((prev) =>
                            prev === null
                              ? 0
                              : Math.min(activeResult.steps.length - 1, prev + 1)
                          );
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-slate-300 hover:text-white"
                        title="Próximo passo"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                      {stepIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlayingSteps(false);
                            setStepIndex(null);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                        >
                          Ver Resultado Final
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso dos Passos */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">
                      {stepIndex === null
                        ? `Final (${activeResult.steps.length} iterações)`
                        : `Iteração ${stepIndex + 1} / ${activeResult.steps.length}`}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, activeResult.steps.length - 1)}
                      value={stepIndex === null ? Math.max(0, activeResult.steps.length - 1) : stepIndex}
                      onChange={(e) => {
                        setIsPlayingSteps(false);
                        setStepIndex(parseInt(e.target.value, 10));
                      }}
                      className="flex-1 accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Detalhes da Fronteira e Fechados na Iteração Actual */}
                  {(() => {
                    const snap =
                      currentStepSnapshot ||
                      activeResult.steps[activeResult.steps.length - 1];
                    if (!snap) return null;
                    return (
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3 text-xs">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                          <div className="text-[11px] text-slate-400">
                            Estado Seleccionado para Expansão:
                          </div>
                          <div className="mt-1 font-bold text-pink-400">
                            [{snap.currentNode}] {LOCATIONS[snap.currentNode].name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-300">
                            g(n) = {snap.costG.toFixed(2)} min
                            {selectedAlgo === 'astar' &&
                              ` | h(n) = ${snap.heuristicH.toFixed(2)} | f(n) = ${snap.priorityF.toFixed(2)}`}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                          <div className="text-[11px] text-slate-400">
                            Conjunto de Fechados ({snap.expandedNodes.length} expandidos):
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {snap.expandedNodes.map((n, i) => (
                              <span
                                key={`${n}-${i}`}
                                className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-mono text-sky-300"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                          <div className="text-[11px] text-slate-400">
                            Fronteira / Fila de Prioridade ({snap.frontierNodes.length}):
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {snap.frontierNodes.length === 0 ? (
                              <span className="text-[11px] text-slate-500">
                                Destino atingido / Fronteira vazia
                              </span>
                            ) : (
                              snap.frontierNodes.slice(0, 6).map((fn, i) => (
                                <span
                                  key={`${fn.node}-${i}`}
                                  className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300"
                                >
                                  {fn.node}:{fn.f.toFixed(1)}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: TESTES OFICIAIS (SECÇÃO 7) & VALIDAÇÃO DOS 156 PARES
           =================================================================== */}
        {activeTab === 'testes' && (
          <div className="space-y-6">
            {/* Resumo da Validação Automática (Secção 7.4 - 156 pares ordenados) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Validação Busca de Custo Uniforme
                  </span>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {validationNormal.ucsOptimalCount} / {validationNormal.totalPairs}{' '}
                  <span className="text-base font-bold text-emerald-400">(100%)</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Coincidência exacta em todos os 156 pares (13 × 12) tanto na hora normal
                  como na hora de ponta contra referência independente.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Validação Busca A* (Heurística Admissível)
                  </span>
                  <Zap className="h-5 w-5 text-sky-400" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {validationNormal.astarOptimalCount} / {validationNormal.totalPairs}{' '}
                  <span className="text-base font-bold text-sky-400">(100%)</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Média de estados expandidos reduzida de{' '}
                  <strong className="text-white">{validationNormal.ucsAvgExpanded}</strong>{' '}
                  (UCS) para{' '}
                  <strong className="text-sky-300">{validationNormal.astarAvgExpanded}</strong>{' '}
                  (A*), mantendo 100% de optimalidade.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Limite da Busca em Largura (BFS)
                  </span>
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {validationPonta.bfsOptimalCount} / {validationPonta.totalPairs}{' '}
                  <span className="text-base font-bold text-amber-400">
                    ({Math.round((validationPonta.bfsOptimalCount / validationPonta.totalPairs) * 100)}% óptimos)
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Na hora de ponta, a BFS falha o percurso de menor tempo em{' '}
                  {validationPonta.totalPairs - validationPonta.bfsOptimalCount} pares (ex.:
                  Sede → Matola com +46,3% de excesso).
                </p>
              </div>
            </div>

            {/* Tabela 7 — Resultados da Busca de Custo Uniforme */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Tabela 7 — Resultados da Busca de Custo Uniforme (Secção 7.2)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Origem fixa na Sede (Baixa) para três destinos representativos nos dois
                    cenários de trânsito.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Teste</th>
                      <th className="py-3 px-3">Destino</th>
                      <th className="py-3 px-3">Cenário</th>
                      <th className="py-3 px-3">Percurso Seleccionado</th>
                      <th className="py-3 px-3 text-right">Custo (min)</th>
                      <th className="py-3 px-3 text-right">Dist. (km)</th>
                      <th className="py-3 px-3 text-right">Acção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {OFFICIAL_TESTS.map((test) => {
                      const sim = compareAllMethods(
                        test.origin,
                        test.destination,
                        test.scenario
                      );
                      return (
                        <tr key={test.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            #{test.id}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {LOCATIONS[test.destination].name}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                test.scenario === 'normal'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {test.scenario === 'normal' ? 'Normal' : 'Ponta'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-200">
                            {sim.ucs.path.map((c) => LOCATIONS[c].name).join(' → ')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white">
                            {sim.ucs.costMin.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            {sim.ucs.distanceKm.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleLoadOfficialTest(test)}
                              className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
                            >
                              Ver no Mapa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela 8 — Comparação entre Métodos (Custo e Estados Expandidos) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Tabela 8 — Custo e Estados Expandidos por Método (Secção 7.3)
                </h2>
                <p className="text-xs text-slate-400">
                  Entre parênteses indica-se o número de estados expandidos. O asterisco (*)
                  assinala percursos com custo superior ao óptimo.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Teste</th>
                      <th className="py-3 px-3">Destino / Cenário</th>
                      <th className="py-3 px-3">Busca de Custo Uniforme</th>
                      <th className="py-3 px-3">Busca em Largura (BFS)</th>
                      <th className="py-3 px-3">Busca A*</th>
                      <th className="py-3 px-3">Análise Académica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {OFFICIAL_TESTS.map((test) => {
                      const sim = compareAllMethods(
                        test.origin,
                        test.destination,
                        test.scenario
                      );
                      const bfsSub = sim.bfs.costMin > sim.ucs.costMin + 0.01;
                      return (
                        <tr key={test.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            #{test.id}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {LOCATIONS[test.destination].name} / {test.scenario}
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-300 font-semibold">
                            {sim.ucs.costMin.toFixed(2)} min ({sim.ucs.expandedCount})
                          </td>
                          <td
                            className={`py-3 px-3 font-mono ${
                              bfsSub ? 'text-amber-300 font-semibold' : 'text-slate-300'
                            }`}
                          >
                            {sim.bfs.costMin.toFixed(2)} min ({test.expectedBfsExpanded})
                            {bfsSub ? ' *' : ''}
                          </td>
                          <td className="py-3 px-3 font-mono text-sky-300 font-semibold">
                            {sim.astar.costMin.toFixed(2)} min ({sim.astar.expandedCount})
                          </td>
                          <td className="py-3 px-3 text-slate-400 max-w-sm">
                            {test.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MULTI-ENTREGAS TSP (MELHORIA FUTURA DA SECÇÃO 8)
           =================================================================== */}
        {activeTab === 'multi-entregas' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                    Melhoria Futura Implementada (Secção 5.3 e Secção 8)
                  </span>
                  <h2 className="mt-1 text-base font-bold text-white">
                    Optimização da Ordem de Visita de Várias Entregas numa Viagem
                  </h2>
                  <p className="text-xs text-slate-400">
                    Combina a Busca de Custo Uniforme entre todos os pares com a pesquisa de
                    sequência óptima no espaço de estados{' '}
                    <code className="text-emerald-300">(local_actual, destinos_visitados)</code>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnToSede}
                      onChange={(e) => setReturnToSede(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Regressar ao depósito ({LOCATIONS[origin].name}) no fim</span>
                  </label>
                </div>
              </div>

              {/* Selecção de Destinos da Ronda de Entrega */}
              <div>
                <div className="text-xs font-medium text-slate-300 mb-2">
                  Seleccione os pontos de entrega a visitar a partir de{' '}
                  <strong className="text-emerald-400">{LOCATIONS[origin].name}</strong> (Cenário:{' '}
                  <strong className="text-amber-300">{scenario.toUpperCase()}</strong>):
                </div>
                <div className="flex flex-wrap gap-2">
                  {NODE_LIST.filter((n) => n.code !== origin).map((loc) => {
                    const selected = multiStops.includes(loc.code);
                    return (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => toggleMultiStopNode(loc.code)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>[{loc.code}]</span>
                        <span>{loc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {multiStopResult ? (
                <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                        <div className="text-[11px] text-slate-400">Tempo Total Óptimo</div>
                        <div className="mt-1 text-2xl font-extrabold text-emerald-400">
                          {multiStopResult.totalCostMin.toFixed(2)} min
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                        <div className="text-[11px] text-slate-400">Distância Total</div>
                        <div className="mt-1 text-2xl font-extrabold text-sky-400">
                          {multiStopResult.totalDistanceKm.toFixed(2)} km
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <div className="text-xs font-bold text-white">
                        Ordem Óptima de Entregas ({multiStopResult.legs.length} etapas):
                      </div>
                      <div className="space-y-2.5">
                        {multiStopResult.legs.map((leg, i) => (
                          <div
                            key={`${leg.from}-${leg.to}-${i}`}
                            className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between font-semibold text-white">
                              <span>
                                Etapa {i + 1}: {LOCATIONS[leg.from].name} →{' '}
                                {LOCATIONS[leg.to].name}
                              </span>
                              <span className="text-emerald-400 font-mono">
                                {leg.costMin.toFixed(2)} min ({leg.distanceKm.toFixed(2)} km)
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Via: {leg.path.map((c) => LOCATIONS[c].name).join(' → ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <MaputoGraphCanvas
                      origin={origin}
                      destination={
                        multiStopResult.orderedStops[
                          multiStopResult.orderedStops.length - 1
                        ] || destination
                      }
                      scenario={scenario}
                      activePath={multiStopResult.fullPath}
                      expandedNodes={multiStopResult.orderedStops}
                      blockedEdges={blockedEdges}
                      customMultiplier={customMultiplier}
                      onSelectNode={(code) => toggleMultiStopNode(code)}
                      onToggleEdgeBlock={handleToggleEdgeBlock}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-400">
                  Seleccione pelo menos um ponto de entrega acessível para calcular a rota
                  completa.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: FORMULAÇÃO PEAS, TABELAS 1–6 & CÓDIGO PYTHON
           =================================================================== */}
        {activeTab === 'teoria-codigo' && (
          <div className="space-y-6">
            {/* Modelo PEAS e Formulação em Espaço de Estados */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <h2 className="text-base font-bold text-white">
                  Tabela 1 — Descrição PEAS do Agente de Rotas (Secção 2.1)
                </h2>
                <div className="divide-y divide-slate-800 text-xs">
                  {[
                    {
                      el: 'Medida de desempenho',
                      desc: 'Tempo total estimado de deslocação (minutos), a minimizar.',
                    },
                    {
                      el: 'Ambiente',
                      desc: 'Rede viária de Maputo representada por um grafo; determinista, discreto, totalmente observável e estático durante cada pesquisa.',
                    },
                    {
                      el: 'Actuadores',
                      desc: 'Escolha da próxima ligação a percorrer; apresentação do percurso calculado.',
                    },
                    {
                      el: 'Sensores',
                      desc: 'Localização de origem e de destino, cenário de trânsito (normal ou ponta) e custos das ligações.',
                    },
                  ].map((row) => (
                    <div key={row.el} className="py-2.5 grid grid-cols-3 gap-2">
                      <span className="font-semibold text-emerald-400">{row.el}</span>
                      <span className="col-span-2 text-slate-300">{row.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <h2 className="text-base font-bold text-white">
                  Tabela 3 — Formulação do Problema de Busca (Secção 4)
                </h2>
                <div className="divide-y divide-slate-800 text-xs">
                  {[
                    {
                      comp: 'Estado',
                      def: 'Localização actual do veículo (um dos 13 vértices do grafo).',
                    },
                    {
                      comp: 'Estado inicial',
                      def: 'Localização de origem indicada pelo utilizador (por defeito, a Sede, na Baixa).',
                    },
                    {
                      comp: 'Estado objectivo',
                      def: 'Localização de destino indicada pelo utilizador.',
                    },
                    {
                      comp: 'Acções / Transição',
                      def: 'Deslocar-se para qualquer localização ligada: Resultado(u, ir para v) = v.',
                    },
                    {
                      comp: 'Custo da acção',
                      def: 'c(u, v) = tempo estimado de deslocação, em minutos, na ligação (u, v).',
                    },
                    {
                      comp: 'Solução',
                      def: 'Sequência de localizações da origem ao destino com o menor custo total.',
                    },
                  ].map((row) => (
                    <div key={row.comp} className="py-2 grid grid-cols-3 gap-2">
                      <span className="font-semibold text-sky-400">{row.comp}</span>
                      <span className="col-span-2 text-slate-300">{row.def}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabela 5 Completa: As 21 Ligações do Grafo */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Tabela 5 — Ligações do Grafo: Distância e Custo (Minutos) por Cenário
                  </h2>
                  <p className="text-xs text-slate-400">
                    Fórmulas: d(u, v) = 1,25 × haversine(u, v) | t(u, v) = d(u, v) / vel × 60 ×
                    f (vel = 45 km/h em vias principais e 30 km/h em vias urbanas).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Ligação (u – v)</th>
                      <th className="py-2.5 px-3">Tipo de Via</th>
                      <th className="py-2.5 px-3 text-right">Dist. (km)</th>
                      <th className="py-2.5 px-3 text-right">Normal (min)</th>
                      <th className="py-2.5 px-3 text-right">Ponta (min)</th>
                      <th className="py-2.5 px-3 text-right">Factor (f)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {EDGES.map((edge, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-white">
                          {LOCATIONS[edge.source].name} – {LOCATIONS[edge.target].name}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              edge.via === 'Principal'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {edge.via}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {edge.distanceKm.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-300">
                          {edge.normalMin.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-300">
                          {edge.pontaMin.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {edge.factor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Excerto Oficial em Python (Secção 6.1) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Implementação de Referência em Python (Secção 6.1 — rotas_maputo.py)
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Incluído na pasta <code className="text-emerald-300">/python/rotas_maputo.py</code>
                </span>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-300 leading-relaxed">
{`def custo_uniforme(grafo, origem, destino):
    """Busca de Custo Uniforme: expande sempre o nó com menor g(n)."""
    fronteira = [(0.0, origem)]
    g = {origem: 0.0}
    pai = {origem: None}
    fechados = set()
    expandidos = 0
    while fronteira:
        custo, no = heapq.heappop(fronteira)
        if no in fechados:
            continue
        if no == destino:  # teste de objectivo ao expandir
            return _reconstruir(pai, no), custo, expandidos
        fechados.add(no)
        expandidos += 1
        for viz, c, _ in grafo[no]:
            novo = custo + c
            if viz not in g or novo < g[viz]:
                g[viz] = novo
                pai[viz] = no
                heapq.heappush(fronteira, (novo, viz))
    return None, math.inf, expandidos`}
              </pre>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: SUPABASE & DEPLOY VERCEL + GITHUB
           =================================================================== */}
        {activeTab === 'cloud-deploy' && (
          <div className="space-y-6">
            {/* Histórico de Simulações Guardadas (Supabase / LocalStorage) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Histórico de Simulações de Rotas ({simulations.length} registos)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Fonte actual:{' '}
                      <strong className="text-emerald-400">
                        {storageSource === 'supabase'
                          ? 'PostgreSQL no Supabase (Nuvem)'
                          : 'Armazenamento Local com Fallback Automático para Supabase'}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Origem → Destino</th>
                      <th className="py-2.5 px-3">Cenário</th>
                      <th className="py-2.5 px-3">Percurso Óptimo (UCS)</th>
                      <th className="py-2.5 px-3 text-right">UCS (min)</th>
                      <th className="py-2.5 px-3 text-right">BFS (min)</th>
                      <th className="py-2.5 px-3 text-right">A* Exp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simulations.map((sim) => (
                      <tr key={sim.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {LOCATIONS[sim.origin]?.name || sim.origin} →{' '}
                          {LOCATIONS[sim.destination]?.name || sim.destination}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              sim.scenario === 'normal'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {sim.scenario}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {Array.isArray(sim.ucs_path) ? sim.ucs_path.join(' → ') : ''}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-300 font-bold">
                          {Number(sim.ucs_cost_min).toFixed(2)} ({sim.ucs_expanded})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {Number(sim.bfs_cost_min).toFixed(2)} ({sim.bfs_expanded})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-300">
                          ({sim.astar_expanded})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Guia de Alocação: GitHub + Supabase + Vercel */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Database className="h-4 w-4" />
                  <span>1. Configurar Supabase</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Crie um projecto no Supabase e execute o script SQL incluído em{' '}
                  <code className="text-emerald-300">supabase/schema.sql</code> no SQL Editor.
                  Esse script cria as tabelas <code className="text-slate-200">locations</code>,{' '}
                  <code className="text-slate-200">edges</code> e{' '}
                  <code className="text-slate-200">route_simulations</code> com os dados das
                  Tabelas 4, 5, 7 e 8.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <GitBranch className="h-4 w-4" />
                  <span>2. Repositório GitHub</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O repositório Git já está inicializado nesta pasta (<code className="text-sky-300">App</code>)
                  com a aplicação Web Next.js, os scripts Python originais em{' '}
                  <code className="text-sky-300">/python</code> e a migração SQL em{' '}
                  <code className="text-sky-300">/supabase</code>. Basta fazer push para o seu
                  GitHub.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Globe className="h-4 w-4" />
                  <span>3. Deploy no Vercel</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Importe o repositório GitHub no Vercel e defina as variáveis de ambiente{' '}
                  <code className="text-purple-300">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
                  <code className="text-purple-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. A app
                  funciona mesmo sem variáveis configuradas graças ao modo híbrido!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Académico */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Universidade Pedagógica de Maputo • Faculdade de Engenharias e Tecnologias •
            Inteligência Artificial (2026)
          </span>
          <span>
            Almeida Chiboze • Francelino Penisselo • Safira Vilanculos — Docente: MSc. Sheila
            António Sitoe Rangel
          </span>
        </div>
      </footer>
    </div>
  );
}
