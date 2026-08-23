# WhatsApp templates to create in Meta

Submit each one in **Meta Business Suite → WhatsApp Manager → Message templates**.
Category **Utility** for all of them (not Marketing — utility templates are approved
faster and are not subject to marketing limits).

Language: **English** (`en`). If you pick `en_US` or `en_GB`, change `language.code`
in `apps/web/lib/whatsapp.ts` to match, or every send fails with a template-not-found.

---

## Why there are only four booking templates

The booking conversation itself needs **no templates**. A visitor taps
"Book on WhatsApp" and messages us first, which opens Meta's 24-hour service
window — inside it the bot can send free text and interactive pickers freely.

Templates are only needed for messages **we** start: confirmations that may land
after the window, and reminders hours or days later.

---

## Four rules the Meta form enforces, learned the hard way

### 1. Variable density — roughly 20 characters of body per variable

Three variables in a 49-character body is rejected outright:

> This template has too many variables for its length. Reduce the number of
> variables or increase the message length.

This is why every body below is longer than the sentence it needs to be. The
padding is not decoration — it is what makes a three-variable template legal.
Shorten one of these and the form stops accepting it.

### 2. There is no draft-save

Leaving the Create-template page discards everything typed into it. Templates
must be filled and submitted **one at a time**; you cannot prepare all four and
submit them together.

Also: typing `{{` into the body box triggers brace auto-completion and produces
`{{1}}1}}`. Use the **+ Add variable** button, or paste the body in whole.

### 3. A body cannot start or end with a variable

> Variables can't be at the start or end of the template.

`{{1}} booked a {{2}} demo for {{3}}.` is rejected for opening on `{{1}}`, which
is why `demo_booked_owner` is prefixed with "New demo booked:". Trailing
punctuation counts as text, so a body ending `... at {{3}}.` is fine — one
ending `... at {{3}}` is not.

### 4. Editing an approved template re-enters review

An approved template can be edited — name and language are locked, everything
else is not — but the edit sends it back through Meta: it flips from Active to
In review and cannot be sent in the meantime. Get the buttons right before
submitting, and open the edit in a **second tab** if another draft is open, or
rule 2 eats it.

---

## The buttons

### Join demo — a dynamic URL button

Three of these templates carry a **URL button** labelled *Join demo* rather than
a link in the text. On a phone a button is a target; a link inside a paragraph
is something to find first.

Meta's dynamic URL buttons are a **fixed prefix plus one variable** — you cannot
pass a whole URL. So the button is configured as:

```
Type:        Visit website
Button text: Join demo
URL type:    Dynamic
URL:         https://meet.google.com/
Sample:      https://meet.google.com/abc-defg-hij
```

The URL field takes the **prefix only** — Meta appends `{{1}}` itself and shows
it as a chip beside the field. The sample field, confusingly, wants the **whole**
URL. At send time the code passes only the meeting code (`abc-defg-hij`).

Get this wrong — a Static URL, or `{{1}}` typed into the prefix — and the button
either sends everyone to the same dead meeting or fails validation.

**Untick "You direct Meta to use link tracking to report website clicks."** It is
checked by default and sends click data on client demo links to Meta.

### Reschedule — a quick reply

Meta allows quick-reply buttons **alongside** the URL button (the old rule
against mixing no longer applies; the form accepts it).

**There is deliberately no Cancel button.** Offering one invites the tap: it
sits under a message the client is already reading, and it turns "I can't make
Tuesday" into calling the whole thing off rather than moving it. Reschedule
keeps the demo alive; someone who genuinely wants out will say so, and typing
"cancel" still reaches the same handler.

Tapping a quick reply sends an inbound message to our number, which **opens the
24-hour service window** — so the bot can then run the existing date/time picker
as free interactive messages, with no further template needed. That is the whole
reason these are quick replies and not links.

The handler is built — see `agent_docs/booking-reschedule.md`. It PATCHes the
existing Google event rather than recreating it, so every *Join demo* button
already delivered stays valid.

---

## 1. `demo_confirmed`

Sent to the person who booked, right after the booking is confirmed.

- **Name:** `demo_confirmed`
- **Category:** Utility
- **Language:** English

**Body**

```
Hi {{1}}, your {{2}} demo is confirmed for {{3}}. We look forward to speaking with you.
```

**Sample values** (Meta asks for these)

| Variable | Example |
|---|---|
| {{1}} | Rahul |
| {{2}} | PracticeStack |
| {{3}} | Tue 19 Aug, 03:00 pm |

**Buttons**

- Visit website · *Join demo* · Dynamic · `https://meet.google.com/` · sample `https://meet.google.com/abc-defg-hij`
- Quick reply · *Reschedule*

---

## 2. `demo_reminder`

Sent to the person who booked, about 30 minutes before the call.

- **Name:** `demo_reminder`
- **Category:** Utility
- **Language:** English

**Body**

```
Reminder: your {{1}} demo starts at {{2}}. Tap below to join, or reschedule if you cannot make it.
```

| Variable | Example |
|---|---|
| {{1}} | PracticeStack |
| {{2}} | 03:00 pm |

**Buttons**

- Visit website · *Join demo* · Dynamic · `https://meet.google.com/` · sample `https://meet.google.com/abc-defg-hij`
- Quick reply · *Reschedule*

The reminder is the moment someone realises they cannot make it, so it carries
the same Reschedule button as the confirmation.

---

## 3. `demo_booked_owner`

Sent to the project owner when someone books.

- **Name:** `demo_booked_owner`
- **Category:** Utility
- **Language:** English

**Body**

```
New demo booked: {{1}} booked a {{2}} demo for {{3}}. The details are on your Glitchgrab dashboard.
```

The "New demo booked:" prefix is not decoration — a body may not open on a
variable (rule 3).

| Variable | Example |
|---|---|
| {{1}} | Rahul |
| {{2}} | PracticeStack |
| {{3}} | Tue 19 Aug, 03:00 pm |

**No buttons** — this one tells you a booking happened; the call is not for hours.

---

## 4. `demo_starting_owner`

Sent to the project owner shortly before the call.

- **Name:** `demo_starting_owner`
- **Category:** Utility
- **Language:** English

**Body**

```
Your {{1}} demo with {{2}} starts at {{3}}. Tap below to join the call.
```

| Variable | Example |
|---|---|
| {{1}} | PracticeStack |
| {{2}} | Rahul |
| {{3}} | 03:00 pm |

**Button:** Visit website · *Join demo* · Dynamic · `https://meet.google.com/` · sample `https://meet.google.com/abc-defg-hij`

No quick replies — an owner who needs to move a call does it from the dashboard,
and giving the owner path its own reschedule branch doubles the handler's work
for no gain.

---

# Daily digest templates (issue #322)

Two more, unrelated to booking: the morning nudge and the evening wrap that tell
an admin where their backlog actually is. **The code that sends them is already
merged and deliberately inert** — both crons return early until
`WHATSAPP_DIGEST_ENABLED=true` is set, so nothing sends until these two are
Active and you flip the flag.

Do **not** edit the existing `daily_issue_reminder` to add the breakdown. Editing
an approved template sends it back into review and it cannot send meanwhile
(rule 4) — that is why these are new names, and why the old reminder keeps
running until the flag is flipped.

## 5. `daily_issue_digest`

Sent 08:00 IST to anyone who owns an org or has issues assigned to them. One
message covers both hats: the person is usually admin *and* developer, and two
separate messages to the same human every morning is what this replaces.

- **Name:** `daily_issue_digest`
- **Category:** Utility
- **Language:** English

**Body**

```
☀️ Good morning {{1}}! Across {{2}} there are {{3}} open issue(s) waiting. Where they sit: {{4}}. On your own plate: {{5}}. Pick one and close it today — and if you are on leave, tap Skip today.
```

| Variable | Example |
|---|---|
| {{1}} | Naresh |
| {{2}} | Navibyte Innovations |
| {{3}} | 87 |
| {{4}} | practicestacks 32, abhyasika 18, glitchgrab 12, +3 more |
| {{5}} | 6 assigned to you |

**Buttons**

- Visit website · *Open dashboard* · Dynamic · `https://glitchgrab.dev/` · sample `https://glitchgrab.dev/org/Navibyte-Innovations-Pvt-Ltd`
- Quick reply · *Skip today*

The suffix carries **no query string** — `?triageAssign=assigned` would be a
nicer landing, but a `?…=…` inside a dynamic-URL variable is the kind of thing
the review form bounces, and a rejection costs a review cycle. The org page opens
unfiltered instead.

{{4}} is one flat comma-separated line rather than the bullet list it wants to
be: Meta rejects any parameter containing a newline, a tab, or four consecutive
spaces with error 132018. `formatBreakdown` in `apps/web/lib/digest.ts` builds it
and is unit-tested for exactly that.

## 6. `evening_recap`

Sent 19:00 IST, and **only on a day where something actually closed**. A nightly
"0 issues closed today" is a guilt message, and the fastest route to someone
muting the digest for good.

- **Name:** `evening_recap`
- **Category:** Utility
- **Language:** English

**Body**

```
🌙 Evening wrap for {{1}} — {{2}} issue(s) closed today across {{3}}. Still open: {{4}}, and {{5}} of those sit with you. Good work today, rest up. Tap Skip today if tomorrow is off.
```

| Variable | Example |
|---|---|
| {{1}} | Naresh |
| {{2}} | 4 |
| {{3}} | Navibyte Innovations |
| {{4}} | 83 |
| {{5}} | 6 |

**Buttons**

- Visit website · *Open dashboard* · Dynamic · `https://glitchgrab.dev/` · sample `https://glitchgrab.dev/org/Navibyte-Innovations-Pvt-Ltd`
- Quick reply · *Skip today*

### Skip today, and why the label matters

A template quick reply carries **no payload of its own** — Meta echoes the
button's label back to the webhook, and which field it lands in differs between a
template button and an interactive one. The handler reads all four fields and
matches on intent, so the label may be re-worded, but it must still *read* as
skipping ("Skip today", "Not today", "On leave"). Rename it to something like
"Later" and the tap arrives and is silently ignored.

Typing works too and needs no button: "on leave", "day off", "don't message me
today", or a bare "leave" all mute the rest of the day. "RESUME" turns them back
on early. A reply to us opens the 24-hour window, so the confirmation that comes
back is free text and needs no template of its own.

Muting is **until midnight IST**, so the nudges resume by themselves tomorrow —
except for a reply arriving after 18:00 IST, which carries through the whole of
the next day (the evening message has already gone out, so "the rest of today"
would mute nothing at all).

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

The bodies here are longer than the ones the code was written against, but the
variable **count and order are unchanged**, so `sendTemplate` needs no edit.

To check one is live before relying on it:

```bash
curl -s "https://graph.facebook.com/v19.0/<WABA_ID>/message_templates?name=demo_confirmed" \
  -H "Authorization: Bearer $META_WA_ACCESS_TOKEN" | jq '.data[].status'
```

`APPROVED` means it will send. `PENDING` or `REJECTED` means the message is
silently dropped at send time — the API still answers 200, which is why
`sendTemplate` logs the response body on failure.

## Environment variables to add

```
META_WA_PUBLIC_NUMBER=919876543210
WHATSAPP_DIGEST_ENABLED=true
```

`WHATSAPP_DIGEST_ENABLED` is the handover switch for the two digest templates
above. Leave it unset until both report `APPROVED`; setting it turns on
`cron/daily-digest` + `cron/evening-recap` and silences the old
`cron/daily-reminder` in the same move, so nobody ever gets two morning messages.

`META_WA_PUBLIC_NUMBER` is the number visitors are sent to, digits only with
country code. It builds the `wa.me` deep link shown in the booking dialog.
Without it the dialog simply omits the WhatsApp option rather than linking
somewhere broken.
