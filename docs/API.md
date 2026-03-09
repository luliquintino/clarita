# Clarita - Documentacao da API

Documentacao completa da API REST da plataforma Clarita de saude mental.

---

## Informacoes Gerais

| Item | Valor |
|------|-------|
| **URL Base** | `http://localhost:3001/api` |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Autenticacao** | JWT Bearer Token |
| **Upload de Arquivos** | `multipart/form-data` |

### Autenticacao

A maioria dos endpoints requer autenticacao via token JWT. O token deve ser enviado no header `Authorization`:

```
Authorization: Bearer <seu_token_jwt>
```

O token e obtido nos endpoints de login ou registro e tem validade de **7 dias**.

### Codigos de Erro Comuns

| Codigo | Significado |
|--------|-------------|
| `400` | Requisicao invalida (campos faltantes ou formato incorreto) |
| `401` | Nao autenticado (token ausente ou invalido) |
| `403` | Sem permissao (role insuficiente ou sem acesso ao recurso) |
| `404` | Recurso nao encontrado |
| `409` | Conflito (ex: email ja cadastrado) |
| `410` | Endpoint descontinuado |
| `500` | Erro interno do servidor |

### Roles (Papeis)

| Role | Descricao |
|------|-----------|
| `patient` | Paciente |
| `psychologist` | Psicologo(a) |
| `psychiatrist` | Psiquiatra |

---

## 1. Autenticacao (Auth)

### POST /api/auth/register

Registra um novo usuario na plataforma.

- **Autenticacao:** Nao
- **Role obrigatoria:** Nenhuma

**Request Body:**

```json
{
  "email": "joao@email.com",
  "password": "SenhaSegura123!",
  "first_name": "Joao",
  "last_name": "Silva",
  "role": "patient",
  "phone": "(11) 99999-0000",
  "date_of_birth": "1990-05-15",
  "gender": "male"
}
```

Para profissionais:

```json
{
  "email": "dra.maria@email.com",
  "password": "SenhaSegura123!",
  "first_name": "Maria",
  "last_name": "Santos",
  "role": "psychologist",
  "phone": "(11) 98888-0000",
  "license_number": "CRP 06/123456",
  "specialization": "Terapia Cognitivo-Comportamental",
  "institution": "Clinica Mente Saudavel",
  "bio": "Psicologa com 10 anos de experiencia.",
  "years_of_experience": 10
}
```

**Resposta (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "patient",
    "first_name": "Joao",
    "last_name": "Silva",
    "phone": "(11) 99999-0000",
    "display_id": "CLA-AB12CD",
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Numero de registro e obrigatorio para profissionais |
| `409` | Email ja cadastrado |

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "password": "SenhaSegura123!",
    "first_name": "Joao",
    "last_name": "Silva",
    "role": "patient"
  }'
```

---

### POST /api/auth/login

Autentica um usuario e retorna o token JWT.

- **Autenticacao:** Nao
- **Role obrigatoria:** Nenhuma

**Request Body:**

```json
{
  "email": "joao@email.com",
  "password": "SenhaSegura123!"
}
```

**Resposta (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "patient",
    "first_name": "Joao",
    "last_name": "Silva",
    "is_active": true,
    "display_id": "CLA-AB12CD"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `401` | Email ou senha invalidos |
| `403` | Conta desativada |

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@email.com", "password": "SenhaSegura123!"}'
```

---

### GET /api/auth/me

Retorna os dados do usuario autenticado e seu perfil.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Resposta (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "patient",
    "first_name": "Joao",
    "last_name": "Silva"
  },
  "profile": {
    "user_id": "uuid",
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "onboarding_completed": true,
    "onboarding_data": {}
  }
}
```

**Exemplo curl:**

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

### PUT /api/auth/me

Atualiza os dados do usuario autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Request Body (paciente):**

```json
{
  "first_name": "Joao",
  "last_name": "Silva Jr.",
  "phone": "(11) 99999-1111",
  "avatar_url": "https://example.com/avatar.jpg",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "emergency_contact_name": "Maria Silva",
  "emergency_contact_phone": "(11) 98888-0000"
}
```

**Request Body (profissional):**

```json
{
  "first_name": "Maria",
  "last_name": "Santos",
  "phone": "(11) 98888-1111",
  "avatar_url": "https://example.com/avatar.jpg",
  "specialization": "Psicanalise",
  "institution": "Clinica Nova",
  "bio": "Bio atualizada.",
  "years_of_experience": 12
}
```

**Resposta (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "patient",
    "first_name": "Joao",
    "last_name": "Silva Jr.",
    "phone": "(11) 99999-1111",
    "avatar_url": "https://example.com/avatar.jpg",
    "updated_at": "2025-01-15T12:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Nenhum campo para atualizar |

---

### POST /api/auth/forgot-password

Solicita redefinicao de senha. Envia email com token de reset.

- **Autenticacao:** Nao
- **Role obrigatoria:** Nenhuma

**Request Body:**

```json
{
  "email": "joao@email.com"
}
```

**Resposta (200 OK):**

```json
{
  "message": "Se este email estiver cadastrado, voce recebera um link para redefinir sua senha"
}
```

> Nota: A resposta e sempre a mesma, independentemente de o email existir ou nao (por seguranca).

---

### POST /api/auth/reset-password

Redefine a senha usando o token recebido por email.

- **Autenticacao:** Nao
- **Role obrigatoria:** Nenhuma

**Request Body:**

```json
{
  "token": "abc123def456...",
  "password": "NovaSenhaSegura456!"
}
```

**Resposta (200 OK):**

```json
{
  "message": "Senha redefinida com sucesso"
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Token invalido ou expirado |

---

## 2. Pacientes (Patients)

Todos os endpoints requerem autenticacao.

### GET /api/patients

Lista os pacientes vinculados ao profissional autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `search` | string | Busca por nome ou email |
| `page` | integer | Pagina (padrao: 1) |
| `limit` | integer | Itens por pagina (padrao: 20, max: 100) |

**Resposta (200 OK):**

```json
{
  "patients": [
    {
      "id": "uuid",
      "email": "joao@email.com",
      "first_name": "Joao",
      "last_name": "Silva",
      "phone": "(11) 99999-0000",
      "avatar_url": null,
      "display_id": "CLA-AB12CD",
      "created_at": "2025-01-15T10:00:00.000Z",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "onboarding_completed": true,
      "relationship_status": "active",
      "relationship_type": "psychologist",
      "started_at": "2025-01-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

**Exemplo curl:**

```bash
curl -X GET "http://localhost:3001/api/patients?search=joao&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/patients/:id

Retorna detalhes de um paciente especifico.

- **Autenticacao:** Sim
- **Role obrigatoria:** Profissional com vinculo ativo ou o proprio paciente

**Resposta (200 OK):**

```json
{
  "patient": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "patient",
    "first_name": "Joao",
    "last_name": "Silva",
    "phone": "(11) 99999-0000",
    "avatar_url": null,
    "created_at": "2025-01-15T10:00:00.000Z",
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "emergency_contact_name": "Maria Silva",
    "emergency_contact_phone": "(11) 98888-0000",
    "onboarding_completed": true,
    "onboarding_data": {}
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Paciente nao encontrado |

---

### GET /api/patients/:id/timeline

Retorna a timeline unificada do paciente (registros emocionais, eventos de vida, mudancas de medicacao, sintomas e avaliacoes).

- **Autenticacao:** Sim
- **Role obrigatoria:** Profissional com vinculo ativo ou o proprio paciente

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `start_date` | ISO date | Data inicial do filtro |
| `end_date` | ISO date | Data final do filtro |
| `limit` | integer | Maximo de eventos (padrao: 50, max: 200) |

**Resposta (200 OK):**

```json
{
  "timeline": [
    {
      "event_type": "emotional_log",
      "id": "uuid",
      "event_date": "2025-01-15T10:00:00.000Z",
      "data": {
        "mood_score": 7,
        "anxiety_score": 3,
        "energy_score": 6,
        "sleep_quality": "good",
        "notes": "Dia tranquilo"
      }
    },
    {
      "event_type": "life_event",
      "id": "uuid",
      "event_date": "2025-01-14T00:00:00.000Z",
      "data": {
        "title": "Mudanca de emprego",
        "description": "Comecei em um novo emprego",
        "category": "work",
        "impact_level": 4
      }
    }
  ]
}
```

---

### GET /api/patients/my-professionals

Retorna os profissionais vinculados ao paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta (200 OK):**

```json
{
  "professionals": [
    {
      "id": "uuid",
      "first_name": "Maria",
      "last_name": "Santos",
      "email": "dra.maria@email.com",
      "role": "psychologist",
      "avatar_url": null,
      "display_id": "CLA-XY34ZW",
      "specialization": "TCC",
      "institution": "Clinica Mente Saudavel",
      "license_number": "CRP 06/123456",
      "relationship_type": "psychologist",
      "started_at": "2025-01-16T10:00:00.000Z",
      "permissions": [
        {
          "permission_type": "emotional_logs",
          "granted": true
        }
      ]
    }
  ]
}
```

---

### PUT /api/patients/revoke-access

Paciente revoga o acesso de um profissional.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "professional_id": "uuid-do-profissional"
}
```

**Resposta (200 OK):**

```json
{
  "relationship": {
    "id": "uuid",
    "patient_id": "uuid",
    "professional_id": "uuid",
    "status": "inactive",
    "ended_at": "2025-01-20T10:00:00.000Z"
  },
  "message": "Acesso revogado com sucesso"
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | professional_id e obrigatorio |
| `404` | Vinculo ativo nao encontrado |

---

### POST /api/patients/:id/connect (DESCONTINUADO)

- **Status:** 410 Gone
- **Substituido por:** `POST /api/invitations`

---

### PUT /api/patients/:id/permissions

Paciente atualiza as permissoes de acesso de um profissional aos seus dados.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient` (apenas o proprio paciente)

**Request Body:**

```json
{
  "professional_id": "uuid-do-profissional",
  "permissions": [
    { "permission_type": "emotional_logs", "granted": true },
    { "permission_type": "clinical_notes", "granted": true },
    { "permission_type": "medications", "granted": false }
  ]
}
```

**Resposta (200 OK):**

```json
{
  "permissions": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "professional_id": "uuid",
      "permission_type": "emotional_logs",
      "granted": true
    }
  ]
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | professional_id e array de permissoes sao obrigatorios |
| `403` | Apenas o paciente pode atualizar suas proprias permissoes |
| `404` | Nenhum vinculo de cuidado encontrado com este profissional |

---

## 3. Profissionais (Professionals)

Todos os endpoints requerem autenticacao.

### GET /api/professionals

Lista profissionais disponiveis na plataforma.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `search` | string | Busca por nome ou especializacao |
| `role` | string | Filtrar por `psychologist` ou `psychiatrist` |
| `page` | integer | Pagina (padrao: 1) |
| `limit` | integer | Itens por pagina (padrao: 20, max: 100) |

**Resposta (200 OK):**

```json
{
  "professionals": [
    {
      "id": "uuid",
      "email": "dra.maria@email.com",
      "role": "psychologist",
      "first_name": "Maria",
      "last_name": "Santos",
      "avatar_url": null,
      "license_number": "CRP 06/123456",
      "specialization": "TCC",
      "institution": "Clinica Mente Saudavel",
      "bio": "Psicologa com 10 anos de experiencia.",
      "years_of_experience": 10
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

---

### GET /api/professionals/my-patients

Retorna os pacientes vinculados ao profissional autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "patients": [
    {
      "id": "uuid",
      "email": "joao@email.com",
      "first_name": "Joao",
      "last_name": "Silva",
      "phone": "(11) 99999-0000",
      "avatar_url": null,
      "created_at": "2025-01-15T10:00:00.000Z",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "onboarding_completed": true,
      "relationship_status": "active",
      "relationship_type": "psychologist",
      "started_at": "2025-01-16T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/professionals/:id

Retorna detalhes de um profissional especifico.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Resposta (200 OK):**

```json
{
  "professional": {
    "id": "uuid",
    "email": "dra.maria@email.com",
    "role": "psychologist",
    "first_name": "Maria",
    "last_name": "Santos",
    "avatar_url": null,
    "created_at": "2025-01-15T10:00:00.000Z",
    "license_number": "CRP 06/123456",
    "specialization": "TCC",
    "institution": "Clinica Mente Saudavel",
    "bio": "Psicologa com 10 anos de experiencia.",
    "years_of_experience": 10
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Profissional nao encontrado |

---

## 4. Registros Emocionais (Emotional Logs)

Todos os endpoints requerem autenticacao.

### POST /api/emotional-logs

Cria um novo registro emocional.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "mood_score": 7,
  "anxiety_score": 3,
  "energy_score": 6,
  "sleep_quality": "good",
  "sleep_hours": 7.5,
  "notes": "Dia tranquilo, sem grandes preocupacoes.",
  "journal_entry": "Hoje acordei bem e fiz exercicios...",
  "logged_at": "2025-01-15T10:00:00.000Z"
}
```

**Resposta (201 Created):**

```json
{
  "emotional_log": {
    "id": "uuid",
    "patient_id": "uuid",
    "mood_score": 7,
    "anxiety_score": 3,
    "energy_score": 6,
    "sleep_quality": "good",
    "sleep_hours": 7.5,
    "notes": "Dia tranquilo, sem grandes preocupacoes.",
    "journal_entry": "Hoje acordei bem e fiz exercicios...",
    "logged_at": "2025-01-15T10:00:00.000Z",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

> Nota: Apos criar o registro, alertas sao gerados automaticamente em segundo plano.

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/emotional-logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mood_score": 7, "anxiety_score": 3, "energy_score": 6}'
```

---

### GET /api/emotional-logs

Lista registros emocionais do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |
| `page` | integer | Pagina (padrao: 1) |
| `limit` | integer | Itens por pagina (padrao: 30, max: 100) |

**Resposta (200 OK):**

```json
{
  "emotional_logs": [ ... ],
  "pagination": { "page": 1, "limit": 30, "total": 42 }
}
```

---

### GET /api/emotional-logs/trends

Retorna tendencias emocionais agregadas por periodo.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `period` | string | `daily`, `weekly` (padrao) ou `monthly` |
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |

**Resposta (200 OK):**

```json
{
  "trends": [
    {
      "period_start": "2025-01-06T00:00:00.000Z",
      "avg_mood": 6.5,
      "avg_anxiety": 4.2,
      "avg_energy": 5.8,
      "avg_sleep_hours": 7.1,
      "log_count": 5
    }
  ],
  "period": "weekly"
}
```

---

### GET /api/emotional-logs/:patientId

Profissional visualiza registros emocionais de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `emotional_logs`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina |

**Resposta (200 OK):**

```json
{
  "emotional_logs": [ ... ],
  "pagination": { "page": 1, "limit": 30, "total": 42 }
}
```

---

## 5. Sintomas (Symptoms)

### GET /api/symptoms

Lista todos os sintomas de referencia disponiveis.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `category` | string | Filtrar por categoria |

**Resposta (200 OK):**

```json
{
  "symptoms": [
    {
      "id": "uuid",
      "name": "Insonia",
      "category": "sleep",
      "description": "Dificuldade para dormir"
    }
  ]
}
```

---

### POST /api/patient-symptoms

Paciente reporta um sintoma.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "symptom_id": "uuid-do-sintoma",
  "severity": 7,
  "notes": "Dificuldade para dormir nos ultimos 3 dias.",
  "reported_at": "2025-01-15T22:00:00.000Z"
}
```

**Resposta (201 Created):**

```json
{
  "patient_symptom": {
    "id": "uuid",
    "patient_id": "uuid",
    "symptom_id": "uuid",
    "severity": 7,
    "notes": "Dificuldade para dormir nos ultimos 3 dias.",
    "reported_at": "2025-01-15T22:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Sintoma nao encontrado |

---

### GET /api/patient-symptoms

Lista historico de sintomas do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 30) |

**Resposta (200 OK):**

```json
{
  "patient_symptoms": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "symptom_id": "uuid",
      "severity": 7,
      "notes": "...",
      "reported_at": "2025-01-15T22:00:00.000Z",
      "symptom_name": "Insonia",
      "symptom_category": "sleep"
    }
  ],
  "pagination": { "page": 1, "limit": 30, "total": 15 }
}
```

---

### GET /api/patient-symptoms/:patientId

Profissional visualiza sintomas de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `symptoms`

**Query Parameters:** Mesmos de `GET /api/patient-symptoms`

**Resposta (200 OK):** Mesmo formato de `GET /api/patient-symptoms`

---

## 6. Medicacoes (Medications)

### GET /api/medications

Lista medicamentos de referencia disponiveis.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `category` | string | Filtrar por categoria |
| `search` | string | Busca por nome |

**Resposta (200 OK):**

```json
{
  "medications": [
    {
      "id": "uuid",
      "name": "Sertralina",
      "category": "antidepressant",
      "description": "Inibidor seletivo da recaptacao de serotonina"
    }
  ]
}
```

---

### POST /api/patient-medications

Prescreve medicacao para um paciente (somente psiquiatra).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychiatrist`

**Request Body:**

```json
{
  "patient_id": "uuid-do-paciente",
  "medication_id": "uuid-do-medicamento",
  "dosage": "50mg",
  "frequency": "1x ao dia",
  "start_date": "2025-01-15",
  "end_date": "2025-04-15",
  "notes": "Iniciar com dose baixa"
}
```

**Resposta (201 Created):**

```json
{
  "patient_medication": {
    "id": "uuid",
    "patient_id": "uuid",
    "medication_id": "uuid",
    "prescribed_by": "uuid",
    "dosage": "50mg",
    "frequency": "1x ao dia",
    "start_date": "2025-01-15",
    "end_date": "2025-04-15",
    "status": "active",
    "notes": "Iniciar com dose baixa"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Sem vinculo de cuidado ativo com este paciente |
| `404` | Medicamento nao encontrado |

---

### PUT /api/patient-medications/:id

Atualiza uma prescricao (somente psiquiatra).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychiatrist`

**Request Body (campos opcionais):**

```json
{
  "dosage": "100mg",
  "frequency": "2x ao dia",
  "end_date": "2025-06-15",
  "status": "discontinued",
  "notes": "Aumento de dose apos avaliacao"
}
```

**Resposta (200 OK):**

```json
{
  "patient_medication": { ... }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Nenhum campo para atualizar |
| `404` | Prescricao nao encontrada ou sem acesso |

---

### GET /api/patient-medications

Lista medicacoes do paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente ve as proprias; profissional precisa de `patient_id`)

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `patient_id` | UUID | Obrigatorio para profissionais |
| `status` | string | Filtrar por status (`active`, `discontinued`, etc.) |

**Resposta (200 OK):**

```json
{
  "patient_medications": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "medication_id": "uuid",
      "dosage": "50mg",
      "frequency": "1x ao dia",
      "status": "active",
      "medication_name": "Sertralina",
      "medication_category": "antidepressant",
      "prescriber_first_name": "Dra. Ana",
      "prescriber_last_name": "Lima"
    }
  ]
}
```

---

### POST /api/medication-logs

Registra tomada ou pulo de medicacao (somente paciente).

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "patient_medication_id": "uuid-da-prescricao",
  "taken_at": "2025-01-15T08:00:00.000Z",
  "skipped": false,
  "skip_reason": null,
  "notes": "Tomei no horario"
}
```

Para registro de dose pulada:

```json
{
  "patient_medication_id": "uuid-da-prescricao",
  "skipped": true,
  "skip_reason": "Esqueci de tomar",
  "notes": null
}
```

**Resposta (201 Created):**

```json
{
  "medication_log": {
    "id": "uuid",
    "patient_medication_id": "uuid",
    "taken_at": "2025-01-15T08:00:00.000Z",
    "skipped": false,
    "skip_reason": null,
    "notes": "Tomei no horario"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | patient_medication_id e obrigatorio |
| `400` | skip_reason e obrigatorio quando a medicacao e pulada |
| `404` | Prescricao nao encontrada |

---

### GET /api/medication-logs

Lista logs de medicacao com resumo de aderencia.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente ve os proprios; profissional precisa de `patient_id`)

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `patient_id` | UUID | Obrigatorio para profissionais |
| `patient_medication_id` | UUID | Filtrar por prescricao especifica |
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |

**Resposta (200 OK):**

```json
{
  "medication_logs": [ ... ],
  "summary": {
    "total": 30,
    "taken": 27,
    "skipped": 3,
    "adherence_rate": 90
  }
}
```

---

## 7. Avaliacoes (Assessments)

### GET /api/assessments

Lista instrumentos de avaliacao disponiveis (PHQ-9, GAD-7, etc.).

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Resposta (200 OK):**

```json
{
  "assessments": [
    {
      "id": "uuid",
      "name": "PHQ-9",
      "description": "Questionario sobre a Saude do Paciente - Depressao",
      "questions": [ ... ]
    }
  ]
}
```

---

### POST /api/assessment-results

Envia resultado de uma avaliacao com calculo automatico de score.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "assessment_id": "uuid-da-avaliacao",
  "answers": [
    { "question_id": 1, "value": 2 },
    { "question_id": 2, "value": 1 },
    { "question_id": 3, "value": 3 }
  ]
}
```

**Resposta (201 Created):**

```json
{
  "assessment_result": {
    "id": "uuid",
    "patient_id": "uuid",
    "assessment_id": "uuid",
    "answers": [ ... ],
    "total_score": 12,
    "severity_level": "moderate",
    "completed_at": "2025-01-15T10:00:00.000Z"
  },
  "scoring": {
    "total_score": 12,
    "severity_level": "moderate",
    "assessment_name": "PHQ-9"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Respostas invalidas |
| `404` | Avaliacao nao encontrada |

---

### GET /api/assessment-results

Lista resultados de avaliacoes do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `assessment_id` | UUID | Filtrar por avaliacao especifica |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 20) |

**Resposta (200 OK):**

```json
{
  "assessment_results": [
    {
      "id": "uuid",
      "assessment_id": "uuid",
      "total_score": 12,
      "severity_level": "moderate",
      "completed_at": "2025-01-15T10:00:00.000Z",
      "assessment_name": "PHQ-9"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### GET /api/assessment-results/:patientId

Profissional visualiza resultados de avaliacoes de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `assessments`

**Query Parameters:** Mesmos de `GET /api/assessment-results`

**Resposta (200 OK):** Mesmo formato de `GET /api/assessment-results`

---

## 8. Eventos de Vida (Life Events)

### POST /api/life-events

Cria um evento de vida.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "title": "Mudanca de emprego",
  "description": "Comecei em um novo cargo na empresa X.",
  "category": "work",
  "impact_level": 4,
  "event_date": "2025-01-10"
}
```

**Resposta (201 Created):**

```json
{
  "life_event": {
    "id": "uuid",
    "patient_id": "uuid",
    "title": "Mudanca de emprego",
    "description": "Comecei em um novo cargo na empresa X.",
    "category": "work",
    "impact_level": 4,
    "event_date": "2025-01-10"
  }
}
```

---

### GET /api/life-events

Lista eventos de vida do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `category` | string | Filtrar por categoria |
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 30) |

**Resposta (200 OK):**

```json
{
  "life_events": [ ... ],
  "pagination": { "page": 1, "limit": 30, "total": 8 }
}
```

---

### GET /api/life-events/:patientId

Profissional visualiza eventos de vida de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `life_events`

**Query Parameters:** Mesmos de `GET /api/life-events`

**Resposta (200 OK):** Mesmo formato de `GET /api/life-events`

---

## 9. Notas Clinicas (Clinical Notes)

### POST /api/clinical-notes

Profissional cria uma nota clinica.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body:**

```json
{
  "patient_id": "uuid-do-paciente",
  "session_date": "2025-01-15",
  "note_type": "session_note",
  "content": "Paciente relatou melhora no humor...",
  "is_private": false
}
```

**Resposta (201 Created):**

```json
{
  "clinical_note": {
    "id": "uuid",
    "professional_id": "uuid",
    "patient_id": "uuid",
    "session_date": "2025-01-15",
    "note_type": "session_note",
    "content": "Paciente relatou melhora no humor...",
    "is_private": false,
    "created_at": "2025-01-15T15:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Sem vinculo de cuidado ativo com este paciente |

> Nota: Notas marcadas como `is_private: true` so sao visiveis pelo autor.

---

### GET /api/clinical-notes/:patientId

Lista notas clinicas de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (com vinculo ativo)
- **Permissao necessaria:** `clinical_notes`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `note_type` | string | Filtrar por tipo de nota |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 20) |

**Regras de visibilidade:**

- **Paciente:** Ve apenas notas nao privadas (`is_private = false`)
- **Profissional autor:** Ve todas as suas notas
- **Outro profissional:** Ve apenas notas nao privadas de outros autores

**Resposta (200 OK):**

```json
{
  "clinical_notes": [
    {
      "id": "uuid",
      "professional_id": "uuid",
      "patient_id": "uuid",
      "session_date": "2025-01-15",
      "note_type": "session_note",
      "content": "...",
      "is_private": false,
      "professional_first_name": "Maria",
      "professional_last_name": "Santos",
      "professional_role": "psychologist"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12 }
}
```

---

### PUT /api/clinical-notes/:id

Atualiza uma nota clinica (somente o autor).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist` (somente o autor)

**Request Body (campos opcionais):**

```json
{
  "session_date": "2025-01-16",
  "note_type": "follow_up",
  "content": "Conteudo atualizado...",
  "is_private": true
}
```

**Resposta (200 OK):**

```json
{
  "clinical_note": { ... }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Nenhum campo para atualizar |
| `403` | Sem permissao (nao e o autor) |

---

## 10. Insights de IA (Insights)

### GET /api/insights

Lista insights de IA do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `insight_type` | string | Filtrar por tipo de insight |
| `impact_level` | string | Filtrar por nivel de impacto |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 20) |

**Resposta (200 OK):**

```json
{
  "insights": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "insight_type": "mood_pattern",
      "content": "Observamos uma tendencia de queda no humor nas segundas-feiras...",
      "impact_level": "medium",
      "is_reviewed": false,
      "reviewed_by": null,
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3 }
}
```

---

### GET /api/insights/:patientId

Profissional visualiza insights de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `insight_type` | string | Filtrar por tipo |
| `impact_level` | string | Filtrar por impacto |
| `is_reviewed` | string | `true` ou `false` |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina |

**Resposta (200 OK):** Mesmo formato de `GET /api/insights`

---

### PUT /api/insights/:id/review

Profissional marca um insight como revisado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "insight": {
    "id": "uuid",
    "is_reviewed": true,
    "reviewed_by": "uuid-do-profissional"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Sem vinculo de cuidado ativo com este paciente |
| `404` | Insight nao encontrado |

---

## 11. Alertas (Alerts)

### GET /api/alerts

Lista alertas dos pacientes do profissional autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `severity` | string | Filtrar por severidade (`low`, `medium`, `high`, `critical`) |
| `is_acknowledged` | string | `true` ou `false` |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 30) |

**Resposta (200 OK):**

```json
{
  "alerts": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "alert_type": "mood_drop",
      "severity": "high",
      "title": "Queda significativa no humor",
      "description": "O paciente registrou queda de 3 pontos no humor nos ultimos 3 dias.",
      "is_acknowledged": false,
      "acknowledged_by": null,
      "acknowledged_at": null,
      "patient_first_name": "Joao",
      "patient_last_name": "Silva",
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 30, "total": 5 }
}
```

**Exemplo curl:**

```bash
curl -X GET "http://localhost:3001/api/alerts?severity=high&is_acknowledged=false" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/alerts/:patientId

Lista alertas de um paciente especifico.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `severity` | string | Filtrar por severidade |
| `is_acknowledged` | string | `true` ou `false` |

**Resposta (200 OK):**

```json
{
  "alerts": [ ... ]
}
```

---

### PUT /api/alerts/:id/acknowledge

Profissional reconhece (acknowledge) um alerta.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "alert": {
    "id": "uuid",
    "is_acknowledged": true,
    "acknowledged_by": "uuid-do-profissional",
    "acknowledged_at": "2025-01-15T12:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Alerta ja reconhecido |
| `403` | Sem vinculo de cuidado ativo com este paciente |
| `404` | Alerta nao encontrado |

---

## 12. Gemeo Digital (Digital Twin)

Todos os endpoints requerem autenticacao e sao restritos a profissionais.

### GET /api/digital-twin/:patientId

Retorna o estado mais recente do gemeo digital do paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `digital_twin`

**Resposta (200 OK):**

```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "current_state": {
    "mood": 6.5,
    "anxiety": 4.2,
    "energy": 5.8
  },
  "correlations": { ... },
  "baseline": { ... },
  "predictions": [ ... ],
  "treatment_responses": { ... },
  "data_points_used": 150,
  "model_version": "1.0",
  "confidence_overall": 0.85,
  "computed_at": "2025-01-15T10:00:00.000Z",
  "created_at": "2025-01-15T10:00:00.000Z"
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Gemeo digital ainda nao disponivel para este paciente |

---

### GET /api/digital-twin/:patientId/history

Retorna a evolucao do gemeo digital ao longo do tempo.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `digital_twin`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `days` | integer | Numero de dias retroativos (padrao: 90) |

**Resposta (200 OK):**

```json
{
  "history": [
    {
      "id": "uuid",
      "computed_at": "2025-01-01T00:00:00.000Z",
      "current_state": { ... },
      "confidence_overall": 0.82
    }
  ]
}
```

---

### GET /api/digital-twin/:patientId/predictions

Retorna apenas as predicoes mais recentes (endpoint leve).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `digital_twin`

**Resposta (200 OK):**

```json
{
  "predictions": [
    {
      "type": "mood_forecast",
      "value": 5.8,
      "confidence": 0.78,
      "horizon_days": 7
    }
  ],
  "confidence_overall": 0.85,
  "computed_at": "2025-01-15T10:00:00.000Z"
}
```

---

### POST /api/digital-twin/:patientId/refresh

Dispara recomputacao do gemeo digital via motor de IA.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `digital_twin`

**Resposta (200 OK):**

```json
{
  "status": "success",
  "message": "Gemeo digital atualizado com sucesso",
  "analysis": { ... }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `503` | Motor de IA indisponivel. Tente novamente mais tarde. |

---

## 13. Diario (Journal)

### POST /api/journal

Cria uma entrada de diario com check-in diario.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "mood_score": 7,
  "anxiety_score": 3,
  "energy_score": 6,
  "sleep_quality": "good",
  "sleep_hours": 7.5,
  "journal_entry": "Hoje foi um dia produtivo. Consegui manter o foco...",
  "notes": "Sem observacoes adicionais",
  "logged_at": "2025-01-15T22:00:00.000Z"
}
```

**Resposta (201 Created):**

```json
{
  "journal": {
    "id": "uuid",
    "patient_id": "uuid",
    "mood_score": 7,
    "anxiety_score": 3,
    "energy_score": 6,
    "sleep_quality": "good",
    "sleep_hours": 7.5,
    "journal_entry": "Hoje foi um dia produtivo. Consegui manter o foco...",
    "notes": "Sem observacoes adicionais",
    "logged_at": "2025-01-15T22:00:00.000Z"
  }
}
```

> Nota: Os dados sao salvos na tabela `emotional_logs`. Alertas sao gerados automaticamente.

---

### GET /api/journal

Lista entradas de diario do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `start_date` | ISO date | Data inicial |
| `end_date` | ISO date | Data final |
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 20) |

**Resposta (200 OK):**

```json
{
  "journals": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 30 }
}
```

---

### GET /api/journal/:patientId

Profissional acessa diarios de um paciente (somente entradas com texto).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `journal_entries`

**Query Parameters:** Mesmos de `GET /api/journal`

**Resposta (200 OK):** Mesmo formato de `GET /api/journal`

---

## 14. Metas (Goals)

### POST /api/goals

Profissional cria uma meta para um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body:**

```json
{
  "patient_id": "uuid-do-paciente",
  "title": "Praticar 30 min de exercicio 3x por semana",
  "description": "Meta para melhorar o humor e a qualidade do sono.",
  "target_date": "2025-03-15"
}
```

**Resposta (201 Created):**

```json
{
  "goal": {
    "id": "uuid",
    "patient_id": "uuid",
    "created_by": "uuid",
    "title": "Praticar 30 min de exercicio 3x por semana",
    "description": "Meta para melhorar o humor e a qualidade do sono.",
    "status": "in_progress",
    "patient_status": "pending",
    "target_date": "2025-03-15",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado a este paciente |

---

### GET /api/goals/:patientId

Lista metas de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente ve as proprias; profissional precisa de vinculo)

**Resposta (200 OK):**

```json
{
  "goals": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "title": "Praticar exercicios",
      "description": "...",
      "status": "in_progress",
      "patient_status": "accepted",
      "target_date": "2025-03-15",
      "achieved_at": null,
      "created_by_first_name": "Maria",
      "created_by_last_name": "Santos"
    }
  ]
}
```

---

### PUT /api/goals/:id

Profissional atualiza uma meta.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body (campos opcionais):**

```json
{
  "title": "Titulo atualizado",
  "description": "Descricao atualizada",
  "status": "paused",
  "target_date": "2025-04-15"
}
```

**Valores aceitos para `status`:** `in_progress`, `paused`, `cancelled`

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Nao e possivel alterar o status de uma meta pendente de aceitacao |
| `404` | Meta nao encontrada ou acesso negado |

---

### PUT /api/goals/:id/achieve

Profissional marca uma meta como conquistada.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "goal": {
    "id": "uuid",
    "status": "achieved",
    "achieved_at": "2025-02-15T10:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Meta precisa ser aceita pelo paciente antes de ser conquistada |
| `404` | Meta nao encontrada ou acesso negado |

---

### PUT /api/goals/:id/respond

Paciente aceita ou rejeita uma meta proposta.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "action": "accept"
}
```

Ou para rejeitar:

```json
{
  "action": "reject",
  "rejection_reason": "Nao me sinto pronto para essa meta neste momento."
}
```

**Resposta (200 OK):**

```json
{
  "goal": {
    "id": "uuid",
    "patient_status": "accepted",
    "responded_at": "2025-01-16T10:00:00.000Z"
  }
}
```

> Nota: Quando o paciente rejeita uma meta, um alerta e criado automaticamente para os profissionais vinculados.

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Esta meta ja foi respondida |
| `404` | Meta nao encontrada |

---

### POST /api/goals/milestones

Profissional cria um marco (milestone).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body:**

```json
{
  "patient_id": "uuid-do-paciente",
  "title": "Primeira semana de exercicios completa",
  "description": "Paciente completou a primeira semana de atividades fisicas.",
  "milestone_type": "positive",
  "event_date": "2025-01-22",
  "goal_id": "uuid-da-meta"
}
```

**Valores aceitos para `milestone_type`:** `positive`, `difficult`

**Resposta (201 Created):**

```json
{
  "milestone": {
    "id": "uuid",
    "patient_id": "uuid",
    "goal_id": "uuid",
    "title": "Primeira semana de exercicios completa",
    "milestone_type": "positive",
    "event_date": "2025-01-22",
    "created_by": "uuid"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado a este paciente |

---

### GET /api/goals/milestones/:patientId

Lista marcos de um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente ve os proprios; profissional precisa de vinculo)

**Resposta (200 OK):**

```json
{
  "milestones": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "goal_id": "uuid",
      "title": "Primeira semana de exercicios completa",
      "description": "...",
      "milestone_type": "positive",
      "event_date": "2025-01-22",
      "created_by_first_name": "Maria",
      "created_by_last_name": "Santos",
      "goal_title": "Praticar exercicios"
    }
  ]
}
```

---

## 15. Chat

Todos os endpoints requerem autenticacao e role de profissional.

### GET /api/chat/conversations

Lista conversas do profissional autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "conversations": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "patient_first_name": "Joao",
      "patient_last_name": "Silva",
      "other_user_id": "uuid",
      "other_first_name": "Ana",
      "other_last_name": "Lima",
      "other_role": "psychiatrist",
      "last_message": "Combinado, vou ajustar a medicacao.",
      "last_message_at": "2025-01-15T14:30:00.000Z",
      "last_message_sender_id": "uuid",
      "unread_count": 2,
      "created_at": "2025-01-10T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/chat/conversations

Cria ou retorna conversa existente entre dois profissionais sobre um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body:**

```json
{
  "other_user_id": "uuid-do-outro-profissional",
  "patient_id": "uuid-do-paciente"
}
```

**Resposta (201 Created):**

```json
{
  "conversation": {
    "id": "uuid",
    "existing": false
  }
}
```

Se ja existir:

```json
{
  "conversation": {
    "id": "uuid",
    "existing": true
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Ambos profissionais devem ter acesso ao paciente |

---

### GET /api/chat/conversations/:id/messages

Lista mensagens de uma conversa.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `page` | integer | Pagina |
| `limit` | integer | Itens por pagina (padrao: 50, max: 100) |

**Resposta (200 OK):**

```json
{
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "content": "Boa tarde, gostaria de discutir o caso do paciente.",
      "read_at": null,
      "created_at": "2025-01-15T14:00:00.000Z",
      "sender_first_name": "Maria",
      "sender_last_name": "Santos"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 12 }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado a esta conversa |

---

### POST /api/chat/conversations/:id/messages

Envia uma mensagem em uma conversa.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Request Body:**

```json
{
  "content": "Boa tarde, gostaria de discutir o caso do paciente."
}
```

**Resposta (201 Created):**

```json
{
  "message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "content": "Boa tarde, gostaria de discutir o caso do paciente.",
    "created_at": "2025-01-15T14:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado a esta conversa |

---

### PUT /api/chat/conversations/:id/read

Marca mensagens como lidas em uma conversa.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "success": true
}
```

---

### GET /api/chat/unread-count

Retorna o total de mensagens nao lidas para o profissional.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "unread_count": 5
}
```

---

## 16. Resumos (Summaries)

Todos os endpoints sao restritos a profissionais.

### POST /api/summaries/:patientId/generate

Gera um novo resumo via IA para o paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `emotional_logs`

**Request Body (opcional):**

```json
{
  "period_days": 7
}
```

**Resposta (201 Created):**

```json
{
  "summary": {
    "id": "uuid",
    "patient_id": "uuid",
    "content": "Resumo dos ultimos 7 dias...",
    "period_days": 7,
    "generated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### GET /api/summaries/:patientId

Lista resumos gerados para um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `emotional_logs`

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `limit` | integer | Maximo de resumos (padrao: 10, max: 50) |

**Resposta (200 OK):**

```json
{
  "summaries": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "content": "...",
      "generated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/summaries/:patientId/brief

Retorna um briefing compilado do paciente para o profissional.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`
- **Permissao necessaria:** `emotional_logs`

**Resposta (200 OK):**

```json
{
  "brief": {
    "patient_id": "uuid",
    "summary": "...",
    "key_metrics": { ... },
    "recent_alerts": [ ... ],
    "compiled_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## 17. Onboarding

### GET /api/onboarding

Retorna os dados de onboarding do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta (200 OK):**

```json
{
  "profile": {
    "onboarding_completed": false,
    "onboarding_data": {},
    "date_of_birth": null,
    "gender": null,
    "emergency_contact_name": null,
    "emergency_contact_phone": null,
    "phone": null
  }
}
```

---

### PUT /api/onboarding

Salva o formulario de onboarding completo e marca como finalizado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "full_name": "Joao da Silva",
  "email": "joao@email.com",
  "phone": "(11) 99999-0000",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "emergency_contact_name": "Maria Silva",
  "emergency_contact_phone": "(11) 98888-0000",
  "personal": {
    "marital_status": "single",
    "occupation": "Engenheiro"
  },
  "physical": {
    "height": 175,
    "weight": 70,
    "exercises": true
  },
  "gynecological": {},
  "medical": {
    "allergies": "Nenhuma",
    "chronic_conditions": [],
    "previous_treatments": "Nenhum"
  },
  "family_history": "Historico de depressao na familia materna.",
  "current_treatments": "Nenhum tratamento atual."
}
```

**Resposta (200 OK):**

```json
{
  "profile": {
    "onboarding_completed": true,
    "onboarding_data": { ... },
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "emergency_contact_name": "Maria Silva",
    "emergency_contact_phone": "(11) 98888-0000",
    "phone": "(11) 99999-0000"
  }
}
```

**Exemplo curl:**

```bash
curl -X PUT http://localhost:3001/api/onboarding \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Joao da Silva",
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "personal": {"marital_status": "single"},
    "medical": {"allergies": "Nenhuma"}
  }'
```

---

## 18. Documentos (Documents)

### POST /api/documents

Paciente faz upload de um documento.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`
- **Content-Type:** `multipart/form-data`

**Form Data:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `file` | File | Arquivo (max: 10MB, PDF/JPEG/PNG) |
| `document_type` | string | Tipo do documento (opcional) |
| `document_date` | ISO date | Data do documento (opcional) |
| `notes` | string | Observacoes (opcional) |

**Resposta (201 Created):**

```json
{
  "document": {
    "id": "uuid",
    "patient_id": "uuid",
    "file_name": "abc123.pdf",
    "original_name": "laudo_medico.pdf",
    "file_type": "pdf",
    "file_size": 204800,
    "document_type": "laudo",
    "document_date": "2025-01-10",
    "notes": null,
    "uploaded_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Arquivo muito grande. Maximo: 10MB. |
| `400` | Nenhum arquivo enviado. |

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@/caminho/para/laudo.pdf" \
  -F "document_type=laudo" \
  -F "document_date=2025-01-10"
```

---

### GET /api/documents

Lista documentos do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta (200 OK):**

```json
{
  "documents": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "file_name": "abc123.pdf",
      "original_name": "laudo_medico.pdf",
      "file_type": "pdf",
      "file_size": 204800,
      "document_type": "laudo",
      "document_date": "2025-01-10",
      "notes": null,
      "uploaded_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/documents/:id/file

Serve o arquivo do documento (com controle de acesso).

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente: deve ser dono; profissional: precisa de `documents` permission + `document_access`)

**Resposta:** Arquivo binario com headers `Content-Type` e `Content-Disposition`.

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado / Acesso negado a este documento |
| `404` | Documento nao encontrado / Arquivo nao encontrado no servidor |

---

### DELETE /api/documents/:id

Paciente exclui um documento.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta:** `204 No Content`

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Documento nao encontrado |

---

### GET /api/documents/:id/access

Lista quais profissionais tem acesso a um documento especifico.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta (200 OK):**

```json
{
  "access": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "professional_id": "uuid",
      "granted_at": "2025-01-15T10:00:00.000Z",
      "first_name": "Maria",
      "last_name": "Santos",
      "role": "psychologist"
    }
  ]
}
```

---

### PUT /api/documents/:id/access

Paciente concede ou revoga acesso de um profissional a um documento.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "professional_id": "uuid-do-profissional",
  "granted": true
}
```

Para revogar:

```json
{
  "professional_id": "uuid-do-profissional",
  "granted": false
}
```

**Resposta (200 OK):**

```json
{
  "access": [ ... ]
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | professional_id e obrigatorio / Profissional nao vinculado |
| `404` | Documento nao encontrado |

---

### GET /api/documents/patient/:patientId

Profissional lista documentos compartilhados por um paciente.

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "documents": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "file_name": "abc123.pdf",
      "original_name": "laudo_medico.pdf",
      "file_type": "pdf",
      "file_size": 204800,
      "document_type": "laudo",
      "document_date": "2025-01-10",
      "notes": null,
      "uploaded_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## 19. Exames (Exams)

### POST /api/exams

Paciente faz upload de um exame.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`
- **Content-Type:** `multipart/form-data`

**Form Data:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `file` | File | Arquivo do exame (max: 10MB) |
| `exam_type` | string | Tipo do exame (obrigatorio) |
| `exam_date` | ISO date | Data do exame (obrigatorio) |
| `notes` | string | Observacoes (opcional) |
| `professional_ids` | JSON string | Array de UUIDs de profissionais para conceder acesso (opcional) |

**Resposta (201 Created):**

```json
{
  "exam": {
    "id": "uuid",
    "patient_id": "uuid",
    "exam_type": "hemograma",
    "exam_date": "2025-01-10",
    "file_name": "abc123.pdf",
    "original_name": "hemograma_jan2025.pdf",
    "mime_type": "application/pdf",
    "file_size": 512000,
    "notes": null,
    "permissions": [
      { "professional_id": "uuid" }
    ]
  }
}
```

> Nota: Um alerta e criado automaticamente para os profissionais vinculados.

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | Arquivo muito grande. Maximo: 10MB. |
| `400` | Nenhum arquivo enviado. |
| `400` | exam_type e exam_date sao obrigatorios. |

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/exams \
  -H "Authorization: Bearer <token>" \
  -F "file=@/caminho/para/hemograma.pdf" \
  -F "exam_type=hemograma" \
  -F "exam_date=2025-01-10" \
  -F 'professional_ids=["uuid-prof-1", "uuid-prof-2"]'
```

---

### GET /api/exams/my-exams

Lista todos os exames do paciente autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta (200 OK):**

```json
{
  "exams": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "exam_type": "hemograma",
      "exam_date": "2025-01-10",
      "file_name": "abc123.pdf",
      "original_name": "hemograma_jan2025.pdf",
      "mime_type": "application/pdf",
      "file_size": 512000,
      "notes": null,
      "permissions": [
        {
          "professional_id": "uuid",
          "first_name": "Maria",
          "last_name": "Santos",
          "role": "psychologist"
        }
      ]
    }
  ]
}
```

---

### GET /api/exams/patient/:patientId

Profissional visualiza exames de um paciente (somente os com permissao).

- **Autenticacao:** Sim
- **Role obrigatoria:** `psychologist`, `psychiatrist`

**Resposta (200 OK):**

```json
{
  "exams": [ ... ]
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Sem vinculo de cuidado ativo com este paciente. |

---

### GET /api/exams/download/:examId

Download do arquivo de um exame.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (paciente: deve ser dono; profissional: precisa de `exam_permissions`)

**Resposta:** Arquivo binario com headers `Content-Type` e `Content-Disposition`.

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Acesso negado. / Acesso negado a este exame. |
| `404` | Exame nao encontrado. / Arquivo nao encontrado no servidor. |

---

### DELETE /api/exams/:examId

Paciente exclui um exame.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Resposta:** `204 No Content`

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `404` | Exame nao encontrado. |

---

### PUT /api/exams/:examId/permissions

Paciente atualiza permissoes de acesso a um exame.

- **Autenticacao:** Sim
- **Role obrigatoria:** `patient`

**Request Body:**

```json
{
  "professional_ids": ["uuid-prof-1", "uuid-prof-2"]
}
```

> Nota: As permissoes sao substituidas integralmente. Profissionais que nao estiverem na lista perdem acesso. Novos profissionais recebem um alerta.

**Resposta (200 OK):**

```json
{
  "permissions": [
    {
      "professional_id": "uuid",
      "first_name": "Maria",
      "last_name": "Santos",
      "role": "psychologist"
    }
  ]
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | professional_ids deve ser um array. |
| `404` | Exame nao encontrado. |

---

## 20. Convites (Invitations)

### POST /api/invitations

Envia um convite de vinculo (paciente-profissional).

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Request Body:**

```json
{
  "display_id": "CLA-XY34ZW",
  "message": "Gostaria de iniciar acompanhamento com voce."
}
```

**Resposta (201 Created):**

```json
{
  "invitation": {
    "id": "uuid",
    "patient_id": "uuid",
    "professional_id": "uuid",
    "relationship_type": "psychologist",
    "status": "pending",
    "invited_by": "uuid",
    "invitation_message": "Gostaria de iniciar acompanhamento com voce.",
    "other_first_name": "Maria",
    "other_last_name": "Santos",
    "other_role": "psychologist",
    "other_display_id": "CLA-XY34ZW"
  },
  "reactivation": false
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | display_id e obrigatorio |
| `400` | Voce nao pode enviar um convite para si mesmo |
| `400` | O convite deve ser entre um paciente e um profissional |
| `404` | Usuario nao encontrado com este ID |
| `409` | Ja existe um vinculo ativo com este usuario |
| `409` | Ja existe um convite pendente com este usuario |

**Exemplo curl:**

```bash
curl -X POST http://localhost:3001/api/invitations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_id": "CLA-XY34ZW", "message": "Gostaria de ser seu paciente."}'
```

---

### GET /api/invitations/pending

Lista convites pendentes recebidos pelo usuario autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Resposta (200 OK):**

```json
{
  "invitations": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "professional_id": "uuid",
      "relationship_type": "psychologist",
      "status": "pending",
      "invited_by": "uuid",
      "invitation_message": "Gostaria de iniciar acompanhamento.",
      "created_at": "2025-01-15T10:00:00.000Z",
      "other_first_name": "Joao",
      "other_last_name": "Silva",
      "other_role": "patient",
      "other_display_id": "CLA-AB12CD",
      "other_avatar_url": null,
      "specialization": "TCC",
      "institution": "Clinica Mente Saudavel"
    }
  ]
}
```

---

### GET /api/invitations/sent

Lista convites pendentes enviados pelo usuario autenticado.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Resposta (200 OK):** Mesmo formato de `GET /api/invitations/pending`

---

### PUT /api/invitations/:id/respond

Aceita ou rejeita um convite recebido.

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (somente o destinatario pode responder)

**Request Body:**

```json
{
  "action": "accept"
}
```

Ou:

```json
{
  "action": "reject"
}
```

**Resposta (200 OK):**

```json
{
  "relationship": {
    "id": "uuid",
    "status": "active",
    "started_at": "2025-01-16T10:00:00.000Z",
    "responded_at": "2025-01-16T10:00:00.000Z"
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | action deve ser "accept" ou "reject" |
| `403` | Voce nao pode responder ao proprio convite / Acesso negado |
| `404` | Convite nao encontrado ou ja respondido |

---

### DELETE /api/invitations/:id

Cancela um convite enviado (somente o remetente pode cancelar).

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer (somente o remetente)

**Resposta:** `204 No Content`

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `403` | Apenas quem enviou pode cancelar o convite |
| `404` | Convite nao encontrado ou ja respondido |

---

## 21. Usuarios (Users)

### GET /api/users/search

Busca um usuario pelo display_id (retorna informacoes basicas).

- **Autenticacao:** Sim
- **Role obrigatoria:** Qualquer

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `display_id` | string | ID publico do usuario (ex: `CLA-AB12CD`) |

**Resposta (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "display_id": "CLA-AB12CD",
    "first_name": "Joao",
    "last_name": "Silva",
    "role": "patient",
    "avatar_url": null,
    "specialization": null,
    "institution": null
  }
}
```

**Erros:**

| Codigo | Mensagem |
|--------|----------|
| `400` | display_id e obrigatorio |
| `404` | Usuario nao encontrado |

**Exemplo curl:**

```bash
curl -X GET "http://localhost:3001/api/users/search?display_id=CLA-AB12CD" \
  -H "Authorization: Bearer <token>"
```

---

## Referencia Rapida de Endpoints

| # | Metodo | Endpoint | Role |
|---|--------|----------|------|
| 1 | POST | `/api/auth/register` | Publico |
| 2 | POST | `/api/auth/login` | Publico |
| 3 | GET | `/api/auth/me` | Qualquer |
| 4 | PUT | `/api/auth/me` | Qualquer |
| 5 | POST | `/api/auth/forgot-password` | Publico |
| 6 | POST | `/api/auth/reset-password` | Publico |
| 7 | GET | `/api/patients` | Profissional |
| 8 | GET | `/api/patients/:id` | Vinculo ativo |
| 9 | GET | `/api/patients/:id/timeline` | Vinculo ativo |
| 10 | GET | `/api/patients/my-professionals` | Paciente |
| 11 | PUT | `/api/patients/revoke-access` | Paciente |
| 12 | PUT | `/api/patients/:id/permissions` | Paciente |
| 13 | GET | `/api/professionals` | Qualquer |
| 14 | GET | `/api/professionals/my-patients` | Profissional |
| 15 | GET | `/api/professionals/:id` | Qualquer |
| 16 | POST | `/api/emotional-logs` | Paciente |
| 17 | GET | `/api/emotional-logs` | Paciente |
| 18 | GET | `/api/emotional-logs/trends` | Paciente |
| 19 | GET | `/api/emotional-logs/:patientId` | Profissional |
| 20 | GET | `/api/symptoms` | Qualquer |
| 21 | POST | `/api/patient-symptoms` | Paciente |
| 22 | GET | `/api/patient-symptoms` | Paciente |
| 23 | GET | `/api/patient-symptoms/:patientId` | Profissional |
| 24 | GET | `/api/medications` | Qualquer |
| 25 | POST | `/api/patient-medications` | Psiquiatra |
| 26 | PUT | `/api/patient-medications/:id` | Psiquiatra |
| 27 | GET | `/api/patient-medications` | Qualquer |
| 28 | POST | `/api/medication-logs` | Paciente |
| 29 | GET | `/api/medication-logs` | Qualquer |
| 30 | GET | `/api/assessments` | Qualquer |
| 31 | POST | `/api/assessment-results` | Paciente |
| 32 | GET | `/api/assessment-results` | Paciente |
| 33 | GET | `/api/assessment-results/:patientId` | Profissional |
| 34 | POST | `/api/life-events` | Paciente |
| 35 | GET | `/api/life-events` | Paciente |
| 36 | GET | `/api/life-events/:patientId` | Profissional |
| 37 | POST | `/api/clinical-notes` | Profissional |
| 38 | GET | `/api/clinical-notes/:patientId` | Vinculo ativo |
| 39 | PUT | `/api/clinical-notes/:id` | Autor |
| 40 | GET | `/api/insights` | Paciente |
| 41 | GET | `/api/insights/:patientId` | Profissional |
| 42 | PUT | `/api/insights/:id/review` | Profissional |
| 43 | GET | `/api/alerts` | Profissional |
| 44 | GET | `/api/alerts/:patientId` | Profissional |
| 45 | PUT | `/api/alerts/:id/acknowledge` | Profissional |
| 46 | GET | `/api/digital-twin/:patientId` | Profissional |
| 47 | GET | `/api/digital-twin/:patientId/history` | Profissional |
| 48 | GET | `/api/digital-twin/:patientId/predictions` | Profissional |
| 49 | POST | `/api/digital-twin/:patientId/refresh` | Profissional |
| 50 | POST | `/api/journal` | Paciente |
| 51 | GET | `/api/journal` | Paciente |
| 52 | GET | `/api/journal/:patientId` | Profissional |
| 53 | POST | `/api/goals` | Profissional |
| 54 | GET | `/api/goals/:patientId` | Vinculo ativo |
| 55 | PUT | `/api/goals/:id` | Profissional |
| 56 | PUT | `/api/goals/:id/achieve` | Profissional |
| 57 | PUT | `/api/goals/:id/respond` | Paciente |
| 58 | POST | `/api/goals/milestones` | Profissional |
| 59 | GET | `/api/goals/milestones/:patientId` | Vinculo ativo |
| 60 | GET | `/api/chat/conversations` | Profissional |
| 61 | POST | `/api/chat/conversations` | Profissional |
| 62 | GET | `/api/chat/conversations/:id/messages` | Profissional |
| 63 | POST | `/api/chat/conversations/:id/messages` | Profissional |
| 64 | PUT | `/api/chat/conversations/:id/read` | Profissional |
| 65 | GET | `/api/chat/unread-count` | Profissional |
| 66 | POST | `/api/summaries/:patientId/generate` | Profissional |
| 67 | GET | `/api/summaries/:patientId` | Profissional |
| 68 | GET | `/api/summaries/:patientId/brief` | Profissional |
| 69 | GET | `/api/onboarding` | Paciente |
| 70 | PUT | `/api/onboarding` | Paciente |
| 71 | POST | `/api/documents` | Paciente |
| 72 | GET | `/api/documents` | Paciente |
| 73 | GET | `/api/documents/:id/file` | Vinculo ativo |
| 74 | DELETE | `/api/documents/:id` | Paciente |
| 75 | GET | `/api/documents/:id/access` | Paciente |
| 76 | PUT | `/api/documents/:id/access` | Paciente |
| 77 | GET | `/api/documents/patient/:patientId` | Profissional |
| 78 | POST | `/api/exams` | Paciente |
| 79 | GET | `/api/exams/my-exams` | Paciente |
| 80 | GET | `/api/exams/patient/:patientId` | Profissional |
| 81 | GET | `/api/exams/download/:examId` | Vinculo ativo |
| 82 | DELETE | `/api/exams/:examId` | Paciente |
| 83 | PUT | `/api/exams/:examId/permissions` | Paciente |
| 84 | POST | `/api/invitations` | Qualquer |
| 85 | GET | `/api/invitations/pending` | Qualquer |
| 86 | GET | `/api/invitations/sent` | Qualquer |
| 87 | PUT | `/api/invitations/:id/respond` | Destinatario |
| 88 | DELETE | `/api/invitations/:id` | Remetente |
| 89 | GET | `/api/users/search` | Qualquer |
