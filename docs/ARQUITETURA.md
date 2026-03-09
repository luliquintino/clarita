# Arquitetura da Plataforma Clarita

Documento de referencia tecnica da plataforma **Clarita** -- sistema de saude mental que conecta pacientes, psicologos e psiquiatras em um fluxo de dados clinicos, alertas automaticos e inteligencia artificial.

---

## Sumario

1. [Visao Geral dos Servicos](#1-visao-geral-dos-servicos)
2. [Fluxo de Dados](#2-fluxo-de-dados)
3. [Modelo de Autenticacao (JWT)](#3-modelo-de-autenticacao-jwt)
4. [Controle de Acesso (RBAC)](#4-controle-de-acesso-rbac)
5. [Sistema de Alertas](#5-sistema-de-alertas)
6. [Upload de Arquivos](#6-upload-de-arquivos)
7. [Digital Twin / Motor de IA](#7-digital-twin--motor-de-ia)
8. [Sistema de Email](#8-sistema-de-email)
9. [Assessment Scoring (PHQ-9 e GAD-7)](#9-assessment-scoring-phq-9-e-gad-7)

---

## 1. Visao Geral dos Servicos

A plataforma e composta por quatro servicos principais e um banco de dados, todos orquestrados via Docker Compose.

```
+------------------+        +------------------+        +------------------+
|                  |  HTTP   |                  |  HTTP   |                  |
|    Dashboard     +------->+     Backend      +------->+    AI Engine     |
|   (Next.js)      |        |   (Express.js)   |        |    (Flask)       |
|   Porta: 3000    |        |   Porta: 3001    |        |   Porta: 5001    |
|                  |        |                  |        |                  |
+------------------+        +--------+---------+        +--------+---------+
                                     |                           |
                                     |      SQL (pg)             |    SQL (pg)
                                     v                           v
                            +--------+---------+        +--------+---------+
                            |                  |        |                  |
                            |   PostgreSQL 16  |<-------+   (mesma base)   |
                            |   Porta: 5432    |        |                  |
                            |   DB: clarita    |        |                  |
                            +------------------+        +------------------+

+------------------+
|   Mobile App     |  (futuro / app do paciente)
|  (React Native)  |-------> Backend via REST API
+------------------+
```

### 1.1 Backend (Node.js / Express)

- **Diretorio:** `backend/`
- **Porta:** 3001
- **Responsabilidades:** API REST principal, autenticacao JWT, RBAC, cron de alertas, upload de arquivos, comunicacao com AI Engine.
- **Middlewares globais:** Helmet (seguranca HTTP), CORS configuravel, body-parser JSON (limite 1 MB).
- **Health check:** `GET /api/health` -- valida conexao com o banco.

**Rotas registradas:**

| Prefixo                     | Modulo                  |
|-----------------------------|-------------------------|
| `/api/auth`                 | Autenticacao            |
| `/api/patients`             | Pacientes               |
| `/api/professionals`        | Profissionais           |
| `/api/emotional-logs`       | Registros emocionais    |
| `/api/symptoms`             | Catalogo de sintomas    |
| `/api/patient-symptoms`     | Sintomas do paciente    |
| `/api/medications`          | Catalogo de medicamentos|
| `/api/patient-medications`  | Medicamentos do paciente|
| `/api/medication-logs`      | Logs de medicacao       |
| `/api/assessments`          | Avaliacoes (templates)  |
| `/api/assessment-results`   | Resultados de avaliacoes|
| `/api/life-events`          | Eventos de vida         |
| `/api/clinical-notes`       | Notas clinicas          |
| `/api/insights`             | Insights de IA          |
| `/api/alerts`               | Alertas clinicos        |
| `/api/digital-twin`         | Gemeo digital           |
| `/api/journal`              | Diario do paciente      |
| `/api/goals`                | Metas terapeuticas      |
| `/api/chat`                 | Mensagens               |
| `/api/summaries`            | Resumos de IA           |
| `/api/onboarding`           | Onboarding do paciente  |
| `/api/documents`            | Documentos              |
| `/api/exams`                | Exames                  |
| `/api/invitations`          | Convites de vinculo     |
| `/api/users`                | Busca de usuarios       |

### 1.2 Dashboard (Next.js)

- **Diretorio:** `dashboard/`
- **Porta:** 3000
- **Variavel:** `NEXT_PUBLIC_API_URL` aponta para o backend.
- **Client API:** Modulo centralizado em `dashboard/src/lib/api.ts` com wrappers tipados (`request<T>`) para todas as chamadas REST.
- **Armazenamento de token:** `localStorage` sob a chave `clarita_token`.
- **Redirect automatico:** Ao receber HTTP 401 e o usuario possuir token expirado, o client limpa o storage e redireciona para `/login`.

### 1.3 AI Engine (Flask / Python)

- **Diretorio:** `ai-engine/`
- **Porta:** 5001
- **Variaveis:** `DATABASE_URL`, `ANALYSIS_INTERVAL` (horas), `ALERT_CHECK_INTERVAL` (horas), `FLASK_HOST`, `FLASK_PORT`.
- **Acesso ao banco:** Conecta diretamente ao PostgreSQL para leitura de dados clinicos e escrita de estados do gemeo digital.

### 1.4 PostgreSQL

- **Imagem:** `postgres:16-alpine`
- **Banco:** `clarita`
- **Inicializacao:** Scripts montados em `/docker-entrypoint-initdb.d/`:
  - `01-schema.sql` -- DDL completo (tabelas, indices, constraints).
  - `02-seed.sql` -- Dados de demonstracao.
- **Pool de conexoes (backend):** Max 20 conexoes, idle timeout 30s, connection timeout 5s.

### 1.5 Dependencias de Inicializacao

```
postgres (healthcheck: pg_isready)
   |
   +---> backend  (depende de postgres healthy)
   |       |
   |       +---> dashboard (depende de backend)
   |
   +---> ai-engine (depende de postgres healthy)
```

---

## 2. Fluxo de Dados

### 2.1 Fluxo Principal: Paciente -> Backend -> Profissional

```
  Paciente (Mobile/Web)                  Backend (Express)              Profissional (Dashboard)
  =====================                  =================              ========================

  1. Login
     POST /api/auth/login  ----------->  Valida credenciais
                                          Gera JWT
                           <-----------  { token, user }

  2. Registro emocional diario
     POST /api/journal     ----------->  Salva emotional_log
                                          no PostgreSQL
                           <-----------  { journal }

  3. Cron (a cada 30 min)                 generateAlertsForAllPatients()
                                          - checkDepressivePattern()
                                          - checkAnxietyPattern()
                                          - checkMedicationAdherence()
                                          Grava alerts no banco

  4.                                                              GET /api/alerts
                                          Retorna alertas      <-----------
                                          filtrados por         ----------->  Lista alertas
                                          care_relationship                   por severidade

  5.                                                              GET /api/digital-twin/:id
                                          Retorna estado do    <-----------
                                          gemeo digital         ----------->  Visualiza predicoes
                                                                              e correlacoes

  6.                                                              POST /api/summaries/:id/generate
                                          Compila dados dos    <-----------
                                          ultimos N dias        ----------->  Resumo estruturado
                                          (medias, tendencias)                para consulta
```

### 2.2 Fluxo de Vinculo de Cuidado

```
  Profissional                            Backend                         Paciente
  ============                            =======                         ========

  POST /api/invitations  ------------->  Cria registro em
  { display_id, message }                care_relationships
                                          status = 'pending'

                                                               GET /api/invitations/pending
                                          Retorna convite    <-----------
                                                              ----------->  Visualiza convite

                                                               PUT /api/invitations/:id/respond
                                          Atualiza status    <-----------  { action: 'accept' }
                                          para 'active'       ----------->  Vinculo ativo
```

### 2.3 Fluxo de Permissoes Granulares

```
  Paciente                                Backend
  ========                                =======

  PUT /api/patients/:id/permissions  -->  Atualiza data_permissions
  {                                        para um profissional especifico
    professional_id,
    permissions: [
      { permission_type: "emotional_logs", granted: true },
      { permission_type: "digital_twin", granted: false }
    ]
  }
```

Quando um profissional tenta acessar dados protegidos, o middleware `requirePatientAccess(permissionType)` verifica a tabela `data_permissions` antes de liberar o acesso.

---

## 3. Modelo de Autenticacao (JWT)

### 3.1 Visao Geral

A autenticacao utiliza JSON Web Tokens (JWT) com o algoritmo padrao do `jsonwebtoken` (HS256). O segredo de assinatura e definido pela variavel de ambiente `JWT_SECRET`.

### 3.2 Fluxo de Autenticacao

```
  Cliente                        Backend
  =======                        =======

  POST /api/auth/login    ----->  1. Valida email + senha (bcrypt)
  { email, password }             2. Gera token JWT:
                                       payload = { userId: UUID, role: string }
                                       expiresIn = (definido no momento da criacao)
                                  3. Retorna { user, token }
                          <-----

  GET /api/qualquer-rota  ----->  4. Middleware authenticate():
  Authorization: Bearer <token>        a. Extrai token do header
                                       b. jwt.verify(token, JWT_SECRET)
                                       c. SELECT user FROM users WHERE id = decoded.userId
                                       d. Verifica is_active = true
                                       e. Anexa user a req.user
                          <-----  5. Rota prossegue ou retorna 401/403
```

### 3.3 Payload do Token

```json
{
  "userId": "uuid-do-usuario",
  "role": "patient | psychologist | psychiatrist",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### 3.4 Tratamento de Erros

| Cenario                    | Codigo HTTP | Mensagem               |
|---------------------------|-------------|------------------------|
| Header ausente/invalido    | 401         | "Autenticacao necessaria" |
| Token expirado             | 401         | "Token expirado"       |
| Token invalido             | 401         | "Token invalido"       |
| Usuario nao encontrado     | 401         | "Usuario nao encontrado" |
| Conta desativada           | 403         | "Conta desativada"     |

### 3.5 Client-Side (Dashboard)

O frontend armazena o token em `localStorage` sob a chave `clarita_token`. A cada requisicao, o wrapper `request<T>()` injeta automaticamente o header `Authorization: Bearer <token>`. Quando um 401 e recebido e havia token armazenado (sessao expirada), o token e removido e o usuario e redirecionado para `/login`.

O frontend tambem expoe a funcao `getUserRoleFromToken()` que decodifica o payload Base64 do JWT para extrair o `role` do usuario sem chamar o backend.

---

## 4. Controle de Acesso (RBAC)

### 4.1 Papeis (Roles)

| Role            | Descricao                           |
|-----------------|-------------------------------------|
| `patient`       | Paciente -- acessa apenas seus dados |
| `psychologist`  | Psicologo -- acessa dados dos pacientes vinculados |
| `psychiatrist`  | Psiquiatra -- acessa dados dos pacientes vinculados |

### 4.2 Middlewares de Autorizacao

#### `requireRole(...roles)`

Verifica se `req.user.role` esta na lista de roles permitidos. Caso contrario, retorna 403.

```
Exemplo de uso:
  router.get('/rota', requireRole('psychologist', 'psychiatrist'), handler)
```

Resposta de erro:
```json
{
  "error": "Proibido: papel insuficiente",
  "required": ["psychologist", "psychiatrist"],
  "current": "patient"
}
```

#### `requirePatientAccess(permissionType?)`

Middleware mais complexo que valida a cadeia completa de acesso:

```
  req.user
    |
    +-- E paciente acessando seus proprios dados? --> PERMITIDO
    |
    +-- E profissional?
         |
         +-- Existe care_relationship ativo? (tabela care_relationships)
         |     status = 'active'
         |     professional_id = req.user.id
         |     patient_id = req.params.patientId
         |
         |   NAO --> 403 "Sem vinculo de cuidado ativo"
         |   SIM --> Verifica permissao granular
         |
         +-- permissionType especificado?
               |
               NAO --> PERMITIDO (acesso padrao)
               SIM --> Consulta tabela data_permissions
                       |
                       +-- Registro com granted = false? --> 403
                       +-- Sem registro ou granted = true? --> PERMITIDO
```

**Tabela `care_relationships`:**
Armazena vinculos ativos entre profissionais e pacientes. Criada quando um convite e aceito via `/api/invitations/:id/respond`.

**Tabela `data_permissions`:**
Permissoes granulares que o paciente define para cada profissional. Se nao houver registro, o acesso e permitido por padrao (opt-out model). O paciente pode negar explicitamente acesso a categorias como `emotional_logs`, `digital_twin`, `medications`, etc.

#### `requireOwnership(table, paramName, ownerColumn)`

Verifica se o usuario autenticado e o proprietario do recurso em questao. Utilizado para proteger rotas de edicao/exclusao de recursos como notas clinicas.

```
Exemplo de uso:
  router.put('/:id', requireOwnership('clinical_notes', 'id', 'professional_id'), handler)
```

Fluxo:
1. Busca o recurso pelo `id` na tabela especificada.
2. Compara `ownerColumn` com `req.user.id`.
3. Se diferente, retorna 403 "Voce nao e proprietario deste recurso".

### 4.3 Modelo de Acesso Completo

```
  Requisicao HTTP
       |
       v
  [authenticate]  -- Valida JWT, carrega req.user
       |
       v
  [requireRole]   -- Verifica se o papel e permitido
       |
       v
  [requirePatientAccess]  -- Verifica vinculo + permissao granular
       |                     (ou requireOwnership para recursos proprios)
       v
  [Handler da rota]
```

---

## 5. Sistema de Alertas

### 5.1 Visao Geral

O sistema de alertas monitora automaticamente padroes preocupantes nos dados dos pacientes e gera alertas para os profissionais vinculados. A verificacao e executada a cada 30 minutos por um cron job no backend.

### 5.2 Tipos de Alerta

| Tipo                          | Descricao                                         | Periodo | Threshold |
|-------------------------------|---------------------------------------------------|---------|-----------|
| `depressive_episode`          | Humor <= 3 por 7 ou mais dias consecutivos        | 7 dias  | 7 dias    |
| `high_anxiety`                | Ansiedade >= 7 por 3 ou mais dias consecutivos    | 3 dias  | 3 dias    |
| `medication_non_adherence`    | 4 ou mais doses de medicacao puladas               | 7 dias  | 4 doses   |

### 5.3 Niveis de Severidade

| Severidade  | Criterio                                                  |
|-------------|-----------------------------------------------------------|
| `critical`  | Episodio depressivo com >= 10 dias OU ansiedade >= 5 dias OU >= 7 doses puladas |
| `high`      | Episodio depressivo padrao OU ansiedade padrao            |
| `medium`    | Nao-adesao a medicacao padrao (4-6 doses)                 |

### 5.4 Fluxo do Cron

```
  node-cron (*/30 * * * *)
       |
       v
  generateAlertsForAllPatients()
       |
       v
  SELECT id FROM users WHERE role = 'patient' AND is_active = TRUE
       |
       +-- Para cada paciente:
       |     |
       |     v
       |   generateAlerts(patientId)
       |     |
       |     +-- checkDepressivePattern(patientId)
       |     +-- checkAnxietyPattern(patientId)
       |     +-- checkMedicationAdherence(patientId)
       |     |
       |     v  (execucao paralela via Promise.all)
       |
       |   Para cada alerta detectado:
       |     |
       |     +-- Existe alerta do mesmo tipo nas ultimas 24h?
       |           SIM --> Pula (evita duplicatas)
       |           NAO --> INSERT INTO alerts (...)
       |
       v
  Log: "[cron] Alert generation completed"
```

### 5.5 Estrutura do Alerta

```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "alert_type": "depressive_episode",
  "severity": "high",
  "title": "Humor persistentemente baixo detectado",
  "description": "Paciente reportou pontuacoes de humor de 3 ou menos por 7 dos ultimos 7 dias.",
  "trigger_data": {
    "low_days": 7,
    "threshold": 7,
    "period_days": 7
  },
  "is_acknowledged": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 5.6 Acoes do Profissional

- **Acknowledge:** `PUT /api/alerts/:id/acknowledge` -- Marca como reconhecido.
- **Resolve:** `PUT /api/alerts/:id/resolve` -- Marca como resolvido.

---

## 6. Upload de Arquivos

### 6.1 Configuracao

O sistema utiliza **Multer** para gerenciamento de uploads com armazenamento em disco. Ha duas configuracoes separadas:

| Tipo       | Diretorio                       | Campo do form | Middleware       |
|------------|--------------------------------|---------------|------------------|
| Documentos | `backend/uploads/documents/`   | `file`        | `uploadDocument` |
| Exames     | `backend/uploads/exams/`       | `file`        | `uploadExam`     |

### 6.2 Nomeacao de Arquivos

Cada arquivo recebe um nome unico gerado por UUID + timestamp:

```
{uuid}-{timestamp}.{extensao}
Exemplo: a3f8b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c-1705312000000.pdf
```

### 6.3 Tipos Permitidos

| MIME Type          | Extensao |
|-------------------|----------|
| `application/pdf` | .pdf     |
| `image/jpeg`      | .jpeg    |
| `image/png`       | .png     |

Arquivos com outros tipos sao rejeitados com a mensagem: "Tipo de arquivo nao permitido. Aceitos: PDF, JPEG, PNG."

### 6.4 Limite de Tamanho

Ambos os tipos de upload tem limite de **10 MB** (10 * 1024 * 1024 bytes).

### 6.5 Fluxo de Upload (Documentos)

```
  Paciente (Frontend)                   Backend
  ===================                   =======

  POST /api/documents          ------>  Middleware uploadDocument (multer)
  Content-Type: multipart/form-data       - Valida tipo do arquivo
  Body:                                   - Valida tamanho (max 10MB)
    file: <arquivo>                       - Salva em uploads/documents/
    document_type: "laudo"                - Gera nome unico (uuid)
    document_date: "2024-01-15"
    notes: "Laudo psicologico"          INSERT INTO documents (...)
                               <------  { document: { id, file_name, ... } }
```

### 6.6 Controle de Acesso a Documentos

O paciente controla quais profissionais podem acessar cada documento individualmente:

- **Listar acesso:** `GET /api/documents/:id/access`
- **Conceder/revogar:** `PUT /api/documents/:id/access` com `{ professional_id, granted }`

Para exames, o controle e feito via lista de IDs de profissionais:

- **Atualizar permissoes:** `PUT /api/exams/:id/permissions` com `{ professional_ids: [...] }`

### 6.7 Download

- **Documentos:** `GET /api/documents/:id/file?token=<jwt>` (token via query param)
- **Exames:** `GET /api/exams/download/:id` (token via header Authorization)

---

## 7. Digital Twin / Motor de IA

### 7.1 Conceito

O Gemeo Digital (Digital Twin) e uma representacao computacional do estado emocional e clinico do paciente. Ele e mantido pelo servico **AI Engine** (Flask) e consumido pelo backend e dashboard.

### 7.2 Arquitetura

```
  Dashboard                   Backend (Express)              AI Engine (Flask)
  =========                   =================              =================

  GET /digital-twin/:id  -->  Consulta digital_twin_states
                              no PostgreSQL
                         <--  Retorna estado mais recente

  POST /digital-twin/
    :id/refresh          -->  Proxy para AI Engine:
                              POST http://ai-engine:5001
                                /analyze/:patientId
                                                         --> Executa analise:
                                                             - Le emotional_logs
                                                             - Calcula correlacoes
                                                             - Gera predicoes
                                                             - Salva em
                                                               digital_twin_states
                                                         <-- { resultado }
                         <--  { status, message, analysis }
```

### 7.3 Comunicacao Backend <-> AI Engine

- **URL:** Configurada via variavel `AI_ENGINE_URL` (padrao: `http://localhost:5001`).
- **Endpoint:** `POST /analyze/:patientId`
- **Protocolo:** HTTP simples (comunicacao interna entre containers Docker).
- **Tratamento de falha:** Se o AI Engine estiver indisponivel (`ECONNREFUSED`), o backend retorna 503 com a mensagem "Motor de IA indisponivel".

### 7.4 Variaveis do AI Engine

| Variavel              | Descricao                              | Valor padrao |
|-----------------------|----------------------------------------|-------------|
| `DATABASE_URL`        | String de conexao PostgreSQL           | --          |
| `ANALYSIS_INTERVAL`   | Intervalo de analise automatica (horas)| 6           |
| `ALERT_CHECK_INTERVAL`| Intervalo de verificacao de alertas (h)| 1           |
| `LOG_LEVEL`           | Nivel de log                           | INFO        |
| `FLASK_HOST`          | Host de bind                           | 0.0.0.0     |
| `FLASK_PORT`          | Porta do servico                       | 5001        |

### 7.5 Estrutura do Estado do Gemeo Digital

A tabela `digital_twin_states` armazena snapshots completos contendo:

- **`current_state`:** Estado atual de cada variavel (humor, ansiedade, energia) com medias de 7 e 30 dias, tendencia e inclinacao (slope).
- **`correlations`:** Correlacoes de Pearson entre variaveis (ex: sono vs. humor) com direcao, forca e p-value.
- **`baseline`:** Linha de base do paciente (media, desvio padrao, data de estabelecimento).
- **`predictions`:** Predicoes de aumento/diminuicao/estabilidade para cada variavel com nivel de risco, confianca e horizonte em dias.
- **`treatment_responses`:** Avaliacao de resposta a intervencoes (mudanca de medicacao, sessoes de terapia) com metricas antes/depois.
- **`data_points_used`:** Quantidade de pontos de dados utilizados na analise.
- **`model_version`:** Versao do modelo de IA utilizado.
- **`confidence_overall`:** Confianca geral da analise (0 a 1).

### 7.6 Endpoints do Digital Twin

| Metodo | Rota                                 | Descricao                       | Acesso                      |
|--------|--------------------------------------|--------------------------------|-----------------------------|
| GET    | `/api/digital-twin/:patientId`       | Estado mais recente            | Psicologos, psiquiatras     |
| GET    | `/api/digital-twin/:patientId/history` | Historico (padrao: 90 dias)  | Psicologos, psiquiatras     |
| GET    | `/api/digital-twin/:patientId/predictions` | Apenas predicoes          | Psicologos, psiquiatras     |
| POST   | `/api/digital-twin/:patientId/refresh` | Solicita nova analise ao AI Engine | Psicologos, psiquiatras |

Todos os endpoints requerem `requirePatientAccess('digital_twin')`, ou seja, o paciente pode revogar o acesso do profissional ao gemeo digital via `data_permissions`.

---

## 8. Sistema de Email

### 8.1 Visao Geral

O sistema de email utiliza **Nodemailer** e atualmente suporta um unico fluxo: **redefinicao de senha**.

### 8.2 Configuracao por Ambiente

| Ambiente      | Comportamento                                    |
|---------------|--------------------------------------------------|
| Producao      | Envio via SMTP real (host, porta, credenciais)   |
| Desenvolvimento | Log do link de reset no console do servidor    |

### 8.3 Variaveis de Ambiente (SMTP)

| Variavel       | Descricao                | Padrao                      |
|---------------|--------------------------|----------------------------|
| `SMTP_HOST`    | Host do servidor SMTP    | --                          |
| `SMTP_PORT`    | Porta SMTP               | 587                         |
| `SMTP_SECURE`  | Usar TLS                 | false                       |
| `SMTP_USER`    | Usuario SMTP             | --                          |
| `SMTP_PASS`    | Senha SMTP               | --                          |
| `SMTP_FROM`    | Remetente                | "CLARITA" <noreply@clarita.com> |
| `FRONTEND_URL` | URL do frontend          | http://localhost:3000       |

### 8.4 Fluxo de Redefinicao de Senha

```
  Usuario                          Backend                         Email/Console
  =======                          =======                         =============

  POST /api/auth/forgot-password
  { email }                  --->  1. Busca usuario por email
                                   2. Gera resetToken (aleatorio)
                                   3. Salva token no banco
                                      (expira em 1 hora)
                                   4. Chama sendPasswordResetEmail()
                                                                --> Envia email HTML com
                                                                   link de redefinicao:
                                                                   {FRONTEND_URL}/reset-password
                                                                     ?token={resetToken}
                             <---  { message: "Email enviado" }

  (Usuario clica no link no email)

  POST /api/auth/reset-password
  { token, password }        --->  1. Valida token (existe + nao expirou)
                                   2. Hash da nova senha (bcrypt)
                                   3. Atualiza senha no banco
                                   4. Invalida o token
                             <---  { message: "Senha redefinida" }
```

### 8.5 Template do Email

O email e enviado em formato HTML com:
- Cabecalho com logo "CLARITA - Plataforma de Saude Mental"
- Saudacao personalizada com o nome do usuario
- Botao verde "Redefinir Senha" com link
- Aviso de expiracao (1 hora)
- Link alternativo em texto puro como fallback

---

## 9. Assessment Scoring (PHQ-9 e GAD-7)

### 9.1 Instrumentos Suportados

A plataforma implementa scoring automatico para dois instrumentos de avaliacao psicometrica amplamente utilizados:

- **PHQ-9** (Patient Health Questionnaire-9) -- Rastreio de depressao
- **GAD-7** (Generalized Anxiety Disorder-7) -- Rastreio de ansiedade generalizada

### 9.2 Estrutura das Respostas

Ambos os instrumentos utilizam uma escala Likert de 0 a 3 para cada questao:

| Valor | Significado          |
|-------|----------------------|
| 0     | Nenhuma vez          |
| 1     | Varios dias          |
| 2     | Mais da metade dos dias |
| 3     | Quase todos os dias  |

O formato de envio e um objeto JSON com chaves `q1`, `q2`, ..., `qN`:

```json
{
  "q1": 2,
  "q2": 1,
  "q3": 3,
  "q4": 0,
  "q5": 1,
  "q6": 2,
  "q7": 1,
  "q8": 0,
  "q9": 2
}
```

### 9.3 Calculo do Score

A funcao `calculateScore(answers)` soma todos os valores das respostas:

```
score_total = q1 + q2 + q3 + ... + qN
```

- **PHQ-9:** 9 questoes, score maximo = 27
- **GAD-7:** 7 questoes, score maximo = 21

### 9.4 Classificacao de Severidade

#### PHQ-9 (Depressao)

| Score     | Nivel                 | Chave                 |
|-----------|-----------------------|-----------------------|
| 0 -- 4    | Minimo               | `minimal`             |
| 5 -- 9    | Leve                 | `mild`                |
| 10 -- 14  | Moderado             | `moderate`            |
| 15 -- 19  | Moderadamente severo | `moderately_severe`   |
| 20 -- 27  | Severo               | `severe`              |

#### GAD-7 (Ansiedade)

| Score     | Nivel     | Chave       |
|-----------|-----------|-------------|
| 0 -- 4    | Minimo   | `minimal`   |
| 5 -- 9    | Leve     | `mild`      |
| 10 -- 14  | Moderado | `moderate`  |
| 15 -- 21  | Severo   | `severe`    |

### 9.5 Validacao

A funcao `validateAnswers(assessmentName, answers)` verifica:

1. **Quantidade de respostas:** PHQ-9 deve ter exatamente 9; GAD-7 deve ter exatamente 7.
2. **Intervalo dos valores:** Cada resposta deve ser um inteiro entre 0 e 3.
3. **Tipo de dado:** Valores nao-inteiros geram erro.

Para instrumentos desconhecidos, a validacao estrutural e ignorada (retorna `{ valid: true }`), permitindo extensibilidade futura.

### 9.6 Fluxo Completo de Avaliacao

```
  Profissional/Paciente                  Backend
  =====================                  =======

  POST /api/assessment-results
  {
    patient_id,
    assessment_name: "PHQ-9",
    answers: { q1: 2, q2: 1, ... }
  }                              --->  1. validateAnswers("PHQ-9", answers)
                                          - 9 respostas? Ok
                                          - Todas 0-3? Ok
                                       2. calculateScore(answers)
                                          - soma = 12
                                       3. classifySeverity("PHQ-9", 12)
                                          - "moderate"
                                       4. INSERT INTO assessment_results
                                          (patient_id, score, severity, answers)
                                 <---  { result: { score: 12, severity: "moderate" } }
```

---

## Apendice: Variaveis de Ambiente

| Variavel             | Servico    | Descricao                           |
|---------------------|------------|-------------------------------------|
| `DATABASE_URL`       | Backend, AI| String de conexao PostgreSQL        |
| `JWT_SECRET`         | Backend    | Segredo para assinatura JWT         |
| `PORT`               | Backend    | Porta do servidor (padrao: 3001)    |
| `NODE_ENV`           | Backend    | Ambiente (development/production)   |
| `CORS_ORIGIN`        | Backend    | Origens permitidas (padrao: *)      |
| `AI_ENGINE_URL`      | Backend    | URL do AI Engine                    |
| `SMTP_HOST`          | Backend    | Host do servidor SMTP               |
| `SMTP_PORT`          | Backend    | Porta SMTP (padrao: 587)            |
| `SMTP_SECURE`        | Backend    | TLS (true/false)                    |
| `SMTP_USER`          | Backend    | Usuario SMTP                        |
| `SMTP_PASS`          | Backend    | Senha SMTP                          |
| `SMTP_FROM`          | Backend    | Email remetente                     |
| `FRONTEND_URL`       | Backend    | URL do frontend para links em emails|
| `NEXT_PUBLIC_API_URL` | Dashboard | URL da API para o frontend          |
| `ANALYSIS_INTERVAL`  | AI Engine  | Intervalo de analise (horas)        |
| `ALERT_CHECK_INTERVAL`| AI Engine | Intervalo de checks de alerta (h)  |
| `LOG_LEVEL`          | AI Engine  | Nivel de log (INFO, DEBUG, etc.)    |
| `FLASK_HOST`         | AI Engine  | Host de bind (padrao: 0.0.0.0)     |
| `FLASK_PORT`         | AI Engine  | Porta Flask (padrao: 5001)          |
