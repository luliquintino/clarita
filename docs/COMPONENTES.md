# Catalogo de Componentes - Clarita Dashboard

Referencia completa de todos os componentes React do dashboard Clarita, organizados por categoria funcional.

**Caminho base:** `dashboard/src/components/`

---

## Sumario

- [Dados e Visualizacao](#dados-e-visualizacao)
  - [AlertsPanel](#alertspanel)
  - [AssessmentHistory](#assessmenthistory)
  - [EmotionalChart](#emotionalchart)
  - [InsightsPanel](#insightspanel)
  - [Timeline](#timeline)
  - [AISummaryCard](#aisummarycard)
  - [DigitalTwinPanel](#digitaltwinpanel)
- [Paciente](#paciente)
  - [JournalEntry](#journalentry)
  - [JournalHistory](#journalhistory)
  - [GoalsPanel](#goalspanel)
  - [PatientGoalsPanel](#patientgoalspanel)
  - [ExamUploadPanel](#examuploadpanel)
  - [PatientExamsPanel](#patientexamspanel)
  - [MedicationManager](#medicationmanager)
- [Profissional](#profissional)
  - [ClinicalNotes](#clinicalnotes)
  - [ProfessionalTabs](#professionaltabs)
  - [SharingControls](#sharingcontrols)
- [Chat e Comunicacao](#chat-e-comunicacao)
  - [ChatPanel](#chatpanel)
  - [ConversationList](#conversationlist)
  - [InvitationDialog](#invitationdialog)
  - [PendingInvitations](#pendinginvitations)
- [Layout e Navegacao](#layout-e-navegacao)
  - [Sidebar](#sidebar)
  - [PatientList](#patientlist)
  - [PatientCircle](#patientcircle)
  - [DisplayIdBadge](#displayidbadge)

---

## Dados e Visualizacao

### AlertsPanel

**Arquivo:** `AlertsPanel.tsx`

**Descricao:** Painel completo de alertas clinicos. Exibe alertas agrupados por severidade (critico, alto, medio, baixo) com cards de resumo contendo contadores, barra de filtros em formato de pill, listagem de alertas ativos com opcao de reconhecimento e secao de alertas reconhecidos recentemente. Suporta filtro por severidade e exibicao opcional do nome do paciente.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `alerts` | `Alert[]` | Sim | Lista de alertas a exibir |
| `onAcknowledge` | `(alertId: string) => Promise<void>` | Sim | Callback ao reconhecer um alerta |
| `onResolve` | `(alertId: string) => Promise<void>` | Nao | Callback ao resolver um alerta |
| `showPatientName` | `boolean` | Nao | Mostra nome do paciente em cada alerta (padrao: `true`) |

**Onde e usado:** Pagina `/alerts` (visao geral de alertas do profissional) e pagina `/patients/[id]` (alertas de um paciente especifico).

**Exemplo de uso:**

```tsx
<AlertsPanel
  alerts={alerts}
  onAcknowledge={handleAcknowledge}
  onResolve={handleResolve}
  showPatientName={true}
/>
```

---

### AssessmentHistory

**Arquivo:** `AssessmentHistory.tsx`

**Descricao:** Historico de avaliacoes clinicas padronizadas (PHQ-9 para depressao e GAD-7 para ansiedade). Apresenta seletor de tipo de avaliacao, pontuacao mais recente com tendencia comparativa, e grafico de area com zonas coloridas de severidade (minimo, leve, moderado, moderadamente grave, grave). Utiliza Recharts para visualizacao.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `assessments` | `Assessment[]` | Sim | Lista de avaliacoes do paciente |
| `loading` | `boolean` | Nao | Exibe skeleton de carregamento (padrao: `false`) |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente).

**Exemplo de uso:**

```tsx
<AssessmentHistory assessments={assessments} loading={false} />
```

---

### EmotionalChart

**Arquivo:** `EmotionalChart.tsx`

**Descricao:** Grafico de linhas interativo que exibe tendencias emocionais ao longo do tempo. Plota humor, ansiedade, energia e qualidade do sono (escala 0-10). Possui seletor de periodo (7, 30 ou 90 dias) e toggles individuais para cada metrica. Usa Recharts com tooltip customizado em portugues.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `data` | `EmotionalLog[]` | Sim | Registros emocionais do paciente |
| `loading` | `boolean` | Nao | Exibe skeleton de carregamento (padrao: `false`) |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente).

**Exemplo de uso:**

```tsx
<EmotionalChart data={emotionalLogs} loading={false} />
```

---

### InsightsPanel

**Arquivo:** `InsightsPanel.tsx`

**Descricao:** Painel de insights gerados por IA sobre o paciente. Cada insight exibe titulo, descricao, badge de confianca percentual, nivel de impacto (alto, medio, baixo) e lista de recomendacoes clinicas. Inclui estados de carregamento (skeleton) e vazio.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `insights` | `Insight[]` | Sim | Lista de insights gerados pela IA |
| `loading` | `boolean` | Nao | Exibe skeleton de carregamento (padrao: `false`) |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente).

**Exemplo de uso:**

```tsx
<InsightsPanel insights={insights} loading={false} />
```

---

### Timeline

**Arquivo:** `Timeline.tsx`

**Descricao:** Linha do tempo visual do paciente com entradas cronologicas. Suporta diferentes tipos de eventos: registro emocional, evento de vida, mudanca de medicamento, sintoma e avaliacao. Cada tipo possui icone, cor e badge distintos. Inclui barra de filtro por tipo de evento e linha vertical com gradiente decorativo.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `entries` | `TimelineEntry[]` | Sim | Entradas da linha do tempo |
| `loading` | `boolean` | Nao | Exibe skeleton de carregamento (padrao: `false`) |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente).

**Exemplo de uso:**

```tsx
<Timeline entries={timelineEntries} loading={false} />
```

---

### AISummaryCard

**Arquivo:** `AISummaryCard.tsx`

**Descricao:** Card de resumo gerado por inteligencia artificial. Exibe resumos periodicos do paciente com metricas agregadas (humor medio, ansiedade, energia, sono), indicadores de tendencia e texto formatado com suporte a negrito e alertas. Permite gerar novos resumos, expandir/recolher o conteudo e visualizar resumos anteriores.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `summaries` | `PatientSummary[]` | Sim | Lista de resumos gerados pela IA |
| `loading` | `boolean` | Nao | Exibe spinner de carregamento (padrao: `false`) |
| `generating` | `boolean` | Nao | Indica que um novo resumo esta sendo gerado (padrao: `false`) |
| `onGenerate` | `() => void` | Nao | Callback para gerar novo resumo |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente).

**Exemplo de uso:**

```tsx
<AISummaryCard
  summaries={summaries}
  loading={false}
  generating={generating}
  onGenerate={handleGenerateSummary}
/>
```

---

### DigitalTwinPanel

**Arquivo:** `DigitalTwinPanel.tsx`

**Descricao:** Painel do Gemeo Digital Mental do paciente. Componente complexo que exibe: cards de estado atual das variaveis (humor, ansiedade, energia, sono) com sparklines, rede de correlacoes aprendidas em SVG interativo, timeline de previsoes comportamentais com niveis de risco, grafico de resposta ao tratamento (antes/depois com Recharts), preview do Genoma Mental (em desenvolvimento) e cards do ecossistema futuro. Suporta estado vazio com opcao de gerar modelo.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `twin` | `DigitalTwin \| null` | Sim | Dados do gemeo digital ou null se indisponivel |
| `patientId` | `string` | Sim | ID do paciente |

**Onde e usado:** Pagina `/patients/[id]` (perfil detalhado do paciente, aba Gemeo Digital).

**Exemplo de uso:**

```tsx
<DigitalTwinPanel twin={digitalTwin} patientId={patientId} />
```

---

## Paciente

### JournalEntry

**Arquivo:** `JournalEntry.tsx`

**Descricao:** Formulario de check-in emocional diario do paciente. Inclui sliders interativos para humor (1-10), ansiedade (1-10), energia (1-10) e horas de sono (1-10), cada um com icones e labels descritivos. Tambem possui campo de texto livre para diario e botao de submissao com feedback de sucesso.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `onSubmit` | `(data: { mood_score: number; anxiety_score: number; energy_score: number; sleep_hours?: number; journal_entry?: string }) => Promise<void>` | Sim | Callback ao submeter o check-in |
| `saving` | `boolean` | Nao | Indica estado de salvamento (padrao: `false`) |

**Onde e usado:** Pagina `/patient-home` (portal do paciente).

**Exemplo de uso:**

```tsx
<JournalEntry onSubmit={handleSubmitJournal} saving={false} />
```

---

### JournalHistory

**Arquivo:** `JournalHistory.tsx`

**Descricao:** Historico de check-ins emocionais do paciente. Exibe lista cronologica de registros com emoji de humor, data formatada em portugues, badges de pontuacao (humor, ansiedade, energia) e horas de sono. Entradas com texto de diario podem ser expandidas. Inclui estados de carregamento e vazio com mensagem motivacional.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `entries` | `JournalEntryData[]` | Sim | Lista de entradas do diario |
| `loading` | `boolean` | Nao | Exibe skeleton de carregamento (padrao: `false`) |

**Onde e usado:** Pagina `/patient-home` (portal do paciente).

**Exemplo de uso:**

```tsx
<JournalHistory entries={journalEntries} loading={false} />
```

---

### GoalsPanel

**Arquivo:** `GoalsPanel.tsx`

**Descricao:** Painel de metas terapeuticas gerenciado pelo profissional. Permite criar novas metas (titulo, descricao, data alvo), visualizar metas agrupadas por status (aguardando paciente, em andamento, conquistadas, recusadas), marcar metas como conquista, pausar, retomar ou cancelar. Cada meta exibe badge de status, data alvo e informacoes do criador.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `goals` | `Goal[]` | Sim | Lista de metas do paciente |
| `loading` | `boolean` | Nao | Exibe spinner de carregamento (padrao: `false`) |
| `readOnly` | `boolean` | Nao | Desabilita edicao (padrao: `false`) |
| `patientId` | `string` | Sim | ID do paciente |
| `onCreateGoal` | `(data: { patient_id: string; title: string; description?: string; target_date?: string }) => Promise<void>` | Nao | Callback para criar meta |
| `onAchieveGoal` | `(goalId: string) => Promise<void>` | Nao | Callback para marcar meta como conquista |
| `onUpdateGoal` | `(goalId: string, data: Partial<Pick<Goal, 'title' \| 'description' \| 'status' \| 'target_date'>>) => Promise<void>` | Nao | Callback para atualizar meta |

**Onde e usado:** Pagina `/patients/[id]` (perfil do paciente, visao do profissional).

**Exemplo de uso:**

```tsx
<GoalsPanel
  goals={goals}
  patientId={patientId}
  onCreateGoal={handleCreateGoal}
  onAchieveGoal={handleAchieveGoal}
  onUpdateGoal={handleUpdateGoal}
/>
```

---

### PatientGoalsPanel

**Arquivo:** `PatientGoalsPanel.tsx`

**Descricao:** Painel de metas na visao do paciente. Exibe metas organizadas em abas (pendentes, ativas, recusadas). Metas pendentes podem ser aceitas ou recusadas pelo paciente, com campo opcional para motivo de recusa. Metas ativas exibem status, data alvo e data de conquista. Inclui estados de carregamento e vazio.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `goals` | `Goal[]` | Sim | Lista de metas do paciente |
| `loading` | `boolean` | Sim | Estado de carregamento |
| `onRespond` | `(goalId: string, action: 'accept' \| 'reject', reason?: string) => Promise<void>` | Sim | Callback para aceitar ou recusar meta |

**Onde e usado:** Pagina `/patient-home` (portal do paciente).

**Exemplo de uso:**

```tsx
<PatientGoalsPanel
  goals={goals}
  loading={loading}
  onRespond={handleRespondGoal}
/>
```

---

### ExamUploadPanel

**Arquivo:** `ExamUploadPanel.tsx`

**Descricao:** Painel completo de gerenciamento de exames pelo paciente. Inclui formulario de upload com drag-and-drop (PDF, JPEG, PNG, max 10MB), selecao de tipo de exame (hemograma, glicemia, colesterol, etc.), data, observacoes e selecao de profissionais para compartilhamento. Lista exames enviados com opcao de download, detalhes expandiveis e gerenciamento de permissoes por profissional. Nao recebe props externas -- gerencia seu proprio estado via API.

**Props:**

Nenhuma -- componente autocontido que carrega dados internamente via `examsApi` e `patientProfileApi`.

**Onde e usado:** Pagina `/patient-home` (portal do paciente).

**Exemplo de uso:**

```tsx
<ExamUploadPanel />
```

---

### PatientExamsPanel

**Arquivo:** `PatientExamsPanel.tsx`

**Descricao:** Painel de exames compartilhados na visao do profissional. Exibe lista de exames que o paciente compartilhou com o profissional logado, com tipo, data, nome do arquivo, tamanho e botao de download. Carrega dados automaticamente via API com base no `patientId`.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `patientId` | `string` | Sim | ID do paciente cujos exames serao listados |

**Onde e usado:** Pagina `/patients/[id]` (perfil do paciente, visao do profissional).

**Exemplo de uso:**

```tsx
<PatientExamsPanel patientId={patientId} />
```

---

### MedicationManager

**Arquivo:** `MedicationManager.tsx`

**Descricao:** Gerenciador completo de medicamentos do paciente. Psiquiatras podem prescrever novos medicamentos, ajustar dosagem/frequencia e descontinuar medicamentos. Exibe medicamentos ativos com barra de adesao, efeitos colaterais, informacoes de prescricao e medicamentos anteriores. Psicologos tem acesso somente leitura.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `medications` | `Medication[]` | Sim | Lista de medicamentos do paciente |
| `patientId` | `string` | Sim | ID do paciente |
| `role` | `'psychiatrist' \| 'psychologist' \| 'therapist'` | Sim | Papel do profissional logado |
| `onPrescribe` | `(data: { name: string; dosage: string; frequency: string; notes?: string }) => Promise<void>` | Nao | Callback para prescrever (somente psiquiatra) |
| `onAdjust` | `(medicationId: string, data: { dosage?: string; frequency?: string; notes?: string }) => Promise<void>` | Nao | Callback para ajustar medicamento |
| `onDiscontinue` | `(medicationId: string) => Promise<void>` | Nao | Callback para descontinuar medicamento |

**Onde e usado:** Pagina `/patients/[id]` (perfil do paciente, visao do profissional).

**Exemplo de uso:**

```tsx
<MedicationManager
  medications={medications}
  patientId={patientId}
  role="psychiatrist"
  onPrescribe={handlePrescribe}
  onAdjust={handleAdjust}
  onDiscontinue={handleDiscontinue}
/>
```

---

## Profissional

### ClinicalNotes

**Arquivo:** `ClinicalNotes.tsx`

**Descricao:** Sistema de notas clinicas do profissional. Permite criar, editar e excluir notas com tipos distintos: nota de sessao, observacao, plano de tratamento e nota de progresso. Cada tipo possui icone e badge colorido. Notas longas podem ser expandidas. Formulario inline com seletor de tipo, titulo e conteudo.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `notes` | `ClinicalNote[]` | Sim | Lista de notas clinicas |
| `patientId` | `string` | Sim | ID do paciente |
| `onSave` | `(data: { type: string; title: string; content: string }) => Promise<void>` | Sim | Callback para criar nota |
| `onUpdate` | `(noteId: string, data: { type?: string; title?: string; content?: string }) => Promise<void>` | Sim | Callback para atualizar nota |
| `onDelete` | `(noteId: string) => Promise<void>` | Sim | Callback para excluir nota |

**Onde e usado:** Pagina `/patients/[id]` (perfil do paciente, visao do profissional).

**Exemplo de uso:**

```tsx
<ClinicalNotes
  notes={clinicalNotes}
  patientId={patientId}
  onSave={handleSaveNote}
  onUpdate={handleUpdateNote}
  onDelete={handleDeleteNote}
/>
```

---

### ProfessionalTabs

**Arquivo:** `ProfessionalTabs.tsx`

**Descricao:** Painel de gerenciamento de profissionais na visao do paciente. Exibe abas para cada profissional vinculado (psicologo, psiquiatra) com informacoes de perfil, controles de compartilhamento de dados (via SharingControls), opcao de revogar acesso e placeholders para futuras especialidades (neurologista, nutricionista, endocrinologista). Integra InvitationDialog para envio de convites e PendingInvitations para convites pendentes.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `professionals` | `ProfessionalInfo[]` | Sim | Lista de profissionais vinculados |
| `patientId` | `string` | Sim | ID do paciente |
| `onPermissionChange` | `(professionalId: string, permissions: Array<{ permission_type: string; granted: boolean }>) => Promise<void>` | Sim | Callback para alterar permissoes |
| `pendingInvitations` | `Invitation[]` | Nao | Convites recebidos pendentes (padrao: `[]`) |
| `sentInvitations` | `Invitation[]` | Nao | Convites enviados pendentes (padrao: `[]`) |
| `onInvitationsUpdate` | `() => void` | Nao | Callback ao atualizar convites |
| `currentUserId` | `string` | Nao | ID do usuario logado |

**Onde e usado:** Pagina `/patient-home` (portal do paciente).

**Exemplo de uso:**

```tsx
<ProfessionalTabs
  professionals={professionals}
  patientId={patientId}
  onPermissionChange={handlePermissionChange}
  pendingInvitations={pendingInvitations}
  sentInvitations={sentInvitations}
  onInvitationsUpdate={refreshInvitations}
  currentUserId={currentUserId}
/>
```

---

### SharingControls

**Arquivo:** `SharingControls.tsx`

**Descricao:** Controles granulares de compartilhamento de dados do paciente com um profissional. Organiza permissoes em dois grupos: "Bem-estar diario" (registros emocionais, diario emocional, eventos de vida) e "Clinico" (medicamentos, avaliacoes, notas clinicas). Cada permissao pode ser ativada/desativada individualmente via toggle com gradiente. Respeita permissao "all" como padrao quando nao ha permissao individual definida.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `professional` | `ProfessionalInfo` | Sim | Profissional cujas permissoes serao gerenciadas |
| `patientId` | `string` | Sim | ID do paciente |
| `onPermissionChange` | `(professionalId: string, permissions: Array<{ permission_type: string; granted: boolean }>) => Promise<void>` | Sim | Callback ao alterar uma permissao |

**Onde e usado:** Dentro do componente `ProfessionalTabs` (portal do paciente).

**Exemplo de uso:**

```tsx
<SharingControls
  professional={selectedProfessional}
  patientId={patientId}
  onPermissionChange={handlePermissionChange}
/>
```

---

## Chat e Comunicacao

### ChatPanel

**Arquivo:** `ChatPanel.tsx`

**Descricao:** Painel de chat em tempo real entre profissionais (ou entre paciente e profissional). Exibe cabecalho com avatar e nome do interlocutor, historico de mensagens com separadores de data em portugues, indicador de remetente e input de mensagem com envio por Enter. Faz polling a cada 5 segundos para novas mensagens e marca conversa como lida ao abrir.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `conversation` | `Conversation` | Sim | Conversa ativa |
| `currentUserId` | `string` | Sim | ID do usuario logado |
| `onMessageSent` | `() => void` | Nao | Callback apos envio de mensagem |

**Onde e usado:** Pagina `/chat` (chat entre profissionais).

**Exemplo de uso:**

```tsx
<ChatPanel
  conversation={activeConversation}
  currentUserId={userId}
  onMessageSent={refreshConversations}
/>
```

---

### ConversationList

**Arquivo:** `ConversationList.tsx`

**Descricao:** Lista de conversas do chat. Exibe avatar com anel colorido por tipo de profissional (psicologo em roxo, psiquiatra em verde), nome, contexto do paciente ("sobre Fulano"), ultima mensagem truncada, tempo relativo em portugues e badge de mensagens nao lidas com gradiente. Estado vazio com instrucoes.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `conversations` | `Conversation[]` | Sim | Lista de conversas |
| `activeId` | `string \| null` | Sim | ID da conversa selecionada |
| `currentUserId` | `string` | Sim | ID do usuario logado |
| `onSelect` | `(conv: Conversation) => void` | Sim | Callback ao selecionar conversa |

**Onde e usado:** Pagina `/chat` (painel lateral de conversas).

**Exemplo de uso:**

```tsx
<ConversationList
  conversations={conversations}
  activeId={activeConversationId}
  currentUserId={userId}
  onSelect={handleSelectConversation}
/>
```

---

### InvitationDialog

**Arquivo:** `InvitationDialog.tsx`

**Descricao:** Dialog modal para enviar convites de vinculo entre paciente e profissional. Inclui campo de busca por ID Clarita (formato CLA-XXXXXX) com prefixo fixo, exibicao do resultado da busca com avatar, nome e tipo de profissional, campo opcional de mensagem e botao de envio. Valida que pacientes so convidem profissionais e vice-versa. Exibe estado de sucesso com animacao.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `isOpen` | `boolean` | Sim | Controla visibilidade do dialog |
| `onClose` | `() => void` | Sim | Callback ao fechar o dialog |
| `onInvitationSent` | `() => void` | Sim | Callback apos envio com sucesso |
| `senderRole` | `string` | Sim | Papel do remetente (`'patient'`, `'psychologist'`, etc.) |

**Onde e usado:** Dentro do componente `ProfessionalTabs` (portal do paciente) e pagina `/patients` (profissional convidando paciente).

**Exemplo de uso:**

```tsx
<InvitationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onInvitationSent={refreshInvitations}
  senderRole="patient"
/>
```

---

### PendingInvitations

**Arquivo:** `PendingInvitations.tsx`

**Descricao:** Exibe convites pendentes recebidos e enviados. Convites recebidos mostram avatar, nome, tipo de profissional, mensagem de convite e botoes de aceitar/recusar. Convites enviados sao exibidos em secao colapsavel com status "Aguardando resposta" e opcao de cancelar. Renderiza null se nao houver convites.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `received` | `Invitation[]` | Sim | Convites recebidos pendentes |
| `sent` | `Invitation[]` | Sim | Convites enviados pendentes |
| `onUpdate` | `() => void` | Sim | Callback para atualizar lista de convites |
| `currentUserId` | `string` | Sim | ID do usuario logado |

**Onde e usado:** Dentro do componente `ProfessionalTabs` (portal do paciente) e paginas que exibem convites.

**Exemplo de uso:**

```tsx
<PendingInvitations
  received={pendingInvitations}
  sent={sentInvitations}
  onUpdate={refreshInvitations}
  currentUserId={userId}
/>
```

---

## Layout e Navegacao

### Sidebar

**Arquivo:** `Sidebar.tsx`

**Descricao:** Barra lateral principal de navegacao do profissional. Exibe logo do Clarita, lista de pacientes vinculados com avatares (usando PatientCircle), links de navegacao (Pacientes, Alertas, Chat, Perfil) com badges de contagem, botao de logout e toggle de expansao/recolhimento. Carrega lista de pacientes e contagem de mensagens nao lidas automaticamente (polling a cada 30s para chat). Sidebar fixa com glassmorphism.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `alertCount` | `number` | Nao | Numero de alertas ativos para badge (padrao: `0`) |

**Onde e usado:** Layout principal do dashboard profissional (todas as paginas do profissional).

**Exemplo de uso:**

```tsx
<Sidebar alertCount={activeAlerts.length} />
```

---

### PatientList

**Arquivo:** `PatientList.tsx`

**Descricao:** Listagem completa de pacientes em formato de grid responsivo (1-3 colunas). Inclui barra de busca (nome, email, diagnostico), controles de ordenacao (nome, ultimo acesso, alertas, pontuacao), filtro por status (ativo, inativo, alta) e cards de paciente com avatar, diagnostico, sparkline de tendencia de humor, tempo desde ultimo check-in, score de clareza mental e badge de status. Cada card e um link para o perfil do paciente.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `patients` | `Patient[]` | Sim | Lista de pacientes |

**Onde e usado:** Pagina `/patients` (lista de pacientes do profissional).

**Exemplo de uso:**

```tsx
<PatientList patients={patients} />
```

---

### PatientCircle

**Arquivo:** `PatientCircle.tsx`

**Descricao:** Avatar circular compacto de paciente para uso na sidebar. Exibe iniciais (ou foto se disponivel) com anel colorido baseado no humor (verde >= 7, amarelo >= 4, vermelho < 4, cinza se indisponivel). Suporta modo colapsado (somente avatar) e expandido (avatar + nome). Destaque visual quando ativo.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `patient` | `{ id: string; first_name: string; last_name: string; avatar_url?: string \| null; mood_score?: number \| null }` | Sim | Dados basicos do paciente |
| `isActive` | `boolean` | Sim | Indica se o paciente esta selecionado |
| `collapsed` | `boolean` | Sim | Modo colapsado (somente avatar) |
| `onClick` | `() => void` | Sim | Callback ao clicar |

**Onde e usado:** Dentro do componente `Sidebar` (lista de pacientes na barra lateral).

**Exemplo de uso:**

```tsx
<PatientCircle
  patient={{ id: '1', first_name: 'Maria', last_name: 'Silva', mood_score: 7 }}
  isActive={false}
  collapsed={false}
  onClick={() => router.push('/patients/1')}
/>
```

---

### DisplayIdBadge

**Arquivo:** `DisplayIdBadge.tsx`

**Descricao:** Badge interativo que exibe o ID Clarita do usuario (formato CLA-XXXXXX) com botao de copiar para a area de transferencia. Ao clicar, copia o ID e exibe feedback visual temporario ("Copiado!") com animacao. Suporta dois tamanhos e label opcional. Usa glassmorphism com transicao de cores ao copiar.

**Props:**

| Prop | Tipo | Obrigatorio | Descricao |
|------|------|:-----------:|-----------|
| `displayId` | `string` | Sim | ID Clarita a ser exibido (ex: `CLA-A1B2C3`) |
| `label` | `string` | Nao | Label textual antes do badge |
| `size` | `'sm' \| 'md'` | Nao | Tamanho do badge (padrao: `'md'`) |

**Onde e usado:** Pagina `/patient-home` (portal do paciente), pagina `/profile` (perfil) e dentro de `ProfessionalTabs`.

**Exemplo de uso:**

```tsx
<DisplayIdBadge displayId="CLA-A1B2C3" label="Seu ID:" size="md" />
```

---

## Tipos da API Referenciados

Os componentes utilizam os seguintes tipos principais definidos em `lib/api.ts`:

| Tipo | Descricao |
|------|-----------|
| `Alert` | Alerta clinico com severidade, status e paciente |
| `Assessment` | Avaliacao PHQ-9 ou GAD-7 com pontuacao e severidade |
| `EmotionalLog` | Registro emocional com humor, ansiedade, energia e sono |
| `TimelineEntry` | Entrada da linha do tempo com tipo, titulo e severidade |
| `Insight` | Insight de IA com confianca, impacto e recomendacoes |
| `PatientSummary` | Resumo gerado por IA com metricas e texto |
| `DigitalTwin` | Gemeo digital com estado atual, correlacoes, previsoes e respostas ao tratamento |
| `ClinicalNote` | Nota clinica com tipo, titulo, conteudo e profissional |
| `Medication` | Medicamento com dosagem, frequencia, adesao e efeitos colaterais |
| `Goal` | Meta terapeutica com status, status do paciente e datas |
| `Milestone` | Marco de progresso associado a uma meta |
| `Patient` | Dados completos do paciente |
| `Conversation` | Conversa de chat com ultimo mensagem e contagem nao lida |
| `ChatMessage` | Mensagem individual de chat |
| `Invitation` | Convite de vinculo entre paciente e profissional |
| `ProfessionalInfo` | Informacoes do profissional com permissoes |
| `JournalEntryData` | Entrada do diario emocional do paciente |
| `Exam` | Exame medico com arquivo, tipo e permissoes |
| `UserSearchResult` | Resultado de busca de usuario por display_id |
