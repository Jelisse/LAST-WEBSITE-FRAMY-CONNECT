# Manager workspace

Open `/manager` (the former `/operations` route displays the same workspace). The four sections are overview and reporting, operations with orders/agents/stock tabs, products and monthly plans, and finance.

## Access and persistence
The server checks `order_managers` for Manager access. Product edits additionally require `catalog_managers`; those permissions are independently granted. The existing local development account has both. There are no production grants in the migrations. Customers retain an owner-scoped read-only order view. Manager can see orders across customer accounts and published customer profile links.

Migration 0004 adds agent/plan records, stock movements, management activity history and agreed subscription terms. Stock starts with zero recorded units: enter the actual initial quantity in Operations > Stock. Each existing sandbox order represents one product unit. Paid orders reserve one unit; delivery consumes it. Stock updates and order changes use atomic database batches and optimistic order/record versions. Legacy workspace transitions use the same Manager handler after ownership checks, preserving stock guards.

## Catalogue and subscriptions
Products can be added or edited, with images, descriptions, prices and costs. Existing order amounts/costs are snapshots and stay unchanged. Unavailable products remain visible as consultation-only offerings. No destructive product deletion is exposed.

Plan prices are USD per month; links allow 1–50 and biographies 0–1200 characters, matching the current profile storage limits. New subscriptions save an agreed terms snapshot. Existing memberships without a snapshot retain the original seed terms. Changing a plan does not silently change existing subscribers. Inactive plans are removed from the upgrade chooser. Payments remain simulated: there is no payment provider or recurring collection.

## Reporting
Overview and finance can filter orders by creation date and export CSV. Revenue and cost are recognized on delivery; received cash and outstanding balances are shown separately. Product monetary amounts remain MZN and are not combined with USD subscription prices. Audit records include actor and timestamp. Stock movements require a reason.

## Verification
`node tests/manager-api.mjs` creates removable QA fixtures and checks authorization, CSRF, new products, agent optimistic versions, stock reservation/delivery, customer event propagation and active plans. It writes `outputs/manager-test-cleanup.sql`; apply that file to the local DB afterwards to remove only those fixtures. `node tests/orders-readonly-api.mjs` verifies customer mutation blocking. Use the Manager test for the new fulfilment flow; the historical smoke script assumes untracked stock and is not the current workflow test.

## Agent stock custody
Migration 0005 adds stock custody by stable agent ID; existing movements remain central. Manager can deactivate/reactivate agents, add quantities to central or an active agent, allocate central stock, and return stock from active or inactive agents. Transfers use atomic paired ledger entries and do not change total quantity. Assigned reservations cannot be transferred away; unassigned paid orders reserve globally. Order assignment uses available agent stock or transfers its reserved central unit automatically. Delivery deducts from the assigned agent. Existing agent stock and history remain visible after deactivation.
