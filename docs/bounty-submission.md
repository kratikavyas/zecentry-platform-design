# ZecEntry — bounty submission materials

## Submission description

**ZecEntry brings people together, irl: discover gatherings and experiences worth showing up for, host your own, and explore how Zcash testnet payments can fit into a familiar event-booking experience.** The product combines event discovery, organizer-owned event management, attendee ticket recovery, and staff check-in with an independently verified testnet checkout path.

The project separates a clearly labelled demo booking flow from Zcash testnet payments. In the testnet path, the server creates an expiring signed payment request bound to an authenticated attendee, event, price, quantity, recipient, and exact zatoshi amount. The verification endpoint checks the signed request and attendee ownership, asks a configured Zcash testnet node to verify the network and transaction outputs, and requires the exact amount and a confirmation before requesting ticket issuance. A service-role-only database function protects issuance with transaction uniqueness, idempotent retries, event capacity locking, and an atomic ticket/sold-count update. Supabase row-level security scopes attendee ticket access and organizer event management.

ZecEntry aims to make privacy-oriented payments approachable without asking event organizers to operate a custom checkout stack. Its differentiator is the end-to-end boundary between a public-chain payment and a recoverable, account-bound ticket: clients submit a transaction ID, but they cannot declare a payment confirmed or directly invoke the privileged issuance function.

**Current status and limitations:** This is an early-stage MVP, not a production payment service. Demo bookings do not transfer funds. Zcash support is limited to testnet and transparent `t` addresses, requires operator-configured node credentials/address/exchange rate, and testnet funds have no real-world value. The ticket QR graphic is illustrative, camera scanning is simulated, staff check-in uses a booking reference, and ticket transfers are disabled. The connected deployment's Zcash configuration has not been independently exercised with a live testnet payment in this release review. The repository is MIT-licensed, but its GitHub visibility is currently private, and the full historical Supabase migration source is not yet present in this checkout.

**Demo:** https://zecentry-platform-design.vercel.app/

## Two-minute demo video script

Record the screens yourself; no video has been recorded or published by this project.

- **0:00–0:12 — Landing / Explore:** Open the live demo. Say: “ZecEntry is an event-ticketing MVP. I’ll show the demo booking flow separately from the Zcash testnet verification design.”
- **0:12–0:30 — Event discovery:** Browse the event list, search or filter, and open an event detail. Point out the date, venue, price, and explicit demo-payment messaging.
- **0:30–0:50 — Attendee account:** Open My tickets, sign in or create an attendee account using a mailbox you control, then return to the wallet. Do not show a real user's personal information.
- **0:50–1:10 — Demo booking:** Choose an event, select the demo checkout, confirm that it does not charge money, and complete the booking. Show the resulting ticket in the wallet and refresh/reopen the wallet to demonstrate account-based retrieval.
- **1:10–1:30 — Organizer tools:** Sign in with a separate organizer account. Show an event created under that account and its owner-scoped management. Do not expose test credentials in the recording.
- **1:30–1:45 — Check-in:** Open Staff check-in and look up the demo booking reference. Explain that the QR graphic is illustrative and the current MVP uses manual reference lookup rather than camera scanning.
- **1:45–1:57 — Zcash architecture:** Show the testnet checkout UI or architecture documentation. State: “A configured testnet node must verify the exact recipient, amount, network, and confirmation; an unconfigured demo does not process a Zcash payment.” Only demonstrate a transaction if you personally verify it on testnet and label it testnet.
- **1:57–2:00 — Close:** Show the repository and say: “ZecEntry is MIT-licensed; the next step is completing a clean-room migration baseline and a full end-to-end test deployment.”

## Short project pitch

ZecEntry is a privacy-conscious event ticketing MVP that makes Zcash testnet checkout understandable to both organizers and attendees. It separates simulated demo bookings from real testnet verification, and connects server-verified payments to account-recoverable tickets with database-enforced idempotency and capacity controls. The project is an open-source experiment in making privacy-oriented payments usable in everyday community events; it is not a mainnet payment product.

## Social post

Building ZecEntry: an event-ticketing MVP exploring a clearer path from Zcash testnet payment verification to account-recoverable event tickets. Demo bookings are clearly separate from testnet payments; no mainnet payments or production-ready scanning are claimed. MIT-licensed. Demo: https://zecentry-platform-design.vercel.app/
