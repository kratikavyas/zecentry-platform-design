# ZecEntry

**Events, without the friction.**

ZecEntry is a privacy-conscious event ticketing and entry-management platform designed to make accepting Zcash payments and managing event access simple.

Our goal is to make event infrastructure accessible to everyone — organisers shouldn't need to understand blockchain to accept Zcash, and attendees shouldn't need to understand crypto to attend an event.

## Features

- Event discovery and event details
- Ticket selection and checkout
- Zcash-inspired payment experience (currently demo mode)
- Digital attendee ticket wallet
- Ticket transfer and recovery flows
- Organiser dashboard and event management
- Staff check-in and check-out interface
- QR-based ticket validation prototype

## Current Status

ZecEntry is an early-stage MVP.

The current prototype uses simulated payments and demo ticket state. Production Zcash payment verification, persistent database storage, authentication and secure server-side ticket validation are not yet implemented.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (planned integration)
- Vercel

## Live Demo

https://zecentry-platform-design.vercel.app/

## Getting Started

Clone the repository:

```bash
git clone https://github.com/kratikavyas/zecentry-platform-design.git
cd zecentry-platform-design
```

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open http://localhost:3000.

## Vision

Make private, accessible event payments and seamless event entry available to communities everywhere.

Built with curiosity and a belief that privacy should feel simple.
