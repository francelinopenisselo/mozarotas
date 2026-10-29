#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validação automática dos métodos de busca (Busca de Custo Uniforme e Busca A*)
em todos os 156 pares ordenados de localizações (13 x 12), nos dois cenários
('normal' e 'ponta'), contra uma implementação independente de referência (Bellman-Ford / Dijkstra).
"""

import math
from rotas_maputo import LOCAIS, construir_grafo, custo_uniforme, a_estrela, largura


def dijkstra_referencia(grafo, origem, destino):
    """Implementação independente do caminho mais curto (relaxamento completo)."""
    dist = {v: math.inf for v in grafo}
    dist[origem] = 0.0
    visitados = set()
    while len(visitados) < len(grafo):
        u = min((v for v in grafo if v not in visitados), key=lambda v: dist[v])
        if dist[u] == math.inf or u == destino:
            break
        visitados.add(u)
        for viz, c, _ in grafo[u]:
            if dist[u] + c < dist[viz]:
                dist[viz] = dist[u] + c
    return dist[destino]


def validar_todos_os_pares():
    codigos = list(LOCAIS.keys())
    for cenario in ("normal", "ponta"):
        grafo = construir_grafo(cenario)
        total = 0
        ok_ucs = 0
        ok_astar = 0
        bfs_otimos = 0
        for o in codigos:
            for d in codigos:
                if o == d:
                    continue
                total += 1
                ref = dijkstra_referencia(grafo, o, d)
                _, c_ucs, _ = custo_uniforme(grafo, o, d)
                _, c_ast, _ = a_estrela(grafo, o, d)
                _, c_bfs, _ = largura(grafo, o, d)
                if abs(c_ucs - ref) < 1e-6:
                    ok_ucs += 1
                if abs(c_ast - ref) < 1e-6:
                    ok_astar += 1
                if abs(c_bfs - ref) < 1e-6:
                    bfs_otimos += 1
        print(f"Cenário '{cenario}':")
        print(f"  Busca de Custo Uniforme : {ok_ucs}/{total} pares óptimos ({ok_ucs/total*100:.1f}%)")
        print(f"  Busca A*                : {ok_astar}/{total} pares óptimos ({ok_astar/total*100:.1f}%)")
        print(f"  Busca em Largura (BFS)  : {bfs_otimos}/{total} pares óptimos ({bfs_otimos/total*100:.1f}%)")


if __name__ == "__main__":
    validar_todos_os_pares()

