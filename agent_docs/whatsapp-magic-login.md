# Auto-login from a WhatsApp button

The digest's **Open dashboard** button signs the person in and drops them on
their org page. One tap, no GitHub round trip.

Ported from PracticeStacks (`apps/web/lib/magic-login.ts` there); the constraints
below are the ones that cost time in both codebases.

## The pieces

| File | Role |
|---|---|
| `lib/magic-login.ts` | Mints the token, packs it into the button variable, guards the redirect target |
| `lib/auth.ts` | `magic-token` credentials provider — the only thing that spends a token |
| `app/magic-link/[token]/page.tsx` | Where the button lands |
| `proxy.ts` | Skips signed-in visitors, repairs the encoded spelling |
| `prisma` `LoginToken` | Single-use, 48h, `usedAt` |

## Security model

Every point is load-bearing:

- **Bearer credential.** Whoever holds the link is that user. It is minted
  server-side only and delivered ONLY to the WhatsApp number already verified on
  that account. There is no endpoint that mints one for an arbitrary user.
- **Single-use, claimed atomically.** `updateMany` scoped to
  `usedAt: null, expiresAt: { gt: now }`, then `count === 1`. Read-then-write
  would let two taps arriving together both pass — for a link sitting in a chat
  thread, that is not theoretical.
- **48-hour TTL.** Long enough to survive "I'll look tonight", dead before the
  digest after next.
- **Rate limited** to 40 per user per hour, so a bug in a cron loop cannot mint
  hundreds.
- **Redirect target is validated.** The destination rides in the URL, so it is
  attacker-supplied. `safeTargetPath` allows same-site paths only. `//evil.com`
  is the one that gets missed — no scheme, but browsers treat it as absolute,
  and an auto-login open redirect arrives already authenticated.
- **Signed-in visitors never spend a token.** `proxy.ts` redirects them first.

## Why the destination is base64 in the path

A Meta URL button is a **fixed prefix plus one variable**, and Meta
percent-encodes special characters in that value. So this cannot work:

```
<token>?next=/org/Navibyte      →  <token>%3Fnext%3D%2Forg%2FNavibyte
```

The `?` and `=` become literal path characters. Instead:

```
<token>.<base64url(targetPath)>
```

Every character in the result (`A–Z a–z 0–9 - _ .`) survives verbatim. The `.`
cannot appear inside a UUID or a base64url body, so splitting on the first one is
unambiguous.

## Never send an empty button parameter

A template approved WITH a dynamic URL button is rejected outright when the
parameter is missing:

```
(#131008) Required parameter is missing
```

That loses the **whole message**, not just the button. So `magicButtonSuffix`
falls back to a plain path when no token could be minted — one extra tap, versus
no digest at all. PracticeStacks found this in production when a rate limit
tripped and every digest send died with it.

## The unverified bit: does Meta keep the slash?

Our button prefix is `https://glitchgrab.dev/`, so the variable we send contains
a `/` — `magic-link/<token>.<dest>`. Whether Meta percent-encodes that slash is
**not verified**. The older `daily_issue_reminder` button has been passing a
path with a slash for months, but nothing here proves a click ever resolved.

`proxy.ts` therefore accepts both spellings and redirects `/magic-link%2F…` to
`/magic-link/…`. Once a real click is observed, check which arrived — if the
slash survives, the repair branch is dead code and can go.

## Changing a template is NOT needed to change where the button goes

The template stores only the **prefix**. The suffix is a runtime variable the
sending code supplies, so the destination can change freely without touching an
approved template — no re-review, no send outage. Editing the template would
cost a review cycle for nothing (`WHATSAPP_TEMPLATES.md` rule 6).
