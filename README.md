# ZecEntry

ZecEntry is an early-stage event discovery and ticketing MVP exploring a simpler way for communities to accept Zcash testnet payments and manage event entry.

- **Live demo:** https://zecentry-platform-design.vercel.app/
- **Architecture and security:** [docs/architecture.md](docs/architecture.md)
- **Setup and configuration:** [docs/setup.md](docs/setup.md)
- **Bounty submission, pitch, and demo script:** [docs/bounty-submission.md](docs/bounty-submission.md)
- **License:** [MIT](LICENSE)

## What works in this MVP

- Public event browsing backed by Supabase, with sample events supplied for the demo experience.
- Supabase email/password attendee and organizer accounts.
- Organizer-owned event creation, editing, and deletion, enforced by database row-level security.
- Persistent demo ticket booking. Demo checkout does not charge money; it inserts a ticket with `payment_mode = 'demo'`.
- An attendee ticket wallet that reloads tickets from Supabase after sign-in.
- Organizer ticket status management and staff check-in by booking reference.
- A separate Zcash **testnet** payment flow. The server creates a signed, expiring payment request and only issues a ticket after its configured testnet node verifies the exact payment and at least one confirmation.

## Honest limitations

This is an MVP, not a production payment processor. Demo bookings are not payments. The Zcash path only supports configured testnet transparent `t` addresses, depends on an operator-provided Zcash node and exchange-rate setting, and is not a mainnet integration. Testnet coins have no real-world value. A configured node, wallet, and safe end-to-end transaction are required to demonstrate a real testnet payment; an unconfigured deployment must not be presented as processing Zcash.

Ticket transfer is disabled. The displayed QR-style ticket graphic is illustrative and is not a cryptographically signed or camera-scannable credential. Staff check-in in this MVP uses a booking reference and an authenticated organizer account; camera scanning, refunds, transfer, and production-grade fraud controls are not implemented.

The live Supabase project contains historical migration entries beyond the two SQL migrations currently checked into this repository. Do not reset a production or shared database from this checkout or claim that it provisions a clean Supabase project from zero until the missing historical migration source has been recovered and reconciled. See [the migration notes](docs/setup.md#database-migrations).

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, and row-level security
- `@zcashlabs/zcash.js` for testnet address validation
- Vercel for hosting

## Local development

1. Install Node.js 24 or later and pnpm 12.
2. Configure the environment variables described in [docs/setup.md](docs/setup.md).
3. Install dependencies with `pnpm install`.
4. Start the development server with `pnpm dev` and open http://localhost:3000.

The app needs a configured Supabase project. Zcash testnet variables are optional for browsing and demo bookings, but required for the testnet checkout flow.

## Tests

- `pnpm test` runs the local Zcash verifier tests and the database integration tests.
- The database integration suite is skipped unless `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` are set. Run it only against an isolated disposable test project; it creates and deletes test users, events, and tickets.
- `pnpm exec tsc --noEmit` checks TypeScript.
- `pnpm build` performs the production build and type validation; public Supabase environment variables must be available during prerendering.

Do not use production user or event data for integration tests.

## Security overview

Zcash payment requests are signed server-side and bound to the signed-in attendee, event, quantity, price, recipient, exact amount, and expiry. The verification route rechecks the authenticated user and token, queries the configured node for the testnet network and transaction outputs, and calls a service-role-only issuance function only after the exact amount is confirmed. The database enforces transaction uniqueness, request replay checks, and event capacity locking. See the threat model in [docs/architecture.md](docs/architecture.md).

## License

MIT. See [LICENSE](LICENSE).
