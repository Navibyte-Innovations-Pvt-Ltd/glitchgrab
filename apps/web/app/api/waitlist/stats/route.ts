import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [count, recent] = await Promise.all([
    prisma.waitlist.count(),
    prisma.waitlist.findMany({
      select: { email: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    count,
    initials: recent.map((w) => w.email[0].toUpperCase()),
  });
}
