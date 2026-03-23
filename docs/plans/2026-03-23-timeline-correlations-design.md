# Design: Correlações Automáticas na Linha do Tempo

**Data:** 2026-03-23
**Status:** Aprovado

---

## Objetivo

Permitir que o profissional veja automaticamente como eventos de vida importantes do paciente correlacionam com mudanças nos registros emocionais — sem precisar cruzar dados manualmente.

Exemplo: "Em maio a paciente foi demitida (life_event) e naquele período a ansiedade subiu de 4.0 para 7.8."

---

## Decisões de Design

- **Automático** (não manual): o sistema computa as correlações
- **Frontend-only**: usa os `entries` já carregados no componente `Timeline`, sem novo endpoint
- **Janela configurável**: profissional escolhe 7d / 14d / 30d
- **Threshold mínimo**: ≥ 2 registros emocionais em cada lado (antes e depois) para gerar correlação

---

## Lógica de Correlação

Função pura `computeCorrelations(entries: TimelineEntry[], windowDays: number)`:

1. Filtra `life_event` entries
2. Para cada evento, coleta `emotional_log` entries dentro de `[event_date - window, event_date + window]`
3. Divide em "antes" e "depois" da data do evento
4. Calcula média de `mood_score`, `anxiety_score`, `energy_score` para cada lado
5. Só gera correlação se `before.count >= 2` e `after.count >= 2`

**Tipo de output por correlação:**
```typescript
interface EventCorrelation {
  event: TimelineEntry;
  before: { mood: number; anxiety: number; energy: number; count: number };
  after:  { mood: number; anxiety: number; energy: number; count: number };
  delta:  { mood: number; anxiety: number; energy: number };
}
```

Os dados de `mood_score`, `anxiety_score`, `energy_score` estão em `entry.metadata` para entradas do tipo `emotional_log`.

---

## Visual

Nova seção "Correlações com Momentos de Vida" abaixo da lista de eventos na Timeline, dentro do mesmo `.card`.

### Seletor de janela
```
[7 dias]  [14 dias]  [30 dias]
```
Estado local no componente, default: 14 dias.

### Card por correlação
```
┌──────────────────────────────────────────────────┐
│ ⭐ Demissão do emprego     [trabalho]  15 mai    │
│                                                  │
│           Antes    Depois   Δ                    │
│ Humor      6.2  →   3.1   ↓ −3.1                │
│ Ansiedade  4.0  →   7.8   ↑↑ +3.8  (destaque)  │
│ Energia    5.8  →   3.9   ↓ −1.9                │
│                                                  │
│ 4 registros antes · 5 registros depois           │
└──────────────────────────────────────────────────┘
```

### Regras visuais para o delta
- |Δ| ≥ 2.0: texto **negrito vermelho** (piora) ou **negrito verde** (melhora)
- |Δ| entre 0.5 e 1.9: seta simples ↑/↓ com cor
- |Δ| < 0.5: "→ estável" em cinza

### Estado vazio
"Nenhuma correlação encontrada para este período. Adicione check-ins emocionais próximos aos eventos de vida."

---

## Arquivos a Modificar

### Modificado
- `dashboard/src/components/Timeline.tsx`
  - Adicionar função pura `computeCorrelations`
  - Adicionar estado `correlationWindow: 7 | 14 | 30` (default 14)
  - Adicionar seção `CorrelationsSection` (componente interno)
  - Adicionar componente interno `CorrelationCard`

### Não modificado
- Backend: nenhuma mudança
- `api.ts`: nenhuma mudança
- Outros componentes: nenhuma mudança

---

## Fora de Escopo
- Anotações clínicas manuais sobre correlações
- Correlação com sintomas, medicamentos ou avaliações (só emotional_log)
- Análise estatística de significância (só delta simples)
- Persistência das correlações calculadas
