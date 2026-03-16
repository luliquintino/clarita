# Design: Fundação SaaS para Lançamento — Clarita

**Data:** 2026-03-16
**Status:** Aprovado
**Contexto:** Clarita é uma plataforma SaaS de monitoramento longitudinal de saúde mental. Objetivo: ter usuários reais (profissionais solo → clínicas). Produto gratuito por enquanto, sem billing.

---

## Roadmap em 3 Fases

### Fase 1 — Pronto para ter usuários reais (~3-4 semanas)

| Prioridade | Feature | Por quê é bloqueadora |
|---|---|---|
| 🔴 1 | Email transacional | Convites de paciente não chegam. Reset de senha não existe. |
| 🔴 2 | Deploy em produção | Profissional não vai usar localhost. |
| 🟡 3 | LGPD básico | Dado de saúde sem base legal é risco jurídico. |
| 🟡 4 | Onboarding wizard | Profissional cria conta e fica perdido sem guia. |

### Fase 2 — Pacientes que engajam (+2-3 semanas)

| Prioridade | Feature | Impacto |
|---|---|---|
| 🟢 5 | PWA + push notifications | Check-in diário exige lembrete no celular. |
| 🟢 6 | E-mails de engajamento | Alertas automáticos para o profissional sobre pacientes inativos. |

### Fase 3 — Diferencial clínico (quando tiver dados reais)

| Prioridade | Feature | Impacto |
|---|---|---|
| 🔵 7 | AI engine integrado | Análise de padrões real — só faz sentido com dados de uso real. |

---

## Seção 1: Email Transacional

**Provider:** Resend (resend.com) — free tier 3.000 e-mails/mês, API simples, suporte a domínio customizado.

### E-mails a implementar

| # | E-mail | Trigger | Destinatário |
|---|---|---|---|
| 1 | Convite de paciente | Profissional convida paciente | Paciente — link para criar conta |
| 2 | Boas-vindas | Novo cadastro | Novo usuário |
| 3 | Reset de senha | "Esqueci minha senha" | Usuário que pediu |
| 4 | Alerta crítico | Sistema detecta alerta de risco | Profissional responsável |
| 5 | Sem check-in (3 dias) | Cron job diário | Profissional — notificação passiva |

### Arquitetura

- `backend/src/services/emailService.js` — serviço centralizado com Resend SDK
- `backend/src/templates/` — templates HTML (sem dependência extra além do Resend SDK)
- Integração nos routes existentes:
  - `auth.js` → boas-vindas + reset de senha
  - `invitations.js` → convite de paciente
  - `alerts.js` → alerta crítico
- `node-cron` para job diário de "sem check-in"

**Fora do escopo:** e-mail marketing, boletins, newsletters.

---

## Seção 2: Deploy em Produção

**Stack (tudo com free tier):**

| Camada | Serviço | Motivo |
|---|---|---|
| Dashboard (Next.js) | Vercel | Deploy automático via git push, HTTPS gratuito |
| Backend (Express) | Railway | Simples, variáveis de ambiente fáceis |
| Banco de dados | Neon (PostgreSQL serverless) | Free tier 0.5GB, compatível 100% com schema atual |
| Arquivos/exames | Cloudinary | Uploads hoje salvos localmente precisam ir para nuvem |
| E-mails | Resend | Definido na Seção 1 |

**Mudanças no código:**
- Backend: `DATABASE_URL` → Neon; uploads de arquivo → Cloudinary
- Dashboard: `NEXT_PUBLIC_API_URL` → URL do Railway em produção
- Separar `.env.development` e `.env.production` claramente
- `launch.json` já configurado ✅

**CI/CD:** Vercel e Railway fazem deploy automático em cada `git push main`.

**Fora do escopo:** multi-região, CDN customizado, SLA formal.

---

## Seção 3: LGPD — Mínimo Necessário

Para dados de saúde no Brasil, a LGPD exige base legal explícita.

### Documentos legais (conteúdo a ser redigido pelo responsável legal)
- Termos de Uso
- Política de Privacidade
- Linkados no rodapé do app; exigidos no cadastro com checkbox

### Features técnicas obrigatórias

| Feature | Implementação |
|---|---|
| Consentimento no cadastro | Checkbox "Aceito os Termos e Política" → salvar `consent_accepted_at` na tabela `users` |
| Exportar meus dados | `GET /api/me/export` → JSON com todos os dados do usuário |
| Excluir minha conta | `DELETE /api/me` → anonimiza ou apaga dados pessoais |
| Aceite de compartilhamento | `RecordSharingPanel` já existe ✅ — garantir aceite explícito do paciente |

**Alteração de schema:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
```

**Fora do escopo:** DPO (encarregado de dados), RIPD, auditoria completa — para quando tiver volume de usuários.

---

## Seção 4: Onboarding Wizard

Fluxo de 4 passos, exibido apenas no primeiro login do profissional.

```
Cadastro → [1] Perfil → [2] Especialidade → [3] Convidar paciente → [4] Pronto 🎉
```

| Passo | Conteúdo |
|---|---|
| 1. Complete seu perfil | Nome, foto, CRP/CRM, especialização, instituição → popula `professional_profiles` |
| 2. Como você vai usar o Clarita? | Psicólogo / Psiquiatra / Ambos → ativa role-based features |
| 3. Convide seu primeiro paciente | Campo de e-mail → dispara e-mail de convite imediatamente |
| 4. Tudo pronto | Checklist do que o paciente precisa fazer + CTA "Ver meu painel" |

**Implementação:**
- Componente `OnboardingWizard.tsx` novo — modal/fullscreen no primeiro login
- Condição de exibição: `onboarding_completed = false` em `onboarding_profiles` (campo já existe ✅)
- Após passo 4: seta `onboarding_completed = true`, nunca mais aparece

**Fora do escopo:** tour interativo do app, tooltips contextuais, vídeos de tutorial.

---

## Seção 5: PWA + Push Notifications

**PWA** permite ao paciente instalar o Clarita no celular sem App Store.

### O que implementa

- `manifest.json` + ícones → habilita "Adicionar à tela inicial" no iOS/Android
- Service Worker → cache offline básico (check-in funciona sem internet, sincroniza depois)
- Web Push Notifications (browser API) → lembrete diário "Hora do seu check-in"
- Painel no dashboard do profissional para configurar horário do lembrete por paciente

### Arquitetura

- `dashboard/public/manifest.json` — configuração PWA
- `dashboard/public/sw.js` — service worker (cache + push)
- `backend/src/routes/pushSubscriptions.js` — novo; salva subscription tokens dos pacientes
- `backend/src/services/pushService.js` — envia notificações via Web Push API
- `node-cron` no backend dispara notificações no horário configurado por paciente

### Schema adicional

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,  -- PushSubscription object
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Limitação conhecida:** iOS Safari suporta push notifications apenas no iOS 16.4+. Cobre ~85% dos casos de uso. App React Native (projeto `/mobile`) é a solução completa para fase futura.

**Fora do escopo:** notificações in-app (badge/sino), app React Native nesta fase.

---

## Resumo do Escopo Total

| Feature | Fase | Arquivos principais |
|---|---|---|
| Email transacional (Resend) | 1 | `emailService.js`, `templates/`, hooks em `auth.js`/`invitations.js`/`alerts.js` |
| Deploy (Vercel + Railway + Neon + Cloudinary) | 1 | `.env.production`, config de upload, `Dockerfile` ou Procfile |
| LGPD básico | 1 | Migration `consent_accepted_at`, `GET /me/export`, `DELETE /me`, UI de consentimento |
| Onboarding wizard | 1 | `OnboardingWizard.tsx` |
| PWA + push notifications | 2 | `manifest.json`, `sw.js`, `pushSubscriptions.js`, `pushService.js`, migration |
| E-mails de engajamento | 2 | Extensão do `emailService.js` + cron jobs |
| AI engine integrado | 3 | A definir quando tiver dados reais |
