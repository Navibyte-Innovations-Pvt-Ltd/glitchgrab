import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GSTATIC = "https://t1.gstatic.com/faviconV2";

async function fetchFavicon(domain: string, size: number) {
  const url = `${GSTATIC}?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(domain)}&size=${size}`;
  const res = await fetch(url, { cache: "no-store" });
  return res;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get("domain")?.trim();
  const size = Number(searchParams.get("size") ?? "32");
  if (!rawDomain) return new NextResponse("Missing domain", { status: 400 });

  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const candidates = domain.startsWith("www.")
    ? [domain, domain.replace(/^www\./, "")]
    : [domain, `www.${domain}`];

  for (const candidate of candidates) {
    const res = await fetchFavicon(candidate, size);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
