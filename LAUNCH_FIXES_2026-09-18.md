# Correcções para lançamento — 18 de Setembro de 2026

## Implementado

- Separação dos dados do cliente dos custos, margens, notas e registos internos.
- Controlo do período gratuito de 30 dias na publicação de perfis e fotografias públicas.
- Encomenda e aprovação do perfil numa transacção, prevenção de duplicados, controlo de stock e reservas com validade de 24 horas.
- Confirmação visível da encomenda e pagamento associado à encomenda do cliente.
- Link Opsellio existente limitado ao porta-chaves de 500 MZN. Outros produtos e valores exigem configuração própria.
- Confirmação manual de pagamentos e reembolsos com referência única, valor, moeda e declaração de verificação no fornecedor. Registar um reembolso não executa uma transferência.
- Criação de agentes e gestores após o lançamento, convites de utilização única com validade de 24 horas, desactivação e revogação de sessões. Apenas directores podem criar directores; não é permitida a desactivação da própria conta nem do último gestor activo.
- Alteração de palavra-passe e encerramento de todas as sessões. Recuperação administrativa por novo convite.
- Etapas de produção, teste NFC, embalagem, expedição e entrega validadas também no servidor.
- Relações, índices e restrições adicionais na base de dados, limites de carregamento de ficheiros, cabeçalhos de segurança e redução dos dados guardados no navegador.
- Correcção de textos e mensagens em português, incluindo estado do plano e instruções de pagamento.

## Verificação

41 testes automatizados, incluindo testes das rotas com SQLite e todas as migrações. Fluxo HTTP completo executado no ambiente local isolado: registo, plano, encomenda, pagamento manual, convite de agente, produção, entrega e revogação da sessão do agente. Nenhum pagamento real foi efectuado. As migrações anteriores foram preservadas; a nova migração é 0009.

## Dependências para abertura ao público

- Documentação e configuração oficial da Opsellio para confirmação automática, assinaturas de webhooks e ligação entre transacção e encomenda. A implementação actual exige reconciliação manual.
- Links de pagamento válidos para cada produto e preço adicional.
- Serviço de e-mail para verificação do endereço e recuperação automática; MFA para pessoal de gestão ainda não implementado.
- Confirmar stock físico, valores comerciais, entrega, devoluções, dados legais da entidade e contactos de suporte.
- Verificar inventário dos ficheiros antigos e estabelecer retenção/limpeza. A quota controla novos ficheiros; não faz inventário retroactivo.
- Validar cópias de segurança e recuperação com dados reais, domínio e configuração operacional. O acesso privado existente não constitui lançamento público.
- Numa publicação directa no Cloudflare, configurar o bucket R2 real. O caminho Sites usa as ligações lógicas DB e PROFILE_PHOTOS já declaradas.

O relatório LAUNCH_AUDIT_2026-09-18.md descreve o estado anterior às correcções. Este documento regista o trabalho subsequente, sem afirmar que a integração automática de pagamentos ou o lançamento público ficaram concluídos.
