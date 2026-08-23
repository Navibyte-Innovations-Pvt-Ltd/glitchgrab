"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Github, FlaskConical } from "lucide-react";
import { TesterSignInForm } from "./tester-signin-form";

/**
 * Two front doors, one page. Repo owners sign in with GitHub; QA testers sign in
 * with the phone number their admin invited — they have no GitHub account and
 * no repo of their own. `?tab=tester` deep-links straight to the tester side,
 * which is what every "sign in" link we send a tester points at.
 */
export function LoginTabs({ owner }: { owner: React.ReactNode }) {
  const params = useSearchParams();
  const [tab, setTab] = useState<"owner" | "tester">(
    params.get("tab") === "tester" ? "tester" : "owner"
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/40 bg-muted/30 p-1">
        {(
          [
            { key: "owner", label: "Repo owner", Icon: Github },
            { key: "tester", label: "Tester", Icon: FlaskConical },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "owner" ? owner : <TesterSignInForm />}
    </div>
  );
}
