const DEFAULT_BASE_URL = "https://glitchgrab.dev";

export interface ReportPayload {
  description: string;
  type:
    | "BUG"
    | "FEATURE_REQUEST"
    | "UI_IMPROVEMENT"
    | "PERFORMANCE"
    | "SECURITY"
    | "QUESTION"
    | "OTHER";
  source: "SDK_USER_REPORT";
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail?: string;
  screenshotBase64?: string;
}

export async function submitReport(
  token: string,
  payload: ReportPayload,
  baseUrl = DEFAULT_BASE_URL
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/sdk/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Glitchgrab: report failed (${res.status})`);
  }
}
