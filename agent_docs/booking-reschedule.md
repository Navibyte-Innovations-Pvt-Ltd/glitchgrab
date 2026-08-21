# Reschedule and cancel over WhatsApp

A client who cannot make a demo taps **Reschedule** or **Cancel** on the
confirmation or reminder message. Both are quick-reply buttons on the
`demo_confirmed` / `demo_reminder` templates — see `WHATSAPP_TEMPLATES.md`.

## Why quick replies and not links

Tapping one sends an inbound message to our number, which opens Meta's 24-hour
service window. Inside that window the bot can send free text and native
pickers, so the whole move runs on the **existing** date/time picker with no
extra template and no OTP — the tap came from the number, which is what an OTP
would have proved.

## The flow

```
tap Reschedule ─→ webhook ─→ handleBookingAction("reschedule")
                                   │
                     0 upcoming ────┴──→ "no demos booked"
                     1 upcoming ────┬──→ beginReschedule()  → askDate → askTime
                     2+ upcoming ───┴──→ list picker (b:r:<id>) → beginReschedule()
                                                                       │
                                                     time tapped ──────┴──→ confirm()
                                                                       │
                                                    rescheduleId set ──┴──→ applyReschedule()
```

`Cancel` is the same shape, but goes through a **Yes/Keep confirmation** first
(`askCancelConfirm`) — one stray tap in a chat app must not destroy a real
client call.

**No template carries a Cancel button, by choice.** A button under a message the
client is already reading invites the tap, and turns "I can't make Tuesday" into
calling the whole thing off instead of moving it. The handler stays reachable by
*typing* "cancel", which is what someone who actually wants out will do. Do not
add the button back without deciding that trade again.

## `WhatsappThread.rescheduleId` is the discriminant

The pickers are shared between booking and rescheduling. Without a marker,
`confirm()` cannot tell the two apart and a move would create a *second* demo
while leaving the original on the calendar.

It is cleared in three places, and all three matter:
- when the move completes (`applyReschedule`)
- when a fresh booking completes (`confirm`)
- when the thread restarts — someone abandoning a half-finished move and saying
  "book" must not have their next booking patch the old demo

## Everything that carries the old time has to move

Updating `Booking` alone is the bug this is written to avoid:

| Row | Why |
|---|---|
| `Booking.startsAt/endsAt` | the record itself |
| Google event (PATCH) | **never** delete-and-recreate — see below |
| `Meeting.startsAt/endsAt` | what the recorder bot is dispatched from |
| `Booking.reminderSentAt` → null | or the new time gets no reminder |

### PATCH, never recreate

The Meet link lives on the calendar event. Recreating mints a new room, and
every *Join demo* button already delivered — confirmation, reminder, calendar
invite — silently points at a dead meeting. `patchCalendarEvent` sends only
start and end; including `conferenceData` risks detaching the room.

### Cancel must kill the `ScheduledRecording`

`syncCalendar` only upserts events Google still returns — it never removes a row
for one that vanished. Cancel therefore marks the row `SKIPPED` by hand, or the
recorder bot is still dispatched and joins a meeting that no longer exists.

## Gotchas

1. **The tap carries no booking id.** Meta quick replies return only their own
   label, so the booking is resolved from the phone number: future `CONFIRMED`
   bookings only, and a picker when there is more than one.
2. **Never route the tap through `handleBookingMessage` as text.** "Reschedule"
   matches no picker id, is not a restart word, and falls through to
   `askProject` — starting a brand new booking. That is why
   `handleBookingAction` is a separate entry point.
3. **The label may arrive in any of four fields.** `button.payload`,
   `button.text`, `interactive.button_reply.id`, `interactive.button_reply.title`
   — which one depends on whether it was a template button or an interactive
   reply button. The webhook reads all four, because guessing wrong fails
   *silently*: the loop finds nothing to do and answers 200.
4. **Name and email come from the `Booking`, not from `Client`.**
   `Booking.clientId` is nullable, so a website booker may have no `Client` row —
   seeding from it would stop mid-move to ask a returning customer their name.
5. **Both writes can lose a race.** The partial unique index
   `(repoId, startsAt) WHERE status IN ('PENDING','CONFIRMED')` fires on the
   reschedule UPDATE exactly as it does on the create. Caught and re-offered.
6. **Never look a booking up by id alone.** Every lookup driven by a reply id is
   `findFirst({ where: { id, phone } })`. The webhook signature proves the
   message came from Meta, *not* that the id inside it is one we ever sent — a
   crafted client echoing `cc:<someone else's booking>` would otherwise cancel a
   stranger's call, or pull their name and email into the attacker's thread. The
   scope is checked before any calendar mutation or thread write.
7. **Cancel bails before marking the row.** A booking marked `CANCELLED` with
   the Google event still standing is the worst of both: the owner keeps a call
   nobody attends and the client believes it is off.

## Not built

- Reschedule from the owner's side — owners move a call from the dashboard, and
  giving the owner path its own branch doubles the handler for no gain.
- Reschedule from the website booking dialog. Only WhatsApp has an entry point.
