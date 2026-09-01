# WhatsApp Platform (Glitchgrab as Meta Tech Provider)

Glitchgrab sells WhatsApp Business messaging as infrastructure. Other SaaS
products — SevaStack, PracticeStack, Abhyasika, and eventually third parties —
subscribe to it and resell it to *their* business owners under their own brand.
Feature parity target is AiSensy: connect a number, build and submit templates,
autoreply, broadcast, shared inbox.

Glitchgrab owns the Meta app, the infrastructure, the credit line and the API.
It never owns the phone number.

## Who the actors are

Four levels. Confusing any two of them breaks the design.

| Level | Example | Role |
|---|---|---|
| Provider | **Glitchgrab** | Meta Tech Provider. Owns the app, infra, credit line. |
| Platform | **Abhyasika** | A SaaS product with an audience. Installs our SDK. Never touches Meta. |
| Tenant | **A library admin** | Abhyasika's paying customer. Owns the WABA and the number. |
| Recipient | **A library's students** | Receives the messages. |

The problem this solves: today Abhyasika sends every library's messages from
Abhyasika's own number. Students see a stranger's name, libraries complain, and
one bad report drags the quality rating down for every library at once. After
this, each library admin's messages leave from the library's own verified name.

## The two things people conflate

**Whose number** and **whose bill** are independent settings on the same WABA.

- The tenant owns the WABA and the number. Messages carry their verified name.
- Glitchgrab shares its own Meta credit line onto that WABA. Meta invoices
  Glitchgrab.

Both at once. This is how every WhatsApp reseller works, and it is what makes
the revenue model below possible.

## Money

Cost flows down, invoices flow up:

```
Meta  --(bills)-->  Glitchgrab  --(bills)-->  Abhyasika  --(bills)-->  library admin
      ~cost                      markup 1                 markup 2
```

Illustrative intent from the product owner: Meta cost around ₹0.25, Glitchgrab
charges the platform ~₹0.50, the platform charges its tenant ~₹1.00. Two margins,
both real.

### The trap that inverts that margin

**Meta prices per message, per category, and the categories are not close to
each other.** Marketing costs a multiple of utility in India; authentication is
different again; service messages inside the 24-hour window are free. A flat
₹0.50 sell price against a category-blind ₹0.25 cost assumption is fine while a
tenant sends utility reminders and loses money the moment they send a marketing
broadcast — which is the exact feature they will use most.

Therefore:

1. **Never store one rate.** `WaPriceRule` is keyed by `(platformId, category)`.
2. **Never bill on message count.** Bill on category-weighted cost.
3. **Pull Meta's live rate card** before quoting a platform a price, and re-check
   it on Meta's pricing docs — do not hardcode figures from this document or
   from memory. Meta changes them, and the July 2025 shift from per-conversation
   to per-message pricing already invalidated one generation of assumptions.

### Prepaid wallets — two levels, one ledger

Recharge first, then send. Nothing is ever invoiced in arrears, at either level.

```
library admin --recharge--> [WaWallet ownerType=TENANT]
                                      |  debit per message
                                      v
Abhyasika     --recharge--> [WaWallet ownerType=PLATFORM]
                                      |  debit per message
                                      v
                                  Meta bill (our credit line)
```

A single send decrements both: the tenant's balance at the platform's sell price,
the platform's balance at ours. Either one hitting zero blocks the send.

**We run the ledger. We do not hold the tenant's money.**

This distinction is the whole design. If library admins' rupees flowed through
our account on the way to Abhyasika, we would be acting as a payment aggregator —
RBI-regulated, licence required, not a fight worth picking. So:

- The library admin pays Abhyasika through whatever rails Abhyasika already has.
- Abhyasika then calls `wa.credit({ ownerId, amountPaise })` against our API.
- We hold the *balance*, meter it, and block at zero.

Abhyasika still writes no billing code and carries no float. We never custody a
rupee belonging to someone we have no contract with. Only the platform-level
wallet involves real money moving to us, and that party we do have a contract
with.

### Getting the debit right

Three ways a prepaid wallet leaks money, all of them avoidable:

1. **Race on concurrent sends.** Read-then-write lets two simultaneous sends both
   pass a balance check and both debit, driving the balance negative. The debit
   must be one conditional statement — `UPDATE WaWallet SET balancePaise =
   balancePaise - :amt WHERE id = :id AND balancePaise >= :amt` — with zero rows
   affected meaning insufficient funds, and the `WaMessage` + `WaWalletTxn` rows
   written inside the same transaction.
2. **Broadcasts running dry mid-flight.** A 10,000-recipient send must *reserve*
   its estimated cost up front as a `HOLD` txn, settle against actual as
   recipients complete, then release the remainder. Per-message checking gives
   you a half-sent campaign with no clean way to report or resume it.
3. **Debits for messages Meta never delivered.** A send can fail after the debit —
   bad number, template paused, tenant quality block. Every such failure needs a
   `REFUND` txn. This is why the ledger is an append-only transaction table and
   not a single mutable balance column; the balance is a cached rollup of the
   txns, and the txns are the truth.

Money is `Int` paise everywhere. Never a float, never rupees.

## Tenancy

Three levels, and each must be a distinct model:

- **`WaPlatform`** — a product that subscribes to us (SevaStack). Holds the API
  key, the plan, and the callback URL we push events to.
- **`WaTenant`** — one business owner inside that platform (a clinic, a firm).
  Owns exactly one WABA. This is the security boundary for every query.
- **`WaNumber`** — a phone number registered under that WABA. Usually one,
  occasionally several.

`Organization` in `schema.prisma` cannot be reused: `githubOrgLogin` and
`githubOrgId` are both required and unique, and a clinic owner has no GitHub
org. `WaTenant` is standalone, keyed by `(platformId, externalOwnerId)` where
`externalOwnerId` is the subscribing platform's own user id.

Prefix every model `Wa` — `WhatsappOtp` and `WhatsappThread` already exist and
belong to Glitchgrab's own booking flow. Unrelated. Do not extend them.

## Number sourcing: bring your own, always

Meta does not sell phone numbers and never has. The owner supplies a number they
already control, able to receive an SMS or voice OTP, not currently registered
on consumer WhatsApp or the WhatsApp Business app. Same rule as AiSensy.

We never touch a telco. Do not add a DID reseller (Twilio/Plivo/Exotel) — virtual
DIDs fail WhatsApp verification often enough to become a permanent support load.
If an owner's number is stuck on the consumer app, the fix is theirs: delete the
account in the app, wait, retry. Document it; don't automate it.

## Meta setup — human steps, done once

These cannot be scripted. Each one gates the next.

1. **Business verification** for Navibyte Innovations Pvt Ltd in Meta Business
   Manager. Check whether it is already done before estimating anything.
2. **Create the Meta app**, add the WhatsApp product. This is a *new* app —
   Glitchgrab's existing `META_WA_*` credentials are a single-tenant sender for
   our own number and stay untouched.
3. **App Review for Advanced Access** on `whatsapp_business_management`,
   `whatsapp_business_messaging`, `business_management`.
4. **Data Protection Assessment**, annually, because of Advanced Access. A CASA
   Tier-2 assessment may also apply depending on final scope. Both cost real
   money and take weeks. Verify current requirements and fees on Meta's Tech
   Provider docs — do not quote tiers or thresholds from memory.
5. **Configure Embedded Signup** (Facebook Login for Business) and register the
   single webhook callback URL.
6. **Apply for a Meta extended credit line**, then share it onto each tenant WABA
   at onboarding. This is the gate that makes resale possible and it is the one
   most likely to be refused or delayed — Meta assesses it, and approval is not
   guaranteed for a new provider. Confirm it is obtainable before promising any
   platform a per-message price. Fallback if refused: tenant attaches their own
   card, we charge a flat SaaS fee, and the per-message margin disappears.

Note on the security audit: it is Meta auditing *us*, not us auditing the
subscribing platforms. Our own API scoping is the easy half.

## Onboarding flow

1. Owner clicks "Connect WhatsApp" inside SevaStack.
2. SevaStack opens our Embedded Signup launcher with its platform key and its
   own user id.
3. Meta's popup runs: owner picks or creates a WABA, adds their number, receives
   the OTP, verifies.
4. Meta returns a code. We exchange it for a business token, then create a
   system user token scoped to that WABA.
5. Store `wabaId`, `phoneNumberId`, and the token — **encrypted with the existing
   AES-256-GCM helper in `lib/encrypt.ts`**, same as user AI keys. Never plaintext.
6. Share our credit line onto the new WABA, so Meta invoices us rather than the
   tenant. Without this step the tenant gets Meta's bill directly and the whole
   revenue model is gone.
7. Subscribe our app to that WABA's webhooks.

## Data model

New models, all `Wa`-prefixed:

- `WaPlatform` — name, `apiKeyHash` (SHA-256, `gg_wa_` prefix), plan, callbackUrl, active
- `WaTenant` — platformId, externalOwnerId, name, wabaId, status; `@@unique([platformId, externalOwnerId])`
- `WaNumber` — tenantId, phoneNumberId, displayNumber, verifiedName, qualityRating, messagingLimitTier
- `WaTemplate` — tenantId, name, category, language, components (Json), metaTemplateId, status, rejectionReason, lastSyncedAt
- `WaContact` — tenantId, phone, name, attrs (Json), optedOut; `@@unique([tenantId, phone])`
- `WaContactList` + `WaContactListMember`
- `WaBroadcast` — tenantId, templateId, listId, status, counts; `WaBroadcastRecipient` — status, metaMessageId, error
- `WaConversation` — tenantId, contactId, `windowExpiresAt`, lastInboundAt, assignedAgentId, status
- `WaMessage` — conversationId, direction, type, payload (Json), metaMessageId, status, error, pricingCategory, sentAt
- `WaAutoreplyRule` — tenantId, priority, matchType, pattern, replyKind, payload, enabled
- `WaAgent` — tenantId, name, email, role (inbox seat, not a Glitchgrab `User`)
- `WaWebhookEvent` — raw payload plus Meta's event id, unique, for dedupe
- `WaPriceRule` — platformId, category, `metaCostPaise` (our cost), `platformPricePaise`
  (what we charge the platform), `tenantPricePaise` (what the platform charges its
  tenant, set by the platform), effectiveFrom
- `WaWallet` — `ownerType` (PLATFORM | TENANT), `ownerId`, `balancePaise` (Int),
  `heldPaise` (Int), lowBalanceThresholdPaise; `@@unique([ownerType, ownerId])`
- `WaWalletTxn` — walletId, `amountPaise` (signed), kind, messageId, broadcastId,
  balanceAfterPaise, createdAt. Append-only; the wallet balance is its rollup.

Enums: `WaTemplateStatus`, `WaTemplateCategory`, `WaMessageDirection`,
`WaMessageStatus`, `WaBroadcastStatus`, `WaMatchType`, `WaWalletOwnerType`,
`WaWalletTxnKind` (TOPUP | DEBIT | REFUND | HOLD | RELEASE | ADJUSTMENT).

## API surface

Under `/api/v1/wa/`. Auth is a Bearer platform key; the tenant is resolved
server-side from `externalOwnerId` in the body.

`WaPlatform` rows are **provisioned by hand**. For SevaStack, PracticeStack and
Abhyasika we insert the row and hand over the key directly. No self-serve
subscriber signup — do not build one until a real third party asks.

- `POST /signup/launch` → Embedded Signup URL; `POST /signup/exchange` → code to WABA
- `GET|POST /templates`, `POST /templates/:id/submit`, `GET /templates/:id/status`
- `POST /messages/send` — template or free-form; free-form rejected outside the window
- `GET|POST /contacts`, `POST /contacts/import`, `POST /lists`
- `POST /broadcasts`, `GET /broadcasts/:id`
- `POST /wallet/credit` — platform credits a tenant's balance after collecting
  payment on its own rails; `GET /wallet/balance`; `GET /wallet/transactions`
- `POST /pricing` — platform sets its own per-category tenant sell price
- `GET|POST /autoreply/rules`
- `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/assign`
- `POST /webhook` — single endpoint for every tenant

**Never trust a client-supplied `tenantId`.** Derive it from the platform key
plus `externalOwnerId`, exactly as `getExtensionSessionRepos()` derives repo
scope from the session. Same rule, same reason.

## Webhook fan-out

Meta posts every tenant's events to one URL. Route on `phone_number_id` inside
the payload:

1. Verify `X-Hub-Signature-256` against the app secret. Reject on mismatch.
2. Dedupe on Meta's event id via `WaWebhookEvent` — Meta retries.
3. Look up `WaNumber` by `phoneNumberId` → tenant.
4. Inbound message → upsert `WaConversation`, set `windowExpiresAt = now + 24h`,
   write `WaMessage`, evaluate autoreply rules by priority, first match wins.
5. **Opt-out check, every inbound.** A stop-intent message sets
   `WaContact.optedOut` immediately, regardless of which phase has shipped.
   Meta requires opt-out to be honoured across every marketing send — it is a
   compliance rule, not a broadcast feature. Ship the flag-setting in phase 4
   with the webhook, not in phase 5 with broadcast; retrofitting it after live
   tenants exist means auditing sends you already made.
6. Status callback → update the `WaMessage` / `WaBroadcastRecipient` row.
7. Template status change → update `WaTemplate`, notify the platform's callbackUrl.
8. Return 200 fast. Do the work after, or Meta backs off the whole app — every
   tenant, not just the slow one.

## The 24-hour window

Free-form text is legal only within 24 hours of the contact's last inbound
message. Outside it, an approved template or nothing — and the API answers 200
either way, so a silent failure looks like a success. `windowExpiresAt` on the
conversation is the gate; check it before send, not after. Same trap already
documented in `agent_docs/whatsapp-templates.md`.

## The SDK

A **separate package**, not an addition to `glitchgrab` (the npm package that
creates GitHub issues). Different audience, different auth, different mental
model — a library-management product installing WhatsApp messaging should not
pull in a bug reporter.

New package: `packages/sdk-whatsapp` → published as `@glitchgrab/whatsapp`.

What a platform writes:

```ts
const wa = createWhatsappClient({ apiKey: process.env.GG_WA_KEY })

// once per tenant, returns a URL to open
const { url } = await wa.connect({ ownerId: library.id, name: library.name })

// thereafter
await wa.send({
  ownerId: library.id,
  to: student.phone,
  template: "fee_due",
  params: [student.name, "₹500", "5 Sep"],
})
```

`ownerId` is the platform's own user id. We map it to a `WaTenant` server-side.
The platform never sees a WABA id, a phone number id, or a Meta token, and never
sends us a `tenantId` we would have to trust.

Ship a drop-in React inbox component alongside it, so a platform gets the shared
inbox without rebuilding it. That is the piece that makes "we help for easiness"
real rather than a promise.

## Build sequence

All four v1 features are in scope. Order matters because each depends on the last.

1. **Foundation** — schema, migration, platform key auth, tenant scoping,
   encrypted token storage, both wallet levels, append-only ledger with atomic
   conditional debit, `WaPriceRule`.
2. **Connect** — Embedded Signup, token exchange, webhook subscription, number status.
3. **Templates** — composer, Meta submit, approval polling (a cron, same shape
   as `cron/extension-watch`), send. Every send debits the wallet in the same
   transaction as the message row.
4. **Receive + autoreply** — webhook fan-out, conversations, window tracking,
   message log, opt-out flagging. Autoreply rules land here; they are the same
   pipeline plus a matcher. Backend only, no UI.
5. **Shared team inbox** — the live two-way chat UI, `WaAgent` seats, assignment,
   conversation history. Largest of the four by a wide margin, and the only one
   with an unresolved architecture question: **how new messages reach an open
   inbox tab.** A long-lived websocket does not survive Vercel's serverless
   functions, so the real choice is SSE on a streaming route or plain polling.
   Decide that before writing the UI — it dictates the deployment target.
6. **Broadcast** — contacts, lists, import, throttled send, per-recipient status,
   up-front wallet hold with settle-and-release. Honours the `optedOut` flag set
   back in phase 4.

Phases 1–3 are the first shippable product: connect a number, get a template
approved, send it. Phase 5 is the largest single chunk and can ship after
customers are already sending.

## Gotchas

1. Meta sells no phone numbers. Bring your own, always.
2. `Organization` is GitHub-bound and unusable as a tenant.
3. Free-form outside the 24h window returns 200 and delivers nothing.
4. One webhook URL for every tenant; a slow handler throttles all of them.
5. Meta retries webhooks — dedupe on the event id or autoreply fires twice.
6. Template approval is asynchronous and Meta never notifies on a schedule you
   control. Poll it.
7. Glitchgrab's existing `META_WA_*` env vars are a different app for our own
   number. Do not overload them.
8. Category-blind pricing loses money on marketing. Price per category or not at all.
9. Money in paise as `Int`, never a float. Never bill off message count alone.
10. Read-then-write on a wallet balance goes negative under concurrency. One
    conditional UPDATE, or nothing.
11. Holding a tenant's money makes us a payment aggregator under RBI. We hold the
    ledger; the platform holds the rupees.
12. The credit line, not the code, is the real dependency. If Meta refuses it,
    the margin model dies and the product becomes a flat-fee tool — worth
    knowing before phase 1, not after phase 5.
