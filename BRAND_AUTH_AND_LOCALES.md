# Brand, authentication and locale consistency

Implemented locally (not deployed in this change):

- Shared orange #EE590D from the supplied reference, white primary-action text, a darker related tone for small orange links to improve readability.
- Original mountain artwork reused without stretching or mirroring, subtle on authentication, shared headers and footer. The source asset hash matches the supplied NET WORK VECTOR-01.png.
- Accessible password visibility controls in sign-in, registration, activation, recovery and account security. Toggle buttons never submit the form and passwords start hidden.
- Better authentication spacing, recovery-link placement, loading feedback and network-failure messages.
- Compact support/legal footer for internal account and purchase flows; full footer retained for public marketing pages.
- Expanded Portuguese, English and Traditional Chinese UI dictionaries across delivery, payment, subscriptions, finance and professional profile tools. API JSON error messages follow the language cookie. Customer-authored profile data and machine-readable payment statuses are preserved.

Validation: 144 automated tests pass; TypeScript passes. Login visibility toggling and locale presentation checked in a local browser fixture at desktop and 390px widths. Final production compilation is logged in tmp/identity-build.log.

Scope: this does not automatically translate customer content or manager-authored email/WhatsApp templates. Those retain their authored language. No real password, payment, account creation or outbound message was used during verification.
