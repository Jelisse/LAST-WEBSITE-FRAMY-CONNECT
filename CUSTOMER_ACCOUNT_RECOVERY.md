# Customer account recovery

Managers and directors can search accounts by name/email and send a recovery email to an active customer's registered email. The message reminds them of their sign-in email and contains a personal, single-use link valid for 30 minutes. Passwords and raw recovery tokens are never returned to the manager. Staff invitations retain their separate workflow. Direct customer invitation issuance is rejected.

Issuing a link does not suspend the account or change credentials. Redemption checks account role, activity, email and version, plus the issuing staff member's role/activity. An atomic update changes the password, invalidates all outstanding recovery links/invitations, and revokes all sessions. Expiry, replay, simultaneous redemption, provider failure, permissions and account changes are tested. Limits: 3 sends per customer and 20 per manager within 15 minutes; 30 reset submissions per IP within 15 minutes. Issuance and completion are audited without tokens or passwords. Expired records are cleaned by the existing scheduled worker.

## Before deploying

Apply `drizzle/0016_customer_recovery.sql` to the intended D1 database before deploying the new worker. The schema guard/repair planner discovers it. Do not recreate the database. Remote migration and deployment have not been performed as part of this change.

Configure the existing Worker secret `RESEND_API_KEY`, the verified sending identity `PROFILE_EMAIL_FROM`, and the canonical HTTPS `PUBLIC_SITE_URL`. The UI disables recovery delivery when configuration is absent. API acceptance means the email service accepted the message, not proof of inbox delivery. No real recovery emails were sent during development; provider calls were mocked in tests.

## Current boundary

This release sends only to the address already attached to the account. An alternative-email request is rejected by the server. If the customer cannot access that inbox, do not reroute a recovery link based only on a caller's claim. A separate approved identity-verification and email-change process is still needed. Customer passwords are never emailed, revealed or chosen by staff.

Design references: [OWASP Forgot Password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) and [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).
