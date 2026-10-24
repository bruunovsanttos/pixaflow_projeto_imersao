# Login e dados diários — etapas 4 e 5

Implementação local. Publicação, migração do Neon e definição de senha não foram executadas.

## Comportamento

Login com senha (scrypt, salt aleatório), sessão opaca em cookie HttpOnly/Secure/SameSite=Lax, duração de 8 horas e revogação no logout. O banco guarda somente o hash do identificador de sessão. Cinco falhas por e-mail em 15 minutos bloqueiam novas tentativas naquela janela. Origem validada em gravações; gateway na mesma origem do frontend. Nenhum token em localStorage.

Empresas e vínculos são filtrados pelo usuário autenticado; dados empresariais exigem vínculo; simulações e cenários salvos exigem também autoria. Perfis admin/operator podem gravar; viewer apenas lê dados empresariais. Preferências pessoais podem ser alteradas pelo próprio usuário. Criação pública de usuários, empresas e vínculos fica bloqueada. Os endpoints administrativos antigos permanecem documentados, mas recusam acesso HTTP, inclusive do perfil admin. Provisionamento inicial exige acesso administrativo ao servidor e um usuário/vínculo já existente.

Em `/dados`, cada empresa informa receita realizada, tarefas previstas/concluídas/no prazo e minutos disponíveis/produtivos da equipe. Datas futuras são recusadas. Cada edição guarda revisão e histórico; conflito de revisão retorna 409. Após conflito, use Tentar novamente/recarregue o dia antes de editar novamente. Gere uma análise para atualizar o Dashboard. As análises são versões imutáveis, com origem, revisões, data de referência e modelo; alterações posteriores geram aviso de desatualização.

## Métricas

- Riscos críticos, total de riscos, impacto exposto, oportunidades e eventos continuam nos endpoints existentes.
- Saúde operacional: 100 × tarefas no prazo / previstas na janela de 28 dias. Mede cumprimento de tarefas; não é diagnóstico geral da empresa. Sem tarefas previstas: indisponível.
- Eficiência: 100 × minutos produtivos / disponíveis na janela. Sem tempo disponível: indisponível.
- Tendência: resultados diários reais declarados; dias ausentes aparecem como lacunas, sem previsão de saúde futura.
- Receita estimada: total de 28 dias completos / 28 × 30. Exige todos os dias registrados, inclusive zeros. Sem histórico completo: indisponível. Estimativa simples, sem sazonalidade ou garantia de receita.
- Datas no horário de Brasília. Análise aceita somente dias encerrados. Janela, cobertura e referência aparecem na UI.

Simulações continuam com modelo demonstrativo. Assistente continua consulta determinística de riscos/oportunidades/eventos, sem IA generativa; orienta consultar análises no Dashboard. Notificações e apresentação permanecem demonstrativas, sinalizadas. Nenhum valor demonstrativo substitui métrica analítica ausente.

## Publicação coordenada

1. Antes de publicar, mantenha backup recuperável do banco e confirme a configuração de produção. A nova migração adiciona sete tabelas; não altera registros empresariais existentes.
2. No backend, instalar `requirements.txt` e executar `python -m alembic upgrade head` usando a conexão de produção já configurada. Não execute downgrade em produção: ele remove histórico e acessos.
3. No backend, definir `NEXORA_CORS_ORIGINS=["https://pixaflow-projeto-imersao.onrender.com"]` e `NEXORA_COOKIE_SECURE=true`. Incluir um domínio próprio somente se usado pelo frontend.
4. Provisionar o usuário/vínculo existente: `python -m scripts.provision_access --email EMAIL_EXISTENTE --company-id UUID_DA_EMPRESA --role admin`. O administrador digita a senha duas vezes no terminal oculto (12–128 caracteres). Não enviar senhas pelo chat, argumentos ou commit. Reexecutar troca a senha, atualiza o perfil desse vínculo e revoga sessões anteriores do usuário.
5. No serviço frontend Render, definir `NEXORA_API_ORIGIN=https://nexora-api-hd5c.onrender.com` (sem `/api/v1`). É configuração do servidor, não variável VITE. Publicar backend e frontend como uma alteração coordenada: clientes antigos param de acessar a API após a proteção ser ativada.
6. Validar login, empresa correta, leitura das telas existentes, cadastro de um dia real, geração de análise, logout e recusa de acesso sem login. Confirmar o cookie Secure/HttpOnly no domínio do frontend.

Para desenvolvimento HTTP local, configurar backend `NEXORA_COOKIE_SECURE=false` e origem correspondente ao frontend, e iniciar frontend com `NEXORA_API_ORIGIN=http://127.0.0.1:8000`. Nunca usar a opção false na publicação HTTPS. A variável antiga VITE_API_URL deixa de definir o destino do navegador.

## Limites desta versão

Sem cadastro público, recuperação por e-mail, MFA ou interface administrativa de usuários. Provisionamento requer usuário e vínculo existentes. Uma empresa é selecionada pelo resolvedor atual entre as permitidas. Perfil profissional exibido no cabeçalho é descritivo; permissões usam o papel de acesso separado. Dados manuais não têm verificação externa. Segurança deve ser complementada pela configuração de infraestrutura e operação do serviço.

Referência de arquitetura: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

## Antes do commit de publicação

O `render.yaml` agora contém a origem pública da API, a origem permitida do frontend e cookie seguro. Não contém senha ou URL de banco. Os nomes dos serviços do Blueprint foram preservados para não sugerir criação ou renomeação dos serviços existentes.

Se os serviços existentes foram criados manualmente, o push do código não aplica essas configurações do YAML. No serviço frontend existente, cadastrar `NEXORA_API_ORIGIN=https://nexora-api-hd5c.onrender.com`; no backend existente, conferir `NEXORA_COOKIE_SECURE=true` e `NEXORA_CORS_ORIGINS=["https://pixaflow-projeto-imersao.onrender.com"]`. Não criar outro Blueprint para tentar vincular esses serviços: isso pode criar serviços separados.

A migração e o provisionamento de senha continuam passos explícitos, não executados pelo build/start. O commit sozinho não conclui esses passos. Em serviços com pre-deploy disponível, `python -m alembic upgrade head` pode ser configurado nesse campo; caso contrário, executar manualmente em ambiente com o código novo e conexão já configurada, antes de ativar a versão.

Mensagem sugerida de commit: `feat: adiciona login por empresa e análises com dados diários`.

Referência de configuração: https://render.com/docs/blueprint-spec
