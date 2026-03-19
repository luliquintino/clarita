# CLARITA — Visão Geral do Produto

## O que é o CLARITA?

O CLARITA é uma plataforma digital de saúde mental desenvolvida para conectar psicólogos, psiquiatras e seus pacientes em um sistema unificado de acompanhamento longitudinal. Diferente de ferramentas isoladas, o CLARITA reúne em um único lugar tudo o que o profissional precisa para conduzir um tratamento de qualidade: prontuário digital, avaliações psicológicas padronizadas, diagnósticos formais, gerenciamento de medicamentos e análise por inteligência artificial.

A missão do CLARITA é transformar o acompanhamento de saúde mental no Brasil, tornando o cuidado mais contínuo, estruturado e baseado em dados. O problema que queremos resolver é simples: entre uma consulta e outra, muito acontece na vida do paciente — e esses dados se perdem. O CLARITA captura essa continuidade por meio de registros diários, avaliações periódicas e uma linha do tempo que o profissional pode consultar a qualquer momento.

A plataforma é projetada com total conformidade à LGPD, respeitando a privacidade e a autonomia do paciente em cada etapa do processo terapêutico.

---

## Para quem é?

- **Psicólogos e psiquiatras** que desejam modernizar seu consultório e oferecer um acompanhamento mais próximo e estruturado aos seus pacientes.
- **Pacientes em acompanhamento psicológico ou psiquiátrico** que querem registrar seu dia a dia emocional, acompanhar seu progresso e ter acesso ao seu próprio histórico de saúde mental.

---

## Funcionalidades para o Paciente

### Acompanhamento Diário

O paciente realiza check-ins diários registrando humor, ansiedade, nível de energia e qualidade do sono. Também pode registrar eventos de vida significativos (positivos ou negativos) com o nível de impacto percebido, manter um diário pessoal e acompanhar metas terapêuticas definidas pelo seu profissional de saúde.

### Avaliações Psicológicas

O paciente pode responder avaliações padronizadas atribuídas pelo seu profissional:

- **PHQ-9** — Rastreamento de depressão
- **GAD-7** — Rastreamento de ansiedade
- **DASS-21** — Depressão, Ansiedade e Estresse
- **BDI-II** — Inventário de Beck para Depressão
- **BAI** — Inventário de Beck para Ansiedade
- **Eneagrama Simplificado** — Mapeamento de personalidade (9 tipos)
- **16 Personalidades Simplificado** — Perfil cognitivo (16 tipos)

Os resultados são enviados automaticamente ao profissional com score calculado e interpretação clínica.

### Acesso ao Prontuário

O paciente tem acesso à sua própria linha do tempo, podendo visualizar o histórico de registros e as notas que o profissional autorizou compartilhar. O paciente controla quais dados cada profissional vinculado pode visualizar, garantindo transparência e autonomia sobre suas informações de saúde.

---

## Funcionalidades para o Profissional de Saúde Mental

### Prontuário Digital Completo

O coração do CLARITA para o profissional é a linha do tempo longitudinal do paciente. Em um único painel, é possível visualizar check-ins diários, eventos de vida, resultados de avaliações, notas clínicas e medicamentos ao longo do tempo. As notas clínicas são estruturadas e podem ser marcadas como privadas (visíveis apenas ao profissional) ou compartilhadas com o paciente.

### Avaliações e Testes

O painel unificado de avaliações (UnifiedAssessmentsPanel) consolida todos os 7 instrumentos psicológicos disponíveis. O profissional pode atribuir testes ao paciente, acompanhar o histórico de respostas e comparar resultados ao longo do tempo. O scoring é calculado automaticamente com classificação de severidade de acordo com os critérios clínicos de cada instrumento.

### Diagnósticos CID-11

O CLARITA oferece um browser completo da Classificação Internacional de Doenças (CID-11) com busca inteligente por palavras-chave. O profissional pode registrar diagnósticos formais (confirmados ou suspeitos) diretamente no prontuário, com histórico completo de alterações. Os diagnósticos aparecem no cabeçalho do paciente para visibilidade imediata.

### Gestão de Medicamentos

Para psiquiatras, o sistema oferece controle completo de medicamentos prescritos: registro de nome, dose, frequência e período de uso. O paciente registra diariamente a adesão ao tratamento farmacológico, e o profissional monitora essa adesão ao longo do tempo. Alertas automáticos são gerados em caso de não-adesão persistente.

### Gêmeo Digital (IA)

O módulo de inteligência artificial analisa os dados longitudinais do paciente para identificar padrões, tendências e anomalias que podem passar despercebidos em consultas esporádicas. O sistema detecta, por exemplo, correlações entre qualidade do sono e humor, pioras progressivas antes de crises, e padrões compatíveis com episódios depressivos ou de ansiedade elevada. Todos os sinais são apresentados como sugestões para revisão profissional — o CLARITA não realiza diagnósticos.

### Anamnese e Exames

O profissional pode preencher a ficha de anamnese estruturada do paciente e gerenciar o envio de exames complementares. O paciente pode fazer upload de resultados de exames diretamente pelo aplicativo, com controle de permissões de visualização por profissional vinculado.

---

## Segurança e Privacidade

O CLARITA foi desenvolvido com segurança e privacidade como prioridades desde o primeiro dia:

- **LGPD**: O paciente controla quais dados cada profissional pode acessar, podendo revogar permissões a qualquer momento.
- **Autenticação segura**: Todos os acessos são protegidos por tokens JWT com expiração e senhas armazenadas com criptografia bcrypt.
- **Controle de acesso por papel (RBAC)**: Pacientes, psicólogos e psiquiatras têm permissões distintas, e nenhum profissional acessa dados de um paciente sem vínculo terapêutico formalizado na plataforma.
- **Dados criptografados em trânsito**: Toda comunicação entre o aplicativo e os servidores utiliza HTTPS.
- **Prevenção de ataques**: O sistema utiliza queries parametrizadas para prevenir injeção de SQL e headers de segurança via Helmet.

---

## Tecnologia (para o leigo)

O CLARITA é composto por quatro partes que trabalham juntas:

1. **Aplicativo do Paciente** (celular): Onde o paciente faz seus registros diários e responde avaliações.
2. **Dashboard do Profissional** (navegador web): Onde o psicólogo ou psiquiatra acompanha seus pacientes, escreve notas e acessa todos os dados clínicos.
3. **Servidor Central** (nuvem): Armazena todos os dados com segurança e coordena a comunicação entre o app e o dashboard.
4. **Motor de Inteligência Artificial**: Analisa os dados periodicamente em busca de padrões relevantes para o tratamento.

Toda a infraestrutura pode ser executada em nuvem (Vercel, AWS, Railway) ou em servidor próprio, conforme a preferência da clínica ou consultório.

---

## Roadmap (Próximas Funcionalidades)

O CLARITA está em desenvolvimento ativo. Algumas direções para as próximas versões:

- **Teleconsulta integrada**: Videochamadas diretamente na plataforma, com registro automático na linha do tempo.
- **Notificações inteligentes**: Lembretes personalizados para check-ins, medicamentos e avaliações pendentes.
- **Relatórios clínicos automatizados**: Geração de relatórios de evolução do paciente para laudos, perícias ou encaminhamentos.
- **Compartilhamento entre profissionais**: Encaminhamento seguro de resumo clínico entre psicólogo e psiquiatra de um mesmo paciente.
- **Biblioteca de psicoeducação**: Conteúdo validado por profissionais para o paciente acessar entre as consultas.
- **Integração com prontuários hospitalares**: Conexão com sistemas de saúde públicos e privados via padrão FHIR/HL7.
- **Expansão de instrumentos**: Inclusão de testes adicionais como AUDIT, PCL-5, Y-BOCS e escalas pediátricas.
