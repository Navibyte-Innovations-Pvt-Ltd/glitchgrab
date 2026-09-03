# The HTTP MCP server (`/api/mcp`)

There are **two** MCP servers in this repo and they are not the same thing:

| | `packages/mcp-server` | `apps/web/app/api/mcp` |
|---|---|---|
| Transport | stdio, installed as an npm package | HTTP, part of the deployed app |
| Reaches | Claude Desktop | any HTTP MCP client, Claude Code included |
| Ships on | an npm release | every Vercel deploy |

This doc is about the second one. Adding a tool there needs no release — it is
live the moment `apps/web` deploys.

## Auth

Three ways in, checked in this order:

0. **OAuth 2.1 access token** — the custom-connector path. Any `Authorization:
   Bearer` value that does *not* start with `gg_` is tried here. Resolves to
   `{ userId, repoId: null }`: an OAuth grant covers every repo the user owns,
   so each tool re-checks ownership rather than relying on a pinned repo.


1. **`Authorization: Bearer gg_…`** — a repo `ApiToken`, SHA-256 compared
   against `ApiToken.tokenHash`, the same token the SDK posts reports with.
   Resolves to `{ userId, repoId }`, so the caller is pinned to exactly one
   repo. Expired tokens are rejected; `lastUsed` is touched best-effort.
2. **NextAuth session cookie** — the dashboard. Resolves to
   `{ userId, repoId: null }`, so the caller can reach any repo they own but
   must name one.

The Bearer branch is what makes the server usable by an agent at all. Before it
existed the route was cookie-only, so every tool on it was unreachable outside
a browser — an MCP client sends no cookie and gets a bare 401 with no OAuth
discovery metadata to negotiate against.

## Connecting Claude Code

### The connector flow (no token to copy)

```bash
claude mcp add --transport http glitchgrab https://glitchgrab.dev/api/mcp
```

No header, no token. The first call gets a 401 carrying `WWW-Authenticate`,
Claude Code follows the discovery chain, registers itself, opens a browser at
the consent screen, and you press **Approve**. Add `--scope user` to have it in
every project.

What happens under the hood, and what breaks if a piece is missing:

| Step | Endpoint | Missing → |
|---|---|---|
| 401 names the metadata URL | `WWW-Authenticate` on `/api/mcp` | client gives up; 401 is terminal |
| Resource metadata | `/.well-known/oauth-protected-resource` | no way to find the auth server |
| AS metadata | `/.well-known/oauth-authorization-server` | no endpoints to talk to |
| Client registration | `POST /api/oauth/register` | user must hand-register a client |
| Consent | `GET /oauth/authorize` | nothing to approve |
| Code → token | `POST /api/oauth/token` | no access token |

The `/.well-known/*` paths are **rewrites** to handlers under `/api/oauth/`
(see `next.config.ts`). Both the bare and the `/api/mcp`-suffixed variants are
served, because clients disagree about which one to request.

### Security properties worth not regressing

- **PKCE S256 only.** `plain` makes the verifier equal the challenge, which
  defeats the point for a public client.
- **Redirect URIs match exactly**, never by prefix, and a bad one renders an
  error page rather than redirecting — redirecting to an unvalidated URI *is*
  the open-redirect bug.
- **Codes are single-use** via `updateMany` scoped to `usedAt: null` plus a
  count check. Read-then-write lets two simultaneous redemptions both pass.
- **Refresh tokens rotate** on every use; the presented one is revoked. OAuth
  2.1 requires this for public clients — without it a leaked refresh token is a
  permanent credential.
- **Audience is validated** on every MCP call (RFC 8707). A token minted for a
  different resource is rejected even though this server issued it; that is the
  confused-deputy mitigation the MCP spec calls out.
- Codes live 60s, access tokens 1h, refresh tokens 30d.
- Tokens are stored as SHA-256 only, same as `ApiToken`.

### The manual token path (CI, headless)

Still supported, and the only option where no browser exists. Get one from
**`/org/<slug>/tokens` → New token**, scoped to one repo:

```bash
claude mcp add --transport http glitchgrab https://glitchgrab.dev/api/mcp \
  --header "Authorization: Bearer gg_your_token_here"
```

A `gg_` token pins one repo, so it can never comment on another.

## Tools

Beyond the repo/report/GSC tools, three cover the issue workflow end to end —
read the thread, upload the pictures, post the reply:

### `create_image_upload_url`

Returns `{ uploadUrl, publicUrl, expiresInSeconds }` for one image. The caller
uploads the bytes itself:

```bash
curl -X PUT -H "Content-Type: <the exact contentType you passed>" \
  --data-binary @shot.png "<uploadUrl>"
```

`publicUrl` 404s until that PUT lands.

The `Content-Type` header must match the `contentType` argument **byte for
byte** — it is part of what gets signed, so a case difference or an added
charset suffix returns `403 SignatureDoesNotMatch`. The tool result hands back a
ready-made `uploadWith` command with the value already filled in; use that
rather than retyping the header.

Deliberately **not** base64-over-JSON. An agent would otherwise have to read the
file and emit ~600KB of base64 into its own context per screenshot; a handful of
shots would cost more context than the work being described.

Two constraints worth not breaking:

- **The key stays under `screenshots/`.** That is the one prefix the
  `cdn.glitchgrab.dev` distribution is proven to serve publicly — every SDK bug
  report writes there. A fresh prefix can land in the bucket and still 404 at
  the CDN, which is exactly the broken-image failure this path exists to avoid.
- **`publicUrl` is the CDN host, never the S3 origin.** The bucket is not
  public-read, so a signed origin URL 403s once the signature expires.

### `get_issue`

Reads one issue: title, body, state, labels, author, and comment bodies.
`commentLimit` defaults to 30, caps at 100, and `0` skips comments entirely.

The body is the point — that is where a reporter's screenshot and repro steps
live. `lib/github.ts` already had `getGitHubIssue`, but it returns only a comment
*count*, which tells you a thread is busy and nothing about what it says;
`getGitHubIssueDetail` is the one this tool uses.

Pull requests return "not found" on purpose. GitHub serves PRs from the issues
endpoint too, and a PR is not a bug report.

### `comment_on_issue`

Posts markdown on an issue **as the Glitchgrab GitHub App** — the same identity
that files the issues, so a fix note lands in the thread under the same author.
Needs the App installed on that repo with issue write; the error says so by name
when it is not.

Both issue tools share `resolveIssueRepo`, so they are scoped identically: a
Bearer token pins one repo outright, and any other caller is limited to
`visibleRepoWhere`. Neither path lets a caller name an arbitrary `owner/name`
and have it acted on, and a caller with no pinned repo must name one rather than
falling through to whichever repo happens to match first.

Does not close or reopen — commenting only.

## Why this matters for private repos

GitHub renders images in issue comments through a proxy that cannot
authenticate. So on a **private** repo:

- `raw.githubusercontent.com` links → broken images
- committing PNGs to a branch → broken images
- GitHub's own `user-attachments` upload → needs a browser session, not
  available to a PAT or `gh`

A public CDN URL is the only one of these that renders. That is the whole reason
`create_image_upload_url` exists.
