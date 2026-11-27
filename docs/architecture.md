# ZecEntry : Architecture

## Overview

ZecEntry is an event discovery and ticketing platform that explores how Zcash can connect digital payments with real-world experiences.

The application brings together three core experiences:

- **Attendees** discover events, book tickets and access their passes.
- **Organizers** create and manage gatherings and handle event entry.
- **Zcash integration** provides a transparent testnet payment flow designed to connect verified transactions with ticket issuance.

The application is built with Next.js and Supabase, with server-side payment verification and database-backed ticket management.

## System architecture

The platform is organized into four main layers.

### 1. Application layer

The Next.js application provides the event discovery experience, event details, attendee accounts, organizer tools, checkout and ticket wallet.

It also exposes server-side endpoints for payment requests, transaction verification and entry credentials.

### 2. Authentication and data layer

Supabase provides authentication and persistent data storage.

- Attendees and organizers authenticate through Supabase Auth.
- Event information is available for discovery.
- Event management is scoped to the authenticated organizer.
- Attendee ticket access is restricted to the ticket owner and authorized event organizer.
- Tickets remain associated with attendee accounts and can be retrieved across sessions.

### 3. Payment layer

ZecEntry separates preview bookings from Zcash testnet payments.

**Demo booking**

The demo booking flow lets users explore the ticketing experience without transferring funds. These bookings are explicitly treated as previews, not paid orders.

**Zcash testnet checkout**

The testnet payment flow is designed around server-side verification:

1. An authenticated attendee selects an event and ticket quantity.
2. The server validates the request and retrieves the event price.
3. An expiring payment request is generated with the exact amount and designated testnet recipient.
4. The attendee submits a transaction ID after making a payment.
5. The server checks the transaction against a configured Zcash testnet node.
6. Ticket issuance proceeds only after the transaction meets the required network, recipient, amount and confirmation checks.

The browser cannot independently declare a payment successful.

### 4. Ticket and entry layer

Once a testnet payment is verified, the platform can issue an attendee-bound ticket and a unique QR entry credential.

- Entry credentials are stored as hashes rather than raw values.
- Attendees retrieve their credentials through authenticated access.
- Organizers can validate passes for events they manage.
- Successful check-in consumes the credential, preventing it from being reused.

Preview bookings do not receive verified-payment entry credentials.

## Security principles

The architecture follows a few important principles:

- **Server-side trust:** Payment verification and privileged ticket issuance happen on the server.
- **Access control:** Attendee and organizer permissions are enforced through authenticated sessions and database access policies.
- **Payment integrity:** The server verifies the payment request and transaction details instead of trusting client-submitted payment status.
- **Replay protection:** Duplicate payment submissions must not create duplicate tickets.
- **Capacity integrity:** Ticket issuance accounts for event capacity when processing purchases.
- **Single-use entry:** A verified QR credential can only be consumed once.
- **Secret isolation:** Service credentials and payment infrastructure credentials remain server-side.

## Current implementation scope

The current prototype supports transparent Zcash testnet addresses only.

It does not currently support:

- Mainnet ZEC payments.
- Shielded or Unified Address payment verification.
- Transfers or refunds.
- Production financial operations.

Demo bookings do not transfer funds, and testnet ZEC has no real-world monetary value.

The payment request generation and verification implementation are in place, but a successful end-to-end on-chain payment and entry test with funded testnet wallets remains outstanding.

## Technology stack

| Layer | Technology |
|---|---|
| Application | Next.js |
| Language | TypeScript |
| Authentication | Supabase Auth |
| Database | Supabase / PostgreSQL |
| Payment integration | Zcash transparent testnet |
| Entry verification | QR-based check-in |
| Deployment | Vercel |

## Future direction

The next steps for ZecEntry include:

- Completing an end-to-end testnet payment and entry journey.
- Exploring broader Zcash address and payment compatibility.
- Improving organizer and attendee experiences.
- Bringing more real-world gatherings and communities onto the platform.

**ZecEntry — bringing people together, irl.**
