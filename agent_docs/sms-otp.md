# SMS OTP (Msg91) and how to register a template

`apps/web/lib/sms.ts` sends one-time codes over SMS. Used by demo booking to
verify a prospect's number before anything reaches the owner's calendar.

## The message body is configuration, not copy

The wording lives in `SMS_OTP_TEMPLATE`, paired with `SMS_DLT_TE_ID` — the id of
the DLT template it was registered against.

**How strictly DLT enforces the match varies, and it is worth testing rather
than assuming.** PracticeStack's `sms-service.ts` carries a comment saying a
reworded brand stopped arriving for them. Tested on this account on
2026-08-20 — swapping "My Abhyasika" for "Glitchgrab" in the same sentence
structure **still delivered**. So this route is not enforcing strict matching
today.

Two things follow:

- Keep the sentence *structure* close to the registered template. Enforcement is
  applied per operator and can start without notice.
- The failure mode is **silent**: Msg91 returns a success id whether the operator
  delivers or drops it. Never conclude an SMS worked from the API response —
  only from a handset.

The durable fix is a Glitchgrab template with its own id, below.

## Environment

```
NEXT_OTP_AUTH_KEY   Msg91 auth key
SMS_SENDER_ID       6-character sender id, e.g. bPRlNT — also registered on DLT
SMS_DLT_TE_ID       the registered template's id
SMS_OTP_TEMPLATE    the exact registered wording, with {otp} where the code goes
```

All four must be present or `smsConfigured()` returns false and the caller falls
back to WhatsApp. `{otp}` is required — the code refuses to send a message with
no code in it, which would still cost money and still count against the
template.

## Registering a new template

The booking OTP currently sends Glitchgrab wording against a template id
registered by another brand. It delivers today, but it is borrowed. To put it on
its own footing:

1. **DLT portal** (Jio/Airtel/Vi — whichever your principal entity is registered
   with). Log in with the entity that owns the sender id.
2. **Content Template → Add**. Category **Service Implicit** for OTPs.
3. Enter the message with variables as `{#var#}`:
   ```
   Your Glitchgrab demo code is {#var#}. Valid for 10 minutes. Do not share it.
   ```
   Fixed text must be *exactly* what you intend to send. Approval takes anywhere
   from a few hours to a couple of days.
4. Once approved, copy the **Template ID** (a 19-digit number).
5. Update both env vars together, everywhere the app runs:
   ```
   SMS_DLT_TE_ID="<new 19-digit id>"
   SMS_OTP_TEMPLATE="Your Glitchgrab demo code is {otp}. Valid for 10 minutes. Do not share it."
   ```
   Note `{otp}` in our env where DLT shows `{#var#}` — ours is the placeholder
   `lib/sms.ts` substitutes; DLT's is what the operator matches against.
6. Send one real code to your own phone and **confirm it arrives**. Msg91
   answering `ok` proves nothing; only the handset does.

## Reading a failure

Msg91's legacy endpoint answers HTTP 200 for failures too — a dead auth key
comes back as `{"msg":"303","msgType":"error"}` with a healthy status code.
`lib/sms.ts` inspects the body, not the status, and logs the raw response when
it rejects.

A send that is accepted but never arrives is almost always DLT: the wording
drifted from the registered template, or the template was rejected after
registration.

## Related

- WhatsApp templates (a separate approval system, Meta's): `WHATSAPP_TEMPLATES.md`
