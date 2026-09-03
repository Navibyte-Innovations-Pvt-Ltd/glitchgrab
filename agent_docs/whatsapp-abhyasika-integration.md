# Wiring WhatsApp into Abhyasika

The first platform on the WhatsApp infra. Architecture is in
`whatsapp-platform.md`; this is the checklist for actually switching it on.

## Read this before starting

**Real library admins cannot connect yet.** Meta's Embedded Signup page states
it plainly: *"You cannot use this app in production until app review is
completed. You will have to manually add users to the App for testing."*

That is not a reason to wait. App Review requires a screencast of the working
integration and evidence of real API calls (`api_precheck`), so wiring Abhyasika
up **is** how the submission becomes possible. The order is: integrate → test
with your own number → record → submit → open to customers.

Until approval, only Meta app testers can complete Embedded Signup.

## 1. Provision Abhyasika (once, production)

```bash
bun run scripts/wa-provision-platform.ts abhyasika "Abhyasika" --production
```

Run from `apps/web` with the production `NEXT_POSTGRES_URL` loaded. The
`--production` flag is deliberate friction; the script refuses a non-localhost
database without it, and refuses the flag when the database *is* localhost.

It prints the API key **once** — only its SHA-256 is stored. Losing it means
rotating, not recovering. Put it in Abhyasika's env as `GG_WA_KEY`.

It also seeds a `WaPriceRule` per category. Without one, every send of that
category fails with `NO_PRICE_RULE`. The seeded numbers are illustrative: pull
Meta's live India rate card before billing anyone, and remember marketing costs
a multiple of utility.

## 2. Meta dashboard (once)

App `996021116131151`, and all of it is manual.

1. **Add yourself as a tester** — App roles → Roles → Add People → Testers.
   Without this, Embedded Signup refuses everyone while the app is unreviewed.
2. **Allowlist Abhyasika's domain** — Embedded Signup Setup → Manage Domains →
   Manage allowlist. HTTPS only; `localhost` is rejected, so local development
   needs a tunnel domain added too. This is per platform, not one-time: every
   product we sign needs its own domain here.
3. **Confirm the webhook** — callback is
   `https://glitchgrab.dev/api/v1/whatsapp/webhook` (the legacy path, which
   routes platform traffic by `phone_number_id` — see `whatsapp-platform.md`),
   subscribed to `messages`, `message_template_status_update`,
   `phone_number_quality_update`, `account_update`.
4. **Use the Test WhatsApp Business Account** (`1482815023074117`) for the first
   connection, not a live customer's.

## 3. Install the SDK

```bash
bun add @glitchgrab/whatsapp
```

## 4. Abhyasika code

Four additions. `ownerId` is Abhyasika's own library id throughout — we own the
mapping to a tenant, so Abhyasika never handles a WABA id or a Meta token.

**`app/api/whatsapp/[...action]/route.ts`** — the proxy the inbox talks to.

```ts
import { createWhatsappClient, createInboxHandler } from "@glitchgrab/whatsapp";

const client = createWhatsappClient({ apiKey: process.env.GG_WA_KEY! });

export const GET = createInboxHandler({
  client,
  // Derive the owner from the SESSION, never from the request body. Returning a
  // client-supplied id here would let any signed-in user read any other
  // library's WhatsApp. This one line is the whole tenant boundary.
  resolveOwnerId: async () => (await auth())?.user?.libraryId ?? null,
});
export const POST = GET;
export const PATCH = GET;
```

**Connect button** — server half:

```ts
"use server";
export async function startWhatsappConnect(libraryId: string, name: string) {
  return client.connect({ ownerId: libraryId, ownerName: name });
}
export async function finishWhatsappConnect(libraryId: string, code: string, state: string) {
  return client.completeConnect({ ownerId: libraryId, code, state });
}
```

Browser half — Meta's JS SDK must be on the page
(`https://connect.facebook.net/en_US/sdk.js`):

```tsx
const config = await startWhatsappConnect(library.id, library.name);
const { code, state } = await launchSignup(config);
const result = await finishWhatsappConnect(library.id, code, state);
// result.warnings is not an error list — surface it. "No phone number added
// yet" and "credit line not attached" both arrive here and both matter.
```

**Sending** — from wherever fee reminders already go out:

```ts
await client.send({
  ownerId: library.id,
  to: student.phone,
  template: "fee_due",
  components: [{ type: "body", parameters: [{ type: "text", text: "₹500" }] }],
  refKey: `fee-${invoice.id}`, // a retry with the same key never charges twice
});
```

**Inbox page:**

```tsx
import { WhatsappInbox } from "@glitchgrab/whatsapp/react";
<WhatsappInbox api="/api/whatsapp" height={640} />
```

## 5. Money

Prepaid, and Abhyasika collects from its libraries on its own rails — we hold the
ledger, never the money. Custodying an end customer's funds would make us a
payment aggregator under RBI.

```ts
await client.credit({ ownerId: library.id, amountPaise: 50_000, refKey: payment.id });
```

Both levels debit on every send: the library at Abhyasika's price, Abhyasika at
ours. Either at zero blocks the send with `code: "INSUFFICIENT_FUNDS"` and a
`detail.shortfallPaise` worth showing the user.

Abhyasika tops itself up with the same call, omitting `ownerId`.

## 6. First run, in order

1. Connect the **test WABA** as one library.
2. `client.saveTemplate(...)` then `client.submitTemplate(...)` — approval is
   asynchronous and Meta gives no schedule. `cron/wa-template-sync` polls hourly;
   `client.syncTemplates()` checks now.
3. Once approved, `client.send(...)` to your own number.
4. Reply from your phone. It should appear in the inbox within ~2 seconds — the
   SSE stream polls the database on a 2s interval.
5. Reply **"STOP"**. Marketing to that contact must stop; utility must not.

## What will bite

- **Free text outside the 24-hour window.** Meta answers 200 and delivers
  nothing. The SDK refuses it instead, and the inbox hides the composer.
- **Approval is per template, per language.** A template approved in `en` is not
  approved in `mr`.
- **Meta can recategorise on submission.** A template you called utility may come
  back marketing and bill at the marketing rate; `WaMessage` records the category
  it was actually charged as.
- **The quality rating is the tenant's, not ours.** A library that spams tanks its
  own number, but the pattern repeated across libraries endangers the app.

## Still open

- `@glitchgrab/whatsapp` is not published yet.
- No visual template composer — Meta's component JSON is written by hand.
- A message Meta accepts and then reports `failed` records the failure but is not
  refunded. Refund-on-send-error is wired; refund-on-late-failure is not.
