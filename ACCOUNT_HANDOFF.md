# Framy Connect account handoff

Saved 16 October 2026. This is a repository-based continuation aid, not an export of earlier chats. Only the current request and inspected files were available; prior conversation-only decisions may be missing.

## Start on the other account

1. Keep a private backup of this complete project folder, including uncommitted files. If moving computers, Git alone does not include ignored environment files, local databases, private assets or uncommitted work. Transfer necessary private files separately and securely.
2. Sign out through the Codex profile menu and sign in with your own account. Confirm the intended email in the browser during authentication. Open this project's `framy-app` folder.
3. The reusable skill lives at `.agents/skills/framy-development/SKILL.md` inside this repository. Keep the entire directory when transferring. Restart Codex if the skill does not appear.
4. Reconnect needed plugins and authenticate GitHub/Cloudflare or other services with authorized accounts. A local skill does not transfer external service access or hosted project ownership. Reinstall bundled plugins as needed rather than copying plugin caches.
5. Paste the continuation prompt below, adding your next concrete task.

## Continuation prompt

> Use $framy-development. Read ACCOUNT_HANDOFF.md and CONSOLIDATION.md, inspect Git status, and continue Framy Connect from the existing code. Preserve existing work and the established design and business rules. Read only the documents needed for my task. Tell me what is verified and what still depends on external services. My next task is: [describe the task].

## Verified local snapshot

- Application folder: `framy-app`; its parent contains business specifications, brand references, assets and outputs. Preserve both if you need the complete design/business context.
- Git HEAD at inspection: `edc4c57` (merge); preceding commits included `9752c06` (resume existing PaySuite checkout at pending-order limit) and `3000ba9` (defer foreign-key checks). Working tree was clean before this handoff and skill were added. Reinspect rather than assuming this remains current.
- Stack: Vinext/Vite, React 19, TypeScript, Tailwind 4, Drizzle, Cloudflare D1/Workers. Node >=22.13. Scripts include `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:cloudflare`, and `npm run deploy:cloudflare`.
- Newer consolidation describes account recovery, checkout configuration persistence, payment return, consent-based analytics and deployment integrity checks. Some older README/CLOUDFLARE notes are stale; current code and focused documents must resolve discrepancies.
- External checks mentioned in consolidation: Resend domain/key/delivery, a verified first real provider transaction, and manager-approved stock/prices. No external service was tested during this handoff.
- The online design editor is described as unimplemented in consolidation. Do not promise it without checking subsequent code.
- No active development task beyond account migration was provided in this chat. Do not invent an unfinished task or claim all earlier decisions were recovered.

## Profile save/publication investigation — 16 October 2026

- Task: investigate customers whose account names appear in management while profile saving/publication fails or their published link appears late.
- Confirmed code weaknesses: the save acknowledgement omitted the server-normalized profile (including unique usernames); the client relied on a subsequent GET to recover it. The unawaited forced reload could overwrite new edits. Management accounts loaded only on mount/search and did not refresh after customer publication.
- Changed `app/api/workspace/route.ts` to return the validated saved profile; `components/workspace.tsx` applies it immediately and awaits best-effort revalidation while editing remains disabled. `components/account-manager.tsx` refreshes every 15 seconds while visible and on window focus, pausing during account operations/confirmation/recovery.
- Added a duplicate-name regression in `tests/launch-security.test.mjs`: save, publish from the returned profile without a GET, then verify the persisted draft/public fields and manager link.
- Verified: `npm run typecheck`, all 165 tests, `npm run build:cloudflare`, and `git diff --check` passed. Build required execution outside the Windows sandbox because Vite subprocesses received EPERM. Build emitted bundle-size/plugin-timing/route-classification warnings.
- No deployment, remote database changes, customer record changes or live browser verification. The actual affected-customer root cause remains unconfirmed until the exact publish error or live logs are available. Cloudflare D1 schema/runtime, R2 photo ownership/storage and active membership can independently block publication. Account existence alone does not mean a profile was saved or published; draft links remain private.

### Follow-up publication diagnosis

- User confirmed failures can follow basic text entry as well as photos. Read-only Cloudflare queries confirmed that six supplied active customer accounts lack profile rows; five also lack memberships. This confirms absent persistence, not merely delayed management UI. No customer identifiers or content are retained here.
- A seventh user-supplied account was checked by name: active, free-trial membership present, no profile row. A membership can be activated independently, so this does not by itself establish the exact failed publication stage.
- Configured remote DB is accessible through direct Wrangler queries. Profile columns, membership view, required billing singleton, profile triggers, and deployed DB/R2 bindings were inspected. Latest configured Worker version at inspection was `6af96835-5a38-47f1-bc29-6443b789b16e` (11 October). This alone does not establish its source commit or prove the custom-domain routing.
- Full `check:cloudflare-db` failed with its generic verification error even though direct read-only DB queries succeeded; full remote schema/integrity verification remains unresolved. Do not claim schema repair is required or deploy past that failed guard.
- Further local fixes: validate profile/photo before starting trial; report database/storage failures through privacy-safe service references and stage categories instead of misleading 409 edit conflicts; display profile errors next to Publish as well as at the page top.
- Regression verifies invalid publication does not start a trial and missing membership schema returns traceable 503. All 166 tests, typecheck, Cloudflare build and diff whitespace checks passed after these changes. No deployment or remote data changes occurred. Historical failed requests are not stored in the profile rows; the exact customer-specific failure still needs an observed publish response/live logs. Existing unsaved input cannot be reconstructed from absent server records.

### Live capture — 17 October 2026 (Asia/Taipei)

- User authorized a live failure capture. Added `scripts/watch-profile-publication.mjs`, a five-minute read-only Wrangler tail that prints only profile endpoint/method/status/outcome, exception count, and allowlisted structured diagnostic fields. Raw requests, headers, cookies, profile content and raw exception messages are suppressed. Syntax and diff checks passed.
- Verified routing and tail by sending one unauthenticated diagnostic POST to `https://framyconnect.co.mz/api/workspace`: HTTP 401, no mutation, captured at the configured Worker. Thus the canonical site reaches the configured Worker.
- User reported clicking Publish during capture; no corresponding profile POST appeared during subsequent observation. This is evidence to investigate the client/button or exact page/attempt, not proof of a specific browser defect. Awaiting the user's answer about button behavior, exact address and which affected customer retried. Do not claim the customer-specific root cause is established or that local fixes have been deployed.
- Later in the same capture three `/api/workspace` POST requests arrived, all HTTP 422, outcome `ok`, zero uncaught exceptions. This supersedes the initial no-request observation: the action reaches the live application and is rejected. The tail does not include request/response bodies, so neither the action nor the exact validation/business-rule error is proven by status alone. Asked the user to read the message above the identity editor and identify the retrying customer. No connected customer browser was available to inspect the response directly. Capture ended normally after five minutes.

### Confirmed captured rejection — 17 October 2026

- User supplied a screenshot showing the exact error: `Escolha outro nome de utilizador: 3–40 letras minúsculas, números ou _.` This confirms username validation rejected that attempt, consistent with captured HTTP 422. It does not prove every historical customer's failure had the same cause or reveal the actual entered username.
- The username field accepted arbitrary pasted/typed text, while full-name auto-generation used `usernameFromName`. Updated `components/workspace.tsx` to normalize new username input on blur and before saving, using the existing helper; disable mobile auto-capitalization/spellcheck for the field. Server validation, unique reservation and existing saved URLs remain unchanged. Full customer names remain unchanged.
- Added a fictional-fixture regression proving raw spaced usernames are rejected and normalized input publishes successfully. Full suite: 167 tests passed; typecheck and diff checks passed. Earlier Cloudflare build passed before this last editor-only change; no deployment performed. Immediate live workaround: correct the username field to 3–40 lowercase ASCII letters/digits/underscores, then publish without discarding the filled form.

## Privacy and deletion

Verify you can continue from your own account before deleting the source chats. Archiving is recoverable and does not provide privacy from someone with the same account. Logging out does not erase chat history or local files. Use a separate private Windows login if other people also use this computer; account switching alone is not a filesystem privacy boundary.

Use the supported Delete action for the specific chat if available in your app. Do not delete other people's shared-account chats. CLI users can consult the documented `codex delete --help` command for their installed version; the CLI also documents `/delete` for the current interactive session. App and CLI controls may differ. No chats were deleted or archived by this handoff operation.

Do not copy the entire `.codex` directory to migrate a skill: it can contain credentials and private history. Never transfer `auth.json` or access tokens as part of a skill. Keep environment secrets and database backups out of public repositories and shared archives. Review any previously created public/shared links separately; deletion cannot undo copies already made by other people.

Official references: https://learn.chatgpt.com/docs/build-skills ; https://learn.chatgpt.com/docs/auth ; https://learn.chatgpt.com/docs/developer-commands
