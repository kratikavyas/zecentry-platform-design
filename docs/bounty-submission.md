# ZecEntry — bounty submission materials

## Submission description

**ZecEntry brings people together, irl: discover experiences worth showing up for, host gatherings, and use Zcash to meet people in the real world.** Mainnet ZEC is the product direction; the working payment demo is transparent testnet only. The product combines discovery, organizer-owned gatherings, account-recoverable passes, verified testnet checkout, and one-time QR entry.

The project separates a clearly labelled demo booking flow from Zcash testnet payments. In the testnet path, the server creates an expiring signed payment request bound to an authenticated attendee, event, price, quantity, recipient, and exact zatoshi amount. The verification endpoint checks the signed request and attendee ownership, asks a configured Zcash testnet node to verify the network and transaction outputs, and requires the exact amount and a confirmation before requesting ticket issuance. A service-role-only database function protects issuance with transaction uniqueness, idempotent retries, event capacity locking, and an atomic ticket/sold-count update. Supabase row-level security scopes attendee ticket access and organizer event management.

ZecEntry aims to make privacy-oriented payments approachable without asking organisers to operate a custom checkout stack. Its differentiator is the end-to-end boundary between an independently verified testnet payment and an account-bound pass: clients submit a transaction ID, but cannot declare payment confirmed or invoke privileged issuance. The server then issues a unique QR credential whose hash is stored in Supabase; the organiser-authorized database check-in consumes it once.

**Current status and limitations:** This is an early-stage MVP, not a production payment service. Demo bookings do not transfer funds. Zcash support is limited to testnet transparent `t` addresses; shielded/Unified Address payments and mainnet are not supported. Testnet funds have no real-world value. A confirmed testnet payment produces a one-time QR credential; preview bookings do not. Browser camera access and an authorized organiser account are required for scan-to-check-in. Transfers and refunds are disabled. The connected deployment's Zcash configuration has not been independently exercised with a live testnet payment in this release review. The repository is MIT-licensed, and the full historical Supabase migration source is not yet present in this checkout.

**Demo:** https://zecentry-platform-design.vercel.app/

## Two-minute demo video script

Record the screens yourself; no video has been recorded or published by this project.

- **0:00–0:12 — Landing / Explore:** Open the live demo. Say: “ZecEntry is an event-ticketing MVP. I’ll show the demo booking flow separately from the Zcash testnet verification design.”
- **0:12–0:30 — Event discovery:** Browse the event list, search or filter, and open an event detail. Point out the date, venue, price, and explicit demo-payment messaging.
- **0:30–0:50 — Attendee account:** Open My tickets, sign in or create an attendee account using a mailbox you control, then return to the wallet. Do not show a real user's personal information.
- **0:50–1:10 — Demo booking:** Choose an event, select the demo checkout, confirm that it does not charge money, and complete the booking. Show the resulting ticket in the wallet and refresh/reopen the wallet to demonstrate account-based retrieval.
- **1:10–1:30 — Organizer tools:** Sign in with a separate organizer account. Show an event created under that account and its owner-scoped management. Do not expose test credentials in the recording.
- **1:30–1:45 — Check-in:** For a verified testnet pass, open Staff check-in and scan its real one-time QR with an organizer account; show that a repeat scan is rejected. Preview bookings remain manual-reference demonstrations.
- **1:45–1:57 — Zcash architecture:** Show the testnet checkout UI or architecture documentation. State: “A configured testnet node must verify the exact recipient, amount, network, and confirmation; an unconfigured demo does not process a Zcash payment.” Only demonstrate a transaction if you personally verify it on testnet and label it testnet.
- **1:57–2:00 — Close:** Show the repository and say: “ZecEntry is MIT-licensed; the next step is completing a clean-room migration baseline and a full end-to-end test deployment.”

## Short project pitch

ZecEntry is a real-world experiences MVP exploring how Zcash can help people discover gatherings and support organisers. It separates preview bookings from transparent testnet verification and links confirmed payments to recoverable passes with one-time QR entry. Mainnet payments and shielded/Unified Address verification are not live.

## Social post

Building ZecEntry: discover experiences, host gatherings, and pay with Zcash. Verified transparent testnet payments create account-recoverable entry passes with single-use QR check-in. Mainnet and shielded/Unified Address payments are not live. MIT-licensed. Demo: https://zecentry-platform-design.vercel.app/
