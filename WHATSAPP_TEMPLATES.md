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

## Six rules the Meta form enforces, learned the hard way

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

### 4. A friendly Utility template gets reclassified as Marketing

The first `daily_issue_digest` draft opened with "☀️ Good morning {{1}}!" and
closed with "Pick one and close it today". On Submit, Meta answered:

> **Category does not match.** To make sure that your message template gets
> approved, please choose a category that matches the content in this template.
> … This message template will be rejected.

Marketing was pre-selected as *Recommended*. The content was pure account
status — a count of open issues — but the **register** was promotional:
greeting, encouragement, emoji. The classifier reads tone, not just facts.

Utility wording has to sound like a bank statement, not a coach:

| Rejected as Marketing | Accepted as Utility |
|---|---|
| ☀️ Good morning Naresh! | Issue status update for Naresh. |
| there are 87 open issue(s) waiting | your account currently has 87 open issue(s) |
| Where they sit: … | Breakdown by repository: … |
| On your own plate: … | Assigned to you: … |
| Pick one and close it today | Open your dashboard to review them |

Do not click **Continue** past that dialog. Continuing submits it anyway and it
comes back rejected, which costs a review cycle. Cancel, reword, resubmit.

### 5. Bold and line breaks are allowed — but not around a middle dot

The body may use WhatsApp's own markup (`*bold*`, `_italic_`, `~strike~`) and
real line breaks. Both matter here: a five-variable paragraph is a wall of text
on a phone, and the whole point of the digest is that the numbers are findable
in a glance.

One trap. This renders as **literal asterisks**, not bold:

```
*Issue update · {{1}}*
```

This renders bold:

```
*Issue update for {{1}}*
```

The middle dot (`·`) breaks the parser. Check the live preview panel after every
wording change — it renders the markup exactly as the phone will, and a broken
bold shows up there immediately.

Line breaks in the **body** are fine. Line breaks in a **parameter** are not —
Meta rejects those with error 132018, which is why `formatBreakdown` builds one
flat comma-separated line.

### 6. Editing an approved template re-enters review

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
(rule 6) — that is why these are new names, and why the old reminder keeps
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
*Issue update for {{1}}*

*{{2}}* has *{{3}}* open issue(s).
By repo: {{4}}
Assigned to you: *{{5}}*

Tap Show details for every repo, Open dashboard for the full view, or Skip today to pause.
```

Renders as:

> **Issue update for Naresh**
>
> **Navibyte Innovations** has **87** open issue(s).
> By repo: practicestacks 32, abhyasika 18, glitchgrab 12, +3 more
> Assigned to you: **6**
>
> Tap Show details for every repo, Open dashboard for the full view, or Skip today to pause.

| Variable | Example |
|---|---|
| {{1}} | Naresh |
| {{2}} | Navibyte Innovations |
| {{3}} | 87 |
| {{4}} | practicestacks 32, abhyasika 18, glitchgrab 12, +3 more |
| {{5}} | 6 |

**Buttons**

- Visit website · *Open dashboard* · Dynamic · `https://glitchgrab.dev/` · sample `https://glitchgrab.dev/magic-link/00000000-0000-0000-0000-000000000000.L29yZy9OYXZpYnl0ZS1Jbm5vdmF0aW9ucy1QdnQtTHRk`
- Quick reply · *Skip today*
- Quick reply · *Show details*

That sample is a **fake** token (all zeros) plus the base64url of
`/org/Navibyte-Innovations-Pvt-Ltd`. At send time the code supplies a real
single-use token, so the button opens the dashboard already signed in — see
`agent_docs/whatsapp-magic-login.md`.

The suffix carries **no query string**: a `?…=…` inside a dynamic-URL variable
gets percent-encoded into literal path characters, which is exactly why the
destination is base64'd into the same segment as the token.

**The sample does not control where the button goes.** Meta stores only the
prefix; the suffix is a runtime variable. Changing the destination therefore
needs no template edit — and editing an approved template to "fix" the sample
costs a review cycle for nothing (rule 6).

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
*Daily summary for {{1}}*

*{{2}}* issue(s) closed today in *{{3}}*.
Still open: {{4}}
Assigned to you: {{5}}

Tap Show details for every repo, Open dashboard for the full view, or Skip today to pause.
```

| Variable | Example |
|---|---|
| {{1}} | Naresh |
| {{2}} | 4 |
| {{3}} | Navibyte Innovations |
| {{4}} | 83 |
| {{5}} | 6 |

**Buttons**

- Visit website · *Open dashboard* · Dynamic · `https://glitchgrab.dev/` · sample `https://glitchgrab.dev/magic-link/00000000-0000-0000-0000-000000000000.L29yZy9OYXZpYnl0ZS1Jbm5vdmF0aW9ucy1QdnQtTHRk`
- Quick reply · *Skip today*
- Quick reply · *Show details*

### Show details — the free in-chat breakdown

The digest's `{{4}}` collapses to "+3 more" because a template parameter has a
length the review form polices. **Show details** is where the rest of it lives:
tapping it replies in the same chat with every repo and its count, untruncated,
plus the totals and a dashboard link.

That reply is **free text and costs nothing**. The tap is an inbound message,
which opens Meta's 24-hour service window — inside it we send without a template,
and Meta stopped billing service messages in November 2024. Only the digest
itself (a business-initiated Utility template) is billed. Worth re-checking on
your own WhatsApp billing page; Meta has revised that model before.

What comes back:

> **Open issues — Navibyte Innovations**
>
> practicestacks — **32**
> abhyasika — **18**
> glitchgrab — **12**
>
> Total: **62**
> Assigned to you: **6**
>
> Full view: https://glitchgrab.dev/org/Navibyte-Innovations-Pvt-Ltd

Capped at 60 repos so it cannot exceed WhatsApp's 4096-character limit and get
dropped whole; past that it says "and N more repos not listed" rather than
truncating silently. Typing "details", "breakdown" or "repo wise" does the same
thing without the button.

It deliberately ignores a mute. A mute silences what we send unprompted, not an
answer to a question the person just asked.

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
