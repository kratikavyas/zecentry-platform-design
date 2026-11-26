# Setup guide

## Requirements

- Node.js 24 or later
- pnpm 12
- A Supabase project with Auth and the ZecEntry schema configured
- For testnet checkout only: an operator-controlled Zcash testnet node with JSON-RPC access and a valid transparent testnet receiving address. Unified/shielded receivers and mainnet are not supported.

## Environment variables

Set these in the local environment (or the Vercel project environment settings). Never commit `.env` files or secrets.

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App | Browser-safe Supabase publishable key. The app also recognizes the legacy anon key. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Auth redirects | Development redirect target used by the Supabase auth flow. Configure the matching URL in Supabase Auth redirect allow-list. |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server-side booking, payment requests, and entry-pass issuance | Keep private. Server routes use it for signed payment requests, verified Zcash ticket issuance, and hashed single-use entry credentials. It is never sent to the browser. |
| `ZCASH_TESTNET_RPC_URL` | Zcash testnet checkout | HTTPS endpoint for a testnet node; HTTP is permitted only for localhost. |
| `ZCASH_TESTNET_RPC_USERNAME` / `ZCASH_TESTNET_RPC_PASSWORD` | Authenticated Zcash node | Optional as a pair. Never expose these in client-side variables. |
| `ZCASH_TESTNET_T_ADDRESS` | Zcash testnet checkout | Transparent testnet `t` address only. Shielded and Unified Address receivers are not supported. |
| `ZEC_INR_RATE_TESTNET` | Zcash testnet checkout | Positive INR per ZEC rate used to convert ticket price. Testnet amounts have no real-world value. |
| `SUPABASE_TEST_URL` / `SUPABASE_TEST_SERVICE_ROLE_KEY` | Database integration tests | Use only with an isolated disposable test project. Test service-role credentials can create and delete test users and data. |

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Without the Zcash variables, the browse and demo flows can be exercised against a configured Supabase project, while testnet checkout should report that it is unavailable.

## Auth configuration

Enable email/password in Supabase Auth. Configure the local and deployed callback URLs for `/auth/callback` in the Supabase redirect allow-list. For organizer and attendee email confirmation, use the project policy and test mailbox appropriate to the environment. Never weaken production confirmation requirements merely to make a demo easier.

## Database migrations

Three SQL files are currently committed under `supabase/migrations/`:

- `20261124124337_harden_zcash_testnet_ticket_purchase.sql`
- `20261124133124_serialize_zcash_request_replays.sql`
- `20261126100000_verified_entry_credentials.sql`

The first two migrations harden testnet ticket issuance, add unique transaction protection, and serialize duplicate request retries. The credential migration stores only a hash, allows server-side issuance only for confirmed testnet passes, and provides an organizer-authorized atomic single-use check-in function. The connected project exposed the credential table and issuance function during this review; the complete historical migration chain is still not a fresh-database bootstrap. The remote history also contains six earlier schema migrations—`create_rls_protected_events`, `grant_organizer_event_write_columns`, `create_private_demo_tickets`, `allow_event_organizers_ticket_status_updates`, `add_owner_ticket_status_rpc`, and `add_testnet_zcash_payment_receipts`—whose SQL sources are not currently checked into this repository. The live project also records four verification-query entries in its migration history. Do not run `supabase db reset`, do not apply these three files to an empty database and assume that is sufficient, and do not alter or delete the existing remote migration history.

Before a clean-room release, recover the exact earlier migration SQL from its original source and validate the full ordered migration chain against an isolated Supabase project. The connected database was read-only during this final verification pass; the earlier hardening/replay migrations were applied to it before this audit.

## Checks

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The database integration tests skip unless both `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` are set. Configure them only for an isolated test database; the suite creates and deletes records. Never point it at production.
