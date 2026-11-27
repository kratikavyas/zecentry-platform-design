# ZecEntry : Setup Guide

Get ZecEntry running locally and explore its event discovery, booking and Zcash testnet checkout experience.

## Requirements

- Node.js 24 or later
- pnpm 12
- A Supabase project with Auth and the ZecEntry schema configured
- For testnet checkout only: an operator-controlled Zcash testnet node with JSON-RPC access and a valid transparent testnet receiving address. Mainnet, shielded, and Unified Address payments are unsupported. The complete funded end-to-end testnet payment flow has not yet been demonstrated.
- A configured Supabase project with authentication and the ZecEntry database schema
- For Zcash checkout: access to a Zcash testnet node with JSON-RPC enabled and a transparent testnet receiving address

## Installation

Clone the repository:

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App | Browser-safe Supabase publishable key. The app also recognizes the legacy anon key. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Auth redirects | Development redirect target used by the Supabase auth flow. Configure the matching URL in Supabase Auth redirect allow-list. |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server-side booking, payment requests, and entry-pass issuance | Keep private. Server routes use it for signed payment requests, verified Zcash ticket issuance, and hashed single-use entry credentials. It is never sent to the browser. |
| `ZCASH_TESTNET_RPC_URL` | Zcash testnet checkout | HTTPS endpoint for a testnet node; HTTP is permitted only for localhost. |
| `ZCASH_TESTNET_RPC_USERNAME` / `ZCASH_TESTNET_RPC_PASSWORD` | Authenticated Zcash node | Optional as a pair. Never expose these in client-side variables. |
| `ZCASH_TESTNET_T_ADDRESS` | Zcash testnet checkout | Transparent testnet `t` address only. Shielded and Unified Address receivers are not supported. |
| `ZEC_INR_RATE_TESTNET` | Zcash testnet checkout | Positive INR per ZEC rate used to convert the indicative INR ticket price. Testnet amounts and coins have no monetary value. |
| `SUPABASE_TEST_URL` / `SUPABASE_TEST_SERVICE_ROLE_KEY` | Database integration tests | Use only with an isolated disposable test project. Test service-role credentials can create and delete test users and data. |
```bash
git clone https://github.com/kratikavyas/zecentry-platform-design.git
cd zecentry-platform-design
```

Install dependencies:

```bash
pnpm install
```

## Environment variables

Create a local `.env.local` file and configure the following variables.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Development authentication redirect URL |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server-side database operations |
| `ZCASH_TESTNET_RPC_URL` | Zcash testnet JSON-RPC endpoint |
| `ZCASH_TESTNET_RPC_USERNAME` | Optional RPC username |
| `ZCASH_TESTNET_RPC_PASSWORD` | Optional RPC password |
| `ZCASH_TESTNET_T_ADDRESS` | Transparent Zcash testnet receiving address |
| `ZEC_INR_RATE_TESTNET` | INR-to-ZEC conversion rate used for testnet checkout |

For database integration tests, optionally configure:

- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_SERVICE_ROLE_KEY`

Never commit `.env.local`, service-role credentials, RPC credentials or other secrets. Do not expose private server credentials through `NEXT_PUBLIC_` variables.

## Supabase configuration

1. Configure Supabase Auth with email/password authentication.
2. Add the local and deployed authentication callback URLs to the Supabase redirect allow-list.
3. Ensure the database has the ZecEntry schema and required migrations applied.
4. Configure the appropriate attendee and organizer access policies.

The checked-in SQL migrations are incremental updates to the existing project schema. They are not a complete fresh-database bootstrap. A new Supabase project requires the missing foundational schema to be provisioned before these updates can be applied.

## Zcash testnet configuration

Zcash checkout currently supports transparent testnet `t` addresses only.

Configure an operator-controlled testnet node with JSON-RPC access, along with the receiving address and conversion rate.

Mainnet payments and shielded or Unified Address verification are not supported.

Without the Zcash configuration, event discovery and demo booking can still be explored using a configured Supabase project.

## Run locally

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Run checks

## Database migrations

Three SQL files are currently committed under `supabase/migrations/`:

- `20261124124337_harden_zcash_testnet_ticket_purchase.sql`
- `20261124133124_serialize_zcash_request_replays.sql`
- `20261126100000_verified_entry_credentials.sql`

The first two migrations harden testnet ticket issuance, add unique transaction protection, and serialize duplicate request retries. The credential migration stores only a hash, allows server-side issuance only for confirmed testnet passes, and provides an organizer-authorized atomic single-use check-in function. The checked-in migrations are not a complete fresh-database bootstrap. Do not run `supabase db reset` or assume these three files are sufficient for an empty database. Recover the missing historical SQL and validate the full ordered migration chain against an isolated Supabase project before a clean-room release. Do not alter or delete remote migration history.

## Checks
Run the test suite:

```bash
pnpm test
```

Check TypeScript:

```bash
pnpm exec tsc --noEmit
```

Create a production build:

```bash
pnpm build
```

Database integration tests require a separate disposable Supabase test project. Never point test credentials at production.

## Deployment

ZecEntry can be deployed using Vercel.

1. Import the GitHub repository into Vercel.
2. Configure the required environment variables.
3. Set up the Supabase authentication redirect URLs for the deployed domain.
4. Deploy the application.
5. Verify event discovery, authentication and the configured checkout flow.

**Live demo:** https://zecentry-platform-design.vercel.app/

**Repository:** https://github.com/kratikavyas/zecentry-platform-design
