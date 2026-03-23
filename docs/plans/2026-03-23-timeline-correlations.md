# Timeline Correlations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar seção "Correlações com Momentos de Vida" na Timeline que computa automaticamente como eventos de vida impactaram humor, ansiedade e energia do paciente.

**Architecture:** Tudo em `Timeline.tsx` — função pura `computeCorrelations` + componentes internos `CorrelationCard` e `CorrelationsSection`. Sem novo endpoint, sem mudança de tipos, sem mudança de backend. Os dados de `emotional_log` já chegam com `mood_score`, `anxiety_score`, `energy_score` em `entry.metadata`.

**Tech Stack:** React, TypeScript, Tailwind CSS, date-fns, lucide-react

---

## Task 1: Função pura `computeCorrelations`

**Files:**
- Modify: `dashboard/src/components/Timeline.tsx`

### Contexto
Os `entries` do tipo `emotional_log` têm `entry.metadata` com: `mood_score: number`, `anxiety_score: number`, `energy_score: number`.
Os `entries` do tipo `life_event` têm `entry.timestamp` com a data do evento.
A janela (windowDays) é 7, 14 ou 30.

**Step 1: Adicionar interface `EventCorrelation` e função `computeCorrelations`**

Logo após as constantes do topo do arquivo (após `severityBorderColors`, antes de `function TimelineTooltip`), adicione:

```typescript
// ---------------------------------------------------------------------------
// Correlation computation
// ---------------------------------------------------------------------------

interface EmotionalWindow {
  mood: number;
  anxiety: number;
  energy: number;
  count: number;
}

export interface EventCorrelation {
  event: TimelineEntry;
  before: EmotionalWindow;
  after: EmotionalWindow;
  delta: { mood: number; anxiety: number; energy: number };
}

function computeCorrelations(entries: TimelineEntry[], windowDays: number): EventCorrelation[] {
  const MS_PER_DAY = 86400000;
  const windowMs = windowDays * MS_PER_DAY;

  const lifeEvents = entries.filter((e) => e.type === 'life_event');
  const emotionalLogs = entries.filter((e) => e.type === 'emotional_log');

  const correlations: EventCorrelation[] = [];

  for (const event of lifeEvents) {
    const eventTime = new Date(event.timestamp).getTime();

    const beforeLogs = emotionalLogs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= eventTime - windowMs && t < eventTime;
    });

    const afterLogs = emotionalLogs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t > eventTime && t <= eventTime + windowMs;
    });

    // Require at least 2 records on each side to avoid noise
    if (beforeLogs.length < 2 || afterLogs.length < 2) continue;

    const avg = (logs: TimelineEntry[], key: string): number => {
      const vals = logs
        .map((e) => Number((e.metadata as Record<string, unknown>)?.[key] ?? NaN))
        .filter((v) => !isNaN(v));
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };

    const before: EmotionalWindow = {
      mood: avg(beforeLogs, 'mood_score'),
      anxiety: avg(beforeLogs, 'anxiety_score'),
      energy: avg(beforeLogs, 'energy_score'),
      count: beforeLogs.length,
    };

    const after: EmotionalWindow = {
      mood: avg(afterLogs, 'mood_score'),
      anxiety: avg(afterLogs, 'anxiety_score'),
      energy: avg(afterLogs, 'energy_score'),
      count: afterLogs.length,
    };

    correlations.push({
      event,
      before,
      after,
      delta: {
        mood: after.mood - before.mood,
        anxiety: after.anxiety - before.anxiety,
        energy: after.energy - before.energy,
      },
    });
  }

  // Sort by absolute sum of deltas descending (most impactful first)
  return correlations.sort(
    (a, b) =>
      Math.abs(b.delta.mood) + Math.abs(b.delta.anxiety) + Math.abs(b.delta.energy) -
      (Math.abs(a.delta.mood) + Math.abs(a.delta.anxiety) + Math.abs(a.delta.energy))
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

**Step 3: Commit**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/Timeline.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add computeCorrelations pure function to Timeline"
```

---

## Task 2: Componentes `CorrelationCard` e `CorrelationsSection`

**Files:**
- Modify: `dashboard/src/components/Timeline.tsx`

### Contexto
Adicionar dois componentes internos no final do arquivo (após `SelectedEventCard`).

**Step 1: Adicionar `CorrelationCard`**

Adicione no final do arquivo (após `SelectedEventCard` mas antes do último `export`/fim do arquivo):

```typescript
// ---------------------------------------------------------------------------
// Correlation card
// ---------------------------------------------------------------------------

function DeltaCell({ value, label }: { value: number; label: string }) {
  const abs = Math.abs(value);
  const sign = value > 0 ? '+' : '';
  const isSignificant = abs >= 2.0;
  const isModerate = abs >= 0.5 && abs < 2.0;
  const isPositiveChange = (label === 'Humor' || label === 'Energia') ? value > 0 : value < 0;

  let deltaClass = 'text-gray-400';
  let arrow = '→';

  if (isSignificant) {
    deltaClass = isPositiveChange ? 'text-clarita-green-600 font-bold' : 'text-red-500 font-bold';
    arrow = value > 0 ? '↑↑' : '↓↓';
  } else if (isModerate) {
    deltaClass = isPositiveChange ? 'text-clarita-green-500' : 'text-orange-500';
    arrow = value > 0 ? '↑' : '↓';
  }

  const display = abs < 0.5 ? 'estável' : `${sign}${value.toFixed(1)}`;

  return (
    <span className={`text-xs tabular-nums ${deltaClass}`}>
      {arrow} {display}
    </span>
  );
}

function CorrelationCard({ correlation }: { correlation: EventCorrelation }) {
  const { event, before, after, delta } = correlation;
  const config = categoryConfig[event.type] ?? { icon: null, label: 'Evento', color: '#9ca3af', badgeClass: 'badge-blue' };
  const catMeta = (event.metadata as Record<string, unknown>)?.category as string | undefined;

  const metrics: Array<{ label: string; beforeVal: number; afterVal: number; deltaVal: number }> = [
    { label: 'Humor', beforeVal: before.mood, afterVal: after.mood, deltaVal: delta.mood },
    { label: 'Ansiedade', beforeVal: before.anxiety, afterVal: after.anxiety, deltaVal: delta.anxiety },
    { label: 'Energia', beforeVal: before.energy, afterVal: after.energy, deltaVal: delta.energy },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4">
      {/* Event header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <span className="font-medium text-gray-800 text-sm">{event.title}</span>
          {catMeta && (
            <span className="badge-blue text-[10px]">{catMeta}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
          {format(new Date(event.timestamp), "d MMM yyyy", { locale: ptBR })}
        </span>
      </div>

      {/* Metrics table */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
          <span>Métrica</span>
          <span className="text-right">Antes</span>
          <span className="text-right">Depois</span>
          <span className="text-right">Δ</span>
        </div>
        {metrics.map((m) => (
          <div key={m.label} className="grid grid-cols-4 gap-2 items-center">
            <span className="text-xs text-gray-600">{m.label}</span>
            <span className="text-xs text-gray-500 text-right tabular-nums">{m.beforeVal.toFixed(1)}</span>
            <span className="text-xs text-gray-700 font-medium text-right tabular-nums">{m.afterVal.toFixed(1)}</span>
            <div className="text-right">
              <DeltaCell value={m.deltaVal} label={m.label} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-400 mt-3">
        {before.count} registros antes · {after.count} registros depois
      </p>
    </div>
  );
}
```

**Step 2: Adicionar `CorrelationsSection`**

Logo após `CorrelationCard`, adicione:

```typescript
type CorrelationWindow = 7 | 14 | 30;

function CorrelationsSection({ entries }: { entries: TimelineEntry[] }) {
  const [window, setWindow] = useState<CorrelationWindow>(14);

  const correlations = computeCorrelations(entries, window);

  return (
    <div className="mt-4 pt-4 border-t border-gray-200/40">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Correlações com Momentos de Vida
        </h4>
        <div className="flex items-center gap-1 bg-white/80 rounded-full p-0.5 border border-gray-200/40">
          {([7, 14, 30] as CorrelationWindow[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 py-1 text-[10px] font-medium rounded-full transition-all duration-200
                ${window === w
                  ? 'bg-clarita-green-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {/* Cards or empty state */}
      {correlations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          Nenhuma correlação encontrada para esta janela. Adicione check-ins emocionais próximos aos eventos de vida.
        </p>
      ) : (
        <div className="space-y-3">
          {correlations.map((c) => (
            <CorrelationCard key={c.event.id} correlation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

**Step 4: Commit**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/Timeline.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add CorrelationCard and CorrelationsSection components"
```

---

## Task 3: Integrar `CorrelationsSection` no `Timeline` + build + push

**Files:**
- Modify: `dashboard/src/components/Timeline.tsx`

### Contexto
O componente `Timeline` retorna um `<div className="space-y-4 animate-fade-in">` com dois filhos: o `<div className="card">` principal e o `{selectedEvent && ...}` card de detalhe. A `CorrelationsSection` vai dentro do `.card` principal, após o bloco `{/* Event list */}`.

**Step 1: Adicionar `<CorrelationsSection>` no JSX do `Timeline`**

Localize o bloco `{/* Event list */}` (começa com `{filtered.length > 0 && (`). Logo após o fechamento desse bloco (após o `}` do `filtered.length > 0`), adicione:

```typescript
{/* Correlations */}
<CorrelationsSection entries={entries} />
```

**IMPORTANTE:**
- `entries` aqui é a prop original do componente (todos os entries, não apenas `filtered`) — isso garante que correlações usam dados do período máximo disponível, independente do filtro de visualização
- `CorrelationsSection` tem seu próprio seletor de janela interno
- Deve ficar dentro do `<div className="card">`, antes do `</div>` de fechamento do card

**Step 2: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

**Step 3: Build de produção**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npm run build 2>&1 | tail -20
```
Esperado: `✓ Compiled successfully` sem erros.

**Step 4: Commit e push**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/Timeline.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: integrate CorrelationsSection into Timeline"
git -C /Users/luizaquintino/Desktop/Clarita push origin main
```

---

## Notas de Implementação

- **`window` é palavra reservada em browsers** — se o TypeScript reclamar, renomeie o estado para `corrWindow` ou `windowDays`
- **`entries` vs `filtered`**: passar `entries` (prop original) para `CorrelationsSection`, não `filtered` — correlações devem usar todos os dados disponíveis, independente do filtro de visualização atual
- **`format` já importado** de `date-fns` — não reimportar
- **`ptBR` já importado** — não reimportar
- **`categoryConfig` já definido** no topo do arquivo — não reimportar
- **`useState` já importado** — não reimportar
- **Classe `tabular-nums`**: classe Tailwind nativa — garante alinhamento de números
- A ordenação por "impacto total" (soma dos |Δ|) garante que correlações mais relevantes aparecem primeiro
