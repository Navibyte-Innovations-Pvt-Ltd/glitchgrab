import { getInstallationAccessToken } from "@/lib/github-app";
import { prisma } from "@/lib/db";

/**
 * GLITCH.md — the project's brief for the report assistant.
 *
 * CLAUDE.md tells a coding agent how the code works. GLITCH.md tells the
 * reporter who the people are and what the things on screen are called: the
 * roles that file reports, the areas of the product, the words the team uses
 * for them, what is known-broken, and what nobody wants reported.
 *
 * It lives in the repo rather than in our database on purpose. The names of
 * things change in the same pull request that changes the things, and a brief
 * that is reviewed alongside the code stays true; one edited in a dashboard
 * six months ago quietly stops being true and nobody notices.
 *
 * Parsed by heading rather than pasted whole, because this rides in a turn
 * somebody is waiting on. A 300-line brief must not spend the budget the
 * screenshot needs.
 */

/** Where teams actually put it. First hit wins. */
const CANDIDATE_PATHS = ["GLITCH.md", "glitch.md", ".github/GLITCH.md", "docs/GLITCH.md"];

/** A brief is a page, not a manual — beyond this it is not being maintained. */
const MAX_FILE_BYTES = 24_000;
/** Per section, so one runaway heading cannot crowd out the others. */
const MAX_SECTION_CHARS = 1_500;
/** Guides carry actual steps, so they get more room than a glossary line. */
const MAX_GUIDE_CHARS = 3_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface GlitchBrief {
  /** What the product is, in two lines. Without it the assistant infers the
   *  domain from a screenshot, which is how "compliance" becomes "a form". */
  product?: string;
  /** Who files reports on this project and what each of them can see. */
  roles?: string;
  /** The real models and the words for them — lead, proposal, executor. */
  entities?: string;
  /**
   * How the common tasks are actually done, and the workaround for each known
   * issue. The section that lets the assistant answer instead of file: someone
   * whose problem already has an answer should leave with the answer, not with
   * a ticket number.
   */
  guides?: string;
  /** The parts of the product, in the team's own names. */
  areas?: string;
  /** Words that mean something specific here. */
  glossary?: string;
  /** Already known and being worked on — reporting it again helps nobody. */
  knownLimitations?: string;
  /** Explicitly out of scope for reports. */
  dontReport?: string;
  /** Anything under a heading we do not recognise, kept short. */
  other?: string;
}

const cache = new Map<string, { brief: GlitchBrief | null; expiresAt: number }>();

/**
 * Which field a heading maps to.
 *
 * Matched loosely — "## Roles", "## roles & permissions", "## Who reports" all
 * land on `roles`. A team that gets the wording slightly wrong should still be
 * understood; the alternative is a brief that silently does nothing.
 */
function classifyHeading(heading: string): keyof GlitchBrief {
  const h = heading.toLowerCase();
  // Order matters: "what this product is" would also match /page/ below.
  if (/(what (this|the) (product|app)|about|overview|product)/.test(h)) return "product";
  if (/(guide|how ?to|workaround|fix|walkthrough|steps|faq)/.test(h)) return "guides";
  if (/(entit|model|data|object|record|concept)/.test(h)) return "entities";
  if (/(role|who|persona|user type)/.test(h)) return "roles";
  if (/(area|module|section|surface|page)/.test(h)) return "areas";
  if (/(glossary|term|vocab|naming|word)/.test(h)) return "glossary";
  if (/(known|limitation|wip|in progress|already)/.test(h)) return "knownLimitations";
  if (/(do ?n['’]?t|not report|out of scope|ignore|exclude)/.test(h)) return "dontReport";
  return "other";
}

/**
 * Split the markdown on its `##` headings into the fields above.
 *
 * Deliberately not a markdown parser: this is somebody's hand-written file and
 * the only structure we rely on is a heading line. Anything before the first
 * heading is treated as `other`, so a brief written as one flowing page still
 * reaches the model instead of being dropped for having no headings.
 */
export function parseGlitchMd(raw: string): GlitchBrief {
  const brief: GlitchBrief = {};
  const sections = raw.split(/^#{1,6}\s+/m);

  const append = (key: keyof GlitchBrief, text: string) => {
    const value = text.trim();
    if (!value) return;
    const existing = brief[key];
    const cap = key === "guides" ? MAX_GUIDE_CHARS : MAX_SECTION_CHARS;
    brief[key] = (existing ? `${existing}\n${value}` : value).slice(0, cap);
  };

  // Text before the first heading has no label of its own.
  append("other", sections[0] ?? "");

  for (const section of sections.slice(1)) {
    const newline = section.indexOf("\n");
    const heading = newline === -1 ? section : section.slice(0, newline);
    const body = newline === -1 ? "" : section.slice(newline + 1);
    append(classifyHeading(heading), body);
  }

  return brief;
}

/** Everything the brief said, as the lines the prompt renders. */
export function briefToLines(brief: GlitchBrief): string[] {
  const lines: string[] = [];
  const push = (label: string, value?: string) => {
    if (!value) return;
    lines.push(`${label}:`);
    for (const line of value.split("\n")) lines.push(`  ${line}`);
  };
  push("What this product is", brief.product);
  push("Roles on this project", brief.roles);
  push("Areas of this product", brief.areas);
  push("The data this product works with", brief.entities);
  push("How things are done here, and known workarounds", brief.guides);
  push("What the team calls things", brief.glossary);
  push("Known and already being worked on", brief.knownLimitations);
  push("The team does NOT want reports about", brief.dontReport);
  push("Other project notes", brief.other);
  return lines;
}

/**
 * Read the repo's GLITCH.md. Returns null when there isn't one — that is the
 * normal case for most repos, not an error, and the assistant works without it.
 */
export async function getGlitchBrief(repoId: string): Promise<GlitchBrief | null> {
  const cached = cache.get(repoId);
  if (cached && cached.expiresAt > Date.now()) return cached.brief;

  let brief: GlitchBrief | null = null;
  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { owner: true, name: true, installation: true },
    });
    if (repo?.installation) {
      const token = await getInstallationAccessToken(repo.installation.installationId);
      for (const path of CANDIDATE_PATHS) {
        const res = await fetch(
          `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              // Raw, so we get the file instead of base64 in an envelope.
              Accept: "application/vnd.github.raw+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
        if (!res.ok) continue;
        const text = (await res.text()).slice(0, MAX_FILE_BYTES);
        if (text.trim()) {
          brief = parseGlitchMd(text);
          break;
        }
      }
    }
  } catch {
    // No brief is a working state. A GitHub outage must not take the assistant
    // down with it.
    brief = null;
  }

  cache.set(repoId, { brief, expiresAt: Date.now() + CACHE_TTL_MS });
  return brief;
}
