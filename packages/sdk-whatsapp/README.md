# @glitchgrab/whatsapp

WhatsApp Business messaging for SaaS products, without the Meta integration.

Your business owners connect **their own** WhatsApp number, so messages arrive
under *their* verified name — not yours. You get templates, sending, a shared
inbox, autoreply and per-owner billing; you never touch a WABA id, a phone number
id, or a Meta access token.

This is not the `glitchgrab` package (that one files GitHub issues). Different
product, different key.

## Install

```bash
bun add @glitchgrab/whatsapp
```

## The one rule

**`WhatsappClient` holds your platform API key and must only run on a server.**
That key reaches every one of your customers' numbers. The package logs an error
if it detects a browser, but the fix is architectural: keep it in route handlers
and server actions, and let `createInboxHandler` serve the UI.

`ownerId` throughout is *your* id for the business owner — a library id, a clinic
id. We map it to a tenant on our side.

## Connect an owner's number

```ts
// server
const client = createWhatsappClient({ apiKey: process.env.GG_WA_KEY! });
const config = await client.connect({ ownerId: library.id, name: library.name });
```

```tsx
// browser — Meta's JS SDK must already be on the page
const { code, state } = await launchSignup(config);
await fetch("/api/whatsapp/complete", { method: "POST", body: JSON.stringify({ code, state }) });
```

```ts
// server, in that route
await client.completeConnect({ ownerId: library.id, code, state });
```

The owner picks or creates their WhatsApp Business Account inside Meta's popup
and verifies their own number. Nothing is connected until `completeConnect`
returns — and check `warnings` on the result, which reports things that are worth
surfacing but are not failures (no number added yet, webhook subscription
refused).

## Send

```ts
await client.send({
  ownerId: library.id,
  to: student.phone,
  template: "fee_due",
  components: [{ type: "body", parameters: [{ type: "text", text: "₹500" }] }],
  refKey: `fee-${invoice.id}`, // a retry with the same key never charges twice
});
```

Free-form text (`body` instead of `template`) is legal only within 24 hours of
the contact's last inbound message. Outside that window this throws — Meta
answers 200 and delivers nothing, so failing loudly is the point.

Out of balance throws with `code: "INSUFFICIENT_FUNDS"` and a `detail.shortfallPaise`.

## Shared inbox

One route:

```ts
// app/api/whatsapp/[...action]/route.ts
import { createWhatsappClient, createInboxHandler } from "@glitchgrab/whatsapp";

const client = createWhatsappClient({ apiKey: process.env.GG_WA_KEY! });

const handler = createInboxHandler({
  client,
  // Derive the owner from YOUR session. Never from the request body — that
  // would let any signed-in user read any other owner's WhatsApp.
  resolveOwnerId: async () => (await auth()).user.libraryId,
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
```

One component:

```tsx
import { WhatsappInbox } from "@glitchgrab/whatsapp/react";

<WhatsappInbox api="/api/whatsapp" height={640} />
```

Live updates arrive over SSE. The component mints a short-lived ticket through
your route, so your API key never reaches the browser, and reconnects on its own
when the stream is closed or the ticket expires.

Restyle with CSS custom properties — `--gg-wa-accent`, `--gg-wa-bg`,
`--gg-wa-bubble-out`, `--gg-wa-border`, `--gg-wa-text`, `--gg-wa-muted`,
`--gg-wa-panel`, `--gg-wa-danger`. For a different layout, use the `useInbox`
hook directly and render your own.

## Billing

Prepaid, per owner. Collect payment however you already do, then:

```ts
await client.credit({ ownerId: library.id, amountPaise: 50_000, refKey: payment.id });
```

We hold the ledger; we never hold your customers' money. Balances are integer
paise. A send debits before it calls Meta and refunds if Meta refuses, so a
failed message never costs anyone anything.

## Autoreply

```ts
await client.createAutoreplyRule({
  ownerId: library.id,
  name: "Timings",
  matchType: "CONTAINS",
  pattern: "timing",
  replyText: "We're open 6am–10pm, every day.",
  priority: 10, // lower runs first; first match wins
});
```

Rules never fire for someone who has just asked to stop.

## API

`connect` · `completeConnect` · `numbers` · `templates` · `saveTemplate` ·
`submitTemplate` · `syncTemplates` · `send` · `messages` · `conversations` ·
`conversation` · `updateConversation` · `agents` · `saveAgent` ·
`autoreplyRules` · `createAutoreplyRule` · `credit` · `balance` ·
`createInboxSession`

Every failure is a `WhatsappError` with a stable `code`. Branch on that, not on
the message.
