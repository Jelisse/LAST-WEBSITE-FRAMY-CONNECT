# Corporate organizations - 19 October 2026

## Scope and commercial configuration

`/corporativo` provides organizations, leader/member permissions, employee onboarding, campaigns, anonymous campaign action totals, consented contact collection and results CSV export. It extends the current account system without replacing staff roles or migrating existing profile teams into a company without employee acceptance.

A verified paid Corporate membership with team permission is required for the organization owner. The canonical `corporate` plan is recognized automatically; a versioned negotiated contract can enable `corporateEnabled`. Plan management configures `memberLimit` from 1 to 500 (default 25). This counts active employees and valid outstanding invitations, excluding the owner. Suspending an employee releases their seat; resuming checks capacity again. Prices and monthly/annual periods remain manager-controlled. This feature does not invent per-seat prices, charge automatically or rewrite existing paid terms. Existing contracts without a limit use 25; new commercial terms are snapshotted through the established renewal flow.

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
