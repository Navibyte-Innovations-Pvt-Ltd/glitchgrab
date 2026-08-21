# WhatsApp messaging and how to create a template

`apps/web/lib/whatsapp.ts` sends over the Meta Cloud API. Two completely
different rules apply depending on who spoke last.

## The 24-hour window decides everything

- **The customer messaged us within the last 24 hours** → we may reply with
  **free text**, interactive lists, and CTA buttons. No approval, no template.
  `sendWhatsappText`, `sendWhatsappList`, `sendWhatsappCtaUrl`.
- **Outside that window, or we message first** → only a **pre-approved
  template** sends. Anything else is accepted by the API and never delivered.

This is why the WhatsApp booking bot needs no templates at all: the prospect
opens the chat from a `wa.me` link, which starts their window. Confirmations and
reminders that fire hours later do need templates.

`WhatsappThread.lastInboundAt` records when the window opened.

## Creating a template

**Meta Business Suite → WhatsApp Manager → Message templates → Create.**

1. **Name** — lowercase with underscores, e.g. `demo_confirmed`. This is the
   string the code passes; it cannot be renamed later.
2. **Category**
   - **Utility** — order updates, appointment confirmations, reminders. What we
     use. Approved faster, not subject to marketing limits.
   - **Authentication** — OTPs only. `wa_otp` is one.
   - **Marketing** — anything promotional. Rate-limited per user, and users can
     opt out of the whole category.
   Choosing Marketing for a utility message is the most common rejection.
3. **Language** — pick `English`. If you pick `en_US` or `en_GB` instead, change
   `language.code` in `lib/whatsapp.ts` to match, or every send fails with
   "template not found" — which looks like the template does not exist.
4. **Body** — variables are `{{1}}`, `{{2}}`, numbered in order. Meta requires a
   sample value for each. A variable may not sit at the very start or end of the
   body, and two may not be adjacent.
5. **Buttons** (optional) — see below.
6. Submit. Approval is usually minutes, sometimes a day.

## URL buttons — the fixed-prefix trap

A URL button is a **fixed prefix plus one variable**. You cannot pass a whole
URL.

```
Type:        Visit website
Button text: Join demo          (≤ 20 characters)
URL type:    Dynamic
URL:         https://meet.google.com/{{1}}
Sample:      abc-defg-hij
```

The code then sends only the varying part (`abc-defg-hij`), never the full link.
Pass a whole URL and the recipient gets `https://meet.google.com/https://…`.
`meetCode()` in `lib/whatsapp.ts` exists for exactly this.

Static URL buttons need no variable and no sample.

## Sending one from code

`sendTemplate(name, phone, bodyParams[], urlButtonParam?)` in `lib/whatsapp.ts`.
Body parameters are positional and must match `{{1}}`, `{{2}}` … exactly in
count and order. A mismatch is rejected with a 132000-series error.

## Checking a template is live

```bash
curl -s "https://graph.facebook.com/v19.0/<WABA_ID>/message_templates?name=demo_confirmed" \
  -H "Authorization: Bearer $META_WA_ACCESS_TOKEN" | jq '.data[].status'
```

`APPROVED` sends. `PENDING` or `REJECTED` is dropped at send time — **the API
still answers 200**, which is why `sendTemplate` logs the response body on
failure rather than trusting the status code.

## When sends stop working

- **Template edited after approval** → goes back to PENDING; sends fail meanwhile.
- **Quality rating drops** (users blocking or reporting) → Meta pauses the
  template, then the number.
- **Error 131026** — "message undeliverable". Often the recipient has no
  WhatsApp, or the template category was disabled for them.
- **Free text outside the window** — accepted, never delivered, no error.

## Templates this project needs

The four booking templates, with their exact wording, samples and button
configuration: `WHATSAPP_TEMPLATES.md` in the repo root.

## Related

- SMS OTP and DLT template registration: `agent_docs/sms-otp.md`
