# PaySuite checkout diagnostics

Successful checkout creation redirects to the validated PaySuite HTTPS checkout URL. The hosted checkout collects the wallet number or card details. A recorded order is not a confirmed payment.

Creation failures emit a structured Cloudflare Worker warning named `paysuite_checkout_failed`. It contains only `paymentReference`, UTC `timestamp`, `category` and `httpStatus`. Never copy API tokens, provider response bodies, account details, wallet numbers or card details into logs or support emails.

## Investigation

On 4 October 2026, a Cloudflare remote preview confirmed that `redirect: 'error'` is unsupported by the Workers fetch runtime and throws before issuing the provider request. The unauthenticated GET with `redirect: 'manual'` returned HTTP 401 without a redirect. Requests now use `manual`; non-success responses, including redirects, are rejected without forwarding the Bearer token. This check establishes connectivity, not merchant-token validity or live settlement.

Find `paysuite_checkout_failed` in Cloudflare Workers observability logs for `framy-connect-staging`.

- `http` / 401 or 403: verify the merchant token, account activation and permissions in PaySuite.
- `http` / 400 or 422: ask PaySuite to identify the validation failure using the reference and timestamp. Compare the request fields with their current API documentation.
- `http` / 429: provider rate limiting; do not automatically create another payment.
- `http` / 5xx: provider service failure.
- `timeout` or `network`: creation has an uncertain outcome; search the merchant dashboard by payment reference before replacing the request.
- `invalid_response`: provider response or checkout URL failed validation. Keep URL validation enabled; obtain the actual supported checkout hostname from PaySuite before changing the allowlist.

No failed creation is automatically repeated. A request with no stored provider ID cannot be verified by the scheduled reconciliation job. For the three historical `creating` requests, search the merchant dashboard by reference and confirm the provider outcome before deciding whether a replacement is safe. Do not mark an order paid based on a redirect or screenshot.

## Verification

Recovery on 4 October 2026: the four known requests created with the unsupported redirect setting were marked failed only where their status remained creating and both provider ID and checkout URL were absent. Corresponding pending product orders were marked failed and unreleased reservations were released. No records were deleted and no payment was initiated. This removed the pending-order limit blocker. Future uncertain network failures must still be reconciled before replacement.

Automated tests cover the callback field, hosted URL validation, signed webhook verification, settlement, HTTP rejection classification, malformed JSON, timeouts and duplicate prevention. These tests use a mocked provider and do not prove that live merchant credentials or payment methods are enabled.

Run a complete flow with PaySuite sandbox credentials when available. Verify M-Pesa, e-Mola and card checkout fields, payment success, cancellation, signed callbacks and order settlement. Do not substitute a live customer charge for a sandbox test.

## Support email template

Subject: Checkout creation failure — Framy Connect merchant integration

Hello PaySuite support,

We are integrating POST https://paysuite.tech/api/v1/payments for https://framyconnect.co.mz. We send amount, method, reference, description, return_url and callback_url, using Bearer authentication.

Expected result: a successful payment request with an id and checkout_url so the customer can enter wallet/card details in hosted checkout.

Observed result:
- Reference: [paymentReference]
- Timestamp (UTC): [timestamp]
- Diagnostic category: [category]
- HTTP status: [httpStatus, or no response]
- Payment method: [method verified in merchant dashboard]

Please confirm whether this request reached your service, whether our merchant account has the selected payment method enabled, and the reason checkout creation failed. For an uncertain response, please confirm the request's current status before we create any replacement. Please also confirm the supported checkout hostname and callback signature configuration.

We can provide our merchant identifier through your secure support channel. No API token or customer payment details are included here.
