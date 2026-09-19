# Opsellio return page

Configure the merchant checkout's post-payment return destination as:

https://framy-connect-staging.jelisselanga.workers.dev/pagamento/retorno

This is a browser return page, not a payment webhook. Provider settings must be configured separately after this route is deployed. No provider-specific query parameter support is assumed.

The payment button stores the order reference locally. The return page loads only the signed-in customer's orders; a reference from the URL or browser storage never authorizes access. Customers can choose their order if the reference is unavailable, or sign in and resume the return page. Status refreshes every 30 seconds while visible and on focus.

Payment remains pending until staff verify it. Confirmed, cancelled and refunded states use server data. The assigned active agent's manager-maintained name and phone appear only for paid, non-cancelled orders. Private application information and identity documents are never returned. The same contact card appears in O meu pedido and order details.

Interface text is available in Portuguese, English and Traditional Chinese. No database migration is required.
