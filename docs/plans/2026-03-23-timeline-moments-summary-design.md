# Design: Linha do Tempo Híbrida, Momentos do Paciente e Resumo IA com Período

**Data:** 2026-03-23
**Status:** Aprovado

---

## 1. Modal de Momentos Importantes — `patient-home`

### Objetivo
Permitir que o paciente registre momentos importantes da vida diretamente na tela principal, com os eventos aparecendo na linha do tempo do profissional.

### UX
- Botão `+ Momento` no header da `patient-home`
- Abre modal/drawer com formulário inline:
  - **Título** (texto livre, obrigatório)
  - **Categoria** (select): relacionamento / trabalho / saúde / família / conquista / perda / outro
  - **Impacto** (select): positivo / negativo / neutro
  - **Data** (date picker, default = hoje)
  - **Descrição** (textarea, opcional)
  - Botão **Salvar**
- Após salvar: modal fecha, timeline atualiza

### Backend
- `POST /api/life-events` já existe e funciona — sem mudança
- `GET /api/life-events` já retorna eventos do paciente autenticado — sem mudança

### Frontend
- Novo componente: `AddLifeEventModal.tsx`
- Integração em `patient-home/page.tsx`: estado `showModal` + handler de submit
- `lifeEventsApi` já existe em `api.ts` — sem mudança de API layer

---

## 2. Linha do Tempo Híbrida — `Timeline.tsx`

### Objetivo
Manter o scatter chart para visualizar padrões temporais, e adicionar abaixo uma lista cronológica de eventos do período selecionado.

### Layout
```
[Scatter chart — existente, sem mudança]
─────────────────────────────────
[Lista de eventos — NOVO]
  ● [ícone] Título                    [badge categoria]
            d de mês · HH:mm
            Descrição truncada (2 linhas, expandível)
```

### Comportamento
- Lista usa os mesmos `entries` já passados ao componente — sem novo fetch
- Reage ao mesmo filtro de categorias e seletor de período (7d/30d/90d) do gráfico
- Ordenação: mais recente primeiro
- Eventos com severity `critical`/`high`: borda esquerda vermelha/laranja
- Clique no card expande para descrição completa
- Estado vazio: "Nenhum evento neste período"

### Implementação
- Modificação de `Timeline.tsx`: adicionar bloco `EventList` abaixo do `ResponsiveContainer`
- Componente interno `EventListItem` para cada card
- Nenhuma mudança de props, estado externo ou fetch

---

## 3. Resumo IA com Seletor de Período — `AISummaryCard.tsx`

### Objetivo
Permitir que o profissional gere resumos para a última semana ou último mês.

### UX
Substituir o botão único "Gerar novo" por dois botões:

```
[Última semana]   [Último mês]
```

- Botão clicado entra em estado `generating` (spinner), o outro fica `disabled`
- Dispara `summariesApi.generate(patientId, days)` com `period_days: 7` ou `period_days: 30`
- Resumo gerado aparece no topo da lista com badge de período correto

### Backend
- `POST /api/summaries/:patientId/generate` já aceita `period_days` no body — sem mudança

### Frontend
- Modificação de `AISummaryCard.tsx`: substituir botão único por dois botões
- `summariesApi.generate` já aceita `days` parâmetro — confirmar que passa `period_days` no body
- Prop `onGenerate` muda assinatura: `onGenerate?: (days: 7 | 30) => void`

---

## Arquivos a Modificar/Criar

### Novo
- `dashboard/src/components/AddLifeEventModal.tsx`

### Modificado
- `dashboard/src/app/patient-home/page.tsx` — adicionar botão + modal
- `dashboard/src/components/Timeline.tsx` — adicionar lista de eventos abaixo do gráfico
- `dashboard/src/components/AISummaryCard.tsx` — trocar botão por dois botões de período
- `dashboard/src/lib/api.ts` — ajustar assinatura de `onGenerate` se necessário

### Backend
- Nenhuma mudança necessária

---

## Fora de Escopo
- Nova página `/patient-home/life-events`
- Edição/exclusão de momentos
- Push notifications para o profissional sobre novos momentos
