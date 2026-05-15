import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface DashboardRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

interface DashboardContext {
  userName: string;
  repos: DashboardRepo[];
  hasOwnerSession: boolean;
}

export async function getDashboardContext(): Promise<DashboardContext> {
  const session = await auth();

  const userName = session?.user?.name?.split(" ")[0] ?? "there";

  const repos = session?.user?.id
    ? await prisma.repo.findMany({
        where: { userId: session.user.id },
        select: { id: true, fullName: true, owner: true, name: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return {
    userName,
    repos,
    hasOwnerSession: !!session?.user?.id,
  };
}
