# Optimização de Rotas de Entrega em Maputo 🇲🇿
### Aplicação Web de Inteligência Artificial — Universidade Pedagógica de Maputo

> **Disciplina:** Inteligência Artificial (2026)  
> **Docente:** MSc. Sheila António Sitoe Rangel  
> **Trabalho em Grupo:** Almeida Chiboze, Francelino Penisselo, Safira Vilanculos  
> **Métodos de Busca:** Busca de Custo Uniforme (Dijkstra) • Busca em Largura (BFS) • Busca A*

---

## 📌 Sobre o Projecto

Esta aplicação web interactiva transpõe fielmente o trabalho académico de IA para a Web moderna, permitindo calcular, simular e comparar algoritmos de busca em espaço de estados sobre a rede viária simplificada da cidade de Maputo e arredores (13 vértices e 21 ligações ponderadas).

A aplicação foi desenhada para ser hospedada na **Vercel**, conectada à base de dados **Supabase** (PostgreSQL com RLS) e versionada no **GitHub**.

### Funcionalidades Principais:
1. **Simulador Visual com Grafo Interactivo:**
   - Mapa vectorial SVG estilizado fiel à Figura 1 do relatório.
   - Selecção dinâmica de Origem e Destino com um clique.
   - Alternância entre cenários de trânsito: **Hora Normal** ($f = 1.0$) e **Hora de Ponta** ($f > 1.0$).
   - Simulação interactiva de vias cortadas/bloqueadas (obras, cheias, acidentes).
   - Ajuste em tempo real da severidade do congestionamento de ponta.
2. **Comparação Rigorosa de Métodos de Busca:**
   - **Busca de Custo Uniforme (UCS / Dijkstra):** Método principal, óptimo para custos não negativos.
   - **Busca em Largura (BFS):** Minimiza número de arestas, revelando desvantagens quando custos variam.
   - **Busca A\*:** Heurística admissível de tempo em linha recta $h(n) = \frac{\text{haversine}(n, \text{destino})}{50\text{ km/h}} \times 60\text{ min}$.
3. **Inspecção Passo-a-Passo da Fronteira:**
   - Visualização da evolução da fila de prioridade, conjunto de nós fechados e valor de $g(n)$, $h(n)$ e $f(n)$ iteração a iteração.
4. **Reprodução dos 6 Testes Oficiais (Tabelas 7 e 8):**
   - Carregamento directo dos casos de teste do relatório (Zimpeto, Matola e Costa do Sol nos dois cenários).
5. **Validação Automática dos 156 Pares Ordenados:**
   - Verificação em tempo de execução de todos os pares $13 \times 12$ contra algoritmo de referência independente.
6. **Extensão Multi-Entregas (Problema do Caixeiro-Viajante / TSP):**
   - Implementação da sugestão de melhoria da Secção 8, optimizando a sequência de visita a vários pontos na cidade.
7. **Modo Híbrido Supabase + Armazenamento Local:**
   - Guarda o histórico de simulações directamente no PostgreSQL da Supabase ou localmente no browser como fallback automático.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** v18+ (recomendado v20+)
- **npm** ou **yarn** / **pnpm**
- **Python 3.8+** (opcional, para executar os scripts originais da pasta `python/`)

### Instalação
```bash
# 1. Clonar o repositório
git clone <URL_DO_SEU_REPOSITORIO>
cd App

# 2. Instalar dependências
npm install

# 3. Executar o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🗄️ Configuração do Supabase (Base de Dados)

1. Crie uma conta ou inicie sessão em [supabase.com](https://supabase.com).
2. Crie um novo projecto (ex: `maputo-route-optimizer`).
3. No painel do projecto, abra o **SQL Editor** e cole todo o conteúdo do ficheiro:
   ```
   supabase/schema.sql
   ```
4. Execute o script. Ele criará as tabelas `locations`, `edges` e `route_simulations` com RLS e dados iniciais pré-carregados.
5. Copie as chaves em **Project Settings > API**:
   - `Project URL`
   - `anon public key`
6. Crie um ficheiro `.env.local` na raiz da pasta `App`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-publica
   ```

*Nota: Se não configurar as variáveis da Supabase, a aplicação continuará a funcionar a 100% gravando no armazenamento local do navegador.*

---

## 🌐 Alocação no GitHub & Vercel

### 1. Enviar para o GitHub
```bash
git add .
git commit -m "feat: Aplicacao Web Completa de Optimizacao de Rotas Maputo com Next.js, Supabase e Vercel"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/<nome-do-repositorio>.git
git push -u origin main
```

### 2. Deploy na Vercel
1. Aceda a [vercel.com](https://vercel.com) e conecte a sua conta GitHub.
2. Clique em **Add New > Project** e importe o repositório deste projecto.
3. Nas configurações do projecto (**Environment Variables**), adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. A aplicação estará online com certificado SSL gratuito e alta velocidade.

---

## 🐍 Scripts Python Originais

Na pasta `python/` encontram-se as implementações de linha de comandos em conformidade com as Secções 6 e 7 do relatório:

```bash
# Menu interactivo
python python/rotas_maputo.py

# Listar localizações
python python/rotas_maputo.py --listar

# Exemplo de teste directo (Sede -> Zimpeto em ponta)
python python/rotas_maputo.py -o SEDE -d ZIM -c ponta

# Validação automática dos 156 pares
python python/testes_rotas.py
```

---

## 📚 Estrutura de Ficheiros

```
App/
├── python/
│   ├── rotas_maputo.py       # Aplicação em Python da Secção 6
│   └── testes_rotas.py       # Validação dos 156 pares da Secção 7.4
├── src/
│   ├── app/
│   │   ├── globals.css       # Estilos Tailwind CSS
│   │   ├── layout.tsx        # Layout base e metadados
│   │   └── page.tsx          # Interface Web completa com todos os módulos
│   ├── components/
│   │   └── MaputoGraphCanvas.tsx # Grafo interactivo SVG fiel à Figura 1
│   └── lib/
│       ├── rotas-maputo.ts   # Modelos, grafo, UCS, BFS, A*, TSP e validação
│       └── supabase.ts       # Cliente Supabase e persistência com fallback
├── supabase/
│   └── schema.sql            # Esquema SQL com tabelas, RLS e dados da Tabela 4/5
├── .env.example              # Exemplo de variáveis de ambiente
├── package.json
└── README.md
```
