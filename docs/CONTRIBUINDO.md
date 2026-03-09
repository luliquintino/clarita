# Guia de Contribuicao -- Clarita

Obrigado pelo interesse em contribuir com a Clarita! Este guia descreve como configurar o ambiente, as convencoes que seguimos e o fluxo para enviar suas contribuicoes.

---

## Sumario

1. [Requisitos](#1-requisitos)
2. [Configuracao do Ambiente de Desenvolvimento](#2-configuracao-do-ambiente-de-desenvolvimento)
3. [Convencoes de Codigo](#3-convencoes-de-codigo)
4. [Como Rodar os Testes](#4-como-rodar-os-testes)
5. [Como Criar Pull Requests](#5-como-criar-pull-requests)
6. [Estrutura do Banco de Teste](#6-estrutura-do-banco-de-teste)
7. [Codigo de Conduta](#7-codigo-de-conduta)

---

## 1. Requisitos

Antes de comecar, certifique-se de ter as seguintes ferramentas instaladas:

| Ferramenta | Versao Minima |
| ---------- | ------------- |
| Node.js    | 18+           |
| npm        | 9+            |
| PostgreSQL | 16+           |
| Git        | 2.30+         |

Para verificar as versoes instaladas:

```bash
node -v
npm -v
psql --version
git --version
```

---

## 2. Configuracao do Ambiente de Desenvolvimento

### 2.1. Faca o fork e clone o repositorio

```bash
git clone https://github.com/SEU-USUARIO/Clarita.git
cd Clarita
```

### 2.2. Configure o backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` na raiz do diretorio `backend/` com base no exemplo fornecido:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais locais do PostgreSQL (host, porta, usuario, senha e nome do banco).

### 2.3. Configure o banco de dados

Crie os bancos de desenvolvimento e teste no PostgreSQL:

```sql
CREATE DATABASE clarita;
CREATE DATABASE clarita_test;
```

Em seguida, rode as migrations (se disponiveis):

```bash
npm run migrate
```

### 2.4. Configure o dashboard

```bash
cd ../dashboard
npm install
```

Crie o arquivo `.env.local` na raiz do diretorio `dashboard/` com base no exemplo fornecido:

```bash
cp .env.example .env.local
```

### 2.5. Inicie os servicos

Em terminais separados:

```bash
# Terminal 1 -- Backend
cd backend
npm run dev

# Terminal 2 -- Dashboard
cd dashboard
npm run dev
```

O backend estara disponivel em `http://localhost:3001` (ou a porta configurada) e o dashboard em `http://localhost:3000`.

---

## 3. Convencoes de Codigo

### 3.1. Linting e Formatacao

Usamos **ESLint** para analise estatica e **Prettier** para formatacao. Sempre rode os dois antes de fazer commit:

```bash
# Backend
cd backend
npm run lint
npm run format

# Dashboard
cd dashboard
npm run lint
npm run format
```

Nao faca commit de codigo com erros de lint. Corrija todos os avisos e erros antes de enviar.

### 3.2. Nomenclatura de Variaveis

| Contexto              | Convencao    | Exemplo               |
| --------------------- | ------------ | --------------------- |
| Backend (JavaScript)  | `snake_case` | `user_name`, `is_active`, `get_all_sessions` |
| Frontend (TypeScript) | `camelCase`  | `userName`, `isActive`, `getAllSessions`      |

Essa distincao existe porque o backend se comunica diretamente com o PostgreSQL (que usa `snake_case` por padrao), enquanto o frontend segue as convencoes do ecossistema TypeScript/React.

### 3.3. Mensagens de Commit

As mensagens de commit devem ser escritas **em ingles** e seguir o padrao de prefixos:

| Prefixo     | Uso                                        |
| ----------- | ------------------------------------------ |
| `feat:`     | Nova funcionalidade                        |
| `fix:`      | Correcao de bug                            |
| `docs:`     | Alteracao em documentacao                  |
| `chore:`    | Tarefas de manutencao (deps, configs etc.) |
| `test:`     | Adicao ou correcao de testes               |
| `refactor:` | Refatoracao sem mudanca de comportamento   |

Exemplos:

```
feat: add mood tracking endpoint
fix: resolve null pointer on session creation
docs: update API endpoint descriptions
chore: upgrade express to v4.19
test: add unit tests for auth middleware
refactor: simplify error handling in routes
```

Mantenha a primeira linha com no maximo **72 caracteres**. Se precisar de mais detalhes, adicione um corpo separado por uma linha em branco.

---

## 4. Como Rodar os Testes

### 4.1. Testes do Backend (Jest + Supertest)

```bash
cd backend

# Rodar todos os testes
npm test

# Rodar testes com relatorio de cobertura
npm run test:coverage
```

Os testes do backend utilizam o banco `clarita_test` (veja a secao 6).

### 4.2. Testes do Dashboard (Jest + React Testing Library)

```bash
cd dashboard

# Rodar todos os testes
npm test

# Rodar testes com relatorio de cobertura
npm run test:coverage
```

### 4.3. Testes End-to-End (Playwright)

```bash
# Na raiz do projeto ou no diretorio de testes
npx playwright test
```

Certifique-se de que tanto o backend quanto o dashboard estejam rodando antes de executar os testes E2E.

Para rodar em modo visual (com navegador aberto):

```bash
npx playwright test --headed
```

Para ver o relatorio de testes:

```bash
npx playwright show-report
```

---

## 5. Como Criar Pull Requests

### 5.1. Crie uma branch

Sempre crie uma branch a partir da `main` com um dos seguintes prefixos:

```bash
# Para novas funcionalidades
git checkout -b feature/descricao-curta

# Para correcoes de bugs
git checkout -b fix/descricao-curta
```

Exemplos:

```
feature/mood-tracking-api
feature/dashboard-charts
fix/session-timeout-error
fix/login-redirect-loop
```

### 5.2. Faca seus commits

Siga as convencoes de commit descritas na secao 3.3. Faca commits pequenos e focados.

### 5.3. Antes de abrir o PR, verifique

- [ ] Todos os testes estao passando (`npm test` no backend e no dashboard)
- [ ] O lint esta limpo (`npm run lint` sem erros)
- [ ] A formatacao esta correta (`npm run format`)
- [ ] O codigo nao quebra funcionalidades existentes
- [ ] Novos endpoints ou componentes possuem testes

### 5.4. Abra o Pull Request

1. Faca push da sua branch para o seu fork
2. Abra um PR para a branch `main` do repositorio original
3. Preencha a descricao do PR com:
   - **O que foi feito:** resumo claro das alteracoes
   - **Por que foi feito:** contexto e motivacao
   - **Como testar:** passos para verificar as mudancas
4. Aguarde a revisao de codigo

### 5.5. Revisao

- Responda aos comentarios de revisao de forma construtiva
- Faca as alteracoes solicitadas em novos commits (nao faca force push durante a revisao)
- Quando aprovado, o mantenedor fara o merge

---

## 6. Estrutura do Banco de Teste

Os testes do backend rodam em um banco de dados **separado** chamado `clarita_test`. Isso garante que os dados de desenvolvimento nao sejam afetados pelos testes.

### Configuracao

Crie o banco de teste no PostgreSQL:

```sql
CREATE DATABASE clarita_test;
```

No arquivo `.env` (ou `.env.test`) do backend, configure a variavel de ambiente para apontar para o banco de teste. Exemplo:

```env
TEST_DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/clarita_test
```

### Comportamento

- O banco de teste e recriado/limpo automaticamente antes de cada suite de testes
- Nenhum dado de teste persiste entre execucoes
- As migrations sao aplicadas automaticamente no banco de teste ao rodar `npm test`
- **Nunca** aponte os testes para o banco de desenvolvimento ou producao

---

## 7. Codigo de Conduta

A Clarita e uma plataforma voltada para saude mental, e esperamos que todas as interacoes no projeto reflitam esse cuidado. Ao contribuir, voce concorda em:

- **Ser respeitoso:** trate todos os contribuidores com respeito, independentemente de nivel de experiencia, identidade ou origem
- **Ser construtivo:** ofereca feedback de forma gentil e focada na melhoria do codigo, nao da pessoa
- **Ser inclusivo:** use linguagem acolhedora e acessivel em todas as interacoes
- **Ser paciente:** lembre-se de que todos estao aprendendo e contribuindo no seu proprio ritmo
- **Ser responsavel:** assuma a responsabilidade por suas palavras e acoes dentro do projeto

### Comportamentos inaceitaveis

- Linguagem ou imagens ofensivas, discriminatorias ou de assedio
- Comentarios depreciativos ou ataques pessoais
- Publicacao de informacoes privadas de terceiros sem consentimento
- Qualquer conduta que seria considerada inapropriada em um ambiente profissional

### Denuncia

Se voce presenciar ou for alvo de comportamento inaceitavel, entre em contato com os mantenedores do projeto. Todas as denuncias serao tratadas com seriedade e confidencialidade.

---

## Duvidas?

Se tiver alguma duvida sobre o processo de contribuicao, abra uma issue no repositorio ou entre em contato com a equipe de mantenedores. Estamos aqui para ajudar!
