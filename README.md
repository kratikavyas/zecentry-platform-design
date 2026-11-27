# ZecEntry

ZecEntry brings people together, irl. Discover experiences worth showing up for, host gatherings, and explore Zcash-powered ticketing. The payment path supports transparent Zcash testnet only; mainnet, shielded, and Unified Address payments are unsupported. Preview bookings are simulations, and a complete funded testnet payment flow has not yet been demonstrated.

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
- Organizer pass management, including real one-time QR check-in for verified Zcash testnet passes; preview bookings use a manual reference demonstration.
- A separate Zcash **testnet** payment flow. The server creates a signed, expiring request and issues a pass only after its configured testnet node verifies the network, exact transparent recipient and amount, and at least one confirmation.
- A unique QR entry credential for a server-verified testnet pass. Only its hash is stored; the authenticated attendee retrieves the credential, and an organizer-owned gathering can accept it once through the database check-in function. The camera scanner uses the browser camera; preview bookings remain manual-reference demos.

## Honest limitations

This is an MVP, not a production payment processor. Demo bookings are not payments. The Zcash path supports configured testnet transparent `t` addresses only; shielded and Unified Address receivers and mainnet are unsupported. Testnet coins have no real-world value. A configured node, wallet, and an actual confirmed testnet transaction are required to demonstrate a payment; the complete funded testnet flow has not yet been demonstrated. An unconfigured deployment must not be presented as processing Zcash. Displayed ticket prices are indicative INR amounts; Zcash requests use testnet amounts, and test coins have no monetary value. Mainnet ZEC is the product direction, not a live feature.

Verified testnet passes receive a unique, server-derived QR credential. The database stores its hash and the organizer-authorized check-in function consumes it once. Preview bookings have no verified QR credential and use a clearly labelled reference-only demo path. Ticket transfers, refunds, and production-grade fraud controls are not implemented. Camera use depends on browser permission and an authorized organizer session.

The live Supabase project contains historical migration entries beyond the three SQL migrations currently checked into this repository. Do not reset a production or shared database from this checkout or claim that it provisions a clean Supabase project from zero until the missing historical migration source has been recovered and reconciled. See [the migration notes](docs/setup.md#database-migrations).

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, and row-level security
- `@zcashlabs/zcash.js` for testnet address validation
- `qrcode` and `@zxing/browser` for real pass QR rendering and camera scanning
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

Zcash payment requests are signed server-side and bound to the signed-in attendee, event, quantity, price, recipient, exact amount, and expiry. The verification route rechecks the authenticated user and signed request, queries the configured node for the testnet network and transaction outputs, and calls service-role-only ticket and entry-credential functions only after the exact payment is confirmed. Entry credentials are deterministic HMAC-derived values bound to the issued ticket; only SHA-256 hashes are stored. Check-in uses the authenticated organizer session and a database-serialized single-use function. The database also enforces transaction uniqueness, request replay checks, and event capacity locking. See [docs/architecture.md](docs/architecture.md) for the security model.

## License

MIT. See [LICENSE](LICENSE).
