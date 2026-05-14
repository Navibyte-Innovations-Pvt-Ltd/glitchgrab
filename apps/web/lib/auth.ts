import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getUserOrgs, getUserOrgRoles, getGitHubUserLogin } from "@/lib/github";

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

        // Auto-detect org membership and upsert OrgMember with real GitHub role
        const [userOrgs, orgRoles] = await Promise.all([
          getUserOrgs(account.access_token),
          getUserOrgRoles(account.access_token),
        ]);
        if (userOrgs.length > 0) {
          const orgLogins = userOrgs.map((o) => o.login);
          const connectedOrgs = await prisma.organization.findMany({
            where: { githubOrgLogin: { in: orgLogins } },
          });
          for (const org of connectedOrgs) {
            const role = orgRoles.get(org.githubOrgLogin) ?? "MEMBER";
            await prisma.orgMember.upsert({
              where: { orgId_userId: { orgId: org.id, userId } },
              create: { orgId: org.id, userId, role },
              update: { role },
            });
          }
          // Cache first org slug in JWT so proxy can redirect /dashboard → /org/[slug]
          token.orgSlug = connectedOrgs[0]?.githubOrgLogin ?? null;
        } else {
          token.orgSlug = null;
        }
      }

      // Fallback: users who logged in before org feature — do a one-time DB lookup
      if (token.id && token.orgSlug === undefined) {
        const membership = await prisma.orgMember.findFirst({
          where: { userId: token.id as string },
          select: { org: { select: { githubOrgLogin: true } } },
        });
        token.orgSlug = membership?.org.githubOrgLogin ?? null;
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
