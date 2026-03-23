export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";
import { CreateTokenDialog } from "./create-token-dialog";
import { DeleteTokenButton } from "./delete-token-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TokensPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const repos = await prisma.repo.findMany({
    where: { userId },
    select: { id: true, fullName: true },
    orderBy: { createdAt: "desc" },
  });

  const tokens = await prisma.apiToken.findMany({
    where: { repo: { userId } },
    include: { repo: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Tokens</h1>
          <p className="text-sm text-muted-foreground">
            Generate tokens for the Glitchgrab SDK
          </p>
        </div>
        {repos.length > 0 && <CreateTokenDialog repos={repos} />}
      </div>

      {repos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect a repo first</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              You need at least one connected repo to generate API tokens.
            </p>
            <Link href="/dashboard/repos">
              <Button>Connect a Repo</Button>
            </Link>
          </CardContent>
        </Card>
      ) : tokens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create an API token to use with the Glitchgrab SDK in your app.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((token: typeof tokens[number]) => (
            <Card key={token.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{token.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {token.repo.fullName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        gg_••••••••
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">
                      Created {token.createdAt.toLocaleDateString()}
                    </p>
                    {token.lastUsed && (
                      <p className="text-xs text-muted-foreground">
                        Last used {token.lastUsed.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <DeleteTokenButton tokenId={token.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
