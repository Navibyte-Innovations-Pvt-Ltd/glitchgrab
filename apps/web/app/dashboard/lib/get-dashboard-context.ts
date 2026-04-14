import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";

export interface DashboardRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

export interface DashboardContext {
  userName: string;
  repos: DashboardRepo[];
  hasOwnerSession: boolean;
  hasCollabOnly: boolean;
}

export async function getDashboardContext(): Promise<DashboardContext> {
  const session = await auth();
  const collabSession = await getCollabSession();

  const userName =
    session?.user?.name?.split(" ")[0] ??
    collabSession?.email.split("@")[0] ??
    "there";

  const ownRepos = session?.user?.id
    ? await prisma.repo.findMany({
        where: { userId: session.user.id },
        select: { id: true, fullName: true, owner: true, name: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const sharedRepos = collabSession
    ? await prisma.collaboratorRepo.findMany({
        where: {
          collaborator: {
            id: collabSession.collaboratorId,
            status: "ACCEPTED",
          },
        },
        include: {
          repo: { select: { id: true, fullName: true, owner: true, name: true } },
        },
      })
    : [];

  const seenIds = new Set(ownRepos.map((r) => r.id));
  const repos: DashboardRepo[] = [
    ...ownRepos,
    ...sharedRepos.map((cr) => cr.repo).filter((r) => !seenIds.has(r.id)),
  ];

  return {
    userName,
    repos,
    hasOwnerSession: !!session?.user?.id,
    hasCollabOnly: !!collabSession && !session?.user?.id,
  };
}
