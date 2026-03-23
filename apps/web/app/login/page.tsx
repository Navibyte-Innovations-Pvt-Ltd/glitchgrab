import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GitHubSignInButton } from "./github-signin-button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Glitchgrab"
            width={64}
            height={64}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold">Welcome to Glitchgrab</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to start capturing bugs and creating issues
            automatically.
          </p>
        </div>

        <GitHubSignInButton />

        <p className="text-xs text-muted-foreground">
          We need repo access to create issues on your behalf.
          <br />
          Your code is never read or stored.
        </p>
      </div>
    </div>
  );
}
