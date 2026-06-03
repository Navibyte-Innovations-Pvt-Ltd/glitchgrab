const META_API_BASE = "https://graph.facebook.com/v19.0";

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function sendIssueResolvedWhatsApp({
  phone,
  reporterName,
  issueTitle,
}: {
  phone: string;
  reporterName: string;
  issueTitle: string;
}): Promise<void> {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  const templateName = process.env.META_WA_TEMPLATE_NAME ?? "issue_resolved";

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
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: reporterName },
                { type: "text", text: issueTitle },
              ],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] send failed:", await res.text());
    }
  } catch (err) {
    console.error("[whatsapp] error:", err);
  }
}
