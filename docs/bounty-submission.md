ZecEntry

Bringing people together, irl.

The idea

Displayed ticket prices are indicative INR amounts; testnet checkout uses testnet ZEC amounts, and test coins have no monetary value. Mainnet, shielded, and Unified Address payments are unsupported. The project separates a clearly labelled simulated preview booking flow from Zcash testnet payments. In the testnet path, the server creates an expiring signed payment request bound to an authenticated attendee, event, price, quantity, recipient, and exact zatoshi amount. The verification endpoint checks the signed request and attendee ownership, asks a configured Zcash testnet node to verify the network and transaction outputs, and requires the exact amount and a confirmation before requesting ticket issuance. A service-role-only database function protects issuance with transaction uniqueness, idempotent retries, event capacity locking, and an atomic ticket/sold-count update. Supabase row-level security scopes attendee ticket access and organizer event management.
Finding people to do things with shouldn't be harder than finding the things themselves.

ZecEntry is a platform for discovering gatherings, workshops and experiences worth showing up for — or hosting something of your own.

**Current status and limitations:** This is an early-stage MVP, not a production payment service. Preview bookings are simulated and do not transfer funds. Zcash support is limited to transparent testnet `t` addresses; shielded and Unified Address payments and mainnet are unsupported. A complete funded end-to-end testnet payment flow has not yet been demonstrated. Testnet funds have no real-world value. A confirmed testnet payment produces a one-time QR credential; preview bookings do not. Browser camera access and an authorized organiser account are required for scan-to-check-in. Transfers and refunds are disabled. A complete funded end-to-end testnet payment flow has not yet been demonstrated. The repository is MIT-licensed, and the full historical Supabase migration source is not yet present in this checkout.
We're exploring how Zcash can make real-world event participation simpler, connecting digital payments with experiences and people offline.

Discover. Host. Show up.

What you can do

Discover experiences: Explore gatherings, workshops and events happening around you.

Host your own: Create experiences and bring people together.

Book your spot: Explore event booking and Zcash-powered checkout.

Get your pass: Access your bookings through your attendee account.

Check in: Use QR-based entry for a smoother event experience.

Built with Zcash

ZecEntry explores a practical use case for cryptocurrency beyond online transactions: paying for experiences in the real world.

The current integration includes:

Transparent Zcash testnet checkout.

Server-generated payment requests with exact ZEC amounts.

Backend transaction verification against a configured testnet node.

Protected ticket issuance and unique entry credentials.

Organizer-authorized, single-use QR check-in.

The goal is to make paying with Zcash feel as natural as booking a ticket for an event.

What's working

The current MVP includes event discovery, event details, attendee and organizer experiences, demo bookings, testnet payment request generation, and the backend verification and ticket-credential flows.

The complete on-chain payment-to-entry journey still needs a successful end-to-end test with funded testnet wallets.

Current scope

Zcash transparent testnet payments only.

Mainnet payments are not yet enabled.

Shielded and Unified Address payment verification is not yet supported.

Demo bookings are previews and do not transfer funds.

Testnet ZEC has no real-world monetary value.

These are the boundaries of the current prototype, with broader Zcash support part of the future roadmap.

Try ZecEntry

Live demo: https://zecentry-platform-design.vercel.app/

Source code: https://github.com/kratikavyas/zecentry-platform-design

License: MIT

What's next

Complete an end-to-end Zcash testnet payment and entry flow.

Expand payment compatibility.

Improve the organizer experience.

Bring more real-world communities and experiences onto the platform.

ZecEntry — bringing people together, irl.
