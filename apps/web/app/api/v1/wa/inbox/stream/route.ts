export const dynamic = "force-dynamic";

/**
 * Vercel kills a function at this limit regardless of what the stream is doing,
 * so the loop below closes itself a little earlier and lets the browser
 * reconnect cleanly rather than seeing a truncated response.
 */
export const maxDuration = 300;

import { prisma } from "@/lib/db";
import { verifyStreamTicket } from "@/lib/wa/stream-ticket";
import { WaError } from "@/lib/wa/errors";

/**
 * Live inbox updates over Server-Sent Events.
 *
 * **Why polling inside a stream rather than an event bus.** On Vercel each
 * request is its own serverless instance, so the process holding this connection
 * is almost never the one running the webhook that received the message. An
 * in-process EventEmitter would compile, pass review, and deliver nothing in
 * production. Redis pub/sub would work but is infrastructure this stack does not
 * have. So the server polls Postgres on a short interval and pushes deltas — the
 * client still gets push semantics, and it is correct across any number of
 * instances.
 *
 * The query is a covered index scan on `(tenantId, status, updatedAt)` bounded
 * by a watermark, so an idle inbox costs one cheap query every two seconds.
 */

const POLL_INTERVAL_MS = 2000;
/** Comfortably under `maxDuration`, so we close rather than get killed. */
const MAX_STREAM_MS = 270_000;
/** Proxies and load balancers drop a connection that goes quiet. */
const HEARTBEAT_MS = 15_000;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  let claims: { tenantId: string };
  try {
    claims = verifyStreamTicket(params.get("ticket"));
  } catch (err) {
    const status = err instanceof WaError ? err.status : 401;
    return new Response("Unauthorized", { status });
  }

  const { tenantId } = claims;

  // Resume point. `Last-Event-ID` is sent by the browser automatically on
  // reconnect, so a dropped connection does not lose the messages that arrived
  // while it was down.
  const lastEventId = request.headers.get("last-event-id") ?? params.get("since");
  let watermark = lastEventId ? new Date(Number(lastEventId)) : new Date();
  if (Number.isNaN(watermark.getTime())) watermark = new Date();

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // The client aborting is the normal way this ends — a closed tab, a
      // navigation, a reconnect.
      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      send(`retry: 3000\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ since: watermark.toISOString() })}\n\n`);

      let lastHeartbeat = Date.now();

      while (!closed && Date.now() - startedAt < MAX_STREAM_MS) {
        try {
          const changed = await prisma.waConversation.findMany({
            where: { tenantId, updatedAt: { gt: watermark } },
            orderBy: { updatedAt: "asc" },
            take: 50,
            select: {
              id: true,
              contactPhone: true,
              contactName: true,
              windowExpiresAt: true,
              lastInboundAt: true,
              lastOutboundAt: true,
              optedOut: true,
              status: true,
              assignedAgentId: true,
              unreadCount: true,
              updatedAt: true,
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  direction: true,
                  status: true,
                  payload: true,
                  createdAt: true,
                },
              },
            },
          });

          if (changed.length > 0) {
            const now = Date.now();
            for (const conversation of changed) {
              watermark = conversation.updatedAt;
              // The event id IS the watermark, so Last-Event-ID on reconnect
              // resumes exactly where this left off.
              send(
                `id: ${conversation.updatedAt.getTime()}\n` +
                  `event: conversation\n` +
                  `data: ${JSON.stringify({
                    ...conversation,
                    windowOpen:
                      !!conversation.windowExpiresAt &&
                      conversation.windowExpiresAt.getTime() > now,
                    lastMessage: conversation.messages[0] ?? null,
                    messages: undefined,
                  })}\n\n`
              );
            }
            lastHeartbeat = Date.now();
          } else if (Date.now() - lastHeartbeat > HEARTBEAT_MS) {
            // A comment line: valid SSE, ignored by EventSource, and enough to
            // stop an idle connection being reaped.
            send(`: keepalive\n\n`);
            lastHeartbeat = Date.now();
          }
        } catch (err) {
          console.error("[wa-stream] poll failed", err);
          send(`event: error\ndata: ${JSON.stringify({ message: "poll failed" })}\n\n`);
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // Tell the client this was a planned close, not a crash, before the
      // platform's own timeout would have cut it off mid-frame.
      send(`event: reconnect\ndata: ${JSON.stringify({ since: watermark.toISOString() })}\n\n`);
      try {
        controller.close();
      } catch {
        /* already closed by the abort handler */
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and friends buffer streamed responses by default, which turns SSE
      // into one long silence followed by everything at once.
      "X-Accel-Buffering": "no",
    },
  });
}
