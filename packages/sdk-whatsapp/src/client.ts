import {
  WhatsappError,
  type WaAgent,
  type WaBalance,
  type WaConversation,
  type WaMatchType,
  type WaMessage,
  type WaNumber,
  type WaSendResult,
  type WaSignupLaunch,
  type WaTemplate,
  type WaTemplateCategory,
} from "./types";

/**
 * The server-side client.
 *
 * **This holds your platform API key. It must never run in a browser** — the key
 * is scoped to your whole account, and every one of your customers' numbers is
 * reachable with it. Call it from a route handler or a server action, and give
 * the browser only what it needs. `createInboxSession()` exists precisely so the
 * inbox UI can work without the key ever leaving your server.
 *
 * `ownerId` is *your* user id for the business owner. We map it to a tenant on
 * our side, so you never handle a WABA id, a phone number id, or a Meta token.
 */

export interface WhatsappClientOptions {
  apiKey: string;
  /** Override for local development against a tunnel. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  detail?: Record<string, unknown>;
}

const DEFAULT_BASE_URL = "https://glitchgrab.dev";

export class WhatsappClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: WhatsappClientOptions) {
    if (!options.apiKey) throw new Error("@glitchgrab/whatsapp: apiKey is required");

    if (typeof window !== "undefined") {
      // Loud on purpose. A key that reaches a bundle is a key that reaches every
      // visitor, and the failure is otherwise completely silent.
      console.error(
        "[@glitchgrab/whatsapp] WhatsappClient is running in a browser. Your API key is now " +
          "public. Move this to a server route and use createInboxSession() for the UI."
      );
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/wa${path}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    const res = await this.fetchImpl(url.toString(), {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await res.json()) as ApiEnvelope<T>;
    } catch {
      throw new WhatsappError("INTERNAL", `Unexpected response (${res.status})`, res.status);
    }

    if (!res.ok || !envelope.success) {
      throw new WhatsappError(
        envelope.code ?? "INTERNAL",
        envelope.error ?? `Request failed (${res.status})`,
        res.status,
        envelope.detail
      );
    }

    return envelope.data as T;
  }

  // ── Onboarding ────────────────────────────────────────────────────────────

  /**
   * Starts Embedded Signup for one of your business owners.
   *
   * Returns config for Meta's JS SDK, not a redirect URL — a plain OAuth
   * redirect yields a token but skips WABA creation, which is the part the owner
   * actually needs. Pass the result to `launchSignup()` in the browser.
   */
  connect(params: { ownerId: string; ownerName?: string }): Promise<WaSignupLaunch> {
    return this.request("/signup/launch", { method: "POST", body: params });
  }

  /** Exchanges the code Meta's popup returns. Call this from your server. */
  completeConnect(params: {
    ownerId: string;
    code: string;
    state?: string;
  }): Promise<{ wabaId: string; numbers: WaNumber[]; creditLineShared: boolean; warnings: string[] }> {
    return this.request("/signup/exchange", { method: "POST", body: params });
  }

  numbers(params: { ownerId: string; refresh?: boolean }): Promise<{ numbers: WaNumber[] }> {
    return this.request("/numbers", {
      query: { ownerId: params.ownerId, refresh: params.refresh ? "true" : undefined },
    });
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  templates(params: { ownerId: string; status?: string }): Promise<{ templates: WaTemplate[] }> {
    return this.request("/templates", {
      query: { ownerId: params.ownerId, status: params.status },
    });
  }

  saveTemplate(params: {
    ownerId: string;
    name: string;
    language: string;
    category: WaTemplateCategory;
    components: unknown[];
  }): Promise<{ template: WaTemplate }> {
    return this.request("/templates", { method: "POST", body: params });
  }

  /** Sends a draft to Meta. The verdict arrives asynchronously — poll or wait. */
  submitTemplate(params: { ownerId: string; templateId: string }): Promise<{ template: WaTemplate }> {
    return this.request(`/templates/${params.templateId}/submit`, {
      method: "POST",
      body: { ownerId: params.ownerId },
    });
  }

  /** Reconciles against Meta now, rather than waiting for the hourly sweep. */
  syncTemplates(params: { ownerId: string }): Promise<{ checked: number; updated: number }> {
    return this.request("/templates/sync", { method: "POST", body: params });
  }

  // ── Sending ───────────────────────────────────────────────────────────────

  /**
   * Sends a message from the owner's own number.
   *
   * With `template`, any time. With `body`, only inside the 24-hour window the
   * contact opened by messaging them — outside it this throws rather than
   * letting Meta accept the send and deliver nothing.
   *
   * Pass `refKey` to make a retry safe: the same key never charges twice.
   */
  send(params: {
    ownerId: string;
    to: string;
    template?: string;
    language?: string;
    components?: unknown[];
    body?: string;
    refKey?: string;
  }): Promise<WaSendResult> {
    return this.request("/messages/send", { method: "POST", body: params });
  }

  messages(params: {
    ownerId: string;
    contact?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ messages: WaMessage[]; nextCursor: string | null }> {
    return this.request("/messages", {
      query: {
        ownerId: params.ownerId,
        contact: params.contact,
        limit: params.limit?.toString(),
        cursor: params.cursor,
      },
    });
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────

  conversations(params: {
    ownerId: string;
    status?: string;
    unread?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ conversations: WaConversation[]; nextCursor: string | null }> {
    return this.request("/conversations", {
      query: {
        ownerId: params.ownerId,
        status: params.status,
        unread: params.unread ? "true" : undefined,
        limit: params.limit?.toString(),
        cursor: params.cursor,
      },
    });
  }

  conversation(params: {
    ownerId: string;
    conversationId: string;
  }): Promise<{ conversation: WaConversation & { messages: WaMessage[] } }> {
    return this.request(`/conversations/${params.conversationId}`, {
      query: { ownerId: params.ownerId },
    });
  }

  updateConversation(params: {
    ownerId: string;
    conversationId: string;
    status?: "OPEN" | "SNOOZED" | "CLOSED";
    assignedAgentId?: string | null;
    optedOut?: boolean;
  }): Promise<{ updated: boolean }> {
    const { conversationId, ...body } = params;
    return this.request(`/conversations/${conversationId}`, { method: "PATCH", body });
  }

  agents(params: { ownerId: string; includeInactive?: boolean }): Promise<{ agents: WaAgent[] }> {
    return this.request("/agents", {
      query: {
        ownerId: params.ownerId,
        includeInactive: params.includeInactive ? "true" : undefined,
      },
    });
  }

  saveAgent(params: {
    ownerId: string;
    agentId: string;
    name: string;
    email?: string;
    role?: "AGENT" | "ADMIN";
    active?: boolean;
  }): Promise<{ agent: WaAgent }> {
    return this.request("/agents", { method: "POST", body: params });
  }

  // ── Autoreply ─────────────────────────────────────────────────────────────

  autoreplyRules(params: { ownerId: string }): Promise<{ rules: unknown[] }> {
    return this.request("/autoreply/rules", { query: { ownerId: params.ownerId } });
  }

  createAutoreplyRule(params: {
    ownerId: string;
    name: string;
    matchType: WaMatchType;
    pattern?: string;
    replyText: string;
    priority?: number;
  }): Promise<{ rule: unknown }> {
    return this.request("/autoreply/rules", { method: "POST", body: params });
  }

  // ── Wallet ────────────────────────────────────────────────────────────────

  /**
   * Adds balance for one of your owners, after you have collected the money on
   * your own rails. We hold the ledger; we never hold your customer's funds.
   */
  credit(params: {
    ownerId: string;
    amountPaise: number;
    refKey?: string;
    note?: string;
  }): Promise<WaBalance> {
    return this.request("/wallet/credit", { method: "POST", body: params });
  }

  balance(params: { ownerId?: string } = {}): Promise<WaBalance> {
    return this.request("/wallet/balance", { query: { ownerId: params.ownerId } });
  }

  // ── Inbox session ─────────────────────────────────────────────────────────

  /**
   * Mints a short-lived, owner-scoped session for the inbox UI.
   *
   * Call this from a server route and return the result to your page. It is
   * what lets `<WhatsappInbox>` talk to us without your API key ever reaching
   * the browser. The ticket lasts sixty seconds; the component refreshes it
   * through the same route on reconnect.
   */
  async createInboxSession(params: {
    ownerId: string;
  }): Promise<{ ownerId: string; ticket: string; expiresIn: number; baseUrl: string }> {
    const data = await this.request<{ ticket: string; expiresIn: number }>("/inbox/ticket", {
      method: "POST",
      body: { ownerId: params.ownerId },
    });
    return { ownerId: params.ownerId, baseUrl: this.baseUrl, ...data };
  }
}

export function createWhatsappClient(options: WhatsappClientOptions): WhatsappClient {
  return new WhatsappClient(options);
}
