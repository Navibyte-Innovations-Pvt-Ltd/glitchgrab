import type { WhatsappClient } from "./client";

/**
 * A ready-made proxy route for the inbox UI.
 *
 * The browser must never hold your platform API key, so `<WhatsappInbox>` talks
 * to *your* server, and your server talks to us. This builds that middle layer
 * so you do not have to hand-write five thin fetch wrappers.
 *
 * ```ts
 * // app/api/whatsapp/[...action]/route.ts
 * import { createWhatsappClient, createInboxHandler } from "@glitchgrab/whatsapp";
 *
 * const client = createWhatsappClient({ apiKey: process.env.GG_WA_KEY! });
 *
 * const handler = createInboxHandler({
 *   client,
 *   // The single most important line here: derive the owner from YOUR session,
 *   // never from the request body. Returning a client-supplied id would let any
 *   // signed-in user read any other library's WhatsApp.
 *   resolveOwnerId: async () => (await auth()).user.libraryId,
 * });
 *
 * export const GET = handler;
 * export const POST = handler;
 * ```
 */

export interface InboxHandlerOptions {
  client: WhatsappClient;
  /**
   * Returns the owner id for the current request, from your own auth. Return
   * null to deny.
   */
  resolveOwnerId: (request: Request) => Promise<string | null> | string | null;
  /** Set false to make the inbox read-only for this route. Default true. */
  allowSend?: boolean;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function createInboxHandler(options: InboxHandlerOptions) {
  const { client, resolveOwnerId, allowSend = true } = options;

  return async function handler(request: Request): Promise<Response> {
    let ownerId: string | null;
    try {
      ownerId = await resolveOwnerId(request);
    } catch {
      ownerId = null;
    }

    if (!ownerId) return json({ error: "Unauthorized" }, 401);

    const url = new URL(request.url);
    // Everything after the mount point, so the route works wherever it is
    // mounted rather than assuming a fixed prefix.
    const segments = url.pathname.split("/").filter(Boolean);
    const action = segments[segments.length - 1] ?? "";
    // Avoids Array.prototype.at: this package ships into other people's
    // runtimes, and ES2022 methods are not worth the compatibility floor.
    const parent = segments[segments.length - 2] ?? "";

    try {
      if (request.method === "GET" && action === "conversations") {
        return json(
          await client.conversations({
            ownerId,
            status: url.searchParams.get("status") ?? undefined,
            unread: url.searchParams.get("unread") === "true",
            limit: Number(url.searchParams.get("limit")) || undefined,
            cursor: url.searchParams.get("cursor") ?? undefined,
          })
        );
      }

      // .../conversations/<id>
      if (request.method === "GET" && parent === "conversations") {
        return json(await client.conversation({ ownerId, conversationId: action }));
      }

      if (request.method === "GET" && action === "agents") {
        return json(await client.agents({ ownerId }));
      }

      if (request.method === "POST" && action === "ticket") {
        return json(await client.createInboxSession({ ownerId }));
      }

      if (request.method === "POST" && action === "send") {
        if (!allowSend) return json({ error: "Sending is disabled" }, 403);
        const body = (await request.json()) as {
          to?: string;
          body?: string;
          template?: string;
          language?: string;
          components?: unknown[];
        };
        const { to } = body;
        if (!to) return json({ error: "to is required" }, 400);
        return json(await client.send({ ...body, ownerId, to }));
      }

      if (request.method === "PATCH" && parent === "conversations") {
        const body = (await request.json()) as {
          status?: "OPEN" | "SNOOZED" | "CLOSED";
          assignedAgentId?: string | null;
          optedOut?: boolean;
        };
        return json(await client.updateConversation({ ownerId, conversationId: action, ...body }));
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      return json(
        {
          error: err instanceof Error ? err.message : "Request failed",
          code: (err as { code?: string }).code,
          detail: (err as { detail?: unknown }).detail,
        },
        status
      );
    }
  };
}
