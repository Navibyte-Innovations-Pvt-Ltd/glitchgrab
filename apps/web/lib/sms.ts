import axios from "axios";

/**
 * OTP over SMS, via Msg91.
 *
 * Ported from PracticeStack, which learned two things the hard way.
 *
 * First: Msg91's legacy endpoint answers HTTP 200 for failures too — a dead
 * auth key comes back as `{"msg":"303","msgType":"error"}` with a perfectly
 * healthy status code. Trusting the status alone printed "sent" for every one
 * of those while the user sat waiting for a code that never left.
 *
 * Second, and the reason the message text lives in an env var rather than here:
 * Indian DLT rules mean the operator silently drops any SMS whose body does not
 * match a REGISTERED template character for character — after Msg91 has already
 * returned a request id. PracticeStack tried rewording their own brand into an
 * unregistered template and the messages simply never arrived. So the text and
 * the template id are configuration: the day a Glitchgrab template is approved,
 * it is an env change, not a deploy.
 */

/** Where the code goes in the configured template. */
const OTP_PLACEHOLDER = "{otp}";

/**
 * True when a 200 from Msg91 is actually a rejection.
 *
 * A successful send answers with a bare request id; a failure answers with
 * `{"msgType":"error"}` — same status, same content type.
 */
function isMsg91Rejection(data: unknown): boolean {
  if (typeof data === "object" && data !== null) {
    return (data as { msgType?: string }).msgType === "error";
  }
  return /"msgType"\s*:\s*"error"/.test(String(data));
}

/** SMS is only attempted when every part of the DLT registration is present. */
export function smsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_OTP_AUTH_KEY &&
      process.env.SMS_OTP_TEMPLATE &&
      process.env.SMS_DLT_TE_ID &&
      process.env.SMS_SENDER_ID
  );
}

export async function sendSmsOtp(
  phone: string,
  otp: string
): Promise<{ ok: boolean; error?: string }> {
  if (!smsConfigured()) {
    return { ok: false, error: "SMS is not configured" };
  }

  // Msg91 wants the bare 10-digit number with the country code passed
  // separately; a +91 prefix inside `mobiles` is rejected.
  const mobile = phone.replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return { ok: false, error: "Invalid phone number" };

  const template = process.env.SMS_OTP_TEMPLATE ?? "";
  if (!template.includes(OTP_PLACEHOLDER)) {
    // Refuse rather than send a code-less message that still costs money and
    // still counts against the template.
    return { ok: false, error: `SMS_OTP_TEMPLATE must contain ${OTP_PLACEHOLDER}` };
  }
  const message = template.replaceAll(OTP_PLACEHOLDER, otp);

  // POSTed as a form body, not a query string.
  //
  // A GET puts the auth key and the code itself into the URL, where they end up
  // in proxy logs, in any error-tracking breadcrumb, and in the `url` field of
  // an axios error object that some future catch block will happily log. The
  // endpoint accepts the same parameters either way.
  const params = new URLSearchParams({
    authkey: process.env.NEXT_OTP_AUTH_KEY ?? "",
    mobiles: `91${mobile}`,
    message,
    sender: process.env.SMS_SENDER_ID ?? "",
    route: "4",
    country: "91",
    DLT_TE_ID: process.env.SMS_DLT_TE_ID ?? "",
  });

  try {
    const { data } = await axios.post(
      "https://control.msg91.com/api/sendhttp.php",
      params.toString(),
      {
        timeout: 15_000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    const body = typeof data === "string" ? data : JSON.stringify(data);

    if (isMsg91Rejection(data)) {
      // Last four digits only — a full number in the logs is PII we have no
      // reason to keep, and the tail is enough to match it to a booking.
      console.error(`Msg91 rejected the SMS for …${mobile.slice(-4)}: ${body}`);
      return { ok: false, error: "The SMS provider rejected the message" };
    }

    return { ok: true };
  } catch (error) {
    // Deliberately not logging the error object: axios attaches the request
    // config, which carries the auth key and the code.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    console.error(`Msg91 request failed${status ? ` (HTTP ${status})` : ""}`);
    return { ok: false, error: "Could not reach the SMS provider" };
  }
}
