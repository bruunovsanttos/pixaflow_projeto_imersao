# Nexora

### Veja o impacto das suas decisões antes de tomá-las.

A **Nexora** é um MVP funcional de **SaaS B2B de inteligência operacional**, desenvolvido para transformar dados operacionais de uma empresa em indicadores, riscos, oportunidades e simulações que apoiem a tomada de decisão.

A proposta é ajudar gestores a responder perguntas como:

- **O que está acontecendo com a operação agora?**
- **Quais riscos merecem atenção?**
- **Quais oportunidades podem gerar impacto positivo?**
- **O que pode acontecer se determinada decisão for aplicada?**
- **Como os indicadores da empresa estão evoluindo ao longo do tempo?**

O projeto possui **frontend e backend integrados**, autenticação, controle de acesso por empresa, persistência em PostgreSQL, análises operacionais, simulação de cenários, histórico de dados e testes automatizados.

A empresa utilizada como cenário de demonstração é a **Bella Studio**, uma operação fictícia de beleza e estética.

---

## Status do projeto

**MVP funcional e publicado.**

O Nexora atualmente possui:

- Frontend publicado em produção.
- Backend REST em FastAPI.
- Banco de dados PostgreSQL hospedado no Neon.
- Autenticação e sessões.
- Controle de permissões por usuário.
- Isolamento de dados por empresa.
- Dashboard baseado em dados persistidos.
- Registro e histórico de dados operacionais.
- Central de riscos.
- Central de oportunidades.
- Linha do tempo.
- Simulador de decisões.
- Cenários salvos.
- Assistente contextual.
- Testes automatizados de frontend e backend.

---

## Aplicação publicada

### Frontend

https://pixaflow-projeto-imersao.onrender.com

### Backend

https://nexora-api-hd5c.onrender.com

### Documentação da API

https://nexora-api-hd5c.onrender.com/docs

---

# Funcionalidades

## Landing Page

Apresentação da proposta da Nexora, principais benefícios do produto e acesso à aplicação.

---

## Autenticação

O sistema possui autenticação real integrada ao backend.

O fluxo inclui:

- Login por e-mail e senha.
- Senhas armazenadas utilizando hash seguro.
- Sessões autenticadas.
- Cookies de sessão.
- Expiração de sessão.
- Logout.
- Proteção contra excesso de tentativas de login.
- Validação de origem das requisições.

Não existe cadastro público no MVP.

Os usuários são provisionados previamente no sistema.

---

## Empresas e isolamento de dados

O Nexora foi estruturado como uma aplicação multiempresa.

Cada usuário possui vínculo com uma ou mais empresas através de memberships.

As consultas realizadas pela aplicação respeitam a empresa selecionada, impedindo o acesso indevido a dados de outra organização.

---

## Perfis e permissões

O sistema trabalha atualmente com três níveis de acesso:

### Admin

Pode:

- Visualizar dados.
- Editar dados operacionais.
- Executar simulações.
- Salvar cenários.
- Gerar análises.

### Operator

Pode:

- Visualizar dados.
- Editar dados operacionais.
- Executar simulações.
- Salvar cenários.
- Gerar análises.

### Viewer

Pode:

- Visualizar informações.
- Executar simulações.

Não pode:

- Alterar dados operacionais.
- Salvar cenários.
- Executar operações administrativas.

As permissões são verificadas no frontend e também no backend.

---

# Dashboard

A tela principal apresenta uma visão consolidada da operação.

Entre os indicadores estão:

- Saúde operacional.
- Eficiência operacional.
- Receita.
- Estimativa de receita.
- Riscos.
- Oportunidades.
- Tendência operacional.
- Histórico de análises.

Os indicadores são calculados utilizando os dados operacionais registrados pela empresa.

---

## Saúde operacional

A saúde operacional considera a relação entre:

**tarefas realizadas no prazo / tarefas previstas**

O indicador permite observar o desempenho da operação em relação ao planejamento.

---

## Eficiência

A eficiência considera:

**minutos produtivos / minutos disponíveis**

Isso permite analisar quanto da capacidade disponível da equipe foi efetivamente utilizada.

---

## Estimativa de receita

O MVP utiliza uma extrapolação simples baseada no histórico operacional.

A estimativa não representa um modelo de Machine Learning ou previsão financeira validada.

Ela deve ser interpretada como um indicador operacional de apoio à decisão.

---

# Dados diários

A página de dados permite registrar as informações operacionais utilizadas pelas análises.

Os campos incluem:

- Receita realizada.
- Tarefas previstas.
- Tarefas concluídas.
- Tarefas concluídas no prazo.
- Minutos disponíveis.
- Minutos produtivos.
- Observações.

Ao abrir a página, o sistema identifica automaticamente o **último registro disponível da empresa**.

---

## Validações

Algumas regras aplicadas:

```text
Concluídas no prazo <= Tarefas concluídas <= Tarefas previstas

Minutos produtivos <= Minutos disponíveis

Valores não podem ser negativos
```

Também não é permitido registrar dados realizados em uma data futura.

---

## Versionamento dos registros

Cada atualização gera uma nova revisão.

O sistema mantém o histórico das alterações realizadas em um determinado dia, permitindo rastrear versões anteriores dos dados.

Também é utilizado controle de revisão para evitar conflitos de edição concorrente.

---

# Análises operacionais

A Nexora permite gerar snapshots das informações operacionais.

Cada análise possui:

- Data de referência.
- Data de criação.
- Versão do modelo.
- Registros utilizados.
- Indicadores calculados.
- Identificação caso os dados de origem tenham sido alterados posteriormente.

As análises utilizam uma janela operacional de até **28 dias**.

---

# Central de riscos

Os riscos podem ser classificados por diferentes características.

Entre as informações disponíveis estão:

- Categoria.
- Severidade.
- Probabilidade.
- Impacto financeiro.
- Prazo.
- Status.
- Descrição.
- Recomendações.

A página também permite filtros e paginação.

---

# Central de oportunidades

A Nexora também apresenta oportunidades identificadas para a empresa.

Cada oportunidade pode conter:

- Potencial financeiro.
- Custo estimado.
- Esforço.
- Confiança.
- Horizonte de execução.
- Ação recomendada.
- ROI calculado.

As oportunidades podem servir como ponto de partida para novas simulações.

---

# Linha do tempo

A linha do tempo organiza eventos relevantes da operação.

Um evento pode possuir:

- Data.
- Severidade.
- Título.
- Descrição.
- Causa.
- Impacto.
- Recomendações.

A API suporta filtros por:

- Severidade.
- Data inicial.
- Data final.

---

# Simulador de decisões

O simulador permite avaliar possíveis impactos de uma decisão antes de aplicá-la.

Entre os cenários existentes estão:

- Aumentar investimento em marketing.
- Repor estoque.
- Contratar equipe.
- Alterar preços.
- Abrir novas unidades.
- Aplicar uma oportunidade identificada.

Os resultados podem comparar:

- Investimento.
- Receita.
- Clientes.
- Custos.
- Capacidade.
- Saldo incremental.
- Premissas.
- Recomendações.

---

## Como funciona a simulação

O fluxo básico é:

```text
Usuário escolhe uma decisão
        ↓
Define parâmetros
        ↓
Frontend envia os dados
        ↓
Backend valida a requisição
        ↓
Regras de simulação são executadas
        ↓
Resultado é retornado
        ↓
Usuário pode salvar o cenário
```

As simulações atuais utilizam **regras determinísticas**.

O sistema ainda não utiliza Machine Learning para prever os resultados.

---

# Cenários salvos

Uma simulação pode ser salva como cenário.

Os cenários são persistidos pelo backend e associados:

- à empresa;
- ao usuário/membership;
- à simulação utilizada.

O sistema permite posteriormente consultar ou remover cenários salvos.

As permissões são verificadas antes das operações de escrita.

---

# Assistente Nexora

O Nexora possui uma interface conversacional para consulta de informações da empresa.

O assistente consegue utilizar dados reais disponibilizados pelo sistema para contextualizar respostas relacionadas à operação.

Exemplos:

- indicadores;
- riscos;
- oportunidades;
- dados da empresa;
- contexto operacional.

### Limitação atual

O assistente do MVP **não utiliza ainda um modelo de IA generativa integrado**.

A integração com LLMs está planejada para uma próxima evolução do produto.

---

# Arquitetura

A aplicação utiliza uma arquitetura separada entre frontend, backend e banco de dados.

```text
┌──────────────────────────┐
│        FRONTEND          │
│ React + TypeScript       │
│ TanStack + Vite          │
└────────────┬─────────────┘
             │
             │ HTTP / REST
             ▼
┌──────────────────────────┐
│         BACKEND          │
│ FastAPI                  │
│ Services / Routes        │
│ Regras de negócio        │
└────────────┬─────────────┘
             │
             │ SQLAlchemy
             ▼
┌──────────────────────────┐
│       PostgreSQL         │
│          Neon            │
└──────────────────────────┘
```

---

# Backend

O backend foi desenvolvido utilizando **FastAPI**.

A aplicação está organizada em camadas para separar responsabilidades.

Estrutura simplificada:

```text
backend/
│
├── app/
│   ├── core/
│   ├── database/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── app.py
│
├── alembic/
│
├── tests/
│
├── alembic.ini
├── requirements.txt
└── .env
```

---

## Models

Representam as entidades persistidas no PostgreSQL.

Entre elas:

- Companies.
- Users.
- Company Memberships.
- Credentials.
- Sessions.
- Daily Records.
- Analytics Snapshots.
- Risks.
- Opportunities.
- Timeline Events.
- Simulations.
- Simulation Metrics.
- Simulation Recommendations.
- Saved Scenarios.

---

## Routes

As rotas FastAPI recebem as requisições HTTP e delegam as regras de negócio para as demais camadas.

---

## Services

Os serviços concentram as regras de negócio.

Isso evita que a lógica fique acoplada diretamente aos endpoints.

---

## Database

O projeto utiliza:

- PostgreSQL.
- SQLAlchemy.
- Psycopg.
- Alembic.
- Neon.

O banco de produção está hospedado no **Neon**.

---

# Frontend

O frontend foi desenvolvido utilizando React e TypeScript.

Estrutura simplificada:

```text
src/
├── components/
│   ├── nexora/
│   └── ui/
│
├── hooks/
│
├── lib/
│   └── api/
│
├── routes/
│
├── routeTree.gen.ts
└── styles.css
```

---

# Tecnologias

## Frontend

| Tecnologia | Uso |
|---|---|
| React 19 | Construção da interface |
| TypeScript | Tipagem |
| TanStack Start | Estrutura da aplicação |
| TanStack Router | Roteamento |
| TanStack Query | Requisições e cache |
| Vite 8 | Build e desenvolvimento |
| Tailwind CSS 4 | Estilização |
| Radix UI | Componentes |
| Recharts | Gráficos |
| Zod | Validação |
| Lucide React | Ícones |
| Sonner | Feedback visual |

---

## Backend

| Tecnologia | Uso |
|---|---|
| Python | Linguagem principal |
| FastAPI | API REST |
| SQLAlchemy | ORM |
| PostgreSQL | Banco relacional |
| Neon | Banco PostgreSQL em nuvem |
| Alembic | Migrations |
| Pydantic | Validação |
| Psycopg | Driver PostgreSQL |

---

## Infraestrutura

| Tecnologia | Uso |
|---|---|
| Render | Deploy frontend/backend |
| Neon | PostgreSQL em produção |
| Git | Versionamento |
| GitHub | Repositório |

---

# Testes e qualidade

O MVP possui testes automatizados de frontend e backend.

## Testes E2E

Os testes E2E utilizam **Playwright** e são executados contra a aplicação publicada.

Resultado atual:

```text
31 testes aprovados
31/31 PASS
```

Entre os fluxos validados estão:

- Login.
- Persistência da sessão.
- Dashboard.
- Indicadores.
- Dados diários.
- Riscos.
- Oportunidades.
- Linha do tempo.
- Simulações.
- Cenários salvos.
- Assistente.
- Permissões.

---

## Testes de regras de negócio em produção

Resultado:

```text
11/11 PASS
```

Entre as verificações:

- Janela operacional de 28 dias.
- Saúde operacional.
- Eficiência.
- Receita prevista.
- Riscos.
- Oportunidades.
- Último registro diário.
- Regras das tarefas.
- Simulações.
- Assistente.

---

## Testes do backend

Os testes do backend utilizam **Pytest**.

Resultado atual:

```text
60 testes aprovados
95 subtestes aprovados
```

Entre os comportamentos validados estão:

- Dados diários.
- Empresas e memberships.
- Riscos.
- Oportunidades.
- Simulações.
- Cenários salvos.
- Timeline.
- Autenticação.
- Rate limit.
- Hash de senha.
- Sessões.
- Permissões.
- Isolamento entre empresas.
- Revisões.
- Auditoria.
- Migrações.
- Validações de entrada.

---

# Segurança

O MVP possui mecanismos como:

- Hash seguro de senha.
- Sessões autenticadas.
- Expiração de sessão.
- Cookies.
- Controle de origem.
- Rate limit no login.
- Controle de acesso por empresa.
- Controle por papel do usuário.
- Validação de payloads.
- Isolamento entre organizações.

---

# Executando localmente

## Pré-requisitos

### Frontend

- Node.js.
- npm.

### Backend

- Python 3.12+.
- PostgreSQL ou conexão Neon.

---

# Frontend

Instale as dependências:

```bash
npm install
```

Execute:

```bash
npm run dev
```

---

# Backend

Entre na pasta:

```bash
cd backend
```

Crie o ambiente virtual:

```bash
python -m venv .venv
```

Ative o ambiente.

### Windows

```bash
.venv\Scripts\activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Configure:

```text
DATABASE_URL=
```

Execute as migrations quando necessário:

```bash
alembic upgrade head
```

Inicie a aplicação:

```bash
uvicorn app.app:app --reload
```

---

# Rotas da aplicação

| Rota | Página |
|---|---|
| `/apresentacao` | Apresentação |
| `/login` | Login |
| `/` | Dashboard |
| `/dados` | Dados operacionais |
| `/riscos` | Central de riscos |
| `/oportunidades` | Central de oportunidades |
| `/linha-do-tempo` | Timeline |
| `/simulador` | Simulador |
| `/assistente` | Assistente |
| `/configuracoes` | Configurações |

---

# Fluxo geral

```text
Usuário
   ↓
Login
   ↓
Sessão autenticada
   ↓
Empresa selecionada
   ↓
Dados operacionais
   ↓
Análise
   ↓
Dashboard
   ├── Riscos
   ├── Oportunidades
   ├── Timeline
   ├── Simulações
   └── Assistente
```

---

# Limitações atuais do MVP

A aplicação está funcional, porém algumas evoluções permanecem planejadas.

### Inteligência Artificial

O assistente ainda não utiliza IA generativa.

Uma evolução futura poderá integrar um LLM ao backend para responder com base no contexto operacional da empresa.

---

### Simulações

As simulações atuais utilizam regras determinísticas.

Elas não representam modelos preditivos treinados.

---

### Projeções

As projeções financeiras apresentadas são estimativas operacionais.

Não devem ser interpretadas como previsão financeira garantida.

---

### Integrações

Atualmente os dados operacionais são inseridos diretamente no sistema.

Integrações automáticas com:

- ERP;
- CRM;
- plataformas financeiras;
- planilhas;
- sistemas de vendas;

podem ser implementadas posteriormente.

---

# Próximas evoluções

Entre as possibilidades para versões futuras:

- IA generativa.
- Integração com LLM.
- Explicação inteligente dos indicadores.
- Sugestões automáticas de ações.
- Integração com ERP.
- Integração com CRM.
- Importação de planilhas.
- Alertas.
- Notificações.
- Dashboards configuráveis.
- Novos modelos de simulação.
- Onboarding de empresas.
- Cadastro administrado de usuários.
- Observabilidade.
- CI/CD ampliado.

---

# Objetivo do projeto

Mais do que demonstrar tecnologias isoladas, o Nexora busca explorar como software pode ajudar empresas a transformar dados operacionais em informações úteis para tomada de decisão.

O projeto envolve conceitos de:

- desenvolvimento backend;
- APIs REST;
- frontend;
- modelagem de banco de dados;
- autenticação;
- autorização;
- segurança;
- análise de dados;
- regras de negócio;
- arquitetura de software;
- testes automatizados;
- deploy;
- produto digital.

---

# Autor

**Bruno Vieira Santos**

Desenvolvedor Backend com foco em Python, APIs REST, automação e soluções orientadas a problemas de negócio.

GitHub:

https://github.com/bruunovsanttos

---

## Observação

O Nexora é um projeto em evolução.

O estado atual representa um **MVP funcional**, utilizado para validar a arquitetura, os fluxos principais, as regras de negócio e a proposta do produto antes da implementação de recursos mais avançados, como inteligência artificial generativa e integrações externas.
