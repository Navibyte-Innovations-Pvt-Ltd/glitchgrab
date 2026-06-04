const META_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Send a 6-digit OTP to a WhatsApp number for phone verification.
 * Template "wa_otp" (Utility):
 *   Body: Your Glitchgrab verification code is *{{1}}*. Valid for 10 minutes.
 */
export async function sendWhatsappOtp(phone: string, otp: string): Promise<boolean> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return false;

  const to = phone.replace(/\D/g, "");
  if (!to) return false;

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
          ],
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] otp send failed:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] otp send error:", err);
    return false;
  }
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Send issue-resolved notification to reporter.
 * Template "issue_resolved":
 *   Body:    Hi {{1}}, your issue "{{2}}" reported to {{3}} has been resolved! Was the fix helpful?
 *   Button 0 (URL):         Contact Developer → https://wa.me/{{1}}
 *   Button 1 (quick_reply): ✅ Yes, fixed!   payload: gg_yes_{issueId}
 *   Button 2 (quick_reply): ❌ No, reopen    payload: gg_no_{issueId}
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
  const templateName = process.env.META_WA_TEMPLATE_NAME ?? "issue_resolved";

  if (!phoneNumberId || !accessToken) return;

  const to = formatPhone(phone);
  if (!to) return;

  const components: object[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: reporterName },
        { type: "text", text: issueTitle },
        { type: "text", text: orgName },
      ],
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: formatPhone(developerPhone ?? "0") || "0" }],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [{ type: "payload", payload: `gg_yes_${issueId}` }],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "2",
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
 *   Button 0 (URL): View on GitHub → https://github.com/{{1}}
 *                   suffix = owner/repo/issues/number  (e.g. navibyte/app/issues/42)
 */
export async function sendDeveloperReopenedNotification({
  phone,
  reporterName,
  issueTitle,
  orgName,
  githubUrl,
}: {
  phone: string;
  reporterName: string;
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
                { type: "text", text: reporterName },
                { type: "text", text: issueTitle },
                { type: "text", text: orgName },
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
 * Notify a developer that a GitHub issue was assigned to them.
 * Template "issue_assigned_dev" (Utility):
 *   Body:    👋 {{1}}, issue "{{2}}" from {{3}} has been assigned to you on GitHub.
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
                { type: "text", text: developerName },
                { type: "text", text: issueTitle },
                { type: "text", text: orgName },
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
