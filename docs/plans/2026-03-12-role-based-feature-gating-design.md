# Design: Role-Based Feature Gating

**Data:** 2026-03-12
**Status:** Aprovado

## Contexto

A plataforma Clarita atende dois perfis profissionais distintos — psiquiatra e psicólogo — com competências legais diferentes no Brasil. Atualmente todos os recursos são idênticos para os dois papéis, o que é incorreto (ex: `MedicationManager` tem `isPrescriber = true` hardcoded).

## Decisões

| Área | Psiquiatra | Psicólogo |
|------|-----------|-----------|
| Medicações | Acesso completo (prescrever, ajustar, descontinuar) | Somente leitura + banner de aviso |
| Exames | Acesso completo (solicitar, gerenciar) | Somente leitura + banner informativo |
| Avaliações | Escalas clínicas (HAM-D, BPRS, PANSS) + compartilhadas | Testes SATEPSI (Rorschach, HTP, TAT) + compartilhadas |
| Notas | Acesso igual | Acesso igual |
| CID-11 | Acesso igual | Acesso igual |
| Anamnese | Acesso igual | Acesso igual |
| Timeline | Acesso igual | Acesso igual |
| Gêmeo Digital | Acesso igual | Acesso igual |

## Arquitetura: Config central (Opção 1)

### Arquivo novo: `dashboard/src/lib/roleConfig.ts`

```ts
export const ROLE_CONFIG = {
  psychiatrist: {
    can_prescribe: true,
    can_request_exams: true,
    medications_access: 'full',
    exams_access: 'full',
    assessment_filter: 'clinical',
  },
  psychologist: {
    can_prescribe: false,
    can_request_exams: false,
    medications_access: 'readonly',
    exams_access: 'readonly',
    assessment_filter: 'psychological',
  },
} as const;

export type RoleCapabilities = typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG];
```

### Uso em `patients/[id]/page.tsx`

```ts
import { ROLE_CONFIG } from '@/lib/roleConfig';
const caps = ROLE_CONFIG[userRole as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.psychologist;
```

## Mudanças por componente

### `MedicationManager.tsx`
- Adicionar prop `readOnly?: boolean`
- Substituir `isPrescriber = true` por `isPrescriber = !readOnly`
- Quando `readOnly`: banner amarelo no topo com ícone de aviso
  > *"Prescrição de medicamentos é competência exclusiva do psiquiatra. Dados disponíveis para consulta clínica."*
- Ocultar botões: "Prescrever novo medicamento", "Ajustar", "Descontinuar"
- Histórico de medicamentos permanece visível

### `PatientExamsPanel.tsx`
- Adicionar prop `readOnly?: boolean`
- Quando `readOnly`: banner azul informativo
  > *"Solicitação de exames é realizada pelo psiquiatra. Visualização disponível para contexto clínico."*
- Ocultar botão "Solicitar Exame" e ações individuais por exame
- Resultados e histórico permanecem visíveis

### `PsychTestPanel.tsx`
- Adicionar prop `assessmentFilter: 'clinical' | 'psychological'`
- `clinical`: HAM-D, BPRS, PANSS, Hamilton Anxiety + PHQ-9, GAD-7, Beck (compartilhados)
- `psychological`: testes SATEPSI (Rorschach, HTP, TAT, Bender, WISC, WAIS) + PHQ-9, GAD-7, Beck (compartilhados)
- Filtrar lista de testes disponíveis conforme o filtro
- Categorias `shared` aparecem para ambos

### `patients/[id]/page.tsx`
```tsx
// Medicações
<MedicationManager
  readOnly={!caps.can_prescribe}
  ...
/>

// Exames
<PatientExamsPanel
  patientId={patientId}
  readOnly={!caps.can_request_exams}
/>

// Avaliações
<PsychTestPanel
  patientId={patientId}
  role={userRole}
  assessmentFilter={caps.assessment_filter}
/>
```

## Categorias de testes

### `clinical` (psiquiatra)
- HAM-D (Hamilton Depression Rating Scale)
- BPRS (Brief Psychiatric Rating Scale)
- PANSS (Positive and Negative Syndrome Scale)
- Hamilton Anxiety (HAM-A)
- YMRS (Young Mania Rating Scale)
- + shared: PHQ-9, GAD-7, Beck Depression Inventory

### `psychological` (psicólogo)
- Testes SATEPSI: Rorschach, HTP, TAT, Bender, WISC, WAIS, Raven
- + shared: PHQ-9, GAD-7, Beck Depression Inventory, BDI-II

### `shared` (ambos)
- PHQ-9, GAD-7, Beck Depression Inventory

## Arquivos afetados

1. `dashboard/src/lib/roleConfig.ts` ← **novo**
2. `dashboard/src/components/MedicationManager.tsx`
3. `dashboard/src/components/PatientExamsPanel.tsx`
4. `dashboard/src/components/PsychTestPanel.tsx`
5. `dashboard/src/app/patients/[id]/page.tsx`

## Não muda
- Backend: regras de negócio são frontend-only por ora (o backend já valida role para dados sensíveis)
- Notas, CID-11, Gêmeo Digital, Anamnese, Timeline: sem restrições por papel
