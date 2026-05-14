import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GitFork } from "lucide-react";

interface NoReposStateProps {
  canConnect: boolean;
}

export function NoReposState({ canConnect }: NoReposStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="border-dashed max-w-sm w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No repos connected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect a GitHub repo to start reporting bugs.
          </p>
          {canConnect && (
            <Link href="/dashboard/repos">
              <Button>Connect a Repo</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
