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

The testnet verifier currently accepts transparent `t` addresses only and considers one confirmation sufficient. It does not prove the source of funds, shield transaction metadata, implement mainnet support, or eliminate the privacy implications of transparent addresses and public-chain transaction data. A chain reorganization after the confirmation threshold is an operational risk; monitor and reconcile before production use.

## Organizer status and check-in

`set_ticket_status` is a `SECURITY DEFINER` function with an empty search path. It derives the organizer from `auth.uid()`, requires that the organizer owns the ticket's event, and allows only the supported status transitions. The live function is executable to authenticated users but checks ownership inside the function. Staff lookup in the current UI is by booking reference; the QR-style graphic is decorative, and camera scanning is simulated.

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

Residual risks include an exposed or compromised Supabase service credential, a compromised Zcash node or RPC credential, weak deployment secret management, testnet node availability, payment address reuse, chain reorganization, account takeover, transparent-address metadata exposure, and the lack of production-grade signed/scannable entry credentials. This MVP is not audited and must not handle mainnet funds or be represented as production-ready financial infrastructure.

## Migration provenance

The repository currently contains the two checked-in hardening/replay SQL migrations in `supabase/migrations/`; their version prefixes match the corresponding remote entries (`20261124124337` and `20261124133124`). The connected Supabase project has six earlier schema-migration entries whose source files are not present in this checkout, plus four verification-query entries. The two checked-in files do not constitute a complete fresh-project baseline. Do not run a reset against the connected project. Recover the historical baseline and validate it on an isolated Supabase project before advertising one-command database provisioning or using a fresh database as if it were equivalent to the live schema.
