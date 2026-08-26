// GLITCH.md parsing.
//
// The file is hand-written by a team that has never read our parser, so the
// thing worth defending is tolerance: near-miss headings still land somewhere
// useful, and a brief with no headings at all still reaches the model.

import { describe, it, expect } from "bun:test";
import { parseGlitchMd, briefToLines } from "./glitch-md";

const SAMPLE = `# GLITCH.md

## Roles
- tester — QA, files against assigned repos only
- owner — sees everything

## Areas
- Repos page — repo cards, tokens
- Calls — meeting recording

## Glossary
- "token" = one repo's API key, not an auth token

## Known limitations
- Prod AI assist degrades without GOOGLE_AI_API_KEY

## Don't report
- Anything under /docs — it is static
`;

describe("parseGlitchMd — the sections that let it answer", () => {
  const RICH = `## What this product is
PracticeStack manages the client lifecycle for CA and CS firms.

## Roles
- employee — does the work, sees assigned compliances
- firm admin — everything inside one firm
- partner — owns the client relationship
- super admin — across firms

## Entities
- compliance — a filing with a due date, an executor and a reviewer
- proposal — DRAFT → PENDING → APPROVED

## Guides
- Due date shows only once a compliance has an executor. Assign one.
`;

  it("reads the product, roles, entities and guides", () => {
    const brief = parseGlitchMd(RICH);
    expect(brief.product).toContain("CA and CS firms");
    expect(brief.roles).toContain("super admin");
    expect(brief.entities).toContain("executor");
    expect(brief.guides).toContain("Assign one");
  });

  it("gives guides more room than a glossary line", () => {
    // Guides carry steps. Truncating them at the glossary cap would cut the
    // fix in half, which is worse than not having it.
    const brief = parseGlitchMd(`## Guides\n${"step ".repeat(1200)}`);
    expect((brief.guides ?? "").length).toBeGreaterThan(1500);
    expect((brief.guides ?? "").length).toBeLessThanOrEqual(3000);
  });

  it("matches the headings a team would actually write", () => {
    const brief = parseGlitchMd(
      `## How to\n- reset it\n\n## Data model\n- lead\n\n## Overview\n- a CRM`
    );
    expect(brief.guides).toContain("reset it");
    expect(brief.entities).toContain("lead");
    expect(brief.product).toContain("a CRM");
  });
});

describe("parseGlitchMd", () => {
  it("splits the brief into the sections the prompt renders", () => {
    const brief = parseGlitchMd(SAMPLE);
    expect(brief.roles).toContain("tester");
    expect(brief.areas).toContain("Repos page");
    expect(brief.glossary).toContain("one repo's API key");
    expect(brief.knownLimitations).toContain("GOOGLE_AI_API_KEY");
    expect(brief.dontReport).toContain("/docs");
  });

  it("understands headings the team worded differently", () => {
    const brief = parseGlitchMd(`## Who reports here\n- clients\n\n## Out of scope\n- marketing site`);
    expect(brief.roles).toContain("clients");
    expect(brief.dontReport).toContain("marketing site");
  });

  it("keeps a brief that has no headings at all", () => {
    // Someone will write one flowing paragraph. Dropping it for lacking
    // structure would make the feature look broken to the team that tried.
    const brief = parseGlitchMd("We call the sidebar the rail. Do not report typos.");
    expect(brief.other).toContain("We call the sidebar the rail");
  });

  it("caps a runaway section so one heading cannot eat the turn", () => {
    const brief = parseGlitchMd(`## Glossary\n${"word ".repeat(2000)}`);
    expect((brief.glossary ?? "").length).toBeLessThanOrEqual(1500);
  });

  it("labels every section when rendering, so nothing arrives unattributed", () => {
    const lines = briefToLines(parseGlitchMd(SAMPLE)).join("\n");
    expect(lines).toContain("Roles on this project:");
    expect(lines).toContain("The team does NOT want reports about:");
  });

  it("renders nothing for an empty brief", () => {
    expect(briefToLines({})).toEqual([]);
  });
});
