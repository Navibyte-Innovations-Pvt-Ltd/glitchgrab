import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getUserOrgs, getGitHubUserLogin } from "@/lib/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "github" && account.access_token && token.id) {
        const userId = token.id as string;

        await prisma.account.updateMany({
          where: { userId, provider: "github" },
          data: {
            access_token: account.access_token,
            token_type: account.token_type,
            scope: account.scope,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
          },
        });

        // Store githubLogin on User
        const githubLogin = await getGitHubUserLogin(account.access_token);
        if (githubLogin) {
          await prisma.user.update({ where: { id: userId }, data: { githubLogin } });
          token.githubLogin = githubLogin;
        }

        // Auto-detect org membership and upsert OrgMember
        const userOrgs = await getUserOrgs(account.access_token);
        if (userOrgs.length > 0) {
          const orgLogins = userOrgs.map((o) => o.login);
          const connectedOrgs = await prisma.organization.findMany({
            where: { githubOrgLogin: { in: orgLogins } },
          });
          for (const org of connectedOrgs) {
            const isOwner = org.ownerId === userId;
            await prisma.orgMember.upsert({
              where: { orgId_userId: { orgId: org.id, userId } },
              create: { orgId: org.id, userId, role: isOwner ? "OWNER" : "MEMBER" },
              update: {},
            });
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      if (session.user && token.githubLogin) {
        (session.user as { githubLogin?: string }).githubLogin = token.githubLogin as string;
      }
      return session;
    },
  },
});
