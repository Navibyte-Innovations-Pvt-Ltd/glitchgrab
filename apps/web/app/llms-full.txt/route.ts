import { readFile } from "node:fs/promises";
import path from "node:path";

export const revalidate = 3600;

const BASE_URL = "https://glitchgrab.dev";

export async function GET() {
  const baseLlms = await readFile(
    path.join(process.cwd(), "public", "llms.txt"),
    "utf-8"
  ).catch(() => "");

  const fullDoc = [
    baseLlms.trim(),
    "",
    "## SDK Quick Start",
    "",
    "```bash",
    "npm install glitchgrab",
    "```",
    "",
    "```tsx",
    'import { GlitchgrabProvider } from "glitchgrab";',
    "",
    "export default function RootLayout({ children }) {",
    '  return <GlitchgrabProvider token="gg_your_token">{children}</GlitchgrabProvider>;',
    "}",
    "```",
    "",
    "## API Reference",
    "",
    "### SDK Endpoints (Bearer token auth)",
    `- POST ${BASE_URL}/api/v1/sdk/report — Submit bug report`,
    `- GET  ${BASE_URL}/api/v1/sdk/reports — Fetch reports for a repo`,
    `- GET  ${BASE_URL}/api/v1/repos/github — List user GitHub repos`,
    "",
    "### Dashboard Endpoints (session auth)",
    `- POST ${BASE_URL}/api/v1/reports — Submit report from dashboard`,
    `- GET  ${BASE_URL}/api/v1/repos — List connected repos`,
    "",
    "## Report Sources",
    "",
    "| Source | Description |",
    "|--------|-------------|",
    "| SDK_AUTO | Unhandled JS error captured automatically in production |",
    "| SDK_USER_REPORT | End-user clicked the ReportButton — bypasses AI |",
    "| DASHBOARD_UPLOAD | Developer submitted from the web dashboard |",
    "| MCP | Submitted via Claude Desktop MCP integration |",
    "| COLLABORATOR | Submitted by a collaborator with limited access |",
    "",
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  return new Response(fullDoc, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
