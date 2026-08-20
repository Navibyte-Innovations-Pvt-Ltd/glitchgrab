# WhatsApp templates to create in Meta

Submit each one in **Meta Business Suite → WhatsApp Manager → Message templates**.
Category **Utility** for all of them (not Marketing — utility templates are approved
faster and are not subject to marketing limits).

Language: **English** (`en`). If you pick `en_US` or `en_GB`, change `language.code`
in `apps/web/lib/whatsapp.ts` to match, or every send fails with a template-not-found.

---

## Why there are only four

The booking conversation itself needs **no templates**. A visitor taps
"Book on WhatsApp" and messages us first, which opens Meta's 24-hour service
window — inside it the bot can send free text and interactive pickers freely.

Templates are only needed for messages **we** start: confirmations that may land
after the window, and reminders hours or days later.

---

## How the Join button works

Three of these templates carry a **URL button** labelled *Join demo* rather than
a link in the text. On a phone a button is a target; a link inside a paragraph
is something to find first.

Meta's dynamic URL buttons are a **fixed prefix plus one variable** — you cannot
pass a whole URL. So the button is configured as:

```
Type:        Visit website
Button text: Join demo
URL type:    Dynamic
URL:         https://meet.google.com/{{1}}
Sample:      abc-defg-hij
```

The code sends only the meeting code (`abc-defg-hij`), never the full link.
Get this wrong — a Static URL, or `{{1}}` on its own — and the button either
sends everyone to the same dead meeting or fails validation.

---

## 1. `demo_confirmed`

Sent to the person who booked, right after the booking is confirmed.

- **Name:** `demo_confirmed`
- **Category:** Utility
- **Language:** English

**Body**

```
Hi {{1}}, your {{2}} demo is confirmed for {{3}}.
```

**Sample values** (Meta asks for these)

| Variable | Example |
|---|---|
| {{1}} | Rahul |
| {{2}} | PracticeStack |
| {{3}} | Tue 19 Aug, 03:00 pm |

**Button:** Visit website · *Join demo* · Dynamic · `https://meet.google.com/{{1}}` · sample `abc-defg-hij`

---

## 2. `demo_reminder`

Sent to the person who booked, about 30 minutes before the call.

- **Name:** `demo_reminder`
- **Category:** Utility
- **Language:** English

**Body**

```
Reminder: your {{1}} demo starts at {{2}}.
```

| Variable | Example |
|---|---|
| {{1}} | PracticeStack |
| {{2}} | 03:00 pm |

**Button:** Visit website · *Join demo* · Dynamic · `https://meet.google.com/{{1}}` · sample `abc-defg-hij`

---

## 3. `demo_booked_owner`

Sent to the project owner when someone books.

- **Name:** `demo_booked_owner`
- **Category:** Utility
- **Language:** English

**Body**

```
{{1}} booked a {{2}} demo for {{3}}.
```

| Variable | Example |
|---|---|
| {{1}} | Rahul |
| {{2}} | PracticeStack |
| {{3}} | Tue 19 Aug, 03:00 pm |

**No button** — this one tells you a booking happened; the call is not for hours.

---

## 4. `demo_starting_owner`

Sent to the project owner shortly before the call.

- **Name:** `demo_starting_owner`
- **Category:** Utility
- **Language:** English

**Body**

```
Your {{1}} demo with {{2}} starts at {{3}}.
```

| Variable | Example |
|---|---|
| {{1}} | PracticeStack |
| {{2}} | Rahul |
| {{3}} | 03:00 pm |

**Button:** Visit website · *Join demo* · Dynamic · `https://meet.google.com/{{1}}` · sample `abc-defg-hij`

---

## Already approved — do not recreate

`wa_otp` is reused for verifying the number on the **website** booking form.

The WhatsApp booking conversation itself sends a *Join demo* button too, but as
an interactive `cta_url` message inside the 24-hour window — no template, and no
fixed-prefix restriction, so it carries the full Meet link.
The WhatsApp path needs no OTP at all: the conversation arrives from the number,
which is what an OTP would have been proving.

---

## After they are approved

Nothing else to deploy — the code already calls them by these exact names.
To check one is live before relying on it:

```bash
curl -s "https://graph.facebook.com/v19.0/<WABA_ID>/message_templates?name=demo_confirmed" \
  -H "Authorization: Bearer $META_WA_ACCESS_TOKEN" | jq '.data[].status'
```

`APPROVED` means it will send. `PENDING` or `REJECTED` means the message is
silently dropped at send time — the API still answers 200, which is why
`sendTemplate` logs the response body on failure.

## One environment variable to add

```
META_WA_PUBLIC_NUMBER=919876543210
```

The number visitors are sent to, digits only with country code. It builds the
`wa.me` deep link shown in the booking dialog. Without it the dialog simply
omits the WhatsApp option rather than linking somewhere broken.
