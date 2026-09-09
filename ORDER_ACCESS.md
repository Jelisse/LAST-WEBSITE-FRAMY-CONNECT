# Order tracking access

Customer order tracking is read-only, including for a manager browsing the customer dashboard. Creation and transition controls and the model-context creation tool are only enabled in Operations/Agent views for an authorized order manager.

The workspace API requires both a trusted authenticated identity in `order_managers` and the explicit `X-Framy-Order-Management: true` request header for every order mutation. The header is context, not authorization: forging it without the database role is rejected. Customer profile and subscription actions remain separate. Existing owner scoping is retained.

Migration 0003 introduces the independent permission table with no production grants. The existing local development account `local_seedy` has been granted this permission in the local database only. Catalogue permissions do not grant order permissions.

Validation: `node tests/orders-readonly-api.mjs` confirms every mutation is forbidden without management context and records remain unchanged. With an unprivileged account it also verifies forged management context fails. Both role states were checked locally. `node tests/smoke.mjs` exercises the authorized simulated order lifecycle. Orders and payments remain sandbox simulations.
