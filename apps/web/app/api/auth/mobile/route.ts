export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encode } from "next-auth/jwt";

/**
 * POST /api/auth/mobile
 *
 * Receives a GitHub OAuth code from the mobile app.
 * Exchanges it for an access token (server-side, with client secret),
 * finds or creates the user, and returns a JWT session token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, code_verifier } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing code" },
        { status: 400 }
      );
    }

    // Step 1: Exchange code for GitHub access token (server-side with secret)
    const tokenBody: Record<string, string> = {
      client_id: process.env.GITHUB_MOBILE_CLIENT_ID ?? "",
      client_secret: process.env.GITHUB_MOBILE_CLIENT_SECRET ?? "",
      code,
    };
    if (code_verifier) {
      tokenBody.code_verifier = code_verifier;
    }

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(tokenBody),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error("GitHub token exchange failed:", {
        status: tokenRes.status,
        error: tokenData.error,
        description: tokenData.error_description,
        clientIdSet: !!process.env.GITHUB_MOBILE_CLIENT_ID,
        clientSecretSet: !!process.env.GITHUB_MOBILE_CLIENT_SECRET,
      });
    }

    if (tokenData.error) {
      return NextResponse.json(
        {
          success: false,
          error: tokenData.error_description || tokenData.error,
        },
        { status: 401 }
      );
    }

    const access_token = tokenData.access_token as string;

    // Step 2: Fetch user profile from GitHub
    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    ]);

    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch GitHub profile" },
        { status: 401 }
      );
    }

    const profile = await profileRes.json();
    const emails: Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }> = emailsRes.ok ? await emailsRes.json() : [];

    const primaryEmail =
      emails.find((e) => e.primary && e.verified)?.email ||
      emails.find((e) => e.verified)?.email ||
      profile.email;

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: "No verified email found" },
        { status: 400 }
      );
    }

    const githubId = String(profile.id);

    // Step 3: Find or create user + account
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "github",
          providerAccountId: githubId,
        },
      },
      include: { user: true },
    });

    let user;

    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { access_token },
      });
      user = account.user;
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { email: primaryEmail },
      });

      if (existingUser) {
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            type: "oauth",
            provider: "github",
            providerAccountId: githubId,
            access_token,
            token_type: "bearer",
            scope: "read:user,user:email,repo",
          },
        });
        user = existingUser;
      } else {
        user = await prisma.user.create({
          data: {
            name: profile.name || profile.login,
            email: primaryEmail,
            image: profile.avatar_url,
            accounts: {
              create: {
                type: "oauth",
                provider: "github",
                providerAccountId: githubId,
                access_token,
                token_type: "bearer",
                scope: "read:user,user:email,repo",
              },
            },
          },
        });
      }
    }

    // Step 4: Create JWT session token
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const sessionToken = await encode({
      token: {
        name: user.name,
        email: user.email,
        picture: user.image,
        sub: user.id,
        id: user.id,
      },
      secret,
      salt: "authjs.session-token",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (err) {
    console.error("Mobile auth error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
