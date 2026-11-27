# Architecture and security notes

## Components and data flow

- The Next.js App Router serves the browser app and the Zcash request/verification endpoints.
- Supabase Auth establishes attendee and organizer sessions. Browser database access uses the Supabase publishable key and session cookies.
- `events` is publicly readable. Authenticated users can write only events whose `organizer_id` matches their identity; the database grants only the editable event columns.
- `tickets` is readable to its attendee and the event organizer under RLS. Ticket issuance and status changes are implemented as narrowly scoped Postgres functions.
- The attendee wallet refetches the authenticated user's ticket rows from Supabase, allowing tickets to reappear after sign-in instead of relying on browser-only persistence.

## Demo purchase

1. The attendee signs in and submits event, name, quantity, and a client-generated idempotency key.
2. `purchase_demo_tickets` derives the attendee identity from `auth.uid()` and email from the authenticated JWT; it does not trust a client-supplied attendee ID.
3. The function locks the event row, checks capacity, inserts a `demo` ticket, and updates the sold count in the same database transaction. The request key is unique per attendee so retries do not create duplicate demo tickets.
4. This flow is a simulation. It transfers no funds and must not be described as a paid order.

## Zcash testnet purchase

1. `POST /api/zcash/request` requires an authenticated user with an email, validates the event/name/quantity, and reads the current event price from Supabase using server-side credentials.
2. `lib/zcash-testnet.ts` validates the configured transparent testnet recipient and creates a 30-minute HMAC-signed request containing the attendee ID, event, price, quantity, recipient, exact amount in zatoshis, request key, and expiry. A random zatoshi suffix helps distinguish requests for the same base price.
3. `POST /api/zcash/verify` authenticates again, validates the transaction ID, verifies the HMAC and attendee ownership, then asks the configured Zcash node to confirm its chain is testnet and inspect the transaction outputs.
4. The verifier sums outputs to the configured recipient and requires the exact signed amount plus at least one confirmation. Unconfirmed transactions remain pending; invalid, wrong-network, wrong-recipient, and wrong-amount transactions do not issue tickets.
5. Only after verification does the server call `purchase_zcash_testnet_ticket` with the service-role client. The database function checks the verified Supabase account email, request replay fields, event price, capacity, amount bounds, and transaction format. It takes an advisory lock for request replays and an event-row lock for capacity, then inserts the ticket and increments `sold` atomically.
6. A partial unique index prevents a testnet transaction ID from issuing a second ticket. The RPC is executable by `service_role`, not `anon` or `authenticated`; the live project was queried and confirmed with this permission boundary on 2026-11-24.
7. After the verified ticket is returned, the server derives its entry credential with a domain-separated HMAC and calls `issue_entry_credential`. The database stores only the credential's SHA-256 hash. This operation is idempotent for the same ticket and derived credential, so a retry can finish pass issuance without another payment.

The verifier supports transparent testnet `t` addresses only; mainnet, shielded, and Unified Address payments are unsupported. One confirmation is sufficient, but the verifier does not prove the source of funds or shield transaction metadata. A complete funded end-to-end testnet payment flow has not yet been demonstrated. Displayed INR ticket prices are indicative; testnet amounts and coins have no monetary value. A chain reorganization after the confirmation threshold is an operational risk; monitor and reconcile before production use.

## Entry pass and organizer check-in

A confirmed, active testnet pass can retrieve its derived QR credential only through `GET /api/entry/credential`, which authenticates the attendee, scopes the ticket query to that user, verifies the stored hash, and returns the value with private/no-store caching. The raw credential is never stored in Postgres, and preview bookings never receive one.

The staff camera uses a real browser QR decoder. `POST /api/entry/check-in` authenticates the organizer session and calls `check_in_entry_credential` with the selected gathering ID and a SHA-256 hash. The database function confirms organizer ownership, locks the credential and ticket, rejects invalid/revoked/used passes, then marks both the credential and ticket checked in atomically. Replaying the same QR returns `already_used`; a booking reference alone cannot check in a testnet-paid pass. Preview bookings retain a clearly marked manual-reference demonstration path.

## Security controls

- Supabase RLS scopes event writes and ticket reads to the authenticated attendee or event owner.
- Privileged Zcash ticket issuance is not callable from an untrusted browser session.
- HMAC signatures use the server-side Supabase service credential; secrets are never sent to the browser.
- Transaction IDs are validated, RPC calls are bounded with a timeout, RPC responses are size-limited, and payment verification responses are not cached.
- Database functions use `SECURITY DEFINER` only with `search_path = ''` and schema-qualified objects.
- The app sets baseline response headers including `nosniff`, HSTS, referrer policy, same-origin framing, and a restrictive permissions policy.
- Transfer is unavailable rather than implemented as a misleading status-only operation.

## Threat model and residual risks

The design protects against a browser client inventing a confirmed payment, changing a signed request, claiming another account's ticket, replaying a payment transaction, or overselling event capacity through concurrent purchases. Database credentials and Zcash RPC credentials must remain server-side.

Residual risks include an exposed or compromised Supabase service credential, a compromised Zcash node or RPC credential, weak deployment secret management, testnet node availability, payment address reuse, chain reorganization, account takeover, transparent-address metadata exposure, camera permission/device availability, and the lack of an independent security audit. This MVP must not handle mainnet funds or be represented as production-ready financial infrastructure.

## Migration provenance

Only three migrations are checked into this repository, and they do not provide a complete fresh-project baseline. Do not reset the connected database or treat these files as sufficient to provision a clean project. Recover and validate the full ordered migration chain against an isolated Supabase project before advertising one-command provisioning.
