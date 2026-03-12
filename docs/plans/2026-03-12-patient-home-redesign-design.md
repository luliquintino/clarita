# Patient Home Redesign — Design Doc

**Data:** 2026-03-12
**Status:** Aprovado

---

## Objetivo

Redesenhar a `/patient-home` para ter uma home limpa e focada no dia a dia, com barra de navegação inferior para acesso às demais funcionalidades.

---

## Estrutura da Home (nova)

### Coluna principal
1. **Check-in emocional** — JournalEntry (igual ao atual)
2. **Card "Você tomou sua medicação hoje?"** — novo componente `MedicationCheckCard`
   - Aparece **somente** se o paciente tiver medicações com `status = 'active'`
   - Lista cada medicamento com nome, dosagem, frequência
   - Dois botões por medicamento: ✅ Sim / ❌ Não tomei
   - Ao marcar: chama `POST /api/medication-logs` com `{ patient_medication_id, skipped: false|true }`
   - Se já logou hoje: mostra resumo de adesão (desabilitado, com checkmarks)
   - "Hoje" = verificado via `GET /api/medication-logs?start_date=hoje&end_date=hoje`

### Coluna lateral (direita no desktop)
3. **Profissionais + compartilhamento** — ProfessionalTabs (igual ao atual)

---

## Barra de Navegação Inferior (BottomNav)

Componente fixo `BottomNav` com scroll horizontal para 7 abas:

| Ícone | Label | Componente |
|---|---|---|
| Home | Home | (default — check-in + medicação + profissionais) |
| FileText | Exames | ExamUploadPanel |
| Pill | Prescrições | nova tela de lista de prescrições do paciente |
| FlaskConical | Testes | PsychTestPanel |
| ClipboardList | Anamnese | AnamnesisPanel |
| Target | Metas | PatientGoalsPanel |
| BookOpen | Histórico | JournalHistory |

- Aba ativa: destaque com cor + underline
- Scroll horizontal suave via `overflow-x: auto; scrollbar-width: none`
- Barra **não aparece** quando está na Home (a home já é a raiz)
  _Ou:_ aparece sempre com "Home" ativa — decisão de implementação simples

---

## Backend necessário

### Existente (reutilizado sem alteração)
- `GET /api/patient-medications` → paciente lê as próprias via JWT (já suporta `role = patient`)
- `POST /api/medication-logs` → registra tomada/skip
- `GET /api/medication-logs?start_date=&end_date=` → verifica logs do dia

### Novo endpoint
- `GET /api/prescriptions/my` → lista prescrições do próprio paciente
  (o endpoint atual `/:patientId` requer ID explícito; criar rota que lê do JWT)

---

## Componentes novos

- `MedicationCheckCard` — `dashboard/src/components/MedicationCheckCard.tsx`
- `BottomNav` — `dashboard/src/components/BottomNav.tsx`
- `MyPrescriptionsPanel` — `dashboard/src/components/MyPrescriptionsPanel.tsx`

---

## Arquivos modificados

- `backend/src/routes/prescriptions.js` — adicionar `GET /my`
- `dashboard/src/lib/api.ts` — adicionar `prescriptionsApi.getMy()`, `medicationLogsApi.getToday()`
- `dashboard/src/app/patient-home/page.tsx` — nova estrutura de layout

---

## O que NÃO muda

- Lógica de autenticação / onboarding check
- ProfessionalTabs (painel de profissionais)
- Todos os componentes de conteúdo (apenas movidos para seções da BottomNav)
