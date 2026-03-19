# CID-11 Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar diagnósticos formais vinculados ao prontuário, melhorar busca com linguagem natural + filtros + histórico, e adicionar fluxo clínico pós-diagnóstico (nota + testes + conduta).

**Architecture:** Iterativa — evolui `DiagnosticBrowserPanel.tsx` existente, cria tabela `patient_diagnoses` no banco, adiciona endpoints em `patients.js` e `icd11.js`, e atualiza header de paciente com badges diferenciados.

**Tech Stack:** Express.js (backend), Next.js 14 App Router + TypeScript + Tailwind CSS (frontend), PostgreSQL (Neon), JWT auth

---

## Task 1: Migração do banco — tabela `patient_diagnoses`

**Files:**
- Create: `backend/db/migration_patient_diagnoses.sql`
- Modify: `backend/src/server.js` (ou arquivo de inicialização — verificar onde outras migrations são rodadas)

**Step 1: Criar arquivo de migração**

```sql
-- backend/db/migration_patient_diagnoses.sql
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS diagnosis_id UUID;

CREATE TABLE IF NOT EXISTS patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  icd_code VARCHAR(20) NOT NULL,
  icd_name TEXT NOT NULL,
  certainty VARCHAR(20) NOT NULL DEFAULT 'suspected'
    CHECK (certainty IN ('suspected', 'confirmed')),
  diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  clinical_note_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient
  ON patient_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_professional
  ON patient_diagnoses(professional_id);
```

**Step 2: Executar no banco**

```bash
cd backend
# Checar se há script de migração já configurado:
cat package.json | grep -A5 '"scripts"'
# Se não houver, executar via psql (variável DATABASE_URL está no .env):
node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const fs = require('fs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.query(fs.readFileSync('db/migration_patient_diagnoses.sql', 'utf8'))
    .then(() => { console.log('Migration OK'); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
"
```

Expected: `Migration OK`

**Step 3: Verificar tabela criada**

```bash
node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \\'patient_diagnoses\\' ORDER BY ordinal_position')
    .then(r => { r.rows.forEach(c => console.log(c.column_name, c.data_type)); process.exit(0); });
"
```

Expected: lista com id, patient_id, professional_id, icd_code, icd_name, certainty, diagnosis_date, notes, clinical_note_id, is_active, created_at

**Step 4: Commit**

```bash
git add backend/db/migration_patient_diagnoses.sql
git commit -m "feat: add patient_diagnoses migration with certainty, notes, clinical_note_id"
```

---

## Task 2: Backend — endpoints de diagnóstico em `patients.js`

**Files:**
- Modify: `backend/src/routes/patients.js` (append antes do `module.exports`)

**Step 1: Adicionar endpoint POST /api/patients/:id/diagnoses**

Logo antes do final de `patients.js` (antes do `module.exports`), adicionar:

```javascript
// ---------------------------------------------------------------------------
// POST /api/patients/:id/diagnoses
// Register a formal diagnosis for a patient (professionals only)
// ---------------------------------------------------------------------------
router.post(
  '/:id/diagnoses',
  requireRole('psychologist', 'psychiatrist'),
  requirePatientAccess,
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const { icd_code, icd_name, certainty = 'suspected', diagnosis_date, notes } = req.body;

      if (!icd_code || !icd_name) {
        return res.status(400).json({ error: 'icd_code e icd_name são obrigatórios' });
      }
      if (!['suspected', 'confirmed'].includes(certainty)) {
        return res.status(400).json({ error: 'certainty deve ser suspected ou confirmed' });
      }

      const result = await query(
        `INSERT INTO patient_diagnoses
           (patient_id, professional_id, icd_code, icd_name, certainty, diagnosis_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          patientId,
          req.user.id,
          icd_code,
          icd_name,
          certainty,
          diagnosis_date || new Date().toISOString().split('T')[0],
          notes || null,
        ]
      );

      res.status(201).json({ diagnosis: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/patients/:id/diagnoses
// List all diagnoses for a patient
// Filtering by role: patients only see confirmed; professionals see all
// ---------------------------------------------------------------------------
router.get(
  '/:id/diagnoses',
  requirePatientAccess,
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const role = req.user.role;

      let sql = `
        SELECT pd.*,
               u.first_name AS professional_first_name,
               u.last_name AS professional_last_name,
               u.role AS professional_role,
               mr.title AS clinical_note_title
        FROM patient_diagnoses pd
        JOIN users u ON u.id = pd.professional_id
        LEFT JOIN medical_records mr ON mr.id = pd.clinical_note_id
        WHERE pd.patient_id = $1 AND pd.is_active = true
      `;
      const params = [patientId];

      // Patients only see confirmed diagnoses
      if (role === 'patient') {
        sql += ` AND pd.certainty = 'confirmed'`;
      }

      sql += ` ORDER BY pd.diagnosis_date DESC, pd.created_at DESC`;

      const result = await query(sql, params);
      res.json({ diagnoses: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/patients/:id/diagnoses/:diagId
// Update a diagnosis (certainty, notes) — only the professional who created it
// ---------------------------------------------------------------------------
router.patch(
  '/:id/diagnoses/:diagId',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { diagId } = req.params;
      const { certainty, notes, clinical_note_id, is_active } = req.body;

      // Only the creating professional can update
      const existing = await query(
        `SELECT * FROM patient_diagnoses WHERE id = $1`,
        [diagId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Diagnóstico não encontrado' });
      }
      if (existing.rows[0].professional_id !== req.user.id) {
        return res.status(403).json({ error: 'Somente o profissional que criou pode editar' });
      }

      const updates = [];
      const params = [];

      if (certainty !== undefined) {
        if (!['suspected', 'confirmed'].includes(certainty)) {
          return res.status(400).json({ error: 'certainty deve ser suspected ou confirmed' });
        }
        params.push(certainty);
        updates.push(`certainty = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (clinical_note_id !== undefined) {
        params.push(clinical_note_id);
        updates.push(`clinical_note_id = $${params.length}`);
      }
      if (is_active !== undefined) {
        params.push(is_active);
        updates.push(`is_active = $${params.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      params.push(diagId);
      const result = await query(
        `UPDATE patient_diagnoses SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );

      res.json({ diagnosis: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);
```

**Step 2: Verificar sintaxe**

```bash
cd backend
node -e "require('./src/routes/patients.js'); console.log('OK');"
```

Expected: `OK` sem erros

**Step 3: Commit**

```bash
git add backend/src/routes/patients.js
git commit -m "feat: add POST/GET/PATCH patient diagnoses endpoints"
```

---

## Task 3: Backend — endpoint `GET /api/icd11/recent`

**Files:**
- Modify: `backend/src/routes/icd11.js`

**Step 1: Adicionar rota `/recent` ANTES da rota `/:code`** (ordem importa no Express)

Logo após o bloco `GET /api/icd11/categories` e antes de `GET /api/icd11/:code`:

```javascript
// ---------------------------------------------------------------------------
// GET /api/icd11/recent
// Returns up to 8 most-used ICD codes by the authenticated professional
// ---------------------------------------------------------------------------
router.get('/recent', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pd.icd_code, pd.icd_name,
              COUNT(*) AS usage_count,
              MAX(pd.created_at) AS last_used_at
       FROM patient_diagnoses pd
       WHERE pd.professional_id = $1 AND pd.is_active = true
       GROUP BY pd.icd_code, pd.icd_name
       ORDER BY usage_count DESC, last_used_at DESC
       LIMIT 8`,
      [req.user.id]
    );
    res.json({ recent: result.rows });
  } catch (err) {
    next(err);
  }
});
```

**Step 2: Verificar sintaxe**

```bash
cd backend
node -e "require('./src/routes/icd11.js'); console.log('OK');"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add backend/src/routes/icd11.js
git commit -m "feat: add GET /icd11/recent endpoint for professional usage history"
```

---

## Task 4: Frontend — tipos e API client (`api.ts`)

**Files:**
- Modify: `dashboard/src/lib/api.ts`

**Step 1: Adicionar interface `PatientDiagnosis`**

Após as interfaces existentes (ex: após `MedicalRecord`), adicionar:

```typescript
export interface PatientDiagnosis {
  id: string;
  patient_id: string;
  professional_id: string;
  icd_code: string;
  icd_name: string;
  certainty: 'suspected' | 'confirmed';
  diagnosis_date: string;
  notes: string | null;
  clinical_note_id: string | null;
  is_active: boolean;
  created_at: string;
  professional_first_name?: string;
  professional_last_name?: string;
  professional_role?: string;
  clinical_note_title?: string | null;
}

export interface RecentIcd {
  icd_code: string;
  icd_name: string;
  usage_count: number;
  last_used_at: string;
}
```

**Step 2: Adicionar `diagnosesApi` object**

Após `medicalRecordsApi`, adicionar:

```typescript
export const diagnosesApi = {
  list: (patientId: string) =>
    request<{ diagnoses: PatientDiagnosis[] }>(`/patients/${patientId}/diagnoses`),

  create: (patientId: string, data: {
    icd_code: string;
    icd_name: string;
    certainty: 'suspected' | 'confirmed';
    diagnosis_date?: string;
    notes?: string;
  }) =>
    request<{ diagnosis: PatientDiagnosis }>(`/patients/${patientId}/diagnoses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (patientId: string, diagId: string, data: {
    certainty?: 'suspected' | 'confirmed';
    notes?: string;
    clinical_note_id?: string;
    is_active?: boolean;
  }) =>
    request<{ diagnosis: PatientDiagnosis }>(`/patients/${patientId}/diagnoses/${diagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const icd11Api = {
  list: (params?: { category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return request<{ disorders: IcdDisorder[] }>(`/icd11${q ? `?${q}` : ''}`);
  },
  categories: () => request<{ categories: string[] }>('/icd11/categories'),
  detail: (code: string) => request<{ disorder: IcdDisorder }>(`/icd11/${code}`),
  tests: (code: string) => request<{ suggested_tests: unknown[]; disorder: IcdDisorder }>(`/icd11/${code}/tests`),
  suggestBySymptoms: (symptoms: string[]) =>
    request<{ suggestions: IcdDisorder[] }>('/icd11/suggest-by-symptoms', {
      method: 'POST',
      body: JSON.stringify({ symptoms }),
    }),
  recent: () => request<{ recent: RecentIcd[] }>('/icd11/recent'),
};
```

> **Nota:** `IcdDisorder` já deve existir no arquivo. Se não existir, adicionar:
> ```typescript
> export interface IcdDisorder {
>   id: string;
>   icd_code: string;
>   disorder_name: string;
>   description: string | null;
>   symptom_keywords: string[];
>   category: string | null;
>   created_at: string;
> }
> ```

**Step 3: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 4: Commit**

```bash
git add dashboard/src/lib/api.ts
git commit -m "feat: add PatientDiagnosis types and diagnosesApi/icd11Api client methods"
```

---

## Task 5: Frontend — Header do paciente com badges de diagnóstico

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

**Step 1: Adicionar estado de diagnósticos**

No topo do componente, junto com os outros `useState`, adicionar:

```typescript
const [diagnoses, setDiagnoses] = useState<PatientDiagnosis[]>([]);
```

Importar `PatientDiagnosis` e `diagnosesApi` de `@/lib/api`.

**Step 2: Carregar diagnósticos junto com o paciente**

Na função `loadPatient` (ou `fetchPatient`), após carregar o paciente, adicionar:

```typescript
try {
  const diagData = await diagnosesApi.list(id);
  setDiagnoses(diagData.diagnoses);
} catch {
  // silent
}
```

**Step 3: Adicionar badges de diagnóstico no header**

No bloco onde as condições aparecem no header (buscar por `self_reported_conditions` ou `conditions`), adicionar logo após os badges existentes:

```tsx
{/* Diagnósticos formais — confirmados (visíveis para todos) */}
{diagnoses
  .filter(d => d.certainty === 'confirmed' && d.is_active)
  .map(d => (
    <span
      key={d.id}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white"
      title={d.icd_name}
    >
      {d.icd_code}
    </span>
  ))
}

{/* Diagnósticos suspeitos — apenas para profissionais */}
{userRole !== 'patient' && diagnoses
  .filter(d => d.certainty === 'suspected' && d.is_active)
  .map(d => (
    <span
      key={d.id}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border-2 border-dashed border-indigo-400 text-indigo-700 bg-indigo-50"
      title={`Suspeita: ${d.icd_name}`}
    >
      ? {d.icd_code}
    </span>
  ))
}
```

**Step 4: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 5: Commit**

```bash
git add dashboard/src/app/patients/[id]/page.tsx
git commit -m "feat: show formal diagnosis badges in patient header (confirmed + suspected)"
```

---

## Task 6: Frontend — DiagnosticBrowserPanel — busca melhorada + carrossel

**Files:**
- Modify: `dashboard/src/components/DiagnosticBrowserPanel.tsx`

Este é o maior task. Dividido em sub-etapas.

### 6a — Carrossel "Usados recentemente"

**Step 1: Adicionar estado para CIDs recentes**

No componente, adicionar:

```typescript
const [recentIcds, setRecentIcds] = useState<RecentIcd[]>([]);
```

Importar `RecentIcd` e `icd11Api` de `@/lib/api`.

**Step 2: Carregar no useEffect inicial**

```typescript
useEffect(() => {
  icd11Api.recent().then(d => setRecentIcds(d.recent)).catch(() => {});
}, []);
```

**Step 3: Renderizar carrossel no topo da view 'browse'**

Logo acima da barra de busca, na view de browse:

```tsx
{recentIcds.length > 0 && (
  <div className="space-y-1.5">
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Usados recentemente</p>
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {recentIcds.map(r => (
        <button
          key={r.icd_code}
          onClick={() => handleSelectByCode(r.icd_code)}
          className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-1.5 text-left transition-colors"
        >
          <p className="text-xs font-bold text-indigo-700">{r.icd_code}</p>
          <p className="text-xs text-gray-500 max-w-[120px] truncate">{r.icd_name}</p>
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 4: Adicionar função `handleSelectByCode`**

```typescript
async function handleSelectByCode(code: string) {
  try {
    const data = await icd11Api.detail(code);
    setSelectedDisorder(data.disorder);
    setView('disorder-detail');
  } catch {
    // silent
  }
}
```

### 6b — Busca unificada inteligente

**Step 1: Modificar lógica de busca**

A busca atual é um input que filtra `disorders`. Substituir a lógica para:

```typescript
const [searchMode, setSearchMode] = useState<'text' | 'symptom'>('text');
const [symptomResults, setSymptomResults] = useState<IcdDisorder[]>([]);
const [isSearching, setIsSearching] = useState(false);

// No handler de busca (debounced):
async function handleSearch(value: string) {
  setSearchTerm(value);

  // Detect if it's a symptom phrase (more than 2 words, no CID pattern)
  const isCidCode = /^[A-Z0-9]{2,6}$/.test(value.trim());
  const isPhrase = value.trim().split(' ').length > 2 && !isCidCode;

  if (isPhrase && value.trim().length > 10) {
    setSearchMode('symptom');
    setIsSearching(true);
    try {
      // Extract keywords (remove common PT stopwords)
      const stopwords = ['de', 'da', 'do', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'com', 'que', 'em', 'para', 'por'];
      const keywords = value.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));
      const data = await icd11Api.suggestBySymptoms(keywords);
      setSymptomResults(data.suggestions);
    } catch {
      setSymptomResults([]);
    } finally {
      setIsSearching(false);
    }
  } else {
    setSearchMode('text');
    setSymptomResults([]);
  }
}
```

**Step 2: Adicionar badge nos resultados de busca**

Nos resultados da lista de disorders, adicionar badge quando o CID já foi diagnosticado no paciente atual:

```tsx
{/* Dentro do map de disorders */}
{diagnoses.some(d => d.icd_code === disorder.icd_code && d.is_active) && (
  <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
    Diagnosticado
  </span>
)}
```

> **Nota:** `diagnoses` deve ser recebido como prop: `diagnosesForPatient?: PatientDiagnosis[]`. A prop é passada pelo `patients/[id]/page.tsx` que já carrega diagnósticos no Task 5.

**Step 3: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 4: Commit**

```bash
git add dashboard/src/components/DiagnosticBrowserPanel.tsx
git commit -m "feat: add recent ICD carousel and unified smart search to DiagnosticBrowserPanel"
```

---

## Task 7: Frontend — DiagnosticBrowserPanel — fluxo de diagnóstico guiado

**Files:**
- Modify: `dashboard/src/components/DiagnosticBrowserPanel.tsx`

### 7a — Mini-ficha de registro inline

**Step 1: Adicionar estados da mini-ficha**

```typescript
const [showDiagnoseForm, setShowDiagnoseForm] = useState(false);
const [diagCertainty, setDiagCertainty] = useState<'suspected' | 'confirmed'>('suspected');
const [diagDate, setDiagDate] = useState(new Date().toISOString().split('T')[0]);
const [diagNotes, setDiagNotes] = useState('');
const [diagSaving, setDiagSaving] = useState(false);
const [savedDiagnosis, setSavedDiagnosis] = useState<PatientDiagnosis | null>(null);
```

**Step 2: Adicionar prop e função de registro**

Adicionar à interface de props:
```typescript
interface DiagnosticBrowserPanelProps {
  patientId: string;
  // ... existentes ...
  diagnosesForPatient?: PatientDiagnosis[];
  onDiagnosisCreated?: (diagnosis: PatientDiagnosis) => void;
}
```

Adicionar função:
```typescript
async function handleRegisterDiagnosis() {
  if (!selectedDisorder || !patientId) return;
  setDiagSaving(true);
  try {
    const data = await diagnosesApi.create(patientId, {
      icd_code: selectedDisorder.icd_code,
      icd_name: selectedDisorder.disorder_name,
      certainty: diagCertainty,
      diagnosis_date: diagDate,
      notes: diagNotes || undefined,
    });
    setSavedDiagnosis(data.diagnosis);
    setShowDiagnoseForm(false);
    onDiagnosisCreated?.(data.diagnosis);
    // Refresh recent ICDs
    icd11Api.recent().then(d => setRecentIcds(d.recent)).catch(() => {});
  } catch {
    // silent
  } finally {
    setDiagSaving(false);
  }
}
```

**Step 3: Renderizar mini-ficha na view `disorder-detail`**

Na tela de detalhe do transtorno, substituir o botão de diagnóstico existente (se houver) ou adicionar após a seção de sintomas:

```tsx
{/* Botão ou mini-ficha */}
{!showDiagnoseForm && !savedDiagnosis && (
  <button
    onClick={() => setShowDiagnoseForm(true)}
    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
  >
    <Stethoscope className="w-4 h-4" />
    Diagnosticar este Paciente
  </button>
)}

{showDiagnoseForm && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 animate-fade-in">
    <p className="text-sm font-semibold text-indigo-800">
      Registrar Diagnóstico — {selectedDisorder?.icd_code}
    </p>

    <div>
      <label className="text-xs text-gray-500 mb-1 block">Data do diagnóstico</label>
      <input
        type="date"
        value={diagDate}
        onChange={e => setDiagDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>

    <div>
      <label className="text-xs text-gray-500 mb-1 block">Grau de certeza</label>
      <div className="flex gap-4">
        {(['suspected', 'confirmed'] as const).map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="certainty"
              value={opt}
              checked={diagCertainty === opt}
              onChange={() => setDiagCertainty(opt)}
              className="accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              {opt === 'suspected' ? 'Suspeita' : 'Confirmado'}
            </span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <label className="text-xs text-gray-500 mb-1 block">Observação (opcional)</label>
      <textarea
        value={diagNotes}
        onChange={e => setDiagNotes(e.target.value)}
        placeholder="Observações clínicas..."
        rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => setShowDiagnoseForm(false)}
        className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={handleRegisterDiagnosis}
        disabled={diagSaving}
        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
      >
        {diagSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Registrar e continuar →
      </button>
    </div>
  </div>
)}
```

### 7b — Painel de acompanhamento clínico pós-diagnóstico

**Step 4: Renderizar painel "Próximos passos" após salvar**

```tsx
{savedDiagnosis && (
  <div className="space-y-3 animate-fade-in">
    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        Diagnóstico {savedDiagnosis.certainty === 'confirmed' ? 'confirmado' : 'suspeita'} registrado!
      </span>
    </div>

    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Próximos passos</p>

    {/* Bloco 1: Nota clínica */}
    <NextStepBlock title="Nota clínica" icon={<FileText className="w-4 h-4" />}>
      <ClinicalNoteBlock
        patientId={patientId}
        diagnosis={savedDiagnosis}
        onNoteCreated={(noteId) => {
          // Link note to diagnosis
          diagnosesApi.update(patientId, savedDiagnosis.id, { clinical_note_id: noteId });
        }}
      />
    </NextStepBlock>

    {/* Bloco 2: Testes sugeridos */}
    <NextStepBlock title="Testes sugeridos" icon={<ClipboardList className="w-4 h-4" />}>
      {/* Reutilizar a lista de testes que já existe na view disorder-detail */}
      <SuggestedTestsBlock
        icdCode={savedDiagnosis.icd_code}
        patientId={patientId}
        onAssignTest={onAssignTest}
      />
    </NextStepBlock>

    {/* Bloco 3: Conduta */}
    <NextStepBlock title="Conduta / Tratamento" icon={<Brain className="w-4 h-4" />}>
      <ConductBlock
        diagnosisId={savedDiagnosis.id}
        patientId={patientId}
        initialNotes={savedDiagnosis.notes || ''}
      />
    </NextStepBlock>
  </div>
)}
```

> **Nota de implementação:** Para manter o componente gerenciável, implementar `NextStepBlock` como um sub-componente colapsável simples inline (não criar arquivo separado). `ClinicalNoteBlock`, `SuggestedTestsBlock` e `ConductBlock` também podem ser funções inline dentro do mesmo arquivo, ou componentes extraídos se o arquivo ultrapassar ~600 linhas.

**Step 5: Implementar `NextStepBlock` (colapsável simples)**

```typescript
function NextStepBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon} {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
```

**Step 6: Implementar `ClinicalNoteBlock`**

```typescript
function ClinicalNoteBlock({ patientId, diagnosis, onNoteCreated }: {
  patientId: string;
  diagnosis: PatientDiagnosis;
  onNoteCreated: (noteId: string) => void;
}) {
  const [title, setTitle] = useState(`Diagnóstico: ${diagnosis.icd_name}`);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const data = await medicalRecordsApi.create({
        patient_id: patientId,
        title,
        content,
        record_date: diagnosis.diagnosis_date,
        category: 'Diagnóstico',
        tags: [diagnosis.icd_code],
      });
      onNoteCreated(data.record.id);
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Nota criada no prontuário.</p>;
  }

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Conteúdo da nota clínica..."
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar nota no prontuário
      </button>
    </div>
  );
}
```

**Step 7: Implementar `ConductBlock`**

```typescript
function ConductBlock({ diagnosisId, patientId, initialNotes }: {
  diagnosisId: string;
  patientId: string;
  initialNotes: string;
}) {
  const [conduct, setConduct] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await diagnosesApi.update(patientId, diagnosisId, { notes: conduct });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={conduct}
        onChange={e => { setConduct(e.target.value); setSaved(false); }}
        placeholder="Descreva o plano terapêutico e conduta..."
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
      <button
        onClick={handleSave}
        disabled={saving || !conduct.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Salvo!' : 'Salvar conduta'}
      </button>
    </div>
  );
}
```

**Step 8: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 9: Commit**

```bash
git add dashboard/src/components/DiagnosticBrowserPanel.tsx
git commit -m "feat: add guided diagnosis flow with post-diagnosis clinical panel"
```

---

## Task 8: Frontend — Histórico de diagnósticos no DiagnosticBrowserPanel

**Files:**
- Modify: `dashboard/src/components/DiagnosticBrowserPanel.tsx`

**Step 1: Adicionar estado de histórico**

```typescript
const [diagnoses, setDiagnoses] = useState<PatientDiagnosis[]>([]);
const [loadingDiagnoses, setLoadingDiagnoses] = useState(false);
```

**Step 2: Carregar histórico quando `patientId` estiver disponível**

```typescript
useEffect(() => {
  if (!patientId) return;
  setLoadingDiagnoses(true);
  diagnosesApi.list(patientId)
    .then(d => setDiagnoses(d.diagnoses))
    .catch(() => {})
    .finally(() => setLoadingDiagnoses(false));
}, [patientId]);
```

Também recarregar quando um novo diagnóstico for criado (no `onDiagnosisCreated` callback):
```typescript
// No handler onDiagnosisCreated:
onDiagnosisCreated={(diagnosis) => {
  setDiagnoses(prev => [diagnosis, ...prev]);
}}
```

**Step 3: Renderizar seção "Histórico de Diagnósticos" na view 'browse'**

Logo abaixo do carrossel de recentes e acima da lista de transtornos:

```tsx
{diagnoses.length > 0 && (
  <div className="space-y-2">
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
      Diagnósticos deste Paciente
    </p>
    <div className="space-y-1.5">
      {diagnoses.map(d => (
        <div
          key={d.id}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                d.certainty === 'confirmed'
                  ? 'bg-indigo-600 text-white'
                  : 'border-2 border-dashed border-indigo-400 text-indigo-700'
              }`}
            >
              {d.certainty === 'suspected' ? '? ' : ''}{d.icd_code}
            </span>
            <span className="text-sm text-gray-700 truncate">{d.icd_name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {new Date(d.diagnosis_date).toLocaleDateString('pt-BR')}
            </span>
            {d.certainty === 'suspected' && d.professional_id === currentProfessionalId && (
              <button
                onClick={() => handleUpgradeCertainty(d)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                title="Confirmar diagnóstico"
              >
                Confirmar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 4: Adicionar prop `currentProfessionalId` e função `handleUpgradeCertainty`**

Adicionar à interface de props:
```typescript
currentProfessionalId?: string;
```

Adicionar função:
```typescript
async function handleUpgradeCertainty(diagnosis: PatientDiagnosis) {
  try {
    const data = await diagnosesApi.update(patientId, diagnosis.id, { certainty: 'confirmed' });
    setDiagnoses(prev => prev.map(d => d.id === diagnosis.id ? data.diagnosis : d));
  } catch {
    // silent
  }
}
```

**Step 5: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 6: Commit**

```bash
git add dashboard/src/components/DiagnosticBrowserPanel.tsx
git commit -m "feat: add diagnosis history section with confirm action in DiagnosticBrowserPanel"
```

---

## Task 9: Conectar props em `patients/[id]/page.tsx`

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

**Step 1: Passar props para `DiagnosticBrowserPanel`**

Encontrar o uso de `<DiagnosticBrowserPanel>` e adicionar as novas props:

```tsx
<DiagnosticBrowserPanel
  patientId={patient.id}
  diagnosesForPatient={diagnoses}
  currentProfessionalId={currentUserId}
  onDiagnosisCreated={(diag) => {
    setDiagnoses(prev => [diag, ...prev]);
  }}
  onAssignTest={handleAssignTest} // já existente
/>
```

**Step 2: Verificar TypeScript**

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros

**Step 3: Commit**

```bash
git add dashboard/src/app/patients/[id]/page.tsx
git commit -m "feat: wire diagnosis state and props between patient page and DiagnosticBrowserPanel"
```

---

## Task 10: Verificação manual completa

**Step 1: Iniciar servidores**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd dashboard && npm run dev
```

**Step 2: Verificar fluxo completo**

- [ ] Login como psiquiatra → abrir paciente → aba CID-11
- [ ] Buscar "depressão" → resultados aparecem
- [ ] Digitar frase longa ("paciente tem dificuldade de concentração e impulsividade") → resultado muda para sugestão por sintoma
- [ ] Clicar em um transtorno → tela de detalhe aparece
- [ ] Clicar "Diagnosticar este Paciente" → mini-ficha abre
- [ ] Selecionar "Suspeita" → clicar "Registrar e continuar →"
- [ ] Painel "Próximos passos" aparece com 3 blocos colapsáveis
- [ ] Expandir "Nota clínica" → editar e salvar → mensagem de sucesso
- [ ] Expandir "Testes sugeridos" → atribuir um teste
- [ ] Expandir "Conduta" → escrever e salvar
- [ ] Header do paciente mostra badge `? 6A00` com borda dashed
- [ ] Login como psicólogo → mesmo paciente → badge de suspeita visível
- [ ] Login como paciente → badge de suspeita NÃO visível; badge confirmado visível
- [ ] Voltar como psiquiatra → aba CID-11 → carrossel "Usados recentemente" aparece
- [ ] Histórico de diagnósticos aparece na view de browse

**Step 3: Verificar TypeScript final**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: zero erros

**Step 4: Commit final**

```bash
git add -A
git commit -m "chore: CID-11 improvements complete — formal diagnoses, smart search, clinical workflow"
```
