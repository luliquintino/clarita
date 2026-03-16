# SaaS Launch Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evoluir o Clarita de projeto local para produto com usuários reais — email transacional, deploy em produção, LGPD básico, onboarding wizard e PWA com push notifications.

**Architecture:** O backend Express existente recebe um serviço de email centralizado (Resend), integração de uploads em nuvem (Cloudinary), endpoints LGPD e um cron scheduler. O frontend Next.js recebe PWA manifest + service worker + componente de onboarding.

**Tech Stack:** Resend SDK (`resend`), Cloudinary SDK (`cloudinary`), node-cron, Web Push API (`web-push`), Next.js PWA (manifest.json + sw.js manual), Neon (PostgreSQL serverless), Vercel (dashboard), Railway (backend).

---

## Fase 1: Infraestrutura de Lançamento

---

### Task 1: Migrar emailService para Resend

**Context:** `backend/src/services/emailService.js` já existe com nodemailer. Vamos substituir por Resend que não precisa de SMTP configurado — só uma chave de API.

**Files:**
- Modify: `backend/src/services/emailService.js`
- Modify: `backend/package.json` (install resend, remover nodemailer)

**Step 1: Instalar Resend e remover nodemailer**

```bash
cd backend
npm install resend
npm uninstall nodemailer
```

**Step 2: Reescrever emailService.js**

Substituir TODO o conteúdo de `backend/src/services/emailService.js`:

```javascript
'use strict';

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'CLARITA <noreply@clarita.app>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

// Envia ou loga no console em dev
async function sendEmail({ to, subject, html }) {
  if (resend) {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(`Resend error: ${error.message}`);
  } else {
    console.log('\n=== EMAIL (dev) ===');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log('==================\n');
  }
}

// ─── Templates ─────────────────────────────────────────────────────────────

function wrapTemplate(content) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#16a34a;font-size:26px;margin:0;">CLARITA</h1>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Plataforma de Saúde Mental</p>
      </div>
      <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
        ${content}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
        CLARITA · Plataforma de Saúde Mental
      </p>
    </div>
  `;
}

// ─── Funções públicas ───────────────────────────────────────────────────────

async function sendPasswordResetEmail(email, resetToken, userName) {
  const url = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'CLARITA — Redefinição de Senha',
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá, ${userName}!</h2>
      <p style="color:#4b5563;line-height:1.6;">Recebemos uma solicitação para redefinir sua senha.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${url}" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Redefinir Senha
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Este link expira em 1 hora. Ignore este email se não foi você.</p>
    `),
  });
}

async function sendWelcomeEmail(email, firstName, role) {
  const roleLabel = role === 'patient' ? 'paciente' : role === 'psychologist' ? 'psicólogo(a)' : 'psiquiatra';
  await sendEmail({
    to: email,
    subject: 'Bem-vindo(a) ao CLARITA!',
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá, ${firstName}! 👋</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Sua conta como <strong>${roleLabel}</strong> foi criada com sucesso.<br>
        Acesse a plataforma e comece a acompanhar sua saúde mental.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/login" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Acessar o Clarita
        </a>
      </div>
    `),
  });
}

async function sendPatientInviteEmail(email, professionalName, patientName, inviteUrl) {
  await sendEmail({
    to: email,
    subject: `${professionalName} te convidou para o CLARITA`,
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá${patientName ? ', ' + patientName : ''}!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        <strong>${professionalName}</strong> te convidou para acompanhar sua saúde mental pelo CLARITA.<br>
        Crie sua conta gratuitamente e comece a registrar seus check-ins diários.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Aceitar Convite
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Se não conhece este profissional, ignore este email.</p>
    `),
  });
}

async function sendCriticalAlertEmail(professionalEmail, professionalName, patientName, alertMessage) {
  await sendEmail({
    to: professionalEmail,
    subject: `⚠️ Alerta clínico — ${patientName}`,
    html: wrapTemplate(`
      <h2 style="color:#dc2626;margin:0 0 12px;">⚠️ Alerta Clínico</h2>
      <p style="color:#4b5563;line-height:1.6;">Olá, <strong>${professionalName}</strong>.</p>
      <p style="color:#4b5563;line-height:1.6;">
        O sistema detectou um alerta para o paciente <strong>${patientName}</strong>:
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="color:#991b1b;margin:0;">${alertMessage}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/patients" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Ver Paciente
        </a>
      </div>
    `),
  });
}

async function sendNoCheckinReminderEmail(professionalEmail, professionalName, patients) {
  const rows = patients
    .map(p => `<tr>
      <td style="padding:8px 12px;color:#1f2937;">${p.name}</td>
      <td style="padding:8px 12px;color:#6b7280;">${p.days_since} dias sem check-in</td>
    </tr>`)
    .join('');

  await sendEmail({
    to: professionalEmail,
    subject: `Pacientes sem check-in — ${patients.length} paciente(s)`,
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Pacientes sem check-in recente</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Olá, <strong>${professionalName}</strong>. Os seguintes pacientes não fizeram check-in nos últimos 3 dias:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#374151;font-weight:600;">Paciente</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;font-weight:600;">Última atividade</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/patients" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Ver Pacientes
        </a>
      </div>
    `),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPatientInviteEmail,
  sendCriticalAlertEmail,
  sendNoCheckinReminderEmail,
};
```

**Step 3: Adicionar RESEND_API_KEY ao .env**

Adicionar em `backend/.env` (obter chave em resend.com):
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=CLARITA <noreply@clarita.app>
FRONTEND_URL=http://localhost:3002
```

**Step 4: Verificar que o servidor sobe sem erros**

```bash
cd backend && npm run dev
```

Expected: `CLARITA API running on port 3005`

**Step 5: Commit**

```bash
git add backend/src/services/emailService.js backend/package.json backend/package-lock.json
git commit -m "feat: migrate emailService to Resend, add 4 email templates"
```

---

### Task 2: Disparar e-mails de boas-vindas e convite de paciente

**Context:** `auth.js` já chama `sendPasswordResetEmail`. Vamos adicionar welcome email no register. `invitations.js` cria registros no banco mas não envia email.

**Files:**
- Modify: `backend/src/routes/auth.js`
- Modify: `backend/src/routes/invitations.js`

**Step 1: Adicionar welcome email em auth.js**

No `backend/src/routes/auth.js`, adicionar import no topo:
```javascript
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');
```

Localizar o bloco após o INSERT do cadastro (após `RETURNING id, email...`). Após a linha `res.json({...})` (ou antes dela, não bloquear a resposta), adicionar:

```javascript
// Dispara welcome email sem bloquear a resposta
sendWelcomeEmail(email, first_name, role).catch(err =>
  console.error('Welcome email failed:', err.message)
);
```

**Step 2: Adicionar invite email em invitations.js**

Abrir `backend/src/routes/invitations.js`. Localizar o `require` no topo e adicionar:
```javascript
const { sendPatientInviteEmail } = require('../services/emailService');
```

Localizar o endpoint `POST /` (criar convite). Após o INSERT que cria o `care_relationship`, buscar o email do paciente convidado e disparar:

```javascript
// Buscar email do paciente para enviar convite
const patientResult = await query(
  'SELECT u.email, u.first_name, prof.first_name AS prof_first, prof.last_name AS prof_last FROM users u, users prof WHERE u.id = $1 AND prof.id = $2',
  [patientId, req.user.id]
);
if (patientResult.rows.length > 0) {
  const { email, first_name, prof_first, prof_last } = patientResult.rows[0];
  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/login`;
  sendPatientInviteEmail(
    email,
    `${prof_first} ${prof_last}`,
    first_name,
    inviteUrl
  ).catch(err => console.error('Invite email failed:', err.message));
}
```

**Step 3: Testar manualmente**

```bash
# Em dev (sem RESEND_API_KEY), confirmar que logs aparecem no terminal do backend
# Criar um convite pelo dashboard e verificar:
# === EMAIL (dev) ===
# Para: paciente@teste.com
# Assunto: Dr(a). X te convidou para o CLARITA
# ==================
```

**Step 4: Commit**

```bash
git add backend/src/routes/auth.js backend/src/routes/invitations.js
git commit -m "feat: send welcome email on register, patient invite email on invitation"
```

---

### Task 3: E-mail de alerta crítico + cron job sem check-in

**Files:**
- Modify: `backend/src/routes/alerts.js`
- Create: `backend/src/jobs/noCheckinJob.js`
- Modify: `backend/src/index.js`

**Step 1: Instalar node-cron**

```bash
cd backend && npm install node-cron
```

**Step 2: Adicionar email de alerta crítico em alerts.js**

No `backend/src/routes/alerts.js`, adicionar import:
```javascript
const { sendCriticalAlertEmail } = require('../services/emailService');
```

Localizar onde os alertas de tipo `critical` são criados (INSERT na tabela `alerts`). Após o INSERT, disparar email para o profissional responsável:

```javascript
// Para alertas críticos, notificar profissional por email
if (alertType === 'critical' || severity === 'high') {
  const profResult = await query(
    `SELECT u.email, u.first_name, u.last_name
     FROM care_relationships cr
     JOIN users u ON u.id = cr.professional_id
     WHERE cr.patient_id = $1 AND cr.status = 'active'`,
    [patientId]
  );
  const patientResult = await query(
    'SELECT first_name, last_name FROM users WHERE id = $1',
    [patientId]
  );
  if (profResult.rows.length > 0 && patientResult.rows.length > 0) {
    const prof = profResult.rows[0];
    const patient = patientResult.rows[0];
    sendCriticalAlertEmail(
      prof.email,
      `${prof.first_name} ${prof.last_name}`,
      `${patient.first_name} ${patient.last_name}`,
      message
    ).catch(err => console.error('Alert email failed:', err.message));
  }
}
```

**Step 3: Criar noCheckinJob.js**

Criar `backend/src/jobs/noCheckinJob.js`:

```javascript
'use strict';

const cron = require('node-cron');
const { query } = require('../db');
const { sendNoCheckinReminderEmail } = require('../services/emailService');

// Roda todo dia às 09:00 (horário de Brasília = UTC-3, então às 12:00 UTC)
function startNoCheckinJob() {
  cron.schedule('0 12 * * *', async () => {
    console.log('[noCheckinJob] Verificando pacientes sem check-in...');
    try {
      // Buscar profissionais com pacientes ativos sem check-in nos últimos 3 dias
      const result = await query(`
        SELECT
          u_prof.id AS prof_id,
          u_prof.email AS prof_email,
          u_prof.first_name AS prof_first,
          u_prof.last_name AS prof_last,
          u_pat.first_name || ' ' || u_pat.last_name AS patient_name,
          EXTRACT(DAY FROM NOW() - MAX(el.created_at))::int AS days_since
        FROM care_relationships cr
        JOIN users u_prof ON u_prof.id = cr.professional_id
        JOIN users u_pat ON u_pat.id = cr.patient_id
        LEFT JOIN emotional_logs el ON el.patient_id = cr.patient_id
        WHERE cr.status = 'active'
        GROUP BY cr.id, u_prof.id, u_prof.email, u_prof.first_name, u_prof.last_name, u_pat.first_name, u_pat.last_name
        HAVING MAX(el.created_at) IS NULL OR MAX(el.created_at) < NOW() - INTERVAL '3 days'
      `);

      if (result.rows.length === 0) return;

      // Agrupar por profissional
      const byProf = {};
      for (const row of result.rows) {
        if (!byProf[row.prof_id]) {
          byProf[row.prof_id] = {
            email: row.prof_email,
            name: `${row.prof_first} ${row.prof_last}`,
            patients: [],
          };
        }
        byProf[row.prof_id].patients.push({
          name: row.patient_name,
          days_since: row.days_since ?? '3+',
        });
      }

      for (const prof of Object.values(byProf)) {
        await sendNoCheckinReminderEmail(prof.email, prof.name, prof.patients)
          .catch(err => console.error('noCheckin email failed:', err.message));
      }

      console.log(`[noCheckinJob] ${Object.keys(byProf).length} profissional(is) notificado(s).`);
    } catch (err) {
      console.error('[noCheckinJob] Erro:', err.message);
    }
  });

  console.log('[noCheckinJob] Agendado para 09:00 BRT diariamente.');
}

module.exports = { startNoCheckinJob };
```

**Step 4: Registrar job em index.js**

No `backend/src/index.js`, adicionar após os requires existentes:
```javascript
const { startNoCheckinJob } = require('./jobs/noCheckinJob');
```

E antes do `app.listen(...)`:
```javascript
startNoCheckinJob();
```

**Step 5: Verificar que o servidor sobe sem erros**

```bash
cd backend && npm run dev
# Expected: "[noCheckinJob] Agendado para 09:00 BRT diariamente."
```

**Step 6: Commit**

```bash
git add backend/src/routes/alerts.js backend/src/jobs/noCheckinJob.js backend/src/index.js backend/package.json backend/package-lock.json
git commit -m "feat: critical alert email, daily no-checkin reminder cron job"
```

---

### Task 4: Setup banco em nuvem (Neon) + variáveis de produção

**Context:** Hoje o banco roda local. Para produção, usamos Neon (PostgreSQL serverless, free tier 0.5GB).

**Files:**
- Create: `backend/.env.production` (não commitar — adicionar ao .gitignore)
- Create: `backend/docs/deploy-env.md` (documentar quais vars são necessárias)

**Step 1: Criar conta e banco no Neon**

1. Acessar https://neon.tech → criar conta gratuita
2. Criar projeto "clarita-prod"
3. Copiar a connection string: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/clarita?sslmode=require`

**Step 2: Rodar migrations no Neon**

```bash
# Executar cada migration no banco de produção
psql "postgresql://user:pass@ep-xxx...?sslmode=require" -f backend/db/schema.sql
psql "postgresql://user:pass@ep-xxx...?sslmode=require" -f backend/db/migration_clinical_modules.sql
psql "postgresql://user:pass@ep-xxx...?sslmode=require" -f backend/db/migration_conditions.sql
psql "postgresql://user:pass@ep-xxx...?sslmode=require" -f backend/db/migration_icd11_satepsi.sql
```

**Step 3: Adicionar consent_accepted_at (LGPD — adiantamos a migration)**

```sql
-- Rodar no banco local E no Neon
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
```

Salvar em `backend/db/migration_lgpd.sql`:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
```

**Step 4: Criar backend/.env.production**

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/clarita?sslmode=require
JWT_SECRET=<gerar com: openssl rand -hex 64>
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=CLARITA <noreply@clarita.app>
FRONTEND_URL=https://clarita.vercel.app
```

Adicionar ao `backend/.gitignore`:
```
.env.production
```

**Step 5: Commit da migration**

```bash
git add backend/db/migration_lgpd.sql
git commit -m "feat: add migration_lgpd.sql with consent_accepted_at column"
```

---

### Task 5: Migrar uploads de arquivo para Cloudinary

**Context:** Hoje `multer` salva arquivos em disco local (`uploads/`). Em produção (Railway), o disco é efêmero — arquivos se perdem no próximo deploy. Cloudinary tem free tier de 25GB.

**Files:**
- Modify: `backend/src/middleware/upload.js`
- Modify: `backend/package.json`

**Step 1: Instalar Cloudinary e multer-storage-cloudinary**

```bash
cd backend && npm install cloudinary multer-storage-cloudinary
```

**Step 2: Atualizar upload.js**

Substituir o conteúdo de `backend/src/middleware/upload.js`:

```javascript
'use strict';

const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Em produção, usa Cloudinary. Em dev, usa disco local (comportamento atual).
const isProduction = process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME;

if (isProduction) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de arquivo não permitido. Aceitos: PDF, JPEG, PNG.'), false);
};

function makeUpload(folder) {
  const storage = isProduction
    ? new CloudinaryStorage({
        cloudinary,
        params: { folder: `clarita/${folder}`, allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'] },
      })
    : require('multer').diskStorage({
        destination: (_req, _file, cb) => {
          const path = require('path');
          const fs = require('fs');
          const dir = path.join(__dirname, `../../uploads/${folder}`);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const { v4: uuidv4 } = require('uuid');
          const path = require('path');
          cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
        },
      });

  return multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('file');
}

const uploadDocument = makeUpload('documents');
const uploadExam = makeUpload('exams');
const uploadChatFile = makeUpload('chat');

module.exports = { uploadDocument, uploadExam, uploadChatFile };
```

**Step 3: Adicionar vars Cloudinary ao .env.production**

```
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
```

(Criar conta em cloudinary.com → Dashboard → Copy credentials)

**Step 4: Verificar que uploads funcionam em dev (disco local)**

```bash
cd backend && npm run dev
# Testar upload de arquivo pelo dashboard — deve funcionar igual ao antes
```

**Step 5: Commit**

```bash
git add backend/src/middleware/upload.js backend/package.json backend/package-lock.json
git commit -m "feat: migrate uploads to Cloudinary in production, keep disk storage in dev"
```

---

### Task 6: Deploy — Vercel (dashboard) + Railway (backend)

**Context:** Dashboard Next.js → Vercel (deploy automático via GitHub). Backend Express → Railway.

**Files:**
- Create: `backend/Procfile` (Railway usa isso para saber como iniciar)
- Modify: `dashboard/next.config.ts` ou `.js` (verificar configuração)

**Step 1: Criar Procfile no backend**

Criar `backend/Procfile`:
```
web: npm start
```

**Step 2: Deploy do backend no Railway**

1. Acessar https://railway.app → New Project → Deploy from GitHub repo
2. Selecionar o repo `clarita` → apontar para o diretório `/backend`
3. Em "Variables", adicionar todas as vars de `.env.production`
4. Railway detecta automaticamente o `package.json` e roda `npm start`
5. Copiar a URL gerada (ex: `https://clarita-backend.railway.app`)

**Step 3: Deploy do dashboard no Vercel**

```bash
# Instalar Vercel CLI se não tiver
npm i -g vercel

cd dashboard
vercel --prod
# Seguir o wizard: selecionar o projeto, confirmar configurações
```

Ou via GitHub: Vercel Dashboard → New Project → Import `clarita` repo → Root Directory: `dashboard`

Adicionar variável de ambiente no Vercel:
```
NEXT_PUBLIC_API_URL=https://clarita-backend.railway.app/api
```

**Step 4: Verificar deploy**

```bash
# Testar backend em produção
curl https://clarita-backend.railway.app/api/auth/me
# Expected: {"error":"Autenticação necessária"}

# Acessar dashboard em produção e fazer login
```

**Step 5: Commit do Procfile**

```bash
git add backend/Procfile
git commit -m "chore: add Procfile for Railway deployment"
```

---

### Task 7: LGPD — consentimento no cadastro

**Context:** A migration `consent_accepted_at` já foi aplicada na Task 4. Aqui adicionamos o campo no formulário de cadastro e salvamos no banco.

**Files:**
- Modify: `backend/src/routes/auth.js` (salvar consent_accepted_at no INSERT)
- Modify: `dashboard/src/app/register/page.tsx` (adicionar checkbox)

**Step 1: Salvar consent no backend**

Em `backend/src/routes/auth.js`, no endpoint POST `/register`, atualizar o INSERT para incluir `consent_accepted_at`:

```javascript
// Receber consent do body
const { email, password, role, first_name, last_name, phone, date_of_birth, gender, consent } = req.body;

// Validar que consent foi dado
if (!consent) {
  return res.status(400).json({ error: 'É necessário aceitar os Termos de Uso e Política de Privacidade.' });
}

// No INSERT, adicionar coluna:
`INSERT INTO users (email, password_hash, role, first_name, last_name, phone, display_id, consent_accepted_at)
 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
 RETURNING ...`
```

**Step 2: Adicionar checkbox no formulário de cadastro**

Em `dashboard/src/app/register/page.tsx`, antes do botão de submit:

```tsx
{/* Consentimento LGPD */}
<div className="flex items-start gap-3">
  <input
    type="checkbox"
    id="consent"
    required
    className="mt-1 h-4 w-4 rounded border-gray-300 text-clarita-green-600 focus:ring-clarita-green-500"
    {...register('consent', { required: 'Você precisa aceitar os termos para continuar.' })}
  />
  <label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed">
    Li e aceito os{' '}
    <a href="/terms" target="_blank" className="text-clarita-green-600 hover:underline font-medium">
      Termos de Uso
    </a>{' '}
    e a{' '}
    <a href="/privacy" target="_blank" className="text-clarita-green-600 hover:underline font-medium">
      Política de Privacidade
    </a>
    . Concordo com o tratamento dos meus dados conforme a LGPD.
  </label>
</div>
{errors.consent && <p className="text-red-500 text-sm">{errors.consent.message}</p>}
```

**Step 3: Criar páginas de Termos e Privacidade (placeholder)**

Criar `dashboard/src/app/terms/page.tsx`:
```tsx
export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Termos de Uso</h1>
      <p className="text-gray-600">
        [Conteúdo a ser redigido pelo responsável legal da Clarita.]
      </p>
    </main>
  );
}
```

Criar `dashboard/src/app/privacy/page.tsx` com a mesma estrutura, título "Política de Privacidade".

**Step 4: TypeScript check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: zero erros.

**Step 5: Commit**

```bash
git add backend/src/routes/auth.js dashboard/src/app/register/page.tsx dashboard/src/app/terms/page.tsx dashboard/src/app/privacy/page.tsx
git commit -m "feat: LGPD consent checkbox on registration, placeholder terms/privacy pages"
```

---

### Task 8: LGPD — exportar e excluir dados

**Files:**
- Create: `backend/src/routes/me.js` (novo arquivo com GET /export e DELETE /)
- Modify: `backend/src/index.js` (registrar rota)
- Modify: `dashboard/src/app/profile/page.tsx` (adicionar botões)

**Step 1: Criar backend/src/routes/me.js**

```javascript
'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/me/export — baixar todos os dados do usuário
router.get('/export', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [user, emotionalLogs, journals, medications, goals, assessments] = await Promise.all([
      query('SELECT id, email, first_name, last_name, role, phone, created_at, consent_accepted_at FROM users WHERE id = $1', [userId]),
      query('SELECT * FROM emotional_logs WHERE patient_id = $1 ORDER BY created_at DESC', [userId]),
      query('SELECT * FROM journal_entries WHERE patient_id = $1 ORDER BY created_at DESC', [userId]),
      query('SELECT * FROM patient_medications WHERE patient_id = $1', [userId]),
      query('SELECT * FROM goals WHERE patient_id = $1', [userId]),
      query('SELECT * FROM assessments WHERE patient_id = $1 ORDER BY created_at DESC', [userId]),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: user.rows[0],
      emotional_logs: emotionalLogs.rows,
      journal_entries: journals.rows,
      medications: medications.rows,
      goals: goals.rows,
      assessments: assessments.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="clarita-meus-dados-${userId}.json"`);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/me — anonimizar e desativar conta
router.delete('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Anonimizar dados pessoais (mantém logs para integridade do relacionamento terapêutico)
    await query(`
      UPDATE users SET
        email = 'deleted_' || id || '@clarita.deleted',
        first_name = 'Conta',
        last_name = 'Removida',
        phone = NULL,
        password_hash = '',
        is_active = false,
        avatar_url = NULL
      WHERE id = $1
    `, [userId]);

    // Remover dados sensíveis diretos
    await query('DELETE FROM journal_entries WHERE patient_id = $1', [userId]);
    await query('UPDATE emotional_logs SET notes = NULL WHERE patient_id = $1', [userId]);

    res.json({ message: 'Conta removida com sucesso. Seus dados pessoais foram anonimizados.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**Step 2: Registrar rota em index.js**

Em `backend/src/index.js`, adicionar:
```javascript
const meRoutes = require('./routes/me');
app.use('/api/me', meRoutes);
```

**Step 3: Adicionar botões na página de perfil**

Em `dashboard/src/app/profile/page.tsx`, na seção de configurações, adicionar:

```tsx
{/* Seção LGPD */}
<section className="card p-6 border border-red-100">
  <h3 className="font-semibold text-gray-800 mb-1">Dados e Privacidade</h3>
  <p className="text-sm text-gray-500 mb-4">Gerencie seus dados conforme a LGPD.</p>
  <div className="flex flex-col sm:flex-row gap-3">
    <a
      href="/api/me/export"
      className="btn-secondary text-sm text-center"
    >
      ⬇️ Exportar meus dados
    </a>
    <button
      type="button"
      onClick={() => setShowDeleteConfirm(true)}
      className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
    >
      🗑️ Excluir minha conta
    </button>
  </div>

  {showDeleteConfirm && (
    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
      <p className="text-sm text-red-700 mb-3">
        Esta ação é permanente. Seus dados pessoais serão anonimizados. Tem certeza?
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={handleDeleteAccount} className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Confirmar exclusão
        </button>
        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  )}
</section>
```

Adicionar o estado e handler:
```tsx
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDeleteAccount = async () => {
  try {
    await fetch('/api/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    logout();
    router.push('/login');
  } catch {
    alert('Erro ao excluir conta. Tente novamente.');
  }
};
```

**Step 4: TypeScript check**

```bash
cd dashboard && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add backend/src/routes/me.js backend/src/index.js dashboard/src/app/profile/page.tsx
git commit -m "feat: LGPD data export and account deletion endpoints + profile UI"
```

---

### Task 9: Onboarding Wizard

**Context:** O campo `onboarding_completed` já existe em `onboarding_profiles`. O wizard aparece apenas no primeiro login do profissional.

**Files:**
- Create: `dashboard/src/components/OnboardingWizard.tsx`
- Modify: `dashboard/src/app/layout.tsx` ou o componente raiz do profissional

**Step 1: Criar OnboardingWizard.tsx**

Criar `dashboard/src/components/OnboardingWizard.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { X, ChevronRight, User, Briefcase, UserPlus, CheckCircle } from 'lucide-react';

interface OnboardingWizardProps {
  userName: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const totalSteps = 4;

  const handleInvite = async () => {
    if (!inviteEmail) return;
    // Chama o endpoint de convite existente
    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ patient_email: inviteEmail, relationship_type: 'therapy' }),
      });
      setInviteSent(true);
    } catch {
      // Se falhar, não bloquear o onboarding
      setInviteSent(true);
    }
  };

  const handleComplete = async () => {
    // Marcar onboarding como completo
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).catch(() => {});
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Passo {step} de {totalSteps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-clarita-green-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div>
              <div className="w-12 h-12 bg-clarita-green-100 rounded-xl flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-clarita-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo(a), {userName}! 👋</h2>
              <p className="text-gray-500 mb-6">
                Você está a poucos passos de ter seus primeiros pacientes monitorados no Clarita.
                Vamos configurar seu perfil rapidamente.
              </p>
              <button onClick={() => setStep(2)} className="btn-primary w-full">
                Começar <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Como você vai usar o Clarita?</h2>
              <p className="text-gray-500 mb-4">Isso ajusta as funcionalidades disponíveis para você.</p>
              <div className="space-y-3 mb-6">
                {['Psicólogo(a)', 'Psiquiatra', 'Ambos'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-clarita-green-400 hover:bg-clarita-green-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Convide seu primeiro paciente</h2>
              <p className="text-gray-500 mb-4">
                Ele receberá um e-mail com o link para criar a conta e começar os check-ins.
              </p>
              {!inviteSent ? (
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="email@paciente.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="input w-full"
                  />
                  <button onClick={handleInvite} disabled={!inviteEmail} className="btn-primary w-full disabled:opacity-50">
                    Enviar convite
                  </button>
                  <button type="button" onClick={() => setStep(4)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                    Pular por agora
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-clarita-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-4">Convite enviado para {inviteEmail}!</p>
                  <button onClick={() => setStep(4)} className="btn-primary">
                    Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-clarita-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-clarita-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Tudo pronto! 🎉</h2>
              <p className="text-gray-500 mb-6">
                Seu paciente receberá o convite por e-mail. Quando ele criar a conta e fizer o primeiro check-in,
                você verá os dados no painel.
              </p>
              <button onClick={handleComplete} className="btn-primary w-full">
                Ir para o painel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Criar endpoint POST /api/onboarding/complete**

Em `backend/src/routes/auth.js` (ou criar `backend/src/routes/onboarding.js`), adicionar:

```javascript
// POST /api/onboarding/complete
router.post('/onboarding/complete', authenticate, async (req, res, next) => {
  try {
    await query(
      `INSERT INTO onboarding_profiles (user_id, onboarding_completed, completed_at)
       VALUES ($1, true, NOW())
       ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, completed_at = NOW()`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
```

**Step 3: Exibir wizard quando onboarding não está completo**

No componente de layout do profissional (provavelmente `dashboard/src/app/patients/page.tsx` ou o layout principal), buscar o status de onboarding:

```tsx
// No componente raiz do profissional, adicionar:
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
  // Verificar se é profissional e se onboarding não foi completado
  if (user?.role !== 'patient') {
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (!data.onboarding_completed) setShowOnboarding(true);
      })
      .catch(() => {});
  }
}, [user]);

// No JSX:
{showOnboarding && (
  <OnboardingWizard
    userName={user?.first_name || 'profissional'}
    onComplete={() => setShowOnboarding(false)}
  />
)}
```

**Step 4: TypeScript check**

```bash
cd dashboard && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add dashboard/src/components/OnboardingWizard.tsx backend/src/routes/auth.js
git commit -m "feat: onboarding wizard for new professional accounts"
```

---

## Fase 2: Engajamento de Pacientes

---

### Task 10: PWA — manifest.json + service worker

**Files:**
- Create: `dashboard/public/manifest.json`
- Create: `dashboard/public/sw.js`
- Modify: `dashboard/src/app/layout.tsx`

**Step 1: Criar manifest.json**

Criar `dashboard/public/manifest.json`:

```json
{
  "name": "CLARITA — Saúde Mental",
  "short_name": "Clarita",
  "description": "Monitore sua saúde mental com acompanhamento profissional",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f0fdf4",
  "theme_color": "#22c55e",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

(Gerar os ícones em 192x192 e 512x512 a partir do logo existente e salvar em `dashboard/public/`)

**Step 2: Criar service worker**

Criar `dashboard/public/sw.js`:

```javascript
const CACHE_NAME = 'clarita-v1';
const STATIC_ASSETS = ['/', '/login', '/patient-home'];

// Instalar: cache das páginas principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Não interceptar chamadas de API
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CLARITA', {
      body: data.body || 'Você tem uma notificação.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'clarita',
      data: { url: data.url || '/patient-home' },
    })
  );
});

// Clique na notificação → abrir app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data?.url || '/patient-home';
      const existing = clientList.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
```

**Step 3: Registrar manifest e SW em layout.tsx**

Em `dashboard/src/app/layout.tsx`, adicionar no `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#22c55e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Clarita" />
```

E em um `useEffect` no componente raiz ou em um `ClientLayout` wrapper:

```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err =>
      console.error('SW registration failed:', err)
    );
  }
}, []);
```

**Step 4: Verificar que o PWA funciona**

```bash
cd dashboard && npm run build && npm start
# Abrir http://localhost:3002 no Chrome
# DevTools → Application → Manifest → verificar que aparece
# DevTools → Application → Service Workers → verificar "Activated and running"
```

**Step 5: Commit**

```bash
git add dashboard/public/manifest.json dashboard/public/sw.js dashboard/src/app/layout.tsx
git commit -m "feat: PWA manifest and service worker with offline cache and push support"
```

---

### Task 11: Push notifications — backend

**Files:**
- Create: `backend/db/migration_push_subscriptions.sql`
- Create: `backend/src/routes/pushSubscriptions.js`
- Create: `backend/src/services/pushService.js`
- Modify: `backend/src/index.js`
- Modify: `backend/package.json`

**Step 1: Instalar web-push**

```bash
cd backend && npm install web-push
```

**Step 2: Gerar chaves VAPID**

```bash
cd backend && node -e "const webpush=require('web-push'); const keys=webpush.generateVAPIDKeys(); console.log(JSON.stringify(keys,null,2));"
```

Copiar as chaves geradas para `.env` e `.env.production`:
```
VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_EMAIL=mailto:admin@clarita.app
```

**Step 3: Criar migration**

Criar `backend/db/migration_push_subscriptions.sql`:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- um dispositivo por usuário (simplificado)
);

-- Horário de lembrete configurado pelo profissional por paciente (opcional)
ALTER TABLE care_relationships
  ADD COLUMN IF NOT EXISTS checkin_reminder_hour INT DEFAULT 20;  -- 20:00 padrão
```

Rodar no banco local:
```bash
psql "$DATABASE_URL" -f backend/db/migration_push_subscriptions.sql
```

**Step 4: Criar pushService.js**

Criar `backend/src/services/pushService.js`:

```javascript
'use strict';

const webpush = require('web-push');
const { query } = require('../db');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@clarita.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId, { title, body, url = '/patient-home', tag = 'clarita' }) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log(`[push] (dev) → user ${userId}: ${title} — ${body}`);
    return;
  }

  const result = await query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return;

  const subscription = result.rows[0].subscription;
  const payload = JSON.stringify({ title, body, url, tag });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expirada — remover
      await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    } else {
      console.error('[push] sendNotification error:', err.message);
    }
  }
}

module.exports = { sendPushToUser };
```

**Step 5: Criar pushSubscriptions.js**

Criar `backend/src/routes/pushSubscriptions.js`:

```javascript
'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/push/subscribe — salvar subscription do browser
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida.' });

    await query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET subscription = $2, created_at = NOW()`,
      [req.user.id, JSON.stringify(subscription)]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/push/vapid-public-key — retorna chave pública para o browser
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

module.exports = router;
```

**Step 6: Registrar rota em index.js**

```javascript
const pushRoutes = require('./routes/pushSubscriptions');
app.use('/api/push', pushRoutes);
```

**Step 7: Criar cron job de lembrete de check-in**

Criar `backend/src/jobs/checkinReminderJob.js`:

```javascript
'use strict';

const cron = require('node-cron');
const { query } = require('../db');
const { sendPushToUser } = require('../services/pushService');

// Roda a cada hora para verificar quem deve receber lembrete nessa hora
function startCheckinReminderJob() {
  cron.schedule('0 * * * *', async () => {
    const currentHour = new Date().getUTCHours() + 3; // BRT = UTC-3, então + 3 converte para BRT, ajustar conforme servidor
    // Na prática: usar UTC e deixar o padrão às 20:00 UTC (17:00 BRT) ou configurar por timezone

    try {
      // Buscar pacientes que têm lembrete configurado para esta hora e não fizeram check-in hoje
      const result = await query(`
        SELECT DISTINCT
          cr.patient_id,
          COALESCE(cr.checkin_reminder_hour, 20) AS reminder_hour
        FROM care_relationships cr
        WHERE cr.status = 'active'
          AND COALESCE(cr.checkin_reminder_hour, 20) = $1
          AND cr.patient_id NOT IN (
            SELECT patient_id FROM emotional_logs
            WHERE created_at >= CURRENT_DATE
          )
      `, [currentHour]);

      for (const row of result.rows) {
        await sendPushToUser(row.patient_id, {
          title: 'Como você está hoje? 🌱',
          body: 'Faça seu check-in diário no Clarita. Leva menos de 1 minuto.',
          url: '/patient-home',
          tag: 'checkin-reminder',
        }).catch(err => console.error('[checkinReminder] push failed:', err.message));
      }

      if (result.rows.length > 0) {
        console.log(`[checkinReminder] ${result.rows.length} lembrete(s) enviado(s).`);
      }
    } catch (err) {
      console.error('[checkinReminder] Erro:', err.message);
    }
  });

  console.log('[checkinReminderJob] Agendado (verificação a cada hora).');
}

module.exports = { startCheckinReminderJob };
```

Registrar em `index.js`:
```javascript
const { startCheckinReminderJob } = require('./jobs/checkinReminderJob');
startCheckinReminderJob();
```

**Step 8: Commit**

```bash
git add backend/db/migration_push_subscriptions.sql backend/src/routes/pushSubscriptions.js backend/src/services/pushService.js backend/src/jobs/checkinReminderJob.js backend/src/index.js backend/package.json backend/package-lock.json
git commit -m "feat: Web Push backend — VAPID, subscriptions, hourly check-in reminder cron"
```

---

### Task 12: Push notifications — frontend (solicitar permissão + configurar horário)

**Files:**
- Create: `dashboard/src/hooks/usePushNotifications.ts`
- Modify: `dashboard/src/app/patient-home/page.tsx`

**Step 1: Criar hook usePushNotifications**

Criar `dashboard/src/hooks/usePushNotifications.ts`:

```typescript
'use client';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

export function usePushNotifications(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !token) return;

    // Buscar chave pública VAPID
    const { publicKey } = await fetch(`${API_URL}/push/vapid-public-key`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    if (!publicKey) return; // dev sem VAPID configurado

    const permission = await Notification.requestPermission();
    setPermission(permission);
    if (permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    await fetch(`${API_URL}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription }),
    });

    setSubscribed(true);
  }

  async function unsubscribe() {
    await fetch(`${API_URL}/push/unsubscribe`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSubscribed(false);
  }

  return { permission, subscribed, subscribe, unsubscribe };
}
```

**Step 2: Adicionar banner de ativação de notificações no patient-home**

Em `dashboard/src/app/patient-home/page.tsx`, importar o hook e adicionar banner:

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Dentro do componente:
const { permission, subscribed, subscribe } = usePushNotifications(token);

// No JSX, antes das seções principais (só mostra se ainda não ativou):
{permission === 'default' && !subscribed && (
  <div className="card p-4 flex items-center justify-between gap-4 bg-clarita-green-50 border-clarita-green-200">
    <div>
      <p className="font-medium text-clarita-green-800 text-sm">Ativar lembretes de check-in 🔔</p>
      <p className="text-xs text-clarita-green-600">Receba um lembrete diário para registrar como você está.</p>
    </div>
    <button type="button" onClick={subscribe} className="btn-primary text-sm whitespace-nowrap">
      Ativar
    </button>
  </div>
)}
```

**Step 3: TypeScript check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: zero erros.

**Step 4: Commit final**

```bash
git add dashboard/src/hooks/usePushNotifications.ts dashboard/src/app/patient-home/page.tsx
git commit -m "feat: push notification permission banner and subscription hook in patient-home"
```

---

## Verificação Final

Após todas as tasks:

1. **Backend sobe sem erros:** `cd backend && npm run dev` → `CLARITA API running on port 3005`
2. **Emails funcionam em dev:** criar conta → ver log `=== EMAIL (dev) ===` no terminal
3. **Upload funciona:** fazer upload de exame → arquivo salvo (disco local em dev)
4. **LGPD:** cadastro com checkbox exige aceite; `/api/me/export` retorna JSON
5. **Onboarding:** criar conta de profissional → wizard aparece → fechar → não aparece mais
6. **PWA:** `npm run build && npm start` → Chrome → Application → Manifest → ícones e nome corretos
7. **Push:** paciente vê banner "Ativar lembretes" → clica → permissão solicitada
8. **TypeScript:** `cd dashboard && npx tsc --noEmit` → zero erros
9. **GitHub:** `git push origin main`
