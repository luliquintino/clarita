# Diagnósticos + Laudos — Design

## Contexto

Duas melhorias no prontuário do paciente:
1. Badges de diagnóstico mais legíveis (código + nome + distinção visual clara entre suspeita e confirmado)
2. Laudos: paciente faz upload, apenas psicólogo/psiquiatra pode visualizar e baixar — restrição enforçada no backend

---

## Decisões de Design

| Questão | Decisão |
|---|---|
| Laudos vs Exames | Dentro da aba Exames existente, tipo `'laudo'` com `is_professional_only = true` |
| Quem faz upload | Paciente — profissional só visualiza/baixa |
| Restrição de acesso | Backend: filtra na listagem e bloqueia download com 403 para pacientes |
| Badges | Nome completo + código + ícone visual distinto por certeza |

---

## Seção 1: Banco de Dados

### Migration `007_patient_exams_professional_only.sql`

```sql
ALTER TABLE patient_exams
  ADD COLUMN IF NOT EXISTS is_professional_only BOOLEAN NOT NULL DEFAULT false;
```

Aplicada via `psql "$DATABASE_URL" -f backend/db/migrations/007_patient_exams_professional_only.sql`.

### Lógica de negócio

- `POST /api/exams` — se `exam_type === 'laudo'`, INSERT com `is_professional_only = true`
- `GET /api/exams/:patientId` — se `req.user.role === 'patient'`, filtra `WHERE is_professional_only = false`
- `GET /api/exams/:id/file` (download) — se `is_professional_only = true` e `req.user.role === 'patient'`, retorna 403

---

## Seção 2: Badges de Diagnóstico

### Confirmado (laudado)
- Ícone `CheckCircle` (verde sólido)
- Cor: `bg-green-600 text-white`
- Texto: `F41.1 · Transtorno de ansiedade`
- Tooltip: nome CID completo + data

### Suspeita (só profissionais)
- Ícone `HelpCircle` (âmbar)
- Cor: `bg-amber-50 border-2 border-amber-400 text-amber-700`
- Texto: `? F41.1 · Ansiedade generalizada`
- Tooltip: nome completo + "Suspeita clínica"
- Visível apenas quando `userRole !== 'patient'`

### Localização
Permanecem no cabeçalho do perfil. Nenhuma nova aba.

---

## Seção 3: Laudos na Aba Exames

### Upload (paciente — sem mudança de fluxo)
- Adicionar opção `'laudo'` no select de tipo no formulário de exames
- Backend automaticamente seta `is_professional_only = true` para `exam_type === 'laudo'`
- Paciente vê confirmação de envio mas não vê o arquivo na listagem

### Visualização (profissional)
- Laudos aparecem com badge `🔒 Laudo` distinto
- Botão "Baixar" disponível
- Filtrado do backend — paciente não recebe esses registros na API

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `backend/db/migrations/007_patient_exams_professional_only.sql` | NOVO — migration |
| `backend/src/routes/exams.js` | Filtro na listagem + 403 no download + auto-set is_professional_only |
| `dashboard/src/app/patients/[id]/page.tsx` | Redesenho dos badges de diagnóstico |
| `dashboard/src/components/PatientExamsPanel.tsx` | Mostrar badge 🔒 para laudos + ocultar laudos para paciente |
| `dashboard/src/app/patient-home/page.tsx` | Adicionar 'laudo' como opção de tipo no upload de exames |

---

## Verificação

1. `cd dashboard && npx tsc --noEmit` → zero erros
2. Upload como paciente com tipo "Laudo" → confirmação exibida → arquivo não aparece na lista do paciente
3. Login como psicólogo/psiquiatra → aba Exames → laudo aparece com badge `🔒 Laudo` → download funciona
4. Login como paciente → tenta GET `/api/exams/:id/file` de um laudo → 403
5. Badges no cabeçalho: confirmados em verde com nome, suspeitas em âmbar com `?`
