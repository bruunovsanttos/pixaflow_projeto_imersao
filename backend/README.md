# Backend Nexora

Base em FastAPI, com Python 3.10 ou superior. Disponibiliza health e o nucleo de identidade
(empresas, usuarios, vinculos e preferencias). Nao ha autenticacao
ou integracao com o frontend. A infraestrutura PostgreSQL usa SQLAlchemy e Alembic.

## Executar no Windows (PowerShell)

A partir da raiz do repositorio:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Nao e necessario ativar o ambiente virtual. Copie `.env.example` apenas na
primeira configuracao, para nao sobrescrever um `.env` existente.

- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health

`NEXORA_CORS_ORIGINS` recebe uma lista JSON com as origens do frontend.
Ajuste as portas conforme seu ambiente. Variaveis de ambiente prevalecem sobre
o `.env`; o arquivo e localizado relativamente ao backend.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `app/__init__.py` | Define o pacote Python do backend. |
| `app/main.py` | Fabrica a aplicacao, configura CORS e registra as rotas em `/api/v1`. Expoe `app` para o Uvicorn. |
| `app/core/__init__.py` | Define o pacote de configuracoes e recursos compartilhados. |
| `app/core/config.py` | Le e valida configuracoes usando Pydantic Settings. |
| `app/routes/__init__.py` | Define a camada HTTP. |
| `app/routes/router.py` | Centraliza o registro dos routers. |
| `app/routes/health.py` | Disponibiliza a verificacao de que a API responde, sem consultar dependencias. |
| `app/schemas/__init__.py` | Define o pacote de contratos de entrada e saida. |
| `app/schemas/health.py` | Define o formato tipado da resposta de health. |
| `app/services/__init__.py` | Reserva a camada de regras de negocio e casos de uso. |
| `app/models/__init__.py` | Importa os 14 models e registra suas tabelas no metadata. |
| `app/repositories/__init__.py` | Reserva a camada de consultas e persistencia. |
| `app/database/__init__.py` | Exporta Base sem abrir conexoes; session.py fornece engine, SessionLocal e get_db. |
| `requirements.txt` | Declara as dependencias da API e seus intervalos de versao. |
| `.env.example` | Documenta configuracoes locais, sem segredos. |
| `.gitignore` | Exclui ambiente virtual, caches e configuracoes locais do Git. |
| `README.md` | Documenta instalacao, execucao e arquitetura. |

## Proximas implementacoes

O fluxo das funcionalidades de identidade e `routes -> services -> repositories`, com
`schemas` definindo os contratos HTTP, `models` representando entidades e
`database` cuidando da infraestrutura de persistencia. `core` concentra
configuracoes compartilhadas. A rota de health nao precisa dessas camadas.

Os contratos futuros devem acompanhar os tipos exportados em
`../src/lib/mock-data.ts`. A integracao devera trocar os corpos das funcoes
por chamadas HTTP preservando esses tipos. O frontend continua com os mocks.

Referencia: [aplicacoes com multiplos arquivos no FastAPI](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

## PostgreSQL e migrations

Configure `DATABASE_URL` no ambiente ou em `backend/.env`, usando
`postgresql+psycopg://usuario:senha@localhost:5432/nexora`.
O banco deve existir. Codifique caracteres especiais da senha na URL.
A variavel `DATABASE_URL` nao usa o prefixo `NEXORA_` e e obrigatoria.

A engine mantem um pool de conexoes e usa `pool_pre_ping=True` para verificar
conexoes ao retira-las do pool. Sua criacao nao abre uma conexao imediatamente.
`SessionLocal` cria sessoes sincronas; `get_db` fornece uma sessao por requisicao
via `Depends(get_db)` e sempre a fecha. Commits sao explicitos; fechar a sessao
reverte transacoes pendentes. Nao ha criacao de tabelas no startup.

O Alembic importa `app.models` para registrar todas as entidades em
`Base.metadata` e compara esse metadata com PostgreSQL no autogenerate.
Revise sempre as migrations geradas, incluindo constraints e defaults.
Defaults Python, como UUID e flags, nao sao defaults do servidor PostgreSQL.

Dentro de `backend/`, para gerar a migration inicial contra um banco vazio:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "initial_schema"
```

Depois de revisar a migration, o comando para criar as tabelas sera:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Gerar uma migration nao aplica as tabelas de negocio. `upgrade head` deve ser
executado somente quando for hora de aplicar o schema.


## Nucleo de identidade

Fluxo: `routes -> services -> repositories -> database`.

- `schemas/company.py`, `user.py`, `membership.py`: contratos Pydantic v2
  separados para create e response; strings limitadas aos tamanhos dos models,
  campos extras proibidos, UUIDs tipados e email validado por `EmailStr`.
  Slugs usam letras minusculas ASCII, numeros e hifens entre palavras.
- `schemas/preference.py`: update parcial e response. No PUT, campos omitidos
  sao preservados; null explicito e rejeitado. Horizontes: 7, 15 ou 30 dias.
- `repositories/*_repository.py`: consultas e alteracoes ORM, sem regras HTTP
  ou commits. Consultas de vinculos sao filtradas por empresa.
- `services/*_service.py`: existencia, unicidade, pertencimento e transacoes.
  `MembershipService.get(..., company_id=...)` rejeita vinculos de outra empresa.
  O cadastro do vinculo cria preferencias padrao atomicamente. GET nao escreve;
  se um vinculo antigo nao tiver preferencias, retorna 404 e PUT pode cria-las.
- `routes/`: recebe `Session` via `Depends(get_db)`, chama services e serializa
  respostas. Os quatro routers estao registrados no router principal.

Endpoints (prefixo `/api/v1`):

| Metodo | Caminho |
| --- | --- |
| POST / GET | `/companies` |
| GET | `/companies/{company_id}` |
| POST | `/users` |
| GET | `/users/{user_id}` |
| POST / GET | `/companies/{company_id}/memberships` |
| GET / PUT | `/memberships/{membership_id}/preferences` |

Listagens aceitam `offset >= 0` e `limit` de 1 a 100 (padrao 100).
Criacoes retornam 201; consultas e PUT retornam 200. Recursos ausentes retornam
404, conflitos de unicidade/integridade 409 e entradas invalidas 422.
Email segue a normalizacao do EmailStr; a unicidade segue a comparacao do banco
(case-sensitive na parte local). Nao ha autenticacao: o pertencimento garante
consistencia dos vinculos, nao autorizacao do solicitante. Os endpoints de
preferencias identificam a empresa pelo membership, sem aceitar outro company_id.

### Testes isolados

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Os testes usam TestClient, substituem `get_db` e criam somente as quatro tabelas
de identidade em SQLite em memoria, descartado ao final de cada teste. Nao
conectam ao PostgreSQL nem aplicam migrations. Cobrem os nove endpoints,
validacao, conflitos, rollback, isolamento entre empresas, preferencias de
vinculos antigos, imports, OpenAPI, health e CORS. SQLite nao substitui a
validacao de integracao futura em PostgreSQL.

O banco real precisa receber a migration revisada antes do uso dos endpoints.
Esta implementacao nao executa migrations nem cria tabelas no startup.

## Deploy no Render

O Blueprint `../render.yaml` configura a API e o frontend como servicos web e
nao cria um banco. Configure `DATABASE_URL` com a URL interna do PostgreSQL
existente, `NEXORA_CORS_ORIGINS` como JSON contendo a origem HTTPS exata do
frontend (por exemplo, `["https://nexora-frontend.onrender.com"]`) e
`VITE_API_URL` com a URL publica da API mais `/api/v1`. O backend inicia com
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

Antes do primeiro deploy, confira `python -m alembic current` e `python -m alembic heads` no ambiente ligado ao banco de producao. Se o banco ainda nao
estiver na revisao indicada, revise o estado e faca o upgrade aprovado com
`python -m alembic upgrade head` como comando manual de pre-deploy; nao use
`downgrade` nem rode o seed automaticamente. O seed e opcional apenas para
uma demonstracao vazia, e tem protecoes para o banco `nexora`; nao e necessario
para manter dados existentes.

Health check: `/api/v1/health`. Ele confirma que o processo responde, nao que
o banco esta conectado. A API nao possui autenticacao/autorizacao; nao exponha
dados privados ou permita uso multiempresa em producao antes de implementar
essas protecoes.
