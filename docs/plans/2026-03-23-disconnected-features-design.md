# Design: Funcionalidades Desconectadas — Críticos e Parciais

**Data:** 2026-03-23
**Status:** Aprovado

---

## Objetivo

Conectar 5 funcionalidades que existem no backend mas não têm UI completa, ou que têm UI mas não aparecem nas telas corretas.

---

## Feature 1 — Relato de Sintomas pelo Paciente

### Decisão
Card compacto "Relatar Sintoma" na `patient-home`, ao lado/abaixo do check-in emocional.

### UX
- Card com botão "+ Relatar Sintoma" abre modal
- Modal: busca de sintoma (lista do backend), intensidade (1–10), observações (opcional), data (default hoje)
- Submit → `POST /api/patient-symptoms`
- Após salvar: aparece automaticamente na Linha do Tempo do profissional (já funciona via timeline endpoint)

### Backend
- `GET /api/symptoms` — lista global de sintomas (já existe)
- `POST /api/patient-symptoms` — criar relato (já existe, requer `requireRole('patient')`)
- Zero mudanças

### Frontend
- Novo componente: `ReportSymptomModal.tsx`
- Modificar: `dashboard/src/app/patient-home/page.tsx` — adicionar card + modal

---

## Feature 2 — Seção "Medicamentos" do Paciente

### Decisão
Nova seção na nav inferior do paciente agrupando: medicações ativas + checklist diário + prescrições.

### UX
Nova entrada `'medications'` no `nav-items.ts` do paciente. Ao entrar, exibe 3 blocos:
1. **Medicações Ativas** — lista de `patient_medications` com nome, dosagem, frequência
2. **Checklist Diário** — `MedicationCheckCard` já existente
3. **Minhas Prescrições** — `MyPrescriptionsPanel` já existente

### Backend
- `GET /api/patient-medications/my` — já existe
- `GET /api/prescriptions` — já existe para paciente
- Zero mudanças

### Frontend
- Modificar: `dashboard/src/components/nav-items.ts` — adicionar `'medications'`
- Modificar: `dashboard/src/app/patient-home/page.tsx` — renderizar seção `'medications'`
- Novo componente: `PatientMedicationsSection.tsx` — agrupa os 3 blocos

---

## Feature 3 — Eventos de Vida pelo Profissional

### Decisão
Botão "+ Evento" no header do paciente (visível em qualquer aba). Reutiliza `AddLifeEventModal` com nova prop `patientId`.

### UX
- Botão `<Star size={14} /> + Evento` no header de `/patients/[id]`, ao lado do nome do paciente
- Abre `AddLifeEventModal` com `patientId` passado
- Após salvar: reload da timeline → evento aparece imediatamente

### Backend
**Nova rota necessária:**
```
POST /api/life-events/:patientId
requireRole('psychologist', 'psychiatrist')
requirePatientAccess()
```
Insere `life_events` com `patient_id = req.params.patientId` (não `req.user.id`).

### Frontend
- Modificar: `dashboard/src/components/AddLifeEventModal.tsx` — adicionar prop `patientId?: string`; se presente, chama `/life-events/:patientId`; senão, chama `/life-events` (rota atual do paciente)
- Modificar: `dashboard/src/lib/api.ts` — adicionar `lifeEventsApi.createForPatient(patientId, data)`
- Modificar: `dashboard/src/app/patients/[id]/page.tsx` — adicionar botão no header + modal + reload da timeline

---

## Feature 4 — Aba Chat na View do Profissional

### Decisão
Nova aba "Chat" em `/patients/[id]` que abre `ChatPanel` filtrado para aquele paciente.

### UX
- Tab "Chat" com ícone `MessageCircle` entre "Notas" e "Exames"
- Renderiza `<ChatPanel patientId={patientId} />`
- `ChatPanel` precisa aceitar `patientId` prop para filtrar/abrir conversa correta

### Backend
- `GET /api/chat/conversations` e `GET /api/chat/messages/:id` — já existem
- Zero mudanças

### Frontend
- Modificar: `dashboard/src/app/patients/[id]/page.tsx` — adicionar `'chat'` ao tipo `Tab`, tab item, renderização
- Verificar/modificar: `dashboard/src/components/ChatPanel.tsx` — aceitar `patientId` prop para filtrar conversa

---

## Feature 5 — Aba Insights na View do Profissional

### Decisão
Nova aba "Insights" com todos os insights do paciente, filtros de tipo/impacto, e ação de marcar como revisado.

### UX
- Tab "Insights" com ícone `Sparkles`
- Renderiza `<InsightsPanel insights={insights} showAll={true} />`
- Lista completa (não só top 2)
- Filtros de tipo e impacto dentro do painel
- Botão "Marcar como revisado" já existe

### Backend
- `GET /api/insights/:patientId` — já existe com paginação
- Zero mudanças (exceto carregar mais insights: limit=50 em vez de default)

### Frontend
- Modificar: `dashboard/src/app/patients/[id]/page.tsx` — adicionar `'insights'` ao tipo `Tab`, tab item, renderização; passar `insights` completo (já carregado)
- Verificar/modificar: `dashboard/src/components/InsightsPanel.tsx` — garantir que aceita lista completa e tem filtros

---

## Arquivos Modificados

### Backend (apenas Feature 3)
- `backend/src/routes/lifeEvents.js` — nova rota `POST /:patientId`

### Frontend
- `dashboard/src/components/nav-items.ts` — Feature 2
- `dashboard/src/components/AddLifeEventModal.tsx` — Feature 3
- `dashboard/src/components/ChatPanel.tsx` — Feature 4 (verificar prop)
- `dashboard/src/components/InsightsPanel.tsx` — Feature 5 (verificar filtros)
- `dashboard/src/lib/api.ts` — Feature 3 (nova função API)
- `dashboard/src/app/patient-home/page.tsx` — Features 1, 2
- `dashboard/src/app/patients/[id]/page.tsx` — Features 3, 4, 5

### Novos
- `dashboard/src/components/ReportSymptomModal.tsx` — Feature 1
- `dashboard/src/components/PatientMedicationsSection.tsx` — Feature 2

---

## Fora de Escopo
- Profissional relatar sintomas para o paciente
- Notificações push para novos eventos de vida
- Chat com múltiplos profissionais simultaneamente
- Insights gerados por IA (já existem, apenas expor)
