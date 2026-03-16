# CLARITA

**Plataforma de Monitoramento Longitudinal de Saude Mental**

O CLARITA conecta pacientes, psicologos e psiquiatras em um sistema unificado para acompanhamento de estados emocionais, sintomas, tratamentos e eventos de vida ao longo do tempo.

---

## Sobre o Projeto

O CLARITA foi criado para preencher uma lacuna no acompanhamento de saude mental: a falta de dados longitudinais estruturados que permitam a profissionais identificar padroes, tendencias e riscos de forma proativa.

**Funcionalidades principais:**

- Check-in diario de humor, ansiedade, energia e sono
- Registro e acompanhamento de sintomas
- Prescricao e logs de adesao a medicamentos
- Avaliacoes clinicas padronizadas (PHQ-9, GAD-7)
- Registro de eventos de vida com nivel de impacto
- Notas clinicas com opcao de privacidade
- Journal/diario do paciente
- Metas terapeuticas com aceite/rejeicao pelo paciente
- Chat entre profissionais
- Upload e compartilhamento de exames com controle de permissoes
- Digital Twin — modelo IA do paciente
- Sistema de alertas automaticos (episodio depressivo, ansiedade alta, nao-adesao)
- Convites para vinculos terapeuticos
- Controle de permissoes de dados pelo paciente
- Dashboard profissional com timeline unificada

---

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Dashboard      │     │   Mobile App     │     │   AI Engine      │
│   Next.js 14     │     │   React Native   │     │   Python/Flask   │
│   :3000          │     │   Expo           │     │   :5001          │
└────────┬────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                       │                         │
         └───────────┬───────────┘                         │
                     │                                     │
              ┌──────┴──────┐                              │
              │  Backend API │◄─────────────────────────────┘
              │  Express.js  │
              │  :3001       │
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              │  PostgreSQL  │
              │  :5432       │
              └─────────────┘
```

| Componente | Tecnologia | Porta |
|---|---|---|
| **Backend API** | Node.js + Express.js | 3001 |
| **Dashboard Profissional** | Next.js 14 + React + TypeScript + Tailwind | 3000 |
| **App Paciente** | React Native (Expo) | — |
| **AI Engine** | Python + Flask + scikit-learn | 5001 |
| **Banco de Dados** | PostgreSQL 16 | 5432 |

---

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **PostgreSQL** 16+
- **Python** 3.11+ (para AI Engine)
- **npm** 9+

---

## Setup Rapido (Docker Compose)

```bash
git clone https://github.com/luliquintino/clarita.git
cd clarita
docker compose up --build
```

Isso inicia:
- PostgreSQL com schema e dados de seed automaticos
- Backend API em http://localhost:3001
- Dashboard em http://localhost:3000
- AI Engine em http://localhost:5001

---

## Setup Manual

### 1. Banco de Dados

```bash
createdb clarita

# Rodar schema e seed
psql clarita < backend/db/schema.sql
psql clarita < backend/db/seed.sql
```

### 2. Backend API

```bash
cd backend
cp .env.example .env   # Editar com suas credenciais
npm install
npm run dev             # Inicia na porta 3001
```

### 3. Dashboard

```bash
cd dashboard
npm install
npm run dev             # Inicia na porta 3000
```

### 4. AI Engine (opcional)

```bash
cd ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m src.main      # Inicia na porta 5001
```

### 5. App Mobile (opcional)

```bash
cd mobile
npm install
npx expo start          # Escanear QR code com Expo Go
```

---

## Variaveis de Ambiente

### Backend (`backend/.env`)

| Variavel | Descricao | Exemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexao PostgreSQL | `postgresql://user:pass@localhost:5432/clarita` |
| `JWT_SECRET` | Chave secreta para tokens JWT | `uma-string-segura-aleatoria` |
| `PORT` | Porta do servidor | `3001` |
| `NODE_ENV` | Ambiente de execucao | `development` |
| `AI_ENGINE_URL` | URL do servico de IA | `http://localhost:5001` |
| `CORS_ORIGIN` | Origem permitida para CORS | `http://localhost:3000` |
| `SMTP_HOST` | Servidor SMTP para emails | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | `seu-email@gmail.com` |
| `SMTP_PASS` | Senha SMTP | `senha-de-app` |
| `SMTP_FROM` | Remetente dos emails | `"CLARITA" <noreply@clarita.com>` |
| `FRONTEND_URL` | URL do frontend (para links em emails) | `http://localhost:3000` |

### Dashboard (`dashboard/.env.local`)

| Variavel | Descricao | Exemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL da API backend | `http://localhost:3001/api` |

---

## Estrutura do Projeto

```
clarita/
├── backend/                # API Node.js + Express
│   ├── db/                 # Schema SQL, seeds e migracoes
│   │   ├── schema.sql      # Schema principal (17 tabelas)
│   │   ├── seed.sql        # Dados iniciais
│   │   └── migration_*.sql # Migracoes incrementais
│   └── src/
│       ├── config/         # Configuracao do banco
│       ├── middleware/      # Auth JWT, RBAC, Upload
│       ├── routes/         # 21 arquivos de rotas (65+ endpoints)
│       ├── services/       # Logica de negocios (alertas, assessments, email, sumarios)
│       ├── utils/          # Utilitarios (generateDisplayId)
│       └── validators/     # Validacao de entrada
├── dashboard/              # Dashboard profissional Next.js
│   └── src/
│       ├── app/            # 12 paginas (login, register, patients, alerts, chat...)
│       ├── components/     # 25 componentes React
│       └── lib/            # Cliente API com tipos TypeScript
├── mobile/                 # App paciente React Native
│   └── src/
│       ├── screens/        # 10 telas
│       ├── components/     # Componentes reutilizaveis
│       └── services/       # API + Auth
├── ai-engine/              # Motor de analise Python/Flask
│   └── src/
│       ├── feature_engineering.py
│       ├── pattern_detection.py
│       ├── anomaly_detection.py
│       ├── dsm_patterns.py
│       ├── insight_generation.py
│       └── alert_rules.py
├── docs/                   # Documentacao
├── docker-compose.yml      # Setup Docker completo
└── .editorconfig           # Configuracao de editor
```

---

## Comandos Uteis

### Backend

```bash
cd backend
npm run dev           # Servidor de desenvolvimento
npm run start         # Servidor de producao
npm run lint          # Verificar linting
npm run lint:fix      # Corrigir linting automaticamente
npm run format        # Formatar codigo com Prettier
npm run format:check  # Verificar formatacao
npm run db:init       # Rodar schema no banco
npm run db:seed       # Popular banco com dados de teste
npm test              # Rodar testes
npm run test:coverage # Rodar testes com cobertura
```

### Dashboard

```bash
cd dashboard
npm run dev           # Servidor de desenvolvimento
npm run build         # Build de producao
npm run start         # Servidor de producao
npm run lint          # Verificar linting
npm run lint:fix      # Corrigir linting
npm run format        # Formatar codigo
npm run format:check  # Verificar formatacao
npm test              # Rodar testes
npm run test:coverage # Rodar testes com cobertura
```

---

## Roles de Usuario

| Role | Capacidades |
|---|---|
| **Paciente** | Check-in diario, registro de sintomas, logs de medicamento, avaliacoes, journal, upload de exames, gerenciar permissoes de dados |
| **Psicologo** | Ver dados do paciente, timeline, notas clinicas, insights IA, alertas, metas, chat com profissionais |
| **Psiquiatra** | Tudo do psicologo + prescrever/ajustar medicamentos |

---

## Seguranca

- Autenticacao JWT com RBAC (Role-Based Access Control)
- Verificacao de vinculo terapeutico (care_relationship) para acesso cross-usuario
- Sistema de permissoes de dados (paciente controla o que cada profissional pode ver)
- Queries SQL parametrizadas (prevencao de injection)
- Helmet security headers
- Validacao de entrada em todos os endpoints
- Senhas hash com bcrypt (12 rounds)
- Tokens de reset de senha com expiracao (1 hora)

---

## Avaliacoes Clinicas

Scoring automatico integrado para:

- **PHQ-9** — Rastreamento de depressao (escala 0-27, 5 niveis de severidade)
- **GAD-7** — Rastreamento de ansiedade (escala 0-21, 4 niveis de severidade)

---

## AI Engine

O servico de IA roda analises periodicas:

- **Feature Engineering** — Medias moveis, slopes, taxas de adesao
- **Deteccao de Padroes** — Correlacoes, tendencias, padroes ciclicos
- **Deteccao de Anomalias** — Z-score, mudancas subitas, Isolation Forest
- **Padroes DSM** — Episodios depressivos, padroes de ansiedade, ciclagem rapida
- **Geracao de Alertas** — Alertas baseados em risco com niveis de severidade

O sistema sinaliza padroes para revisao profissional. **Nao realiza diagnosticos.**

---

## Documentacao

- [Documentacao da API](docs/API.md) — Todos os 65+ endpoints detalhados
- [Arquitetura](docs/ARQUITETURA.md) — Visao geral dos servicos e fluxos
- [Banco de Dados](docs/BANCO-DE-DADOS.md) — Schema completo com diagrama ER
- [Contribuindo](docs/CONTRIBUINDO.md) — Guia para contribuidores
- [Componentes](docs/COMPONENTES.md) — Catalogo de componentes do dashboard

---

## Contribuindo

Veja [docs/CONTRIBUINDO.md](docs/CONTRIBUINDO.md) para instrucoes detalhadas sobre como configurar o ambiente, convencoes de codigo e como criar PRs.

---

## Licenca

Este projeto esta licenciado sob a **Clarita Source Available License v1.0**.

Resumo:
- ✅ Visualizacao, estudo e uso educacional — **livre**
- ✅ ONGs e organizacoes sem fins lucrativos — **gratuito** (notificacao por e-mail antes do primeiro uso em producao)
- ✅ Projetos pessoais e pesquisa academica — **livre**
- ⚠️ Uso comercial por empresas — **requer aprovacao previa por escrito** (`luizacqoliveira@gmail.com`)
- ⚠️ Integracao em produtos ou servicos pagos — **requer aprovacao previa**
- ⚠️ Uso do nome/marca CLARITA por terceiros — **proibido sem autorizacao**

Veja o arquivo [LICENSE](LICENSE) para os termos completos.
