# Phase 4 company tools

Company workspace routes: `/corporativo/assinaturas`, `/corporativo/fundos`, `/corporativo/directorio`, `/corporativo/integracoes`. Each preserves company selection and requires the existing active Corporate access. Published card fields are the source; personal profiles, drafts, private internal names and hidden contact details are excluded. The directory is authenticated, limited to active published company cards (the supported company maximum is 500), searchable by name/title/team and filterable by team.

## Signatures and meeting backgrounds

Company leaders control one shared signature layout (essential or QR), background tone and corner placement. Settings use optimistic versions and repeat role checks at write time. Employees generate their own materials; leaders can select published employees. Unsaved settings are guarded before company changes, refresh and page unload.

Email signatures use escaped table HTML, inline styles, company branding, published contact details and a PNG QR. Copy provides HTML and plain text; HTML download is the fallback. Preview uses current-host media; exported material uses the configured canonical HTTPS site origin. Public QR eligibility is checked against active published cards and company access for every request. Mail clients may cache/block images. Users install manually in Gmail/Outlook and regenerate/reinstall after changing the card or branding. Automatic mailbox deployment and banner campaigns are not implemented.

Backgrounds render a 1920 × 1080 PNG locally with company colour/logo, employee identity, original Framy dots and a card QR, leaving the centre free. Downloaded backgrounds are installed manually in Zoom/Teams/Meet. A static downloaded image cannot be recalled when an employee leaves, but its card destination becomes unavailable through the existing server controls.

## HubSpot pilot

The company owner creates a private/static-token HubSpot app with `crm.objects.contacts.read` and `crm.objects.contacts.write`, then enters its token in Integrations. Never put customer tokens in source, chat, command arguments or logs. Connecting checks read access without creating a contact; write scope is exercised only by the user's reviewed transfer. Other active leaders can review and transfer contacts, but only the owner can connect/disconnect.

`CRM_ENCRYPTION_KEY` is a random 32-byte base64 Worker secret. Stored tokens use AES-GCM with unique IVs and company ID as additional authenticated data. Keep the key stable. Replacing it makes existing encrypted tokens unreadable and requires owners to reconnect. Existing payment/email secrets and bindings are independent.

Transfer is explicit and limited to five selected contacts per request, drawn from the company's latest 100 consented leads within the existing 90-day window. The screen previews name/email/phone and requires transfer authorisation. These are the only fields sent; internal notes, tags and marketing subscription permissions are excluded. Existing HubSpot records are looked up by email and left unchanged; missing contacts are created. Fixed `api.hubapi.com` endpoints use documented CRM v3 contact lookup/create operations, bounded responses, a 12-second timeout and no redirects. No email, workflow or marketing send is requested.

Per-lead locks/results prevent duplicate clicks; email lookup reconciles retries after uncertain outcomes. Pending locks expire after two minutes. Rate-limit, credential and uncertain results stop the batch; users can review and retry. Uncertain does not mean the write failed: check HubSpot first. Connection generations isolate results after disconnect/reconnect. Disconnect removes the stored credential, not contacts already held in HubSpot. Audit records contain the actor, action and success count; lead-linked sync metadata follows lead deletion/90-day retention.

This is a reviewed, manual one-way pilot connector, not HiHello's automatic OAuth sync or custom field mapping. Real HubSpot credentials, mailbox rendering, meeting-app installation and a pilot-company acceptance test remain necessary before declaring Phase 4's completion measure achieved.

References: [HiHello company backgrounds](https://support.hihello.com/hc/en-us/articles/14733647656859-Company-Virtual-Backgrounds), [HiHello HubSpot sync](https://support.hihello.com/hc/en-us/articles/32780820140571-New-HubSpot-Integration-Syncing-Your-Contacts), [HubSpot contact API](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide).
