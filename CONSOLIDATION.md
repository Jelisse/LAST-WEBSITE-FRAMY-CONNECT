# Consolidação — Outubro de 2026

## Implementação

- Recuperação autónoma em `/recuperar`, ligada ao login: email registado, token aleatório de uso único, validade de 30 minutos, hash na base, limites por IP/email, resposta pública sem revelar se a conta existe. A mudança de palavra-passe termina sessões e invalida os restantes tokens. Recuperação pela gestão continua limitada a clientes.
- Remetente autorizado: `Framy Connect <info@framyconnect.co.mz>`. O destinatário é sempre o titular da conta; o browser não pode escolher outro destinatário. `RESEND_API_KEY` permanece segredo do Worker. Verificação do domínio e entrega real do email são dependências externas.
- Gestão de contas mostra o link do perfil publicado sem encomenda física, respeitando as permissões existentes. Não expõe rascunhos.
- Uma identidade fictícia, Ana Matavele, é partilhada pelo exemplo e pela demonstração da homepage. A fotografia foi gerada por IA. O cartão usa um QR determinístico de `https://framyconnect.co.mz/exemplo`, sobreposto à ilustração; os perfis de clientes não são alterados.
- Compra mantém a configuração ao entrar/criar conta ou preparar o perfil. Guardada neste separador por 30 minutos; preços são sempre recalculados no servidor. O passo 3 explica o requisito de publicar o perfil e permite voltar à compra.
- O retorno de pagamento preserva a referência após login. O cliente pode consultar pagamentos na secção de encomendas e ver a entrega confirmada. O gestor só confirma entrega de encomendas com pagamento validado, com auditoria e protecção contra repetição.
- Estatísticas do website e visitas a produtos exigem consentimento. Escolhas versionadas por 180 dias; revogação entre separadores; DNT/GPC respeitados. Medição de perfis tem preferência separada. Cookies necessários e armazenamento estão descritos em `/privacidade#cookies`.
- Validação de publicação inclui relações D1: chaves estrangeiras, titular/valor/estado das encomendas e facturas perante o registo de pagamentos. Falhas bloqueiam publicação sem imprimir dados de clientes.

## Validação e limites

Testes automatizados cobrem recuperação, expiração/repetição, permissões, consentimento, retorno após login, restauro de configuração, pagamentos/webhooks, stock, subscrições e entrega. PaySuite é simulada nos testes; nenhum pagamento real é criado ou efectuado por esta validação. Os testes não comprovam aprovação por um banco/carteira.

Ainda é necessário confirmar:

1. Resend: chave no Worker, domínio de envio verificado e chegada de uma recuperação solicitada pelo titular à sua caixa de correio.
2. Primeira transacção real: referência e valor iguais no prestador e no registo interno; webhook válido; estado pago e efeito no produto/plano. Não pagar duas vezes se o estado for incerto; usar reconciliação no painel.
3. Stock, disponibilidade e preços publicados de cada material no gestor. A implementação não inventa stock nem confirma preços ainda por publicar.

O editor online de design ainda não existe. A interface informa que o PDF é entregue à equipa depois do pedido. A criação pela equipa e a entrega de Maputo usam os valores editáveis no gestor. Entrega fora de Maputo exige proposta.

Não há autorização documentada para débito automático recorrente PaySuite. A cobrança é iniciada pelo cliente; o período mensal/anual só é activado após confirmação do prestador.

## Proveniência visual

Ferramenta: geração de imagens integrada, com referência à antiga fotografia demonstrativa. Assets optimizados: `public/home/ana-matavele.webp` e `public/home/ana-card.webp`.

Prompt do retrato: “Professional website profile portrait of a fictional adult Mozambican woman named Ana Matavele, late twenties or thirties, warm dark-brown skin, voluminous shoulder-length natural curly dark-brown hair, simple pale cream sleeveless high-neck top. Chest-up composition, face slightly turned to her left, relaxed friendly expression, soft warm natural indoor window light and softly blurred neutral cream background. Similar warm casual portrait composition to the provided reference, but a distinctly new fictional person. Vertical 4:5, no text, UI, logos or orange overlay.”

Prompt do cartão: substituir o nome Solange Siquela por Ana Matavele, mantendo a composição e a textura. O QR ilustrado é coberto por um SVG funcional gerado com a biblioteca `qrcode`.
