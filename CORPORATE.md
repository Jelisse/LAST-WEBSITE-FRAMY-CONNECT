# Corporate organizations - 19 October 2026

## Scope and commercial configuration

`/corporativo` provides organizations, leader/member permissions, employee onboarding, campaigns, anonymous campaign action totals, consented contact collection and results CSV export. It extends the current account system without replacing staff roles or migrating existing profile teams into a company without employee acceptance.

Owners can now receive explicit audited Corporate approval from a Framy manager without changing payment records. Existing verified paid Corporate memberships with team permission remain supported when no manual approval/suspension overrides them. The canonical `corporate` plan is recognized automatically; a versioned negotiated contract can enable `corporateEnabled`. Plan management configures `memberLimit` from 1 to 500 (default 25). This counts active employees and valid outstanding invitations, excluding the owner. Suspending an employee releases their seat; resuming checks capacity again. Prices and monthly/annual periods remain manager-controlled. This feature does not invent per-seat prices, charge automatically or rewrite existing paid terms. Existing contracts without a limit use 25; new commercial terms are snapshotted through the established renewal flow.

The owner can create an organization, designate delegated leaders, and invite employees. Delegated leaders manage ordinary workers, invitations and campaigns, but cannot promote another leader or change the owner. Members see only their own organization results, assignments and contacts. Neither company leaders nor Framy staff receive another company's dashboard merely by having a global staff role. A paid contract that has expired beyond existing grace blocks corporate operations; workers can still leave their organization. Internal Framy staff access and personal subscriptions are not changed by joining a company.

## Employee creation and email confirmation

The leader enters name, email, team and role. New email addresses receive an inactive customer account with no usable password. Existing accounts retain their identity, profile, personal data and password. A cryptographically random 256-bit invitation is sent only to the entered employee email via configured Resend. Only its SHA-256 hash is stored; the leader API never returns the acceptance link or token. The canonical HTTPS site URL is used, with the token in the URL fragment. The link is valid for seven days and single use. Re-sending revokes its predecessor. Cancellation, inviter suspension/demotion, account version changes, or loss of Corporate access invalidate acceptance.

At `/corporativo/aceitar`, a new employee confirms association/data sharing and chooses their own password (12 characters minimum, 72 UTF-8 bytes maximum). Existing users sign in as the invited account and confirm association; their password cannot be replaced by this flow. Activation, one-time consumption, membership and audit are one transaction. Database triggers enforce seat capacity under concurrency. Organization membership begins only after acceptance. Pending accounts modified by global management cannot be reactivated through the company invitation flow.

The dashboard distinguishes email-service acceptance from uncertain sending and employee acceptance. It does not claim inbox delivery. It supports re-send/cancel. No global account deletion or password visibility is given to company leaders. Suspending company membership does not deactivate a person's independent account.

## Campaign measurement and contacts

Leaders create/close events and assign accepted employees. Each assignment gets a `/campanha/{id}` link and QR code. This public work page identifies the organization, employee and campaign, opens the employee's published profile with campaign attribution, and offers an optional contact form. Subsequent profile actions are validated against the current published profile before campaign attribution. Disabled employees, closed campaigns and expired company access stop collection.

Only campaign links/QRs carry corporate attribution. Existing personal links and already-programmed NFC URLs are not silently rewritten or attributed to an employer. Using campaign URLs on physical NFC products requires the authorized encoding workflow; this implementation does not bypass approved URL checks or automatically reprogram products. Worker personal profile limits remain determined by their own profile plan; company membership supplies organization tools, not a silent replacement personal subscription.

Counters store assignment/day/target/count, with no visitor identity, IP, session ID or device identifier. DNT/GPC, bots and signed-in staff/self activity are excluded. Opens count opening actions, clicks count validated actions, and submitted contacts count received forms. They do not prove unique people, successful contact saving or social-media follows. Results use Maputo calendar periods and can be filtered by campaign. CSV cells are formula-safe. Lists have explicit bounds; contact totals are aggregated independently of the latest 500 displayed forms.

Contact forms require explicit consent, name and email or phone. They record the consent version and timestamp; request IDs deduplicate retries. Organization leaders can see company contacts, workers only their own. Contacts are visible for 90 days and the scheduled worker purges expired records in bounded batches. No automatic marketing, external CRM integration or messages to captured leads are added.

## Release and verification

Required additive migration: `0031_corporate_organisations.sql`. Follow `CLOUDFLARE.md` for backup, remote inventory and deployment; do not replay all migrations or modify live accounts manually. Existing financial and profile records are not reset. Account deletion protects corporate operational history.

Automated tests use isolated SQLite/D1 adapters and fake email/provider services. They cover new/existing employee acceptance, password preservation, consent, invitation replay/re-send/cancel, capacity rollback, account changes, delegated leader rules, organization isolation, suspension, campaign attribution, contact deduplication, retention and contract expiry. Real Resend delivery and acceptance by real employees remain external checks. Source changes and migration are local until explicitly deployed.

## Additional onboarding and access safeguards

Bulk onboarding accepts up to 25 name/email/team rows per submission, validates the entire batch first, and preserves failed/unprocessed rows for retry. Successful invitations are not automatically sent again. The dashboard refreshes visible results every 30 seconds while preserving active form editing.

If paid capacity is reduced, only the earliest accepted active employees within the current limit retain company access. Personal accounts remain active. An employee who leaves has a recorded withdrawal: leaders cannot restore that association with the suspension toggle. A fresh invitation and renewed employee acceptance are required. Delegated leaders can also leave; the organization owner cannot abandon ownership through this control.

## Guided setup and manager approval - 19 October 2026 (local)

Homepage Corporate offer and the profile plan picker lead to /corporativo/configurar. Registration also offers Corporate as an account intention; it does not provision global staff roles or fabricate a paid membership. The user can keep their free Individual profile, save a partial company draft and submit company name, employee count (1-500), contact phone, location, sector, team names, goals and product requirements. A submitted request is immutable and retry-safe. The system sends a notification to the established Framy business inbox info@framyconnect.co.mz with the registered account as reply-to; browser input cannot select recipients. Service acceptance is not proof of inbox delivery. If sending fails, the saved request remains available in management.

Contas e acessos lists the Corporate request status beside the account access level. Company details load only on expansion through a private authorized API; the account list does not fetch every full company submission. Framy managers/directors review the details, choose an approved limit and click Aprovar Corporativo. The versioned transaction records an audit event, grants scoped organization access and creates the owner organization/membership. Repeated approvals do not duplicate organizations. Suspender Corporativo removes access without disabling personal accounts. Approval is an explicit manual operational grant until suspended; it does not confirm payment, change prices, extend paid membership dates or enable automatic debit. Paid subscriptions and their renewal/settlement records remain separate. The customer can refresh the setup status and then open A minha equipa.

Employee joining methods:
- Convite: email recipient creates their own password for a new account; existing users must sign in with the invited email and confirm. Existing passwords and personal profiles are preserved. Leaders cannot reset credentials of these independent accounts.
- Autorizacao: only new pending customer accounts qualify. The employee receives an email button, reviews the organization and explicitly consents to leader creation/password administration and campaign data sharing. Before consent, provisioning is denied. Consent consumes the token, reserves a seat and creates a scoped managed-access authorization while the account remains inactive. The leader then creates access by entering the name/password, delivers credentials privately, and can reset only that authorized managed account. Passwords are bcrypt hashed, never returned by APIs or emailed. Employees can change their password through existing Account security or recover their own access. Resets revoke sessions and recovery tokens. Existing accounts must use Convite.

Both methods support individual and 25-row batch sending. Roles, capacity, issuer status, target account version and organization access are rechecked in transactions. A departed employee's managed-password authorization is revoked and cannot be restored by the leader. Rejoining uses the independent invitation path. Suspension/capacity reductions also block credential administration. Delegated leaders cannot reset owners or other leaders. Lists and bodies remain bounded; owner/request and managed-account lookups are indexed. Campaign links, analytics privacy and 90-day contact retention remain unchanged.

Required additional migration: 0032_corporate_onboarding.sql, with request/authorization storage and replacement of the organization eligibility view. It preserves historical records and existing paid eligibility. This migration and the new flow have not been published in this turn. Existing live deployment remains 85793040-c5c8-4ecd-b5b7-3980f070d18c through migration 0031.

## Automatic approval transition and email-only invitations (local)

The company setup waiting page checks approval every 15 seconds while visible, and immediately on window focus/visibility return. Already-approved setup visits and newly detected approvals open /corporativo automatically. Manager approval grants organization permissions atomically before navigation; neither permission activation nor the transition depends on notification email delivery. Personal profile access remains independent.

The team dashboard now includes an open email-only invitation form with + to add rows, row removal, one optional shared team and a single send button. Up to 25 addresses are validated and deduplicated before sequential sending. Successfully processed rows clear; failed/unprocessed rows remain available for correction/retry. Both invitation and authorization methods are supported. Existing named/advanced and batch workflows remain available.

Corporate invitation messages are generated by the server using authoritative company and inviter names, with a clear acceptance/authorization button. HTML names are escaped; no browser-supplied sender or body is trusted. Acceptance opens the Framy employee account setup page showing company and inviter. For a new invitation account, the employee enters full name and password; the address is bound to the token and cannot be changed to another account. Existing users authenticate with the invited address and retain credentials. Authorization continues to require explicit consent before leader provisioning/private password delivery. Employees may change their passwords using Account security.

No additional migration beyond the pending 0032 is needed for these refinements. They remain local and unpublished.

## Corporate onboarding release - 19 October 2026

The guided setup, manual manager approval, authorization/password administration and email-only invitations are now published. Migration 0032 applied after private backup; Worker 83e67de9-cbed-4fa3-9abe-31812d6da5df, source d1bb074. This supersedes local-only/pending release statements above. Production public access and anonymous access protection verified on canonical/workers.dev domains; real email delivery and employee acceptance still require external confirmation. See ACCOUNT_HANDOFF.md for exact verification.

## Unified employee entry - 20 October 2026 (local)

The corporate dashboard now uses one Add employees section instead of separate email-only, named and bulk forms. Invitation and authorization are explicit choices inside it. Email rows allow optional names; paste-list input retains Name;email;team and a25-person bound. Owners can choose role; delegated leaders submit member invitations. Team selection uses existing member/invitation team names, with a Create a team name option. Bulk row teams override the shared fallback. The entire list is validated and deduplicated before sending; failed/unprocessed rows remain available and processed rows are not resent automatically.

Pending requests have a separate section with consent/invitation, uncertain-send and expired states. Accepted-by-provider notices are not presented as inbox delivery or employee acceptance. Active and ready-for-access counts are distinct, and the existing protected credential workflow remains available. Desktop form hierarchy and mobile stacking were reviewed using local fictional data. These refinements do not change the database, corporate approval rules or consent requirements and are not deployed yet.
