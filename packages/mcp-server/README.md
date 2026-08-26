# @glitchgrab/mcp-server

The project, addressable by a coding agent.

An agent in an editor has the code and nothing else. This gives it the other
half — what is already reported, what the team calls things, and a way to file
what it finds without leaving the editor.

## Setup

Create a token in the dashboard (**API Tokens** → the repo you want), then add
the server to your MCP client.

Claude Code:

```bash
claude mcp add glitchgrab --env GLITCHGRAB_TOKEN=gg_… -- bunx @glitchgrab/mcp-server
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "glitchgrab": {
      "command": "bunx",
      "args": ["@glitchgrab/mcp-server"],
      "env": { "GLITCHGRAB_TOKEN": "gg_…" }
    }
  }
}
```

`GLITCHGRAB_BASE_URL` overrides the API host (default `https://glitchgrab.dev`);
point it at `http://localhost:3000` to work against a dev server.

## Tools

| Tool | What it does |
|---|---|
| `list_open_issues` | Open issues on the repo, numbers and titles. `query` ranks the list. |
| `get_project_context` | The repo's `GLITCH.md` brief — roles, areas, glossary, known limitations, do-not-report — plus dashboard notes. |
| `list_reports` | Reports already filed: what the reporter typed, which page they were on. |
| `report_bug` | Files a report. Pass `existing_issue` to comment on an issue instead of opening a duplicate. |

## The two rules this is built on

**The repo comes from the token.** No tool takes a project, an owner, or a repo
id. One token is one repo, so an agent cannot aim a report at a project it was
not given — not by being wrong, and not by being talked into it by something it
read in a file it was summarising.

**No privileged path.** `report_bug` posts to the same `/api/v1/sdk/report` the
SDK posts to, and lands in the same deterministic build-body → S3 → GitHub
pipeline with the same dedup and the same rate limit. Nothing here can create an
issue a person could not have created by typing.

Reports filed this way are stored with `source: MCP` and a reporter name that
says so, so a maintainer can always tell a machine's report from a person's.

## What it deliberately does not do

Write to the repo. No commits, no branches, no pull requests. An agent that can
both diagnose and silently rewrite is a different product with a different trust
story; this one reports.

## Development

```bash
bun run dev    # run from source over stdio
bun run build  # dist/index.js
```
