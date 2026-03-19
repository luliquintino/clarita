# CID-11: Diagnósticos Formais + Busca Melhorada + Fluxo Clínico Completo

**Data:** 2026-03-18
**Autor:** Brainstorming session
**Status:** Aprovado

---

## Contexto

A feature CID-11 atual (`DiagnosticBrowserPanel.tsx`) permite buscar transtornos por nome/código/descrição, ver detalhes, sugerir por sintomas, e atribuir testes ao paciente. Lacunas identificadas:

1. Não há como registrar formalmente um diagnóstico no prontuário do paciente
2. A busca por sintomas é superficial (keywords simples)
3. Após encontrar o CID certo, não há fluxo clínico integrado

---

## Abordagem Escolhida: Iterativa (Opção 1)

Evoluir o `DiagnosticBrowserPanel` existente sem refatoração grande. Criar tabela `patient_diagnoses` para estrutura de dados própria. Manter toda a UX dentro da mesma aba CID-11.

---

## Seção 1: Modelo de Dados

### Nova tabela `patient_diagnoses`

```sql
CREATE TABLE patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id),
  icd_code VARCHAR(20) NOT NULL,
  icd_name TEXT NOT NULL,
  certainty VARCHAR(20) NOT NULL CHECK (certainty IN ('suspected', 'confirmed')),
  diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  clinical_note_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Novos endpoints backend

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/patients/:id/diagnoses` | Registrar diagnóstico |
| GET | `/api/patients/:id/diagnoses` | Listar histórico de diagnósticos |
| PATCH | `/api/patients/:id/diagnoses/:diagId` | Atualizar (ex: suspeita → confirmado) |
| GET | `/api/icd11/recent` | CIDs mais usados pelo profissional logado |

### Arquivo de migração

`backend/db/migration_patient_diagnoses.sql`

---

## Seção 2: Busca Melhorada

### Busca unificada inteligente

Campo único que detecta automaticamente o tipo de input:
- **Código CID** (ex: `6A00`) → busca direta por código
- **Nome/keyword** (ex: "depressão") → busca por nome/descrição
- **Frase de sintoma** (ex: "dificuldade de concentração e impulsividade") → rota `suggest-by-symptoms` com extração de keywords (stopwords PT removidas)

Debounce 300ms. Resultados em tempo real.

### Filtros avançados

- Categoria (já existe, manter)
- Faixa etária: `Infância / Adulto / Idoso` → campo `age_group` adicionado à tabela `icd11_disorders`
- Badge inline no resultado indicando se aquele CID já foi diagnosticado neste paciente

### Histórico de CIDs mais usados

Carrossel horizontal no topo da aba com até 8 cards dos CIDs que o profissional logado mais diagnosticou (query em `patient_diagnoses GROUP BY icd_code ORDER BY COUNT DESC`). Visível apenas quando há histórico. Clique leva direto ao detalhe do transtorno.

---

## Seção 3: Fluxo de Diagnóstico Guiado

### Mini-ficha de registro (inline no detalhe do transtorno)

Botão **"Diagnosticar este Paciente"** (indigo sólido) na tela de detalhe abre uma ficha inline:

```
┌─ Registrar Diagnóstico ─────────────────────┐
│ CID: 6A00 · Transtorno de atenção           │
│                                              │
│ Data do diagnóstico: [hoje]                  │
│ Grau de certeza: ○ Suspeita  ● Confirmado    │
│ Observação (opcional): [textarea]            │
│                                              │
│ [Cancelar]    [Registrar e continuar →]      │
└──────────────────────────────────────────────┘
```

### Painel de acompanhamento clínico (pós-registro)

Seção "Próximos passos" com 3 blocos colapsáveis:

1. **Nota clínica** — textarea pré-preenchida com título `"Diagnóstico: [Nome CID]"` e data atual. Salvar cria registro em `medical_records` com `clinical_note_id` linkado ao diagnóstico.

2. **Testes sugeridos** — lista dos testes mapeados via `icd_test_mapping` (já existente), com checkbox para atribuir ao paciente com um clique.

3. **Conduta/tratamento** — campo de texto livre para plano terapêutico. Salva na coluna `notes` do diagnóstico.

### Header do paciente — badges de diagnóstico

| Tipo | Visual |
|------|--------|
| Diagnóstico confirmado | Badge indigo sólido com código CID (ex: `6A00`) |
| Diagnóstico suspeita | Badge indigo com borda dashed e ícone `?` |
| Self-reported (atual) | Badge roxo (mantido como está) |

**Visibilidade:**
- Profissionais veem todos (confirmados + suspeitas)
- Paciente vê apenas self-reported e confirmados (sem suspeitas)

### Seção "Histórico de Diagnósticos" na aba CID-11

Lista cronológica com:
- Nome e código do CID
- Data do diagnóstico
- Grau de certeza (badge)
- Profissional que diagnosticou
- Link para nota clínica (se existir)
- Botão para mudar suspeita → confirmado

---

## Arquivos a Criar/Modificar

### Backend
- `backend/db/migration_patient_diagnoses.sql` — nova tabela
- `backend/src/routes/patients.js` — novos endpoints POST/GET/PATCH diagnoses
- `backend/src/routes/icd11.js` — endpoint `/recent`

### Frontend
- `dashboard/src/lib/api.ts` — novos métodos `diagnosesApi.*`
- `dashboard/src/components/DiagnosticBrowserPanel.tsx` — busca melhorada + fluxo de diagnóstico + histórico
- `dashboard/src/app/patients/[id]/page.tsx` — badges no header + carregar `patient_diagnoses`

---

## Critérios de Verificação

1. `npx tsc --noEmit` → zero erros
2. Psiquiatra/psicólogo consegue registrar diagnóstico (suspeita e confirmado)
3. Diagnóstico aparece no header com badge correto
4. Paciente logado não vê suspeitas, vê confirmados
5. Busca por frase de sintoma retorna resultados relevantes
6. Carrossel "usados recentemente" aparece após primeiro diagnóstico
7. Nota clínica criada via painel aparece no prontuário do paciente
8. Testes sugeridos são atribuíveis com um clique
