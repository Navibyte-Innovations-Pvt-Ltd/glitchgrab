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
3. **Idempotency keys that are not scoped.** `refKey` is a string the *caller*
   chooses, not a global identifier, so two platforms will eventually both send
   `topup-1`. When the unique index was global, the second platform's call
   matched the first's row, returned a balance belonging to someone else, and
   silently skipped their credit — cross-tenant disclosure and lost money in one
   bug. The index is `(walletId, refKey)`, and every lookup resolves the wallet
   *before* checking the key.
4. **Debits for messages Meta never delivered.** A send can fail after the debit —
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

## Meta setup — verified status (2026-09-02)

Checked against the live Meta account, not assumed.

| Item | State | Evidence |
|---|---|---|
| Meta app | **Exists, live** | `Glitchgrab`, app id `996021116131151`, base domain `glitchgrab.dev` |
| Business portfolio | `2882312428642904` | "Navibyte Innovations" — NAVIBYTE INNOVATIONS PRIVATE LIMITED, CIN U62013PN2025PTC243132, Pune. Owns the app and every WABA. |
| Business verification | **Verified** 8 Jul 2025 | Business portfolio info |
| **Tech Provider access verification** | **Verified** | Business portfolio info → "Your business was verified as a Tech Provider" |
| WhatsApp product | **Added** | "Connect on WhatsApp" use case active |
| Facebook Login for Business | **Configured** | Required for Embedded Signup |
| 1. Business verification | **Approved** | Tech Provider onboarding page, step 1 |
| 2. App Review | **NOT submitted** | App Review → Submissions reads "Not submitted"; three permissions queued as New requests |
| App compliance | Clean | No violations, no required actions |
| Extended credit line (ours) | **Does not exist** | Billing hub → Credit lines: only lines *allocated from* Haptik and AiSensy |
| Finance editor role | **Granted** (2026-09-02) | Banner cleared; did **not** unlock credit-line requests |
| Meta India rate card | **Not yet pulled** | Needed before quoting a platform a price |

### Billing, as it actually stands

Navibyte's business (`2882312428642904`) holds these WhatsApp Business accounts:

| WABA | Pays via |
|---|---|
| Glitchgrab (`3155474051329602`) | own Visa ···7006, ₹11.06 due |
| My Abhyasika (`1893698398081017`) | own Visa ···7006, ₹94.92 due |
| PracticeStacks (`861240823192636`) | own Visa ···7006, ₹36.00 due |
| Kaydyach Aani Faydyach, Navibyte Innovations | own Visa ···7006 |
| Sevastack (×2) | **no payment method** |
| Startbusiness, Navibyte Innovations Pvt Ltd | **AiSensy** |
| AS Consultancy, Navibyte Innovations Pvt Ltd | **Haptik** |
| Test WhatsApp Business Account (`1482815023074117`) | own Visa — usable for phase 2/3 dev |

Two things follow from this, and they matter more than anything else in this
document:

1. **The model is proven, from the receiving end.** AiSensy and Haptik each
   allocate a credit line onto WABAs that Navibyte owns, and Meta invoices
   *them*. That is precisely the mechanism Glitchgrab would use on a library
   admin's WABA. It is not theoretical — it is already on this account, twice.
2. **We have no line of our own.** Every Navibyte-paid WABA runs on a personal
   Visa. Applying is gated on a Meta role change first: the current role lacks
   *finance editor*, so "Add line of credit" cannot be actioned.

Abhyasika already sends from its own WABA billed to that Visa — which is exactly
the arrangement the backlash comes from: one number for every library.

Tech Provider onboarding reports **1 of 2 steps complete**: business
verification done, App Review outstanding.

`business_management` is **not** required. Meta's Tech Provider checklist lists
exactly two permissions, both `whatsapp_*`. Do not submit for a third.

### App Review has not been submitted

The Tech Provider onboarding page renders step 2 as "In review", and that is
misleading — it reflects the step being open, not a submission being with Meta.
Both the App Review → Submissions page ("Not submitted") and the Graph API
(`submission_status: UNSUBMITTED`, `has_been_previously_reviewed: false`) agree
that nothing has been sent. **Believe those two, not the onboarding page.**

Three permissions sit queued as New requests: `whatsapp_business_messaging`,
`whatsapp_business_management`, and `public_profile`. Every step on the two
WhatsApp permissions is incomplete — `use_case`, `screencast`, `api_precheck`
and `data_use_checkup` all report `is_completed: false`. `public_profile` needs
only `data_use_checkup`, and is worth questioning at all: it is not on Meta's
Tech Provider checklist, and carrying it drags a compliance form into the
submission. Confirm whether Facebook Login for Business needs it before removing.

### Why this inverts the build order

`api_precheck` requires **real calls to the WhatsApp endpoints from this app**,
and `screencast` requires video of a working integration — a message leaving the
app and arriving in WhatsApp, and a template being created over the API. Neither
can be faked and neither can be produced before the integration exists.

App Review is therefore **not** a gate in front of phases 2 and 3. It is a gate
behind them:

```
phase 2 (Embedded Signup, token exchange)
  → phase 3 (templates, send) against Test WhatsApp Business Account (1482815023074117)
  → those calls satisfy api_precheck
  → record the two screencasts from the working app
  → data_use_checkup
  → submit App Review
```

Nothing is waiting on Meta. The blocker is our own code.

## One Meta identity, two Google addresses

Settled empirically on 2026-09-02, after an invite attempt failed twice:

`bhosalenaresh73@gmail.com` and `navibyteinnovations@gmail.com` are **the same
Facebook profile**, and that profile already has Full access plus Finance on the
Navibyte Innovations portfolio (`2882312428642904`).

The confusion is a Meta UI artefact. The People row reads "Navibyte Innovations
(you) — navibyteinnovations@gmail.com" because that is the person's **business
email** field, a label attached to the portfolio membership. It is not the
Facebook login. The login is `bhosalenaresh73@gmail.com`, which is also why the
Graph API reports that address as the Glitchgrab app's contact.

How it was proven: inviting `bhosalenaresh73@gmail.com` and opening the invite in
an incognito window, signed in as that address, returned *"Looks like you're
already in the business portfolio."* A genuinely separate account would have been
able to accept.

**Do not try to add a second person.** There is one human, one Facebook profile,
one portfolio, and it already holds every permission needed. Any pending invite
to `bhosalenaresh73@gmail.com` should be cancelled under Settings → Users →
People; it can never be accepted.

The portfolio members are therefore: this profile (Full access + Finance) and
Vivek Bhos, `bhosvivek123@gmail.com` (Full access + Finance).

## Credit lines — what the dashboard actually allows## Credit lines — what the dashboard actually allows

Credit lines **do** cover WhatsApp, not just ads: the "Supported products" column
on both allocated lines shows the WhatsApp icon, and AiSensy/Haptik appear as the
payer on WhatsApp Business accounts in the billing table. That question is
settled empirically on this account.

**But there is no self-serve way to open one.** Billing → Credit lines → *Add
line of credit* opens a menu with exactly one entry, disabled:

> Request Access to a Partner's Credit — *This option is no longer available.
> Ask your partner to grant access to you.*

So a line of credit is not something the dashboard will sell us. It is granted by
Meta on eligibility — through a Meta rep, or the Tech Provider onboarding support
channel linked from the onboarding page.

**The finance-editor role was granted on 2026-09-02 and changed nothing here.**
The "Missing edit permissions" banner disappeared, confirming the role applied,
and the menu item stayed disabled with the same text. This was worth testing and
is now settled: the block is not a permissions problem at any level, it is Meta
having withdrawn self-serve credit requests. Do not spend more time in the
billing UI looking for another route — the only remaining path is a conversation
with Meta, gated on App Review.

### Constraints on sharing, once we have one

From Meta's own sharing documentation, and each one has a design consequence:

| Constraint | Consequence for us |
|---|---|
| "The receiving business can't reshare your credit line with others." | We must share **directly onto each tenant's business**, never Glitchgrab → Abhyasika → library. The platform is a billing and UI relationship only; the credit relationship is provider-to-tenant. Our schema already models it this way. |
| Businesses in India can only share with businesses in India. | Domestic tenants only. An overseas customer of a platform cannot be onboarded onto our line. |
| Outside US/BR/FR/MX the **sharing** business stays bill-to. India is outside that list. | **We remain liable for every rupee a tenant spends.** This is the whole justification for the prepaid wallet. |
| Partial sharing sets a hard spend cap on the receiving business. | Set it to the tenant's wallet balance. Our wallet is the soft guard; Meta's cap is the hard one that holds even if our code fails open. |

### If the credit line never arrives

The wallet architecture survives intact. Only the Meta-cost line moves:

- **With a line:** Meta bills us, we bill the platform, the platform bills the
  tenant. Margin is resale.
- **Without:** the tenant's own card stays on their WABA and Meta bills them
  directly. We still meter every message and still charge a software fee per
  message through the same wallet.

Nothing in phases 1–6 changes. `WaPriceRule.metaCostPaise` becomes informational
rather than a real payable, and the per-message revenue is a platform fee instead
of a markup. Worth knowing before the credit-line conversation, so it is not
negotiated from a position of it being existential.

## Meta setup — the full sequence, for reference

These cannot be scripted. Each one gates the next.

1. **Business verification** for Navibyte Innovations Pvt Ltd in Meta Business
   Manager. Check whether it is already done before estimating anything.
2. **Create the Meta app**, add the WhatsApp product. This is a *new* app —
   Glitchgrab's existing `META_WA_*` credentials are a single-tenant sender for
   our own number and stay untouched.
3. **App Review for Advanced Access** on `whatsapp_business_messaging` and
   `whatsapp_business_management`. Both need a screencast: one showing a message
   sent from the app and arriving in WhatsApp, one showing a template being
   created over the API.
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

## Status

**Phases 1–4 are built** (2026-09-02). They talk to Meta but have never been run
against it — `META_WA_SIGNUP_CONFIG_ID` does not exist yet.

| Piece | Where |
|---|---|
| Models + enums | `apps/web/prisma/schema.prisma` (tail) |
| Migration | `apps/web/prisma/migrations/20260902060000_wa_platform_foundation/` |
| Platform key auth, tenant mapping | `apps/web/lib/wa/auth.ts` |
| Wallets, atomic debit, holds, refunds | `apps/web/lib/wa/wallet.ts` |
| Per-category pricing | `apps/web/lib/wa/pricing.ts` |
| Typed failures | `apps/web/lib/wa/errors.ts` |
| Routes | `apps/web/app/api/v1/wa/{wallet/credit,wallet/balance,wallet/transactions,pricing}` |
| Manual platform provisioning | `apps/web/scripts/wa-provision-platform.ts` |
| Graph API client (pinned v23.0) | `apps/web/lib/wa/graph.ts` |
| Embedded Signup + token exchange | `apps/web/lib/wa/onboarding.ts` |
| Webhook fan-out + dedupe | `apps/web/lib/wa/webhook.ts` |
| Numbers, webhook events | `migrations/20260902120000_wa_onboarding/` |
| Phase 2 routes | `app/api/v1/wa/{signup/launch,signup/exchange,numbers,webhook}` |
| Templates (save, submit, sync, delete) | `apps/web/lib/wa/templates.ts` |
| Sending + billing + refunds | `apps/web/lib/wa/send.ts` |
| Templates, messages | `migrations/20260902160000_wa_templates_messages/` |
| Phase 3 routes | `app/api/v1/wa/{templates,templates/[id],templates/[id]/submit,templates/sync,messages,messages/send}` |
| Template poll | `app/api/v1/cron/wa-template-sync` (hourly, in `vercel.json`) |
| Conversations, 24h window, opt-out | `apps/web/lib/wa/conversations.ts` |
| Autoreply rules | `apps/web/lib/wa/autoreply.ts` |
| Conversations, autoreply rules | `migrations/20260902180000_wa_conversations/` |
| Phase 4 routes | `app/api/v1/wa/{conversations,conversations/[id],autoreply/rules,autoreply/rules/[id]}` |

### Env vars phase 2 needs

The platform reuses the repo's existing `META_WA_*` variables rather than
introducing parallel `META_WA_PLATFORM_*` names. One Meta app, one set of
credentials — a second name for the same secret is only a way to get them out of
sync. Verified on 2026-09-02 against `oauth/access_token`, which accepts
`META_WA_APP_SECRET` for app `996021116131151` and rejects it for every other app
of ours.

| Var | State |
|---|---|
| `META_WA_APP_ID` | **Needs adding**: `996021116131151` |
| `META_WA_APP_SECRET` | Already set — the Tech Provider app's secret |
| `META_WA_VERIFY_TOKEN` | Already set — shared with `/api/v1/whatsapp/webhook` |
| `META_WA_SIGNUP_CONFIG_ID` | **Does not exist.** Created in Embedded Signup Builder, not looked up |
| `META_WA_EXTENDED_CREDIT_ID` | Leave unset — no credit line; onboarding degrades gracefully |
| `META_WA_CREDIT_CURRENCY` | Defaults to `INR` |

### The env pair is mismatched, and it matters

`META_WA_APP_SECRET` and `META_WA_ACCESS_TOKEN` belong to **different Meta apps**:

- `META_WA_APP_SECRET` authenticates app **`996021116131151` (Glitchgrab)**.
  Meta accepts it there and rejects it for PracticeStacks, so it is genuinely the
  Tech Provider app's secret and the platform code reuses it directly.
- `META_WA_ACCESS_TOKEN` is a system user token on app **`1390644442532883`
  (PracticeStacks)** — `debug_token` names the app outright. It is what
  `lib/whatsapp.ts` sends Glitchgrab's own OTP, booking and digest messages with.

That combination is worth verifying rather than assuming benign. The existing
`/api/v1/whatsapp/webhook` verifies signatures with the **Glitchgrab** secret,
while sends go out on a **PracticeStacks** token. It works only if the Glitchgrab
app is the one subscribed to that WABA's webhooks — plausible, since both apps
sit under the same business and a system user token can reach a WABA either app
is attached to. If it is *not*, every inbound WhatsApp message fails its
signature check and returns 403 silently, which would take reschedule, cancel,
"leave" and "show details" down with no error anywhere.

**How to check:** send a WhatsApp reply to the production number and look for a
`[whatsapp-webhook] signature verification failed` line. Nothing in this project
depends on the answer — the platform app has its own webhook, its own verify
token and its own subscription — but it is a live path nobody has tested.

Never copy `META_WA_ACCESS_TOKEN` into a platform variable. Tenant tokens come
from Embedded Signup, one per WABA, and never from env.

### What is deliberately not built yet

- **The shared inbox UI and agent seats** — phase 5. The data behind it exists
  (`WaConversation`, assignment, unread counts) and is served by
  `GET /conversations`; what is missing is the interface and `WaAgent`.
  The open question there is **how a new message reaches an open inbox tab**: a
  long-lived websocket does not survive Vercel's serverless functions, so the
  real choice is SSE on a streaming route or polling. Decide that before writing
  the UI — it dictates the deployment target.
- **Broadcast and contact lists** — phase 6, on top of `holdFunds` /
  `settleHold`, which already exist unused. Opt-out is done and enforced.
- **Number registration** (`registerPhoneNumber`) is written but unused: it needs
  the tenant's two-step PIN, which is a UI decision.
- **Refunds on `failed` delivery status.** The webhook records the failure; the
  money is not yet given back for a message Meta accepted and then failed to
  deliver. Refund-on-send-error *is* wired. Closing this gap needs a sweep over
  `WaMessage` rows that went FAILED after SENT.

### Phase 4 design notes

- **The window is stored, not inferred.** `WaConversation.windowExpiresAt` is
  written in the same operation that records the inbound message. Deriving it at
  send time from a scan of the message log worked, but put the single most
  consequential rule in the API behind an index lookup that could silently start
  missing rows.
- **Opt-out is evaluated on inbound, not at broadcast time.** Meta requires it to
  be honoured across every marketing send, so a tenant running only phases 1–4
  must still stop messaging someone who asked. Enforced in `sendTemplate()` for
  `MARKETING` only — a fee reminder is utility, and blocking it would break the
  product for no compliance gain.
- **Stop-intent matching is narrow on purpose.** The flag suppresses all future
  marketing, so a false positive costs the tenant a customer they were allowed
  to contact. A bare "no" is left alone. Same reasoning as the digest mute intent
  in `lib/whatsapp.ts`.
- **Autoreply never replies to a stop message.** An autoreply to "stop" is the
  single most damaging thing a bot can do to a quality rating.
- **First match wins, and a catch-all is forced to priority 900+.** Two rules
  matching one message would send two replies, which reads as a broken bot.
- **A tenant-supplied regex is a DoS vector.** `(a+)+$` backtracks exponentially
  and would pin the webhook handler — which Meta then throttles for *every*
  tenant. Guarded by compile-check on write, a length cap, and truncating the
  inbound text before matching.
- **Autoreply failures are swallowed.** A reply that does not send must never
  make the webhook look broken to Meta.

### Phase 3 design notes

- **Send order is charge → call Meta → refund on failure.** Charging first is
  what makes a prepaid wallet mean anything; sending first would let a tenant at
  zero keep sending. The cost is that a Meta failure leaves money debited, hence
  `failAndRefund()` on every error path, and hence an append-only ledger.
- **`failAndRefund()` never throws.** A refund failure must not replace the Meta
  error the caller needs to see; a refund that did not land is recoverable from
  the ledger, a swallowed send error is not.
- **The category comes from the stored template, never the caller.** Marketing
  costs a multiple of utility, so a caller-declared category would let a platform
  bill marketing at utility rates.
- **`WaMessage` stores the price it was charged at.** A rate card changes; a
  disputed invoice still has to be answerable.
- **The 24-hour window is checked before sending free text.** Meta answers 200
  outside the window and delivers nothing, so a silent failure looks exactly like
  a success.
- **Templates sync by name+language, not Meta id.** A template created in Meta's
  own UI has no id on our side, and a send referencing it would otherwise fail
  as "no such template" while being live and approved.
- **Both a webhook and a cron watch template status.** The webhook is not
  guaranteed delivered, and a pause or recategorisation weeks later may produce
  no event at all.

### Design notes worth not re-deriving

- **The WABA id comes from `debug_token`, never the request.** Embedded Signup
  reports it to the browser, and a browser can claim any id. Trusting the body
  would let one platform bind another business's WABA to its own tenant.
- **Credit-line sharing is best-effort.** No line configured, or Meta refusing,
  produces a warning and a connected tenant — not a failed onboarding. Without a
  line, the tenant's own card pays Meta and our per-message charge is a software
  fee rather than a resale margin.
- **The webhook always answers 200.** A 500 makes Meta back off the whole app —
  every tenant's traffic, not just the one that failed. Events are persisted
  before handling, so swallowing an error loses nothing.
- **The Graph version is pinned.** Meta ships breaking changes between versions;
  an unpinned client follows them silently.

Neither migration has been applied — run `bun run db:push` (localhost only)
when ready.

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
9b. Idempotency keys are per-wallet, never global — a caller-chosen key collides across platforms.
10. Read-then-write on a wallet balance goes negative under concurrency. One
    conditional UPDATE, or nothing.
11. Holding a tenant's money makes us a payment aggregator under RBI. We hold the
    ledger; the platform holds the rupees.
12. The credit line, not the code, is the real dependency. If Meta refuses it,
    the margin model dies and the product becomes a flat-fee tool — worth
    knowing before phase 1, not after phase 5.
