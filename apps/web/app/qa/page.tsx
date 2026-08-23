export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getTesterSession } from "@/lib/tester-session";

/**
 * /qa — kept only so old bookmarks and printed links land somewhere sane.
 * Testers live at /dashboard now; the sign-in form is the Tester tab on /login.
 */
export default async function QaPage() {
  const testerId = await getTesterSession();
  redirect(testerId ? "/dashboard" : "/login?tab=tester");
}
