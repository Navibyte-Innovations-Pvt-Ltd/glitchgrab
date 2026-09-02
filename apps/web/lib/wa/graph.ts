import { WaError } from "./errors";

/**
 * Thin wrapper over Meta's Graph API for the WhatsApp platform.
 *
 * Deliberately separate from `lib/whatsapp.ts`, which is Glitchgrab's own
 * single-tenant sender bound to `META_WA_PHONE_NUMBER_ID`. Nothing here reads
 * that env var: every call is made with a *tenant's* token against a *tenant's*
 * WABA, and the app credentials below belong to the Tech Provider app.
 */

/**
 * Pinned. Meta ships breaking changes between versions and an unpinned client
 * silently follows them; bumping this is a deliberate act with a test pass.
 */
export const WA_GRAPH_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${WA_GRAPH_VERSION}`;

export function waAppId(): string {
  const id = process.env.META_WA_PLATFORM_APP_ID;
  if (!id) throw new WaError("UNAUTHORIZED", "META_WA_PLATFORM_APP_ID is not set", 500);
  return id;
}

export function waAppSecret(): string {
  const secret = process.env.META_WA_PLATFORM_APP_SECRET;
  if (!secret) throw new WaError("UNAUTHORIZED", "META_WA_PLATFORM_APP_SECRET is not set", 500);
  return secret;
}

export interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * A Graph failure carrying Meta's own code, so callers can branch on it.
 *
 * Meta's HTTP status is not a reliable signal — it answers 400 for both "your
 * token expired" and "that template name is taken". The `code`/`subcode` pair
 * is what actually distinguishes them.
 */
export class WaGraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
    readonly fbtraceId?: string
  ) {
    super(message);
    this.name = "WaGraphError";
  }

  /** An expired, revoked or otherwise dead token. Re-onboarding is the only fix. */
  get isAuthError(): boolean {
    return this.code === 190 || this.status === 401;
  }

  /** Meta is rate limiting us. Safe to retry later; pointless to retry now. */
  get isRateLimit(): boolean {
    return this.code === 4 || this.code === 80007 || this.code === 131048 || this.status === 429;
  }

  /**
   * Worth retrying at all? A 4xx that is not a rate limit is a permanent
   * rejection — retrying it forever is what pinned meeting rows at
   * "transcribing…" for days, and the same trap applies here.
   */
  get isRetryable(): boolean {
    return this.isRateLimit || this.status >= 500;
  }
}

async function graphRequest<T>(
  path: string,
  init: RequestInit & { accessToken?: string; query?: Record<string, string | undefined> }
): Promise<T> {
  const { accessToken, query, ...rest } = init;

  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const headers = new Headers(rest.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (rest.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (err) {
    // A network failure is not Meta rejecting us; surface it as retryable.
    throw new WaGraphError(err instanceof Error ? err.message : "Network error", 503);
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    const e = (body as GraphErrorBody).error;
    throw new WaGraphError(
      e?.message ?? `Graph API error ${res.status}`,
      res.status,
      e?.code,
      e?.error_subcode,
      e?.fbtrace_id
    );
  }

  return body as T;
}

export function graphGet<T>(
  path: string,
  accessToken: string,
  query?: Record<string, string | undefined>
): Promise<T> {
  return graphRequest<T>(path, { method: "GET", accessToken, query });
}

export function graphPost<T>(
  path: string,
  accessToken: string,
  body?: unknown,
  query?: Record<string, string | undefined>
): Promise<T> {
  return graphRequest<T>(path, {
    method: "POST",
    accessToken,
    query,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function graphDelete<T>(path: string, accessToken: string): Promise<T> {
  return graphRequest<T>(path, { method: "DELETE", accessToken });
}

/**
 * Exchanges the short-lived code Embedded Signup hands back for an access token.
 *
 * Meta expects the app credentials as query parameters here, not a Bearer
 * header — this endpoint authenticates the *app*, not a user.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await graphRequest<{ access_token?: string }>("/oauth/access_token", {
    method: "GET",
    query: {
      client_id: waAppId(),
      client_secret: waAppSecret(),
      code,
    },
  });

  if (!res.access_token) {
    throw new WaError("UNAUTHORIZED", "Meta returned no access token for that code", 502);
  }
  return res.access_token;
}

export interface DebugTokenResult {
  wabaIds: string[];
  expiresAt: Date | null;
  scopes: string[];
}

/**
 * Asks Meta what a token actually grants.
 *
 * This is the security boundary of the whole onboarding flow. Embedded Signup's
 * JS callback reports a WABA id to the browser, and the browser can lie — a
 * caller could claim any WABA id in the world. The `granular_scopes` on the
 * debug response are Meta's own answer to "which WABAs does this token cover",
 * so the ids used to create a tenant come from here and never from the request.
 */
export async function debugToken(userToken: string): Promise<DebugTokenResult> {
  const res = await graphRequest<{
    data?: {
      expires_at?: number;
      scopes?: string[];
      granular_scopes?: { scope: string; target_ids?: string[] }[];
    };
  }>("/debug_token", {
    method: "GET",
    query: {
      input_token: userToken,
      access_token: `${waAppId()}|${waAppSecret()}`,
    },
  });

  const data = res.data;
  if (!data) throw new WaError("UNAUTHORIZED", "Meta could not inspect that token", 502);

  const wabaIds = new Set<string>();
  for (const g of data.granular_scopes ?? []) {
    if (g.scope === "whatsapp_business_management" || g.scope === "whatsapp_business_messaging") {
      for (const id of g.target_ids ?? []) wabaIds.add(id);
    }
  }

  return {
    wabaIds: [...wabaIds],
    // expires_at 0 means "never" — a system user token, which is what we want.
    expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
    scopes: data.scopes ?? [],
  };
}

export interface WabaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  code_verification_status?: string;
  platform_type?: string;
}

export async function listWabaPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<WabaPhoneNumber[]> {
  const res = await graphGet<{ data?: WabaPhoneNumber[] }>(`/${wabaId}/phone_numbers`, accessToken, {
    fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type",
  });
  return res.data ?? [];
}

export async function getWaba(
  wabaId: string,
  accessToken: string
): Promise<{ id: string; name?: string; currency?: string; timezone_id?: string }> {
  return graphGet(`/${wabaId}`, accessToken, { fields: "id,name,currency,timezone_id" });
}

/**
 * Points a WABA's webhooks at our app.
 *
 * Without this Meta delivers that tenant's events nowhere and the whole inbox,
 * autoreply and delivery-status pipeline is silently dead for them — no error,
 * just no traffic. It is the step most easily forgotten during onboarding.
 */
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  await graphPost(`/${wabaId}/subscribed_apps`, accessToken);
}

/**
 * Registers the tenant's number on Cloud API.
 *
 * `pin` is the number's two-step verification PIN. Meta requires one, and a
 * number carrying a PIN from a previous provider cannot be registered until it
 * is cleared — that is the most common onboarding failure and it needs the
 * tenant to act, not us.
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string
): Promise<void> {
  await graphPost(`/${phoneNumberId}/register`, accessToken, {
    messaging_product: "whatsapp",
    pin,
  });
}

/**
 * Shares our extended credit line onto a tenant's WABA, so Meta invoices us
 * rather than the tenant.
 *
 * Returns false when we have no credit line to share, which today is always —
 * see the credit-line section of agent_docs/whatsapp-platform.md. The caller
 * must treat that as a normal onboarding outcome, not an error: the tenant then
 * keeps their own card on the WABA and our per-message charge becomes a software
 * fee instead of a resale margin. Onboarding must never fail on this.
 */
export async function shareCreditLine(
  wabaId: string,
  accessToken: string
): Promise<{ shared: boolean; reason?: string }> {
  const creditLineId = process.env.META_WA_EXTENDED_CREDIT_ID;
  if (!creditLineId) {
    return { shared: false, reason: "No extended credit line configured" };
  }

  try {
    await graphPost(`/${creditLineId}/whatsapp_credit_sharing_and_attach`, accessToken, {
      waba_id: wabaId,
      waba_currency: process.env.META_WA_CREDIT_CURRENCY ?? "INR",
    });
    return { shared: true };
  } catch (err) {
    const message = err instanceof WaGraphError ? err.message : "Credit line share failed";
    console.error("[wa] credit line share failed for waba", wabaId, message);
    return { shared: false, reason: message };
  }
}

export interface MetaTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: unknown[];
  example?: unknown;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  rejected_reason?: string;
  components?: MetaTemplateComponent[];
}

/** Submits a template for approval. Meta answers with an id and PENDING. */
export async function createTemplate(
  wabaId: string,
  accessToken: string,
  template: {
    name: string;
    language: string;
    category: string;
    components: MetaTemplateComponent[];
  }
): Promise<{ id: string; status?: string; category?: string }> {
  return graphPost(`/${wabaId}/message_templates`, accessToken, template);
}

/**
 * Reads templates back.
 *
 * Meta never tells us a verdict landed — a webhook exists but is not guaranteed
 * delivered, and a template can also be paused or recategorised weeks later.
 * The poll is the backstop, exactly as `cron/transcript-poll` is for Sarvam.
 */
export async function listTemplates(
  wabaId: string,
  accessToken: string,
  limit = 200
): Promise<MetaTemplate[]> {
  const res = await graphGet<{ data?: MetaTemplate[] }>(`/${wabaId}/message_templates`, accessToken, {
    fields: "id,name,language,status,category,rejected_reason,components",
    limit: String(limit),
  });
  return res.data ?? [];
}

export async function deleteTemplate(
  wabaId: string,
  accessToken: string,
  name: string
): Promise<void> {
  await graphDelete(`/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, accessToken);
}

export interface SendTemplateParams {
  phoneNumberId: string;
  to: string;
  templateName: string;
  language: string;
  components?: unknown[];
}

/** Sends an approved template. Returns Meta's message id (`wamid.…`). */
export async function sendTemplateMessage(
  accessToken: string,
  params: SendTemplateParams
): Promise<{ messageId: string }> {
  const res = await graphPost<{ messages?: { id?: string }[] }>(
    `/${params.phoneNumberId}/messages`,
    accessToken,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.language },
        ...(params.components?.length ? { components: params.components } : {}),
      },
    }
  );

  const messageId = res.messages?.[0]?.id;
  if (!messageId) throw new WaGraphError("Meta accepted the send but returned no message id", 502);
  return { messageId };
}

/**
 * Sends free-form text. Legal ONLY inside the 24-hour window opened by the
 * contact's last inbound message.
 *
 * Meta answers 200 whether or not the window is open, so a silent failure looks
 * exactly like a success. The window check belongs to the caller, before this.
 */
export async function sendTextMessage(
  accessToken: string,
  params: { phoneNumberId: string; to: string; body: string; previewUrl?: boolean }
): Promise<{ messageId: string }> {
  const res = await graphPost<{ messages?: { id?: string }[] }>(
    `/${params.phoneNumberId}/messages`,
    accessToken,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "text",
      text: { body: params.body, preview_url: params.previewUrl ?? false },
    }
  );

  const messageId = res.messages?.[0]?.id;
  if (!messageId) throw new WaGraphError("Meta accepted the send but returned no message id", 502);
  return { messageId };
}
