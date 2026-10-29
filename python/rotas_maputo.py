#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNIVERSIDADE PEDAGÓGICA DE MAPUTO — Ensino a Distância
Disciplina: Inteligência Artificial (2026)
Docente: MSc. Sheila António Sitoe Rangel
Autores: Almeida Chiboze, Francelino Penisselo, Safira Vilanculos

Aplicação: Optimização de Rotas de Entrega em Maputo
Métodos implementados:
  - Busca de Custo Uniforme (Dijkstra com paragem antecipada) [Método Principal]
  - Busca em Largura (BFS) [Comparação]
  - Busca A* (com heurística admissível de tempo em linha recta) [Comparação]
"""

import argparse
from collections import deque
import heapq
import math
import sys

# Tabela 4 – Localizações (vértices) do grafo: código -> (nome, latitude, longitude)
LOCAIS = {
    "SEDE": ("Sede (Baixa)", -25.970, 32.573),
    "ALM":  ("Alto-Maé", -25.962, 32.581),
    "POL":  ("Polana", -25.966, 32.597),
    "SOM":  ("Sommerschield", -25.952, 32.596),
    "MAL":  ("Malhangalene", -25.950, 32.579),
    "XIP":  ("Xipamanine", -25.960, 32.561),
    "MAX":  ("Maxaquene", -25.938, 32.571),
    "HUL":  ("Hulene", -25.928, 32.548),
    "AER":  ("Aeroporto", -25.924, 32.579),
    "MAH":  ("Mahotas", -25.931, 32.614),
    "CDS":  ("Costa do Sol", -25.946, 32.648),
    "ZIM":  ("Zimpeto", -25.865, 32.565),
    "MAT":  ("Matola (Fomento)", -25.974, 32.455),
}

# Tabela 5 – Ligações do grafo: (origem, destino, via, dist_km, normal_min, ponta_min, factor)
LIGACOES = [
    ("SEDE", "ALM", "Principal", 1.34, 1.79, 3.22, 1.80),
    ("SEDE", "POL", "Urbana",    3.08, 6.17, 6.17, 1.00),
    ("SEDE", "XIP", "Urbana",    2.13, 4.26, 4.26, 1.00),
    ("ALM",  "POL", "Principal", 1.88, 2.51, 2.51, 1.00),
    ("ALM",  "MAL", "Principal", 1.65, 2.20, 4.40, 2.00),
    ("ALM",  "XIP", "Urbana",    2.00, 4.00, 4.00, 1.00),
    ("ALM",  "MAT", "Principal", 14.26, 19.01, 41.82, 2.20),
    ("XIP",  "MAT", "Principal", 12.43, 16.58, 26.53, 1.60),
    ("POL",  "SOM", "Urbana",    1.34, 2.68, 2.68, 1.00),
    ("SOM",  "MAL", "Urbana",    1.65, 3.30, 3.30, 1.00),
    ("POL",  "CDS", "Principal", 6.44, 8.59, 14.60, 1.70),
    ("MAL",  "MAX", "Principal", 1.96, 2.61, 2.61, 1.00),
    ("XIP",  "MAX", "Urbana",    2.69, 5.38, 5.38, 1.00),
    ("MAX",  "AER", "Principal", 2.31, 3.08, 4.62, 1.50),
    ("MAX",  "HUL", "Urbana",    2.11, 4.22, 4.22, 1.00),
    ("MAX",  "MAH", "Principal", 6.14, 8.18, 8.18, 1.00),
    ("HUL",  "AER", "Urbana",    2.80, 5.59, 5.59, 1.00),
    ("HUL",  "ZIM", "Urbana",    8.39, 16.77, 16.77, 1.00),
    ("AER",  "ZIM", "Principal", 7.27, 9.70, 9.70, 1.00),
    ("AER",  "MAH", "Urbana",    4.39, 8.78, 8.78, 1.00),
    ("MAH",  "CDS", "Principal", 2.82, 3.77, 3.77, 1.00),
]


def haversine(coord1, coord2):
    """Distância em linha recta (km) entre duas coordenadas (lat, lon)."""
    lat1, lon1 = map(math.radians, coord1)
    lat2, lon2 = map(math.radians, coord2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def construir_grafo(cenario="normal"):
    """Constrói a lista de adjacências {vértice: [(vizinho, custo, distância)]}
    para o cenário 'normal' ou 'ponta'."""
    if cenario not in ("normal", "ponta"):
        raise ValueError("Cenário inválido. Escolha 'normal' ou 'ponta'.")
    grafo = {cod: [] for cod in LOCAIS}
    for u, v, _via, dist, normal, ponta, _factor in LIGACOES:
        custo = normal if cenario == "normal" else ponta
        grafo[u].append((v, custo, dist))
        grafo[v].append((u, custo, dist))
    return grafo


def heuristica(no, destino):
    """Calcula h(n) = distância em linha recta até ao destino / 50 km/h, em minutos."""
    _, lat1, lon1 = LOCAIS[no]
    _, lat2, lon2 = LOCAIS[destino]
    dist_recta = haversine((lat1, lon1), (lat2, lon2))
    return (dist_recta / 50.0) * 60.0


def _reconstruir(pai, no):
    caminho = []
    while no is not None:
        caminho.append(no)
        no = pai[no]
    return caminho[::-1]


def distancia_percurso(grafo, caminho):
    if not caminho or len(caminho) < 2:
        return 0.0
    total = 0.0
    for u, v in zip(caminho, caminho[1:]):
        for viz, _c, dist in grafo[u]:
            if viz == v:
                total += dist
                break
    return total


def custo_uniforme(grafo, origem, destino):
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
    return None, math.inf, expandidos


def largura(grafo, origem, destino):
    """Busca em Largura (BFS): expande por menor número de ligações."""
    fronteira = deque([origem])
    visitados = {origem}
    pai = {origem: None}
    expandidos = 0
    while fronteira:
        no = fronteira.popleft()
        expandidos += 1
        if no == destino:
            cam = _reconstruir(pai, no)
            custo = 0.0
            for u, v in zip(cam, cam[1:]):
                for viz, c, _ in grafo[u]:
                    if viz == v:
                        custo += c
                        break
            return cam, custo, expandidos
        for viz, _, _ in grafo[no]:
            if viz not in visitados:
                visitados.add(viz)
                pai[viz] = no
                fronteira.append(viz)
    return None, math.inf, expandidos


def a_estrela(grafo, origem, destino):
    """Busca A*: ordena a fronteira por f(n) = g(n) + h(n)."""
    fronteira = [(heuristica(origem, destino), 0.0, origem)]
    g = {origem: 0.0}
    pai = {origem: None}
    fechados = set()
    expandidos = 0
    while fronteira:
        _f, custo, no = heapq.heappop(fronteira)
        if no in fechados:
            continue
        if no == destino:
            return _reconstruir(pai, no), custo, expandidos
        fechados.add(no)
        expandidos += 1
        for viz, c, _ in grafo[no]:
            novo = custo + c
            if viz not in g or novo < g[viz]:
                g[viz] = novo
                pai[viz] = no
                f_novo = novo + heuristica(viz, destino)
                heapq.heappush(fronteira, (f_novo, novo, viz))
    return None, math.inf, expandidos


def executar(origem, destino, cenario, grafico=None):
    origem = origem.upper()
    destino = destino.upper()
    if origem not in LOCAIS or destino not in LOCAIS:
        print("Erro: código de localização inválido. Use --listar para ver os códigos.")
        return
    grafo = construir_grafo(cenario)
    print(f"\n=== Optimização de Rota: {LOCAIS[origem][0]} -> {LOCAIS[destino][0]} ({cenario}) ===")
    for nome, fn in [
        ("Busca de Custo Uniforme", custo_uniforme),
        ("Busca em Largura (BFS)", largura),
        ("Busca A*", a_estrela),
    ]:
        cam, custo, exp = fn(grafo, origem, destino)
        dist = distancia_percurso(grafo, cam)
        nomes_cam = " -> ".join(LOCAIS[c][0] for c in cam) if cam else "Sem percurso"
        print(f"\n[{nome}]")
        print(f"  Percurso  : {nomes_cam}")
        print(f"  Custo     : {custo:.2f} min | Distância: {dist:.2f} km | Estados expandidos: {exp}")


def listar_locais():
    print("\nCódigos das localizações disponíveis:")
    for cod, (nome, lat, lon) in LOCAIS.items():
        print(f"  {cod:<5} - {nome} ({lat:.3f}, {lon:.3f})")


def menu():
    listar_locais()
    origem = input("\nCódigo de origem [SEDE]: ").strip().upper() or "SEDE"
    destino = input("Código de destino [ZIM]: ").strip().upper() or "ZIM"
    cenario = input("Cenário (normal/ponta) [normal]: ").strip().lower() or "normal"
    executar(origem, destino, cenario)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Optimização de rotas de entrega em Maputo")
    parser.add_argument("--listar", action="store_true", help="Listar códigos dos locais")
    parser.add_argument("-o", "--origem", default="SEDE", help="Código da localização de origem")
    parser.add_argument("-d", "--destino", help="Código da localização de destino")
    parser.add_argument("-c", "--cenario", default="normal", choices=["normal", "ponta"], help="Cenário de trânsito")
    parser.add_argument("--grafico", help="Guardar imagem do grafo com o percurso")
    args = parser.parse_args()

    if args.listar:
        listar_locais()
    elif args.destino:
        executar(args.origem, args.destino, args.cenario, args.grafico)
    else:
        menu()

