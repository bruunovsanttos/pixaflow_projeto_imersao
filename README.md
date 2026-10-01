# Nexora

### Veja o impacto das suas decisões antes de tomá-las.

A **Nexora** é um protótipo de SaaS B2B de inteligência operacional que permite explorar riscos, oportunidades e possíveis consequências de decisões empresariais.

A proposta é ajudar o gestor a responder duas perguntas:

- **O que pode acontecer com a operação se nenhuma ação for tomada?**
- **O que muda se uma decisão for aplicada?**

O projeto está na fase de **MVP de frontend**, com dados fictícios, simulações baseadas em regras e armazenamento local. A empresa utilizada na demonstração é a **Bella Studio**, uma operação de beleza e estética com agenda, estoque, equipe e fluxo de caixa.

> As análises e os coeficientes são demonstrativos. Não há conexão com dados reais, autenticação de usuários ou modelos preditivos validados nesta versão.

## Funcionalidades

### Apresentação do produto

Landing page com a proposta da Nexora, exemplos de riscos e oportunidades e acesso à experiência demonstrativa.

### Visão geral

Dashboard com indicadores de saúde operacional, receita prevista, riscos e oportunidades. Inclui gráfico de tendência e acesso às análises detalhadas.

### Linha do tempo do futuro

Visualização de eventos previstos, com classificação de severidade, descrição, causa provável, impacto e recomendações.

### Central de riscos

Riscos organizados por categoria e severidade, com filtros, probabilidade, impacto financeiro, prazo e ações sugeridas.

### Central de oportunidades

Oportunidades com potencial financeiro, custo, esforço, confiança demonstrativa e horizonte de execução. Cada ação pode ser explorada no simulador.

### Simulador de decisões

Simulações parametrizadas para seis tipos de decisão:

- Aumentar o investimento em marketing.
- Repor estoque.
- Contratar equipe.
- Reduzir preços.
- Abrir novas unidades.
- Aplicar uma oportunidade identificada.

Os resultados comparam investimento, clientes, receita e ocupação da capacidade. Também apresentam premissas, custos adicionais, saldo incremental e alertas de sobrecarga.

O tipo de decisão e os valores informados determinam o cálculo. O campo de descrição não é interpretado por inteligência artificial.

### Cenários salvos

Armazenamento de até 20 cenários no navegador, com remoção e comparação de duas alternativas no mesmo horizonte de tempo.

### Assistente Nexora

Interface conversacional com perguntas sugeridas e respostas demonstrativas que combinam texto, indicadores e recomendações. As respostas são predefinidas; não há integração com IA.

### Configurações

Perfil e preferências com validação, salvamento local e cancelamento de alterações. As preferências de alertas e previsão ficam reservadas para a futura integração; não enviam notificações nem modificam os dados demonstrativos.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React 19 | Construção da interface |
| TypeScript | Tipagem do código e dos contratos de dados |
| TanStack Start e Router | Estrutura da aplicação e roteamento |
| Vite 8 | Desenvolvimento e compilação |
| Tailwind CSS 4 | Estilização e responsividade |
| Radix UI | Componentes de interface |
| Recharts | Gráficos |
| Zod | Validação dos dados persistidos |
| Lucide React | Ícones |
| Sonner | Mensagens de feedback |
| localStorage | Persistência demonstrativa no navegador |

## Executando localmente

### Pré-requisitos

- Node.js compatível com Vite 8. O projeto foi validado com Node.js 24.
- npm.

Na pasta do projeto, instale as dependências:

```sh
npm install
```

Inicie o servidor de desenvolvimento:

```sh
npm run dev
```

Abra o endereço exibido no terminal. A apresentação do produto está em `/apresentacao`; o dashboard está em `/`.


## Rotas

| Rota | Página |
|---|---|
| `/apresentacao` | Apresentação da Nexora |
| `/` | Visão geral |
| `/login` | Entrada demonstrativa |
| `/linha-do-tempo` | Linha do tempo do futuro |
| `/riscos` | Central de riscos |
| `/oportunidades` | Central de oportunidades |
| `/simulador` | Simulador e cenários salvos |
| `/assistente` | Assistente Nexora |
| `/configuracoes` | Perfil e preferências |

O acesso direto às rotas é intencional nesta versão. A página de login demonstra a experiência de entrada, sem criar contas ou autenticar usuários.

## Estrutura do projeto

```text
src/
├── components/
│   ├── nexora/
│   │   ├── AppShell.tsx              # Layout e navegação
│   │   ├── cards.tsx                 # Cards do produto
│   │   ├── primitives.tsx            # Elementos compartilhados
│   │   └── SimulationResultView.tsx  # Exibição dos resultados
│   └── ui/                          # Componentes básicos
├── hooks/                           # Hooks compartilhados
├── lib/
│   ├── mock-data.ts                 # Tipos, dados e serviços demonstrativos
│   └── demo-storage.ts              # Persistência local
├── routes/                          # Páginas da aplicação
├── routeTree.gen.ts                 # Árvore de rotas gerada
└── styles.css                       # Estilos globais

tests/
└── simulation.test.mjs               # Testes de cálculo e persistência
```

## Arquitetura e dados

Os tipos, dados fictícios e serviços demonstrativos estão centralizados em `src/lib/mock-data.ts`. Os componentes visuais compartilhados ficam em `src/components/nexora/`.

O simulador separa o cálculo das operações de interface e persistência:

1. O usuário escolhe a decisão e confirma os parâmetros.
2. O serviço de simulação valida os valores e aplica regras determinísticas.
3. A interface apresenta a comparação e as premissas utilizadas.
4. Os parâmetros podem ser salvos no navegador para consultas e comparações posteriores.

As funções de simulação, cenários e configurações possuem interfaces assíncronas que podem ser adaptadas para chamadas HTTP. Parte das telas de leitura ainda importa dados estáticos diretamente.

### Persistência

Os cenários e as preferências são armazenados no `localStorage`:

- Não são compartilhados entre navegadores ou dispositivos.
- Podem ser removidos ao limpar os dados do navegador.
- Os cenários guardam parâmetros e são recalculados pelas regras da versão atual.
- Não existe banco de dados ou histórico imutável dos resultados.

## Escopo e limites do MVP

| Disponível | Ainda não implementado |
|---|---|
| Navegação entre as páginas | Autenticação e cadastro reais |
| Interface adaptável a desktop e dispositivos móveis | Onboarding de empresas |
| Dashboard, riscos, oportunidades e timeline demonstrativos | Integrações com fontes de dados reais |
| Simulação por regras parametrizadas | Modelos preditivos validados |
| Salvamento e comparação local de cenários | Persistência e versionamento no servidor |
| Assistente com respostas predefinidas | Assistente integrado a IA e dados reais |
| Preferências locais | Envio de alertas e notificações reais |
| Tipos e funções preparados para evolução | API Python/FastAPI e banco de dados |

As simulações são independentes dos indicadores fixos das outras telas: executar uma decisão não recalcula automaticamente todo o dashboard ou a timeline.

O **saldo incremental** representa a receita adicional menos o custo adicional considerado na simulação. Não equivale a lucro líquido. O capital necessário para abrir uma unidade é apresentado separadamente.

As oportunidades podem ter prazos distintos e ganhos sobrepostos; seus valores não devem ser somados como uma previsão consolidada.

## Testes e validação

O projeto possui seis testes automatizados que cobrem:

- Preservação do cenário-base quando a variação é zero.
- Efeitos de marketing e contratação sobre demanda, custo e capacidade.
- Alteração de preço e limite do benefício da reposição de estoque.
- Custos e horizontes específicos das oportunidades.
- Rejeição de parâmetros inválidos.
- Salvamento, remoção e falhas de armazenamento.

Na validação do MVP, a compilação de produção, a verificação de tipos e os seis testes foram concluídos com sucesso. Os arquivos de código alterados também passaram pela análise estática.

Os fluxos de simulação, comparação, persistência e configurações foram verificados no navegador, com inspeção visual amostral em desktop e em uma tela de 390 × 844. A cobertura de dispositivos e acessibilidade ainda será ampliada.


### Contratos sugeridos para a futura API

Os endpoints abaixo são propostas de integração e ainda não estão implementados:

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/simulacoes` | Calcular uma simulação |
| `GET` | `/cenarios` | Listar cenários salvos |
| `POST` | `/cenarios` | Salvar um cenário |
| `DELETE` | `/cenarios/{id}` | Remover um cenário |
| `GET` | `/configuracoes` | Consultar preferências |
| `PUT` | `/configuracoes` | Atualizar preferências |
| `GET` | `/riscos` | Consultar riscos |
| `GET` | `/oportunidades` | Consultar oportunidades |
| `GET` | `/timeline` | Consultar eventos previstos |

