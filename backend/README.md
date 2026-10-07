# Backend Nexora

Base em FastAPI, com Python 3.10 ou superior. Nesta etapa existe somente
`GET /api/v1/health`, que retorna `{"status":"ok"}`. Nao ha regras de negocio,
autenticacao ou integracao com o frontend. A infraestrutura PostgreSQL usa SQLAlchemy e Alembic.

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

O fluxo das funcionalidades sera `routes -> services -> repositories`, com
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
