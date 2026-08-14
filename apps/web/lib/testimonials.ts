import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * Testimonials for the marketing site (#309).
 *
 * glitchgrab.dev runs the SDK on itself, so the ratings people leave here land
 * in the Feedback table against whichever repo owns NEXT_PUBLIC_GLITCHGRAB_TOKEN.
 * This reads back only the entries an owner explicitly pressed **publish** on —
 * `approved` is the whole point of the flag, so nothing unvetted reaches the
 * landing page.
 */

interface Testimonial {
  id: string;
  rating: number;
  message: string;
  reporterName: string;
  createdAt: Date;
}

interface TestimonialSummary {
  items: Testimonial[];
  /** Mean rating across the published entries, rounded to 1dp. 0 when empty. */
  average: number;
  count: number;
}

const EMPTY: TestimonialSummary = { items: [], average: 0, count: 0 };

/**
 * Two indexed lookups, uncached on purpose: pressing **publish** in the
 * dashboard has to show up on the landing page immediately, and a stale-for-an-
 * hour testimonial wall reads as a broken feature.
 */
export async function getPublishedTestimonials(limit = 9): Promise<TestimonialSummary> {
  try {
    return await loadTestimonials(limit);
  } catch {
    // The marketing page must render even if the DB is unreachable.
    return EMPTY;
  }
}

async function loadTestimonials(limit: number): Promise<TestimonialSummary> {
  const token = process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN;
  if (!token) return EMPTY;

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { repoId: true },
  });
  if (!apiToken) return EMPTY;

  const rows = await prisma.feedback.findMany({
    where: {
      repoId: apiToken.repoId,
      approved: true,
      // A bare star with no words isn't a quote — it can't be rendered as one.
      message: { not: null },
    },
    select: {
      id: true,
      rating: true,
      message: true,
      reporterName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const items: Testimonial[] = rows
    .filter((r: (typeof rows)[number]) => (r.message ?? "").trim().length > 0)
    .map((r: (typeof rows)[number]) => ({
      id: r.id,
      rating: r.rating,
      message: (r.message ?? "").trim(),
      reporterName: r.reporterName,
      createdAt: r.createdAt,
    }));

  if (items.length === 0) return EMPTY;

  const mean = items.reduce((sum, i) => sum + i.rating, 0) / items.length;

  return {
    items,
    average: Math.round(mean * 10) / 10,
    count: items.length,
  };
}
