# Auditoria de preparação para lançamento — Framy Connect

Data: 18 de Setembro de 2026. Resultado: NÃO lançar vendas públicas ainda.

Âmbito: revisão do código local, APIs, autenticação, permissões, checkout, migrações, armazenamento, conteúdo e testes existentes. Não foi uma auditoria de intrusão nem validação do ambiente de produção. Não foram alterados dados remotos, contas ou pagamentos. Os documentos antigos descrevem funcionalidades que já mudaram; as conclusões abaixo dão prioridade ao código actual.

## Respostas às perguntas

| Questão | Situação confirmada no código |
| --- | --- |
| Opsellio incluída no plano grátis? | O plano digital tem 30 dias gratuitos. A cobrança é do produto físico. O botão Opsellio aparece apenas após submeter um porta-chaves, com texto fixo «Pagar 500 MT». |
| O pagamento funciona de ponta a ponta? | Existe uma ligação externa clicável, mas não uma integração completa: não há criação de sessão por encomenda, referência enviada ao prestador, webhook verificado ou reconciliação automática. A página externa não pôde ser validada nesta revisão. |
| Os dados estão ligados? | Sim, por owner_id, id, agentId e consultas SQL. Existem relações funcionais, mas a maioria não tem chaves estrangeiras e vários atributos estão dentro de JSON. Não foi inspeccionada a base remota. |
| A compra é submetida com sucesso? | A API guarda a encomenda e a interface mostra «Pedido registado» após resposta de sucesso, com referência e acompanhamento. Isso significa pedido pendente, não pagamento concluído. O percurso completo em navegador/produção continua por validar. |
| O sistema está em português? | Predominantemente, com lang=pt-MZ. Restam «Manager», «download», nomes técnicos em erros e textos de prévia incompatíveis com uma loja lançada. |
| O gestor poderá criar utilizadores depois do lançamento? | Ainda não pelo painel. Pode cadastrar registos operacionais de agentes, mas isso não cria auth_accounts nem credenciais. Contas de agente, gestor e direcção exigem provisionamento técnico. Não existe papel financeiro independente. |

## Bloqueios prioritários

1. **Pagamento sem reconciliação (alta).** `lib/customisation.ts` guarda um único PAYMENT_URL; `components/order-submission.tsx` mostra-o apenas para keychain. O URL não recebe orderId nem o valor guardado da encomenda. Uma alteração do preço no catálogo não altera o texto de 500 MT. Não há pagamento equivalente para cartões. `app/api/manager/route.ts` e `lib/domain.ts` permitem confirmar pagamento e reembolso simulados, sem verificar o prestador. Implementar ligação por encomenda, validação de valor/moeda/referência, eventos autenticados e idempotentes, falhas, cancelamentos e reembolsos. Não apresentar uma simulação como confirmação bancária.

2. **Custos internos enviados ao cliente (alta).** O GET de `app/api/workspace/route.ts` devolve todo o data_json das encomendas do titular, incluindo cost e journal. A interface pode esconder estes campos, mas o navegador recebe-os. Criar uma resposta explícita para clientes que exclua custos, margens e contabilidade interna.

3. **Plano gratuito contornável pela API (alta).** Sem sandbox_memberships, `membershipTerms` assume o plano individual. A publicação só rejeita um trial free-30 que já esteja expirado; não exige uma adesão válida. A consulta pública em `app/[slug]/page.tsx` também aceita a ausência de adesão. Um cliente autenticado pode publicar um perfil básico sem iniciar o relógio de 30 dias. Centralizar a autorização de publicação e exigir uma adesão válida. A fotografia pública também não verifica a expiração do trial em `app/api/profile-photo/[id]/route.ts`.

4. **Criação de acesso da equipa incompleta (alta).** A acção agent de `app/api/manager/route.ts` só escreve manager_records. O login de agente requer auth_accounts.id igual ao id desse registo. Implementar convites/credenciais, vínculo atómico, activação, desactivação, revogação de sessões e histórico. Definir quem pode criar/promover gestores e direcção; evitar auto-promoção e remoção do último administrador. O director actual vê contagens gerais, não administra acessos.

5. **Armazenamento ausente na configuração de staging (alta).** `wrangler.jsonc` só declara DB. Fotografias e designs dependem de PROFILE_PHOTOS; uploads falham sem essa ligação. `scripts/build-cloudflare.mjs` valida D1 mas não R2. Configurar o bucket real e verificar ambos os recursos e todas as migrações antes da publicação.

6. **Reservas de stock sem expiração (alta).** Submeter encomendas reduz product_options mesmo antes do pagamento. Não há libertação automática de pedidos abandonados; a reposição depende do cancelamento. Sem verificação de email, múltiplas contas podem consumir reservas. Implementar prazo de reserva, limites de abuso e devolução atómica de unidades. Reconciliar product_options com stock_movements: actualmente são controlos separados, e a migração 0007 inicializa opções com 500 unidades que precisam de validação física.

## Segurança e acessos

Protecções presentes: palavras-passe bcrypt com custo 12; tokens aleatórios de 32 bytes guardados como SHA-256; cookies HttpOnly, SameSite=Lax e Secure em HTTPS; sessão de 24 horas; limites de tentativas por email/IP; verificação de origem nas escritas; SQL parametrizado; cliente limitado às próprias encomendas; agente limitado às encomendas atribuídas; controlo de versões; desactivação de agente verificada nas sessões; verificação de propriedade de fotografias/designs; projecção restrita dos dados enviados ao agente.

Pendências adicionais:

- Não há recuperação de palavra-passe, verificação de email, MFA da equipa ou gestão de sessões pelo titular.
- Uploads têm limites por ficheiro, mas não quotas totais por conta, limpeza de ficheiros órfãos ou política de retenção comprovada.
- Algumas APIs devolvem mensagens de excepção directamente. Normalizar erros públicos e registar detalhes apenas no servidor.
- Não foi encontrada uma política global de CSP/anti-enquadramento nos ficheiros da aplicação; verificar também cabeçalhos efectivos na infraestrutura antes de concluir se estão ausentes em produção.
- O progresso de checkout guarda contactos e endereço em localStorage e não é limpo no logout. Rever retenção e comportamento em dispositivos partilhados.
- O gestor tem poderes amplos sobre produtos, stock, pagamentos e reembolsos; ainda não há separação granular de funções.
- O fluxo do gestor usa transições menos exigentes do que o agente para qualidade/entrega. Definir excepções supervisionadas e justificadas para não omitir programação NFC, embalagem e expedição sem rastreio.

## Banco de dados e consistência

O sistema actual usa Cloudflare D1/SQLite, não o PostgreSQL/Prisma descrito no README principal. O código liga conta → perfil/adesão/encomendas por owner_id; encomenda → eventos por order_id; encomenda/stock → agente por agentId; designs → conta por metadados R2.

`db/schema.ts` está desactualizado face às migrações: faltam tabelas de autenticação, product_options e colunas de trial. Actualizar o esquema antes de gerar novas migrações. A maior parte das relações não tem REFERENCES; validar registos órfãos e adicionar restrições/índices adequados. Os identificadores de agentes e planos partilham a chave primária de manager_records. As tabelas antigas catalog_managers/order_managers já não são a fonte das permissões actuais.

O manager consulta o perfil publicado actual, enquanto a encomenda guarda a versão aprovada, sem guardar uma cópia integral imutável desse perfil. Definir o que é dinâmico e o que constitui prova da aprovação original. Confirmar migrações, integridade, cópias de segurança e restauro no ambiente real. Não há evidência nesta revisão de que a base remota esteja sincronizada.

## Compra, conteúdo e lançamento

O fluxo implementa produto → plano → conta → perfil → entrega → confirmação → referência. A publicação do perfil antecede uploads/submissão; uma falha posterior pode deixar o perfil publicado sem encomenda. A repetição usa o mesmo ID, mas não compara todos os dados de personalização/contacto. O estado «done» é recuperado de localStorage sem verificar novamente a encomenda. A confirmação definitiva deve vir do servidor e o cliente deve conseguir repetir uma compra com uma nova referência.

Actualizar o teste HTTP `tests/checkout-api.mjs`: ainda espera cookie de `/signin-with-chatgpt`, anterior à autenticação actual. Revalidar os restantes testes de integração antes de os usar como prova do lançamento.

Substituir textos de desenvolvimento em ajuda, contacto, termos, privacidade e painéis. A privacidade actual descreve uma prévia privada, mas a rota de perfis publicados não exige login na aplicação. Especificar condições comerciais reais, entrega, devoluções, suporte e tratamento de dados, sem assumir que o texto actual cobre a operação comercial.

Configurar domínio final antes de produzir QR/NFC. `app/layout.tsx` ainda usa um domínio de prévia em metadataBase; robots.ts bloqueia toda a indexação. Manter perfis privados fora da indexação conforme a política escolhida e preparar o SEO das páginas comerciais. Validar DNS, HTTPS, email de suporte, monitorização, alertas, backups/restauro e rollback.

## Verificação realizada

- 36 testes existentes de domínio, acessos, agentes, catálogo, personalização e impressão: passaram. Foram importados no mesmo processo porque o modo normal do test runner encontrou uma restrição EPERM ao criar subprocessos.
- `python tests/stock-reservations.py`: passou, incluindo última unidade, cancelamento e repetição idempotente.
- `npm audit --omit=dev` e auditoria completa: zero vulnerabilidades conhecidas reportadas nesta execução. Isto não equivale a ausência de falhas na aplicação.
- Lint: falhou, incluindo acessibilidade, hooks e promessas sem tratamento. O BUILD_STATUS antigo já não representa esta verificação.
- TypeScript: passou. As nove migrações foram aplicadas numa base SQLite temporária em memória; integrity_check devolveu ok. A inspecção confirmou que só auth_sessions tem chave estrangeira e reproduziu a aceitação, pela consulta pública, de um perfil sem adesão. Este teste não verifica o estado de D1 remoto.
- Não foi executado um pagamento real, teste de intrusão, validação visual completa ou compra ponta a ponta no ambiente publicado.

## Ordem recomendada de trabalho e critérios de aceitação

1. Corrigir exposição de custos, autorização do trial e abuso de reservas; provar isolamento entre dois clientes e dois agentes.
2. Implementar gestão de contas e testar convites, papéis, desactivação e revogação.
3. Integrar pagamentos e testar sucesso, recusa, abandono, evento repetido/fora de ordem, valor errado e reembolso.
4. Sincronizar esquema/migrações e recursos D1/R2; testar restauro e uploads em staging.
5. Corrigir recuperação/repetição do checkout, conteúdo em português e mensagens comerciais.
6. Executar compra completa cliente → pagamento verificado → gestor → agente → NFC/qualidade → entrega, com auditoria e confirmação visíveis ao cliente; passar verificações de qualidade e só depois preparar o lançamento.

