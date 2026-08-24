const META_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Send a 6-digit OTP to a WhatsApp number for phone verification.
 * Template "wa_otp" (Utility):
 *   Body: Your Glitchgrab verification code is *{{1}}*. Valid for 10 minutes.
 */
export async function sendWhatsappOtp(phone: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return { ok: false, error: "META_WA_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not set" };

  const to = phone.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone number" };

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "wa_otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[whatsapp] otp send failed:", res.status, body);
      let message = `Meta API error ${res.status}`;
      try {
        const json = JSON.parse(body) as { error?: { message?: string } };
        if (json.error?.message) message = json.error.message;
      } catch { /* non-JSON body */ }
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] otp send error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Meta template params reject newlines/tabs and 4+ consecutive spaces (error 132018).
 * GitHub issue titles/org names can contain these — strip before sending.
 */
function sanitizeParam(text: string): string {
  return text.replace(/[\n\t\r]+/g, " ").replace(/ {2,}/g, " ").trim();
}

/**
 * Prefix an issue title with its GitHub number so devs can reference it in
 * chat: "#42 Login button dead". Number is parsed from the issue URL
 * (…/issues/42); falls back to the bare title if the URL has no number.
 */
function withIssueNumber(title: string, githubUrl: string): string {
  const match = githubUrl.match(/\/issues\/(\d+)/);
  return match ? `#${match[1]} ${title}` : title;
}

/**
 * Send issue-resolved notification to reporter.
 * Template "issue_resolved":
 *   Body:    Hi {{1}}, your issue "{{2}}" reported to {{3}} has been resolved! Was the fix helpful?
 *            📞 Developer (WhatsApp): +{{4}} — tap to chat
 *   Button 0 (quick_reply): ✅ Yes, fixed!   payload: gg_yes_{issueId}
 *   Button 1 (quick_reply): ❌ No, reopen    payload: gg_no_{issueId}
 */
export async function sendIssueResolvedWhatsApp({
  phone,
  reporterName,
  issueTitle,
  orgName,
  developerPhone,
  issueId,
}: {
  phone: string;
  reporterName: string;
  issueTitle: string;
  orgName: string;
  developerPhone: string | null | undefined;
  issueId: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  const templateName = "issue_resolved";

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const devPhone = formatPhone(developerPhone ?? "") || "N/A";

  const components: object[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: sanitizeParam(reporterName) },
        { type: "text", text: sanitizeParam(issueTitle) },
        { type: "text", text: sanitizeParam(orgName) },
        { type: "text", text: devPhone },
      ],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [{ type: "payload", payload: `gg_yes_${issueId}` }],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [{ type: "payload", payload: `gg_no_${issueId}` }],
    },
  ];

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components,
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] reporter send failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] reporter send error:", err);
  }
}

/**
 * Notify developer that reporter said issue is NOT resolved.
 * Template "issue_reopened_dev":
 *   Body:    ⚠️ Reporter {{1}} says "{{2}}" is NOT resolved on {{3}}. Reopened on GitHub.
 *            📞 Reporter: +{{4}} — tap to contact
 *   Button 0 (URL): View on GitHub → https://github.com/{{1}}
 *                   suffix = owner/repo/issues/number  (e.g. navibyte/app/issues/42)
 */
export async function sendDeveloperReopenedNotification({
  phone,
  reporterName,
  reporterPhone,
  issueTitle,
  orgName,
  githubUrl,
}: {
  phone: string;
  reporterName: string;
  reporterPhone: string | null | undefined;
  issueTitle: string;
  orgName: string;
  githubUrl: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  // Extract path from GitHub URL: https://github.com/owner/repo/issues/42 → owner/repo/issues/42
  const githubPath = githubUrl.replace("https://github.com/", "");

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "issue_reopened_dev",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(reporterName) },
                { type: "text", text: sanitizeParam(withIssueNumber(issueTitle, githubUrl)) },
                { type: "text", text: sanitizeParam(orgName) },
                { type: "text", text: formatPhone(reporterPhone ?? "") || "N/A" },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: githubPath }],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] dev notify failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] dev notify error:", err);
  }
}

/**
 * Daily reminder to developer: how many open issues.
 * Template "daily_issue_reminder" (Utility):
 *   Body:     👋 Hi {{1}}, you have {{2}} open issue(s) in {{3}} waiting for your attention. Keep it up!
 *   Button 0 (URL): View on GitHub → https://github.com/{{1}}
 *             suffix = orgs/{org}/issues?q=is:issue+is:open+assignee:{login}
 */
export async function sendDailyIssueReminder({
  phone,
  developerName,
  openCount,
  orgName,
  glitchgrabPath,
}: {
  phone: string;
  developerName: string;
  openCount: number;
  orgName: string;
  glitchgrabPath: string | null;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const components: object[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: sanitizeParam(developerName) },
        { type: "text", text: String(openCount) },
        { type: "text", text: sanitizeParam(orgName) },
      ],
    },
  ];

  if (glitchgrabPath) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: glitchgrabPath }],
    });
  }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "daily_issue_reminder",
          language: { code: "en" },
          components,
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] daily reminder failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] daily reminder error:", err);
  }
}

/**
 * Tell the owner what the Chrome Web Store did with their submission (#332).
 *
 * The reason this is WhatsApp and not a dashboard badge: the outcome lands
 * hours or days after the release, when nobody is looking at Glitchgrab. A
 * rejected extension that sits unread is a release that silently did not
 * happen — and a Draft looks exactly like a shipped version from the outside.
 *
 * Template "extension_review_status" (Utility):
 *   Body:     🧩 {{1}} v{{2}} on the Chrome Web Store: {{3}}. {{4}}
 *   Button 0 (URL): Open the store listing → https://chrome.google.com/webstore/devconsole/{{1}}
 */
export async function sendExtensionStatusWhatsApp({
  phone,
  extensionName,
  version,
  headline,
  detail,
  consolePath,
}: {
  phone: string;
  extensionName: string;
  version: string;
  /** Two or three words: "published", "still in review", "needs your attention". */
  headline: string;
  /** What to do about it, in one sentence. */
  detail: string;
  consolePath: string | null;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const components: object[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: sanitizeParam(extensionName) },
        { type: "text", text: sanitizeParam(version) },
        { type: "text", text: sanitizeParam(headline) },
        { type: "text", text: sanitizeParam(detail) },
      ],
    },
  ];

  if (consolePath) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: consolePath }],
    });
  }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "extension_review_status",
          language: { code: "en" },
          components,
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] extension status failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] extension status error:", err);
  }
}

/**
 * Weekly summary to developer: how many issues resolved this week.
 * Template "weekly_issue_summary" (Utility):
 *   Body:     📊 Weekly recap for {{1}} on {{2}}: you resolved {{3}} issue(s) this week. Great work!
 *   Button 0 (URL): View on GitHub → https://github.com/{{1}}
 *             suffix = orgs/{org}/issues?q=is:issue+is:open+assignee:{login}
 */
export async function sendWeeklyIssueSummary({
  phone,
  developerName,
  resolvedCount,
  orgName,
  glitchgrabPath,
}: {
  phone: string;
  developerName: string;
  resolvedCount: number;
  orgName: string;
  glitchgrabPath: string | null;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const components: object[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: sanitizeParam(developerName) },
        { type: "text", text: sanitizeParam(orgName) },
        { type: "text", text: String(resolvedCount) },
      ],
    },
  ];

  if (glitchgrabPath) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: glitchgrabPath }],
    });
  }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "weekly_issue_summary",
          language: { code: "en" },
          components,
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] weekly summary failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] weekly summary error:", err);
  }
}

/**
 * Morning digest — one message that serves both hats.
 *
 * Replaces the old `daily_issue_reminder` for anyone once
 * `WHATSAPP_DIGEST_ENABLED` is on. The point of the extra parameters is issue
 * #322: "87 open issues" is a number, "PracticeStacks 32, Abhyasika 18" is
 * somewhere to start. The same person is usually admin AND developer, so the
 * org backlog and their own plate ride in one message rather than two.
 *
 * Wording is flat and transactional on purpose. The first draft opened with
 * "☀️ Good morning {{1}}! … Pick one and close it today" and Meta's classifier
 * answered "Category does not match — this message template will be rejected",
 * pushing it to Marketing. Greetings, encouragement and a sun emoji read as
 * promotion; a Utility template has to sound like an account statement.
 *
 * Laid out as a labelled block rather than a paragraph, with WhatsApp's own
 * `*bold*` markup on the values. A wall of prose on a phone is skipped; the
 * numbers have to be findable in a glance. Note the asterisks must not wrap a
 * middle dot — `*Issue update · {{1}}*` renders as literal text, `*Issue update
 * for {{1}}*` renders bold. Body line breaks are fine; PARAMETERS still cannot
 * contain them (see `sanitizeParam`).
 *
 * Template "daily_issue_digest" (Utility):
 *   Body:     *Issue update for {{1}}*
 *             (blank line)
 *             *{{2}}* has *{{3}}* open issue(s).
 *             By repo: {{4}}
 *             Assigned to you: *{{5}}*
 *             (blank line)
 *             Tap Show details for every repo, Open dashboard for the full view,
 *             or Skip today to pause.
 *   Button 0 (URL):         Open dashboard → https://glitchgrab.dev/{{1}}
 *                           suffix = org/{login} — no query string; a `?…=…`
 *                           inside a dynamic-URL variable risks a rejection.
 *   Button 1 (quick reply): Skip today — mutes both nudges for the day.
 *   Button 2 (quick reply): Show details — replies in-chat with the full
 *                           repo-by-repo list, the part the template's "+3 more"
 *                           had to drop. The tap is an inbound message, so the
 *                           reply is free text inside Meta's 24-hour window and
 *                           costs nothing.
 *
 * Both quick replies are handled in /api/v1/whatsapp/webhook, which matches on
 * the button LABEL — a template quick reply carries no payload of its own.
 */
export async function sendDailyIssueDigest({
  phone,
  name,
  orgLabel,
  openCount,
  breakdown,
  ownPlate,
  glitchgrabPath,
}: {
  phone: string;
  name: string;
  orgLabel: string;
  openCount: number;
  breakdown: string;
  ownPlate: string;
  glitchgrabPath: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate(
    "daily_issue_digest",
    phone,
    [name, orgLabel, String(openCount), breakdown, ownPlate].map(sanitizeParam),
    glitchgrabPath ?? undefined
  );
}

/**
 * Evening recap — what actually got finished today.
 *
 * The counterpart to the morning nudge, and the half the issue asked for by
 * name ("oh good work you have done some work"). Counted off `closed_at`, not
 * `updated_at`: a stale issue someone merely commented on today is not work
 * done, and claiming it is makes every future number suspect.
 *
 * Same flat register as the morning digest, and for the same reason — see the
 * note above `sendDailyIssueDigest`.
 *
 * Template "evening_recap" (Utility):
 *   Body:     *Daily summary for {{1}}*
 *             (blank line)
 *             *{{2}}* issue(s) closed today in *{{3}}*.
 *             Still open: {{4}}
 *             Assigned to you: {{5}}
 *             (blank line)
 *             Tap Show details for every repo, Open dashboard for the full view,
 *             or Skip today to pause.
 *   Button 0 (URL):         Open dashboard → https://glitchgrab.dev/{{1}}
 *                           suffix = org/{login}
 *   Button 1 (quick reply): Skip today
 *   Button 2 (quick reply): Show details
 */
export async function sendEveningRecap({
  phone,
  name,
  closedCount,
  orgLabel,
  openCount,
  assignedCount,
  glitchgrabPath,
}: {
  phone: string;
  name: string;
  closedCount: number;
  orgLabel: string;
  openCount: number;
  assignedCount: number;
  glitchgrabPath: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate(
    "evening_recap",
    phone,
    [name, String(closedCount), orgLabel, String(openCount), String(assignedCount)].map(
      sanitizeParam
    ),
    glitchgrabPath ?? undefined
  );
}

/**
 * Notify a developer that a GitHub issue was assigned to them.
 * Template "issue_assigned_dev" (Utility):
 *   Body:    Hi {{1}}, issue "{{2}}" from {{3}} has been assigned to you on GitHub.
 *   Button 0 (URL): View Issue → https://github.com/{{1}}
 *                   suffix = owner/repo/issues/number
 */
export async function sendIssueAssignedNotification({
  phone,
  developerName,
  issueTitle,
  orgName,
  githubUrl,
}: {
  phone: string;
  developerName: string;
  issueTitle: string;
  orgName: string;
  githubUrl: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const githubPath = githubUrl.replace("https://github.com/", "");

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "issue_assigned_dev",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(developerName) },
                { type: "text", text: sanitizeParam(withIssueNumber(issueTitle, githubUrl)) },
                { type: "text", text: sanitizeParam(orgName) },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: githubPath }],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] assigned notify failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] assigned notify error:", err);
  }
}

/**
 * Notify a QA tester that they've been added to an org.
 * Template "qa_tester_invite" (Utility):
 *   Body:   Hi {{1}}, you've been added as a QA tester for {{2}} on Glitchgrab. You'll receive verification requests here.
 *   Button 0 (URL): Open QA dashboard → https://glitchgrab.dev/qa/{{1}}
 *                   suffix = <magicToken>
 */
export async function sendTesterInvite({
  phone,
  testerName,
  orgName,
  magicToken,
}: {
  phone: string;
  testerName: string;
  orgName: string;
  magicToken: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "qa_tester_invite",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(testerName) },
                { type: "text", text: sanitizeParam(orgName) },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: magicToken }],
            },
          ],
        },
      }),
    });
    if (!res.ok) console.error("[whatsapp] tester invite failed:", await res.text());
  } catch (err) {
    console.error("[whatsapp] tester invite error:", err);
  }
}

/**
 * Ask a QA tester to verify the fixes a developer just merged in one PR.
 * A merged PR can close several issues at once, so this sends ONE message with
 * a count — the QA page lists every issue to check individually.
 * Template "qa_verify_request" (Utility):
 *   Body:   Hi {{1}}, developer {{2}} marked {{3}} issue(s) as fixed on {{4}}. Tap below to verify each one.
 *           ({{3}} carries the count + the issue numbers, e.g. "3 (#918, #974, #917)".)
 *   Button 0 (URL): Verify now → https://glitchgrab.dev/qa/{{1}}
 *                   suffix = <magicToken>
 *
 * Returns the outcome rather than swallowing it — callers stamp QaCheck.notifiedAt
 * either way, so a silent failure here means a tester is never pinged and nobody
 * ever finds out. The reason belongs in the logs.
 */
export async function sendTesterQaRequest({
  phone,
  testerName,
  developerName,
  issueNumbers,
  orgName,
  magicToken,
}: {
  phone: string;
  testerName: string;
  developerName: string;
  issueNumbers: number[];
  orgName: string;
  magicToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "META_WA_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not set" };
  }

  const to = formatPhone(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  // Template body reads "marked {{3}} issue(s) as fixed". {{3}} is a count, but
  // testers asked to see WHICH issues — so embed the numbers: "3 (#918, #974)".
  const count = issueNumbers.length;
  const countParam = count
    ? `${count} (${issueNumbers.map((n) => `#${n}`).join(", ")})`
    : String(count);

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "qa_verify_request",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(testerName) },
                { type: "text", text: sanitizeParam(developerName) },
                { type: "text", text: countParam },
                { type: "text", text: sanitizeParam(orgName) },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: magicToken }],
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[whatsapp] qa request failed:", res.status, body);
      let message = `Meta API error ${res.status}`;
      try {
        const json = JSON.parse(body) as { error?: { message?: string } };
        if (json.error?.message) message = json.error.message;
      } catch { /* non-JSON body */ }
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] qa request error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Notify a developer that a tester marked their fix as NOT working.
 * Template "qa_failed_dev" (Utility):
 *   Body:   ⚠️ Tester {{1}} says "{{2}}" is NOT fixed on {{3}}. It has been reopened on GitHub.
 *   Button 0 (URL): View on GitHub → https://github.com/{{1}}
 *                   suffix = owner/repo/issues/number
 */
export async function sendDeveloperQaFailed({
  phone,
  testerName,
  issueTitle,
  orgName,
  githubUrl,
}: {
  phone: string;
  testerName: string;
  issueTitle: string;
  orgName: string;
  githubUrl: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const githubPath = githubUrl.replace("https://github.com/", "");

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "qa_failed_dev",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(testerName) },
                { type: "text", text: sanitizeParam(withIssueNumber(issueTitle, githubUrl)) },
                { type: "text", text: sanitizeParam(orgName) },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: githubPath }],
            },
          ],
        },
      }),
    });
    if (!res.ok) console.error("[whatsapp] qa failed-dev notify failed:", await res.text());
  } catch (err) {
    console.error("[whatsapp] qa failed-dev notify error:", err);
  }
}

/**
 * Format an instant for someone reading it on their phone.
 *
 * In the recipient's own zone where we know it — a demo confirmed as "3pm"
 * when they meant 3pm their time is the single most expensive mistake this
 * feature can make.
 */
function formatSlot(startsAt: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(startsAt);
  } catch {
    return startsAt.toUTCString();
  }
}

/**
 * Demo confirmed — to the person who booked it.
 * Template "demo_confirmed" (Utility):
 *   Body:   Hi {{1}}, your {{2}} demo is confirmed for {{3}}.
 *   Button: URL "Join demo" → https://meet.google.com/{{1}}
 */
export async function sendBookingConfirmed(params: {
  phone: string;
  name: string;
  project: string;
  startsAt: Date;
  timezone: string;
  meetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate(
    "demo_confirmed",
    params.phone,
    [params.name, params.project, formatSlot(params.startsAt, params.timezone)],
    meetCode(params.meetUrl)
  );
}

/**
 * Demo starting soon — to the person who booked it.
 * Template "demo_reminder" (Utility):
 *   Body:   Reminder: your {{1}} demo starts at {{2}}.
 *   Button: URL "Join demo" → https://meet.google.com/{{1}}
 */
export async function sendBookingReminder(params: {
  phone: string;
  project: string;
  startsAt: Date;
  timezone: string;
  meetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate(
    "demo_reminder",
    params.phone,
    [params.project, formatSlot(params.startsAt, params.timezone)],
    meetCode(params.meetUrl)
  );
}

/**
 * Someone booked a demo — to the project owner.
 * Template "demo_booked_owner" (Utility):
 *   Body: {{1}} booked a {{2}} demo for {{3}}.
 */
export async function sendOwnerNewBooking(params: {
  phone: string;
  project: string;
  bookerName: string;
  startsAt: Date;
  timezone: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate("demo_booked_owner", params.phone, [
    params.bookerName,
    params.project,
    formatSlot(params.startsAt, params.timezone),
  ]);
}

/**
 * A booked demo is about to start — to the project owner.
 * Template "demo_starting_owner" (Utility):
 *   Body:   Your {{1}} demo with {{2}} starts at {{3}}.
 *   Button: URL "Join demo" → https://meet.google.com/{{1}}
 */
export async function sendOwnerBookingStarting(params: {
  phone: string;
  project: string;
  bookerName: string;
  startsAt: Date;
  timezone: string;
  meetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendTemplate(
    "demo_starting_owner",
    params.phone,
    [params.project, params.bookerName, formatSlot(params.startsAt, params.timezone)],
    meetCode(params.meetUrl)
  );
}

/**
 * The part of a Meet link that varies.
 *
 * A WhatsApp template URL button is a FIXED prefix plus one variable, so the
 * template stores `https://meet.google.com/{{1}}` and we send only the code.
 * Passing the whole URL would produce `https://meet.google.com/https://…`.
 */
function meetCode(meetUrl: string): string {
  return meetUrl.replace(/^https?:\/\/meet\.google\.com\//i, "").split(/[?#]/)[0];
}

/**
 * Send a pre-approved Meta template with positional body parameters.
 *
 * Every message above is business-initiated and outside any 24-hour window, so
 * it MUST be a template Meta has already approved — free-form text is silently
 * dropped by the API. Shared here so a new notification is a list of strings
 * rather than another copy of the request shape.
 */
async function sendTemplate(
  templateName: string,
  phone: string,
  parameters: string[],
  /**
   * Fills the template's dynamic URL button. A tappable "Join demo" is worth
   * more than a link in the body: on a phone, mid-day, it is the difference
   * between joining and meaning to.
   */
  urlButtonParam?: string
): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "META_WA_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not set" };
  }

  const to = phone.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone number" };

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            { type: "body", parameters: parameters.map((text) => ({ type: "text", text })) },
            ...(urlButtonParam
              ? [
                  {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [{ type: "text", text: urlButtonParam }],
                  },
                ]
              : []),
          ],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`WhatsApp ${templateName} failed:`, body);
      return { ok: false, error: `WhatsApp said ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Free-form reply inside Meta's 24-hour service window.
 *
 * Only legal because the *customer* messaged us first — that is what makes the
 * booking conversation possible without an approved template for every line.
 * Outside the window Meta silently drops these, which is why the thread records
 * `lastInboundAt` and the bot falls back to a template when it has gone stale.
 */
export async function sendWhatsappText(
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  return postMessage({
    messaging_product: "whatsapp",
    to: phone.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: true, body: text },
  });
}

interface ListRow {
  /** Comes back on the webhook as the reply id — encode what you need here. */
  id: string;
  title: string;
  description?: string;
}

/**
 * A native WhatsApp picker.
 *
 * Chosen over "reply with a number" because a mis-typed 3 books the wrong slot
 * on a real calendar, and the tap carries a machine-readable id instead of text
 * we would have to guess at.
 *
 * Meta caps a list at 10 rows TOTAL across all sections — the caller pages, and
 * this refuses rather than silently truncating someone's afternoon away.
 */
export async function sendWhatsappList(params: {
  phone: string;
  body: string;
  buttonLabel: string;
  rows: ListRow[];
  header?: string;
  footer?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (params.rows.length === 0) return { ok: false, error: "No rows to show" };
  if (params.rows.length > 10) return { ok: false, error: "WhatsApp allows at most 10 rows" };

  return postMessage({
    messaging_product: "whatsapp",
    to: params.phone.replace(/\D/g, ""),
    type: "interactive",
    interactive: {
      type: "list",
      ...(params.header ? { header: { type: "text", text: params.header } } : {}),
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        button: params.buttonLabel.slice(0, 20),
        sections: [
          {
            title: "Options",
            rows: params.rows.map((r) => ({
              id: r.id.slice(0, 200),
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}

async function postMessage(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "META_WA_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not set" };
  }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("WhatsApp send failed:", await res.text());
      return { ok: false, error: `WhatsApp said ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * A message with a tappable button that opens a URL.
 *
 * Free-form equivalent of a template's URL button, usable inside the 24-hour
 * window. Unlike a template the URL is unrestricted — no fixed prefix, no
 * variable suffix — so the Meet link goes in whole.
 *
 * Worth the extra call over pasting the link in text: on a phone a button is a
 * target, and a link in a paragraph is something to find first.
 */
export async function sendWhatsappCtaUrl(params: {
  phone: string;
  body: string;
  buttonText: string;
  url: string;
  footer?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return postMessage({
    messaging_product: "whatsapp",
    to: params.phone.replace(/\D/g, ""),
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        name: "cta_url",
        parameters: {
          // Meta caps the label at 20 characters and silently rejects longer.
          display_text: params.buttonText.slice(0, 20),
          url: params.url,
        },
      },
    },
  });
}

/**
 * Up to three tappable reply buttons.
 *
 * Unlike `sendWhatsappList` these sit directly under the message with no menu
 * to open, which is what a yes/no question wants — a confirmation buried behind
 * "Choose" is one someone dismisses instead of answering.
 *
 * The tap returns as `interactive.button_reply.id`, so the id carries whatever
 * the handler needs; the title is only ever seen by a human.
 */
export async function sendWhatsappButtons(params: {
  phone: string;
  body: string;
  buttons: { id: string; title: string }[];
  footer?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (params.buttons.length === 0) return { ok: false, error: "No buttons to show" };
  // Meta's cap. Refuse rather than truncate: a silently dropped third button is
  // an option the person was meant to have and never saw.
  if (params.buttons.length > 3) return { ok: false, error: "WhatsApp allows at most 3 buttons" };

  return postMessage({
    messaging_product: "whatsapp",
    to: params.phone.replace(/\D/g, ""),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        buttons: params.buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}
