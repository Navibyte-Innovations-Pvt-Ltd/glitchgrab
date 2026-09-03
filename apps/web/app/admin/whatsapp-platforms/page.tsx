export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth, isAdminEmail } from "@/lib/auth";
import { listPlatforms } from "./actions";
import { PlatformsClient } from "./platforms-client";

/**
 * Platforms that resell our WhatsApp infra — Abhyasika, SevaStack, PracticeStack.
 *
 * Not under /org/[slug] on purpose: a `WaPlatform` has no org, because it is a
 * business relationship rather than anything to do with a GitHub repo. Gated by
 * the `ADMIN_EMAILS` allowlist, which fails closed when unset — so an empty env
 * locks everyone out rather than letting everyone in.
 */
export default async function WhatsappPlatformsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  // 404 rather than 403: an admin surface should not confirm it exists to
  // someone who cannot use it.
  if (!isAdminEmail(session.user.email)) redirect("/");

  return <PlatformsClient initialPlatforms={await listPlatforms()} />;
}
