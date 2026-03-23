# Timeline Hybrid View, Patient Life Events Modal, AI Summary Period Selector

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar modal de momentos importantes na `patient-home`, lista cronológica abaixo do scatter chart na `Timeline`, e seletor 7d/30d no resumo IA.

**Architecture:** Três mudanças independentes, todas no frontend apenas. O backend já tem todas as rotas necessárias. Nenhuma migração de banco. Nenhuma mudança de rota.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, date-fns, lucide-react

---

## Task 1: `lifeEventsApi` em `api.ts` + tipos

**Files:**
- Modify: `dashboard/src/lib/api.ts`

**Step 1: Adicionar interface `LifeEvent` e `lifeEventsApi`**

Encontre onde `summariesApi` é definido (linha ~1130) e adicione ANTES dele:

```typescript
// ---------------------------------------------------------------------------
// Life Events
// ---------------------------------------------------------------------------

export interface LifeEvent {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  category: 'relationship' | 'work' | 'health' | 'family' | 'financial' | 'loss' | 'achievement' | 'other';
  impact_level: number; // 1-10
  event_date: string; // ISO date
  created_at: string;
}

export interface CreateLifeEventInput {
  title: string;
  description?: string;
  category: LifeEvent['category'];
  impact_level: number;
  event_date: string;
}

export const lifeEventsApi = {
  create: (data: CreateLifeEventInput) =>
    request<{ life_event: LifeEvent }>('/life-events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () =>
    request<{ life_events: LifeEvent[]; pagination: { total: number } }>('/life-events'),
};
```

**Step 2: Verificar que compila**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros.

**Step 3: Commit**

```bash
git add dashboard/src/lib/api.ts
git commit -m "feat: add LifeEvent types and lifeEventsApi to api.ts"
```

---

## Task 2: `AddLifeEventModal.tsx` — modal de cadastro de momentos

**Files:**
- Create: `dashboard/src/components/AddLifeEventModal.tsx`

**Step 1: Criar o componente**

```typescript
'use client';

import { useState } from 'react';
import { X, Loader2, Star } from 'lucide-react';
import { format } from 'date-fns';
import { lifeEventsApi, type CreateLifeEventInput } from '@/lib/api';

const CATEGORIES = [
  { value: 'relationship', label: 'Relacionamento' },
  { value: 'work', label: 'Trabalho' },
  { value: 'health', label: 'Saúde' },
  { value: 'family', label: 'Família' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'loss', label: 'Perda' },
  { value: 'achievement', label: 'Conquista' },
  { value: 'other', label: 'Outro' },
] as const;

// Mapeia impacto simplificado (UI) para impact_level numérico (1-10)
const IMPACT_OPTIONS = [
  { value: 2, label: 'Negativo', color: 'text-red-500' },
  { value: 5, label: 'Neutro', color: 'text-gray-500' },
  { value: 8, label: 'Positivo', color: 'text-clarita-green-500' },
];

interface AddLifeEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddLifeEventModal({ open, onClose, onCreated }: AddLifeEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CreateLifeEventInput['category']>('other');
  const [impactLevel, setImpactLevel] = useState<number>(5);
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('other');
    setImpactLevel(5);
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await lifeEventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        impact_level: impactLevel,
        event_date: eventDate,
      });
      reset();
      onCreated();
      onClose();
    } catch {
      setError('Erro ao salvar momento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-clarita-blue-50 flex items-center justify-center">
              <Star size={18} className="text-clarita-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Registrar Momento</h2>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Comecei nova terapia"
              maxLength={300}
              className="input-field w-full"
              disabled={saving}
            />
          </div>

          {/* Categoria e Data em linha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CreateLifeEventInput['category'])}
                className="input-field w-full"
                disabled={saving}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-field w-full"
                disabled={saving}
              />
            </div>
          </div>

          {/* Impacto */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Impacto
            </label>
            <div className="flex gap-2">
              {IMPACT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setImpactLevel(opt.value)}
                  disabled={saving}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-200
                    ${impactLevel === opt.value
                      ? 'border-transparent bg-clarita-green-50 text-clarita-green-600 shadow-sm ring-2 ring-clarita-green-200'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Descrição <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o momento com mais detalhes..."
              rows={3}
              maxLength={5000}
              className="input-field w-full resize-none"
              disabled={saving}
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="btn-ghost flex-1 py-2.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : 'Salvar momento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verificar que compila**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros.

**Step 3: Commit**

```bash
git add dashboard/src/components/AddLifeEventModal.tsx
git commit -m "feat: add AddLifeEventModal component for patient life events"
```

---

## Task 3: Integrar modal na `patient-home`

**Files:**
- Modify: `dashboard/src/app/patient-home/page.tsx`

**Contexto:** O arquivo tem ~700+ linhas. As mudanças são cirúrgicas.

**Step 1: Adicionar imports (no topo, após os imports existentes)**

Adicione ao bloco de imports de componentes:
```typescript
import AddLifeEventModal from '@/components/AddLifeEventModal';
```

No bloco de imports de api, adicione `lifeEventsApi`:
```typescript
// Já existem: authApi, journalApi, etc.
// Adicionar:
  lifeEventsApi,
```

**Step 2: Adicionar estado do modal (após o bloco de estados existentes)**

Localize a linha com `const [activeSection, setActiveSection]` e logo após adicione:
```typescript
const [showLifeEventModal, setShowLifeEventModal] = useState(false);
```

**Step 3: Adicionar botão "+ Momento" no header**

Localize o header da patient-home (onde fica o botão de logout ou o nome do usuário). Adicione o botão antes do botão de logout:

```typescript
<button
  onClick={() => setShowLifeEventModal(true)}
  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
>
  <Star size={14} />
  + Momento
</button>
```

**IMPORTANTE:** Você precisa importar `Star` de `lucide-react` junto com os outros ícones já importados (`LogOut`, `Loader2`).

**Step 4: Adicionar o modal no JSX (antes do `</div>` de fechamento do return)**

```typescript
<AddLifeEventModal
  open={showLifeEventModal}
  onClose={() => setShowLifeEventModal(false)}
  onCreated={() => {
    // Sem side-effects necessários por ora
    // A timeline do profissional buscará os eventos atualizado no próximo load
  }}
/>
```

**Step 5: Verificar que compila**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros.

**Step 6: Commit**

```bash
git add dashboard/src/app/patient-home/page.tsx
git commit -m "feat: add life events modal trigger to patient-home header"
```

---

## Task 4: Lista cronológica na `Timeline.tsx`

**Files:**
- Modify: `dashboard/src/components/Timeline.tsx`

**Contexto:** O componente já tem `filtered` (lista dos eventos do período com categorias visíveis aplicadas). A lista vai usar exatamente esses dados.

**Step 1: Adicionar componente interno `EventListItem`**

Adicione este componente no final do arquivo, antes de `SelectedEventCard`:

```typescript
function EventListItem({
  entry,
  onSelect,
  isSelected,
}: {
  entry: TimelineEntry;
  onSelect: (e: TimelineEntry) => void;
  isSelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[entry.type] ?? {
    icon: <ClipboardCheck size={14} />,
    label: entry.type.replace(/_/g, ' '),
    color: '#9ca3af',
    badgeClass: 'badge-blue',
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-2xl transition-all duration-200 cursor-pointer
        ${isSelected ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50/60'}
        ${entry.severity === 'critical' || entry.severity === 'high' ? 'border-l-2 border-red-400 pl-2' : ''}`}
      onClick={() => { onSelect(entry); setExpanded(!expanded); }}
    >
      {/* Ícone */}
      <div
        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white mt-0.5"
        style={{ backgroundColor: config.color }}
      >
        {config.icon}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${config.badgeClass} text-[10px]`}>{config.label}</span>
          {entry.severity && (
            <span className={`${getSeverityBadgeClass(entry.severity)} text-[10px]`}>
              {entry.severity}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
            {format(new Date(entry.timestamp), "d MMM · HH:mm", { locale: ptBR })}
          </span>
        </div>
        <p className="font-medium text-gray-800 text-sm mt-0.5">{entry.title}</p>
        {entry.description && (
          <p className={`text-xs text-gray-500 mt-0.5 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {entry.description}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Adicionar a lista abaixo do scatter chart**

No componente `Timeline`, após o bloco `{/* Lane legend */}` (o `div` com `flex flex-wrap items-center gap-3 mt-3 pt-3 border-t`), adicione:

```typescript
{/* Event list */}
{filtered.length > 0 && (
  <div className="mt-4 pt-4 border-t border-gray-200/40">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
      {filtered.length} evento{filtered.length !== 1 ? 's' : ''} no período
    </h4>
    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
      {[...filtered]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((entry) => (
          <EventListItem
            key={entry.id}
            entry={entry}
            onSelect={setSelectedEvent}
            isSelected={selectedEvent?.id === entry.id}
          />
        ))}
    </div>
  </div>
)}
```

**Step 3: Verificar que compila**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros.

**Step 4: Commit**

```bash
git add dashboard/src/components/Timeline.tsx
git commit -m "feat: add chronological event list below timeline scatter chart"
```

---

## Task 5: Seletor de período no `AISummaryCard.tsx`

**Files:**
- Modify: `dashboard/src/components/AISummaryCard.tsx`
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

### 5a — Atualizar `AISummaryCard.tsx`

**Step 1: Alterar a prop `onGenerate`**

Encontre a interface de props do componente:
```typescript
interface AISummaryCardProps {
  summaries: PatientSummary[];
  loading?: boolean;
  generating?: boolean;
  onGenerate?: () => void;   // <- ALTERAR para:
}
```
Mude para:
```typescript
  onGenerate?: (days: 7 | 30) => void;
```

**Step 2: Adicionar estado `generatingPeriod`**

No componente, substitua o uso de `generating` externo por estado interno para saber qual botão está gerando. Adicione:

```typescript
const [generatingPeriod, setGeneratingPeriod] = useState<7 | 30 | null>(null);
```

**Step 3: Substituir o botão único por dois botões**

Encontre este trecho no header:
```typescript
{onGenerate && (
  <button
    onClick={onGenerate}
    disabled={generating}
    className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
  >
    {generating ? (
      <Loader2 size={12} className="animate-spin" />
    ) : (
      <RefreshCw size={12} />
    )}
    {generating ? 'Gerando...' : 'Gerar novo'}
  </button>
)}
```

Substitua por:
```typescript
{onGenerate && (
  <div className="flex items-center gap-2">
    {([7, 30] as const).map((days) => {
      const label = days === 7 ? 'Última semana' : 'Último mês';
      const isGenerating = generatingPeriod === days;
      const isDisabled = generatingPeriod !== null && generatingPeriod !== days;
      return (
        <button
          key={days}
          onClick={async () => {
            setGeneratingPeriod(days);
            try {
              await onGenerate(days);
            } finally {
              setGeneratingPeriod(null);
            }
          }}
          disabled={isGenerating || isDisabled}
          className={`btn-primary text-xs py-2 px-3 flex items-center gap-1
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {isGenerating ? 'Gerando...' : label}
        </button>
      );
    })}
  </div>
)}
```

**ATENÇÃO:** Como o estado `generating` era prop externa e agora é gerido internamente via `generatingPeriod`, remova `generating` das props e do uso no componente. O componente agora gerencia o próprio estado de loading.

**Step 4: Remover `generating` da interface de props**

```typescript
interface AISummaryCardProps {
  summaries: PatientSummary[];
  loading?: boolean;
  // generating?: boolean;  <- REMOVER
  onGenerate?: (days: 7 | 30) => void;
}
```

### 5b — Atualizar `patients/[id]/page.tsx`

**Step 5: Atualizar `handleGenerateSummary`**

Encontre:
```typescript
const handleGenerateSummary = async () => {
  setGenerating(true);
  try {
    await summariesApi.generate(patientId, 7);
    await loadSummaries();
  } finally {
    setGenerating(false);
  }
};
```

Substitua por:
```typescript
const handleGenerateSummary = async (days: 7 | 30) => {
  try {
    await summariesApi.generate(patientId, days);
    await loadSummaries();
  } finally {
    // generating state agora é interno ao AISummaryCard
  }
};
```

**Step 6: Atualizar o uso de `<AISummaryCard>`**

Encontre onde `AISummaryCard` é renderizado e remova a prop `generating`:
```typescript
<AISummaryCard
  summaries={summaries}
  loading={summariesLoading}
  // generating={generating}  <- REMOVER esta linha
  onGenerate={handleGenerateSummary}
/>
```

Também remova o estado `generating` e `setGenerating` do componente `patients/[id]/page.tsx` se não for mais usado em outro lugar.

**Step 7: Verificar que compila**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros.

**Step 8: Commit**

```bash
git add dashboard/src/components/AISummaryCard.tsx dashboard/src/app/patients/\[id\]/page.tsx
git commit -m "feat: add 7d/30d period selector to AI summary card"
```

---

## Task 6: Build final e push

**Step 1: Build de produção**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm run build 2>&1 | tail -30
```
Esperado: `✓ Compiled successfully` sem erros.

**Step 2: Push**

```bash
git push origin main
```

**Step 3: Verificar deploy no Vercel**

Aguardar ~2 minutos e verificar `https://clarita.tec.br`:
- Na `patient-home`: botão `+ Momento` visível no header
- Clicar no botão: modal abre com formulário
- Preencher e salvar: modal fecha sem erro
- Na view do profissional (João/Maria): linha do tempo mostra lista abaixo do gráfico
- No resumo IA: dois botões "Última semana" e "Último mês"

---

## Notas de Implementação

- **`input-field`**: classe CSS global já definida no projeto — use em todos os inputs/selects/textareas
- **`btn-primary`, `btn-ghost`**: classes globais já definidas
- **`animate-fade-in`, `animate-scale-in`**: classes globais já definidas
- **`clarita-green-*`, `clarita-blue-*`, `clarita-purple-*`**: cores do design system Clarita
- **`line-clamp-2`**: classe Tailwind para truncar em 2 linhas (já disponível)
- O backend `POST /api/life-events` espera `impact_level` como inteiro 1-10 — mapeamos 3 opções: negativo=2, neutro=5, positivo=8
- O estado `generating` era prop de `AISummaryCard` mas agora é interno — remover do `page.tsx`
