# Role-Based Feature Gating — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adaptar a plataforma para que psiquiatra e psicólogo vejam apenas as funcionalidades compatíveis com suas competências legais no Brasil.

**Architecture:** Config central em `roleConfig.ts` define as capacidades de cada papel. `page.tsx` deriva `caps` do role do usuário e passa props de restrição para os componentes. Cada componente recebe `readOnly` ou `assessmentFilter` e renderiza seu estado restrito internamente.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, lucide-react

---

## Task 1: Criar `roleConfig.ts`

**Files:**
- Create: `dashboard/src/lib/roleConfig.ts`

**Step 1: Criar o arquivo**

```ts
// dashboard/src/lib/roleConfig.ts

export const ROLE_CONFIG = {
  psychiatrist: {
    can_prescribe: true,
    can_request_exams: true,
    medications_access: 'full' as const,
    exams_access: 'full' as const,
    assessment_filter: 'clinical' as const,
  },
  psychologist: {
    can_prescribe: false,
    can_request_exams: false,
    medications_access: 'readonly' as const,
    exams_access: 'readonly' as const,
    assessment_filter: 'psychological' as const,
  },
} as const;

export type RoleKey = keyof typeof ROLE_CONFIG;
export type RoleCapabilities = typeof ROLE_CONFIG[RoleKey];

/** Retorna config de capacidades para o role, com fallback seguro para 'psychologist' */
export function getRoleCapabilities(role: string): RoleCapabilities {
  return ROLE_CONFIG[role as RoleKey] ?? ROLE_CONFIG.psychologist;
}
```

**Step 2: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

Esperado: zero erros.

**Step 3: Commit**

```bash
git add dashboard/src/lib/roleConfig.ts
git commit -m "feat: add ROLE_CONFIG central permissions config"
```

---

## Task 2: MedicationManager — suporte a `readOnly`

**Files:**
- Modify: `dashboard/src/components/MedicationManager.tsx`

**Contexto:** `isPrescriber = true` está hardcoded na linha 102. O componente já usa `isPrescriber` em 4 pontos para mostrar/ocultar botões de prescrição.

**Step 1: Adicionar prop `readOnly` na interface**

Localizar:
```ts
interface MedicationManagerProps {
  medications: Medication[];
  patientId: string;
  role: 'psychiatrist' | 'psychologist' | 'therapist';
```

Adicionar `readOnly?: boolean;` após `role`:
```ts
interface MedicationManagerProps {
  medications: Medication[];
  patientId: string;
  role: 'psychiatrist' | 'psychologist' | 'therapist';
  readOnly?: boolean;
  onPrescribe?: ...
```

**Step 2: Extrair `readOnly` na assinatura do componente**

Localizar:
```ts
export default function MedicationManager({
  medications,
  patientId,
  role,
  onPrescribe,
```

Substituir por:
```ts
export default function MedicationManager({
  medications,
  patientId,
  role,
  readOnly = false,
  onPrescribe,
```

**Step 3: Corrigir `isPrescriber`**

Localizar linha 102:
```ts
  const isPrescriber = true; // All professionals can manage medications
```

Substituir por:
```ts
  const isPrescriber = !readOnly;
```

**Step 4: Adicionar banner de aviso quando `readOnly`**

No JSX, localizar o primeiro elemento de conteúdo (após a abertura do container principal, antes dos botões). Adicionar logo antes de `{isPrescriber && !showPrescribeForm && (`:

```tsx
{readOnly && (
  <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200/60">
    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-amber-700 leading-relaxed">
      <span className="font-semibold">Visualização clínica.</span>{' '}
      Prescrição de medicamentos é competência exclusiva do psiquiatra.
      Os dados abaixo estão disponíveis para contexto do acompanhamento.
    </p>
  </div>
)}
```

> Nota: `AlertTriangle` já está importado no arquivo (linha 5).

**Step 5: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

Esperado: zero erros.

**Step 6: Commit**

```bash
git add dashboard/src/components/MedicationManager.tsx
git commit -m "feat: MedicationManager supports readOnly prop for psychologist"
```

---

## Task 3: PatientExamsPanel — suporte a `readOnly`

**Files:**
- Modify: `dashboard/src/components/PatientExamsPanel.tsx`

**Contexto:** O painel atual só mostra exames compartilhados pelo paciente (sem botão de solicitar). Mas a UI não tem nenhuma diferenciação de papel. Adicionar `readOnly` + banner.

**Step 1: Adicionar `readOnly` na interface e no componente**

Localizar:
```ts
interface PatientExamsPanelProps {
  patientId: string;
}

export default function PatientExamsPanel({ patientId }: PatientExamsPanelProps) {
```

Substituir por:
```ts
interface PatientExamsPanelProps {
  patientId: string;
  readOnly?: boolean;
}

export default function PatientExamsPanel({ patientId, readOnly = false }: PatientExamsPanelProps) {
```

**Step 2: Adicionar import de `Info` do lucide-react**

Localizar linha 4:
```ts
import { FileText, Image as ImageIcon, Download, Loader2, ClipboardList } from 'lucide-react';
```

Substituir por:
```ts
import { FileText, Image as ImageIcon, Download, Loader2, ClipboardList, Info } from 'lucide-react';
```

**Step 3: Adicionar banner informativo no JSX**

Logo após o `<div className="flex items-center gap-2 mb-4">` do cabeçalho (após o badge de contagem), adicionar antes do bloco `{exams.length === 0 ? ...}`:

```tsx
{readOnly && (
  <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-200/60">
    <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-700 leading-relaxed">
      <span className="font-semibold">Visualização clínica.</span>{' '}
      Solicitação de exames é realizada pelo psiquiatra.
      Os exames abaixo estão disponíveis para consulta do acompanhamento.
    </p>
  </div>
)}
```

**Step 4: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

Esperado: zero erros.

**Step 5: Commit**

```bash
git add dashboard/src/components/PatientExamsPanel.tsx
git commit -m "feat: PatientExamsPanel supports readOnly prop for psychologist"
```

---

## Task 4: PsychTestPanel — suporte a `assessmentFilter`

**Files:**
- Modify: `dashboard/src/components/PsychTestPanel.tsx`

**Contexto:** A `PsychTest` tem campo `category: string` com valores atuais: `'depression'`, `'anxiety'`, `'general'`. Esses são instrumentos compartilhados (PHQ-9, GAD-7, Beck). O filtro define quais categorias ficam visíveis:
- `'clinical'` (psiquiatra): categorias `['depression', 'anxiety', 'general', 'clinical']`
- `'psychological'` (psicólogo): categorias `['depression', 'anxiety', 'general', 'psychological']`
- Ambos veem as categorias `shared` (depression, anxiety, general) — hoje é tudo o que existe

**Step 1: Adicionar prop `assessmentFilter` na interface**

Localizar:
```ts
interface PsychTestPanelProps {
  patientId?: string;
  role: string;
}
```

Substituir por:
```ts
interface PsychTestPanelProps {
  patientId?: string;
  role: string;
  assessmentFilter?: 'clinical' | 'psychological';
}
```

**Step 2: Extrair `assessmentFilter` na assinatura**

Localizar:
```ts
export default function PsychTestPanel({ patientId, role }: PsychTestPanelProps) {
```

Substituir por:
```ts
export default function PsychTestPanel({ patientId, role, assessmentFilter }: PsychTestPanelProps) {
```

**Step 3: Derivar categorias permitidas**

Logo após a linha `const isPatient = role === 'patient';`, adicionar:

```ts
// Categorias de testes visíveis por papel
// 'depression', 'anxiety', 'general' são compartilhadas por ambos
// 'clinical' é exclusiva do psiquiatra (HAM-D, BPRS etc. — adicionados futuramente)
// 'psychological' é exclusiva do psicólogo (SATEPSI — adicionados futuramente)
const SHARED_CATEGORIES = ['depression', 'anxiety', 'general'];
const allowedCategories: string[] = assessmentFilter === 'clinical'
  ? [...SHARED_CATEGORIES, 'clinical']
  : assessmentFilter === 'psychological'
    ? [...SHARED_CATEGORIES, 'psychological']
    : [...SHARED_CATEGORIES, 'clinical', 'psychological']; // sem filtro = todos
```

**Step 4: Filtrar o catálogo antes de exibir**

Localizar onde `catalog` é usado para renderizar a lista (a variável `catalog` é usada diretamente no JSX). Adicionar a variável filtrada após a derivação de `allowedCategories`:

```ts
const filteredCatalog = catalog.filter(
  (t) => !assessmentFilter || allowedCategories.includes(t.category)
);
```

**Step 5: Substituir uso de `catalog` por `filteredCatalog` no JSX**

Buscar no JSX todos os usos de `catalog.` (como `catalog.map`, `catalog.length`, `catalog.filter`) e substituir por `filteredCatalog.`.

> Dica: geralmente há 1-2 ocorrências na seção de listagem de testes disponíveis.

**Step 6: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

Esperado: zero erros.

**Step 7: Commit**

```bash
git add dashboard/src/components/PsychTestPanel.tsx
git commit -m "feat: PsychTestPanel filters tests by assessmentFilter role prop"
```

---

## Task 5: Conectar tudo em `patients/[id]/page.tsx`

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

**Step 1: Importar `getRoleCapabilities`**

Localizar linha de imports de `@/lib/api`:
```ts
import { patientsApi, ... } from '@/lib/api';
```

Adicionar na linha seguinte:
```ts
import { getRoleCapabilities } from '@/lib/roleConfig';
```

**Step 2: Derivar `caps` a partir do `userRole`**

Localizar linha 458 (aprox):
```ts
const [userRole] = useState(() => getUserRoleFromToken() || 'psychologist');
```

Adicionar logo abaixo (não dentro do useState — é derivado):
```ts
const caps = getRoleCapabilities(userRole);
```

**Step 3: Passar `readOnly` para `MedicationManager`**

Localizar:
```tsx
<MedicationManager
  medications={medications}
  patientId={patientId}
  role={userRole as 'psychiatrist' | 'psychologist' | 'therapist'}
```

Adicionar `readOnly` prop:
```tsx
<MedicationManager
  medications={medications}
  patientId={patientId}
  role={userRole as 'psychiatrist' | 'psychologist' | 'therapist'}
  readOnly={!caps.can_prescribe}
```

**Step 4: Passar `readOnly` para `PatientExamsPanel`**

Localizar:
```tsx
{activeTab === 'exams' && <PatientExamsPanel patientId={patientId} />}
```

Substituir por:
```tsx
{activeTab === 'exams' && (
  <PatientExamsPanel patientId={patientId} readOnly={!caps.can_request_exams} />
)}
```

**Step 5: Passar `assessmentFilter` para `PsychTestPanel`**

Localizar:
```tsx
<PsychTestPanel patientId={patientId} role={userRole} />
```

Substituir por:
```tsx
<PsychTestPanel
  patientId={patientId}
  role={userRole}
  assessmentFilter={caps.assessment_filter}
/>
```

**Step 6: Verificar TypeScript final**

```bash
cd dashboard && npx tsc --noEmit
```

Esperado: zero erros.

**Step 7: Commit final**

```bash
git add dashboard/src/app/patients/[id]/page.tsx
git commit -m "feat: wire role capabilities into patient page (medications, exams, assessments)"
```

---

## Verificação manual

1. Login como **luiza.psiquiatra@teste.com** / `JCHh14025520`
   - Aba Medicações: sem banner, botões "Prescrever", "Ajustar", "Descontinuar" visíveis ✅
   - Aba Exames: sem banner, conteúdo normal ✅
   - Aba Avaliações: PHQ-9, GAD-7, Beck + escalas clínicas (se houver) ✅

2. Login como **luiza.psicologa@teste.com** / `JCHh14025520`
   - Aba Medicações: banner âmbar no topo, sem botões de ação ✅
   - Aba Exames: banner azul no topo, exames visíveis (somente leitura) ✅
   - Aba Avaliações: PHQ-9, GAD-7, Beck + testes psicológicos (se houver) ✅

3. `npx tsc --noEmit` → zero erros ✅
