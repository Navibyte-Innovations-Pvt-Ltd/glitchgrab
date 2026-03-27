"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

export function HeroWaitlist() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["waitlist-stats"],
    queryFn: async () => {
      const { data } = await axios.get("/api/waitlist/stats");
      return data as { count: number; initials: string[] };
    },
  });

  const mutation = useMutation({
    mutationFn: async (emailInput: string) => {
      const { data } = await axios.post("/api/waitlist", { email: emailInput });
      if (!data.success) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          You&apos;re in! We&apos;ll email you when it&apos;s ready.
        </div>
      </div>
    );
  }

  const count = stats?.count ?? 0;
  const initials = stats?.initials ?? [];

  return (
    <div className="mt-6 sm:mt-8 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const trimmed = email.trim();
          if (!trimmed) return;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmed)) {
            setError("Enter a valid email address");
            return;
          }
          mutation.mutate(trimmed);
        }}
        className="flex flex-col gap-2 sm:flex-row sm:gap-0 max-w-md lg:mx-0 mx-auto"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="flex-1 h-11 rounded-lg sm:rounded-r-none border border-border bg-background/60 backdrop-blur-sm px-4 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary transition"
        />
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="sm:rounded-l-none gap-2 h-11 px-6 text-sm font-semibold"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Get Early Access
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {(error || mutation.isError) && (
        <p className="text-xs text-red-400">{error || mutation.error?.message}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground lg:justify-start justify-center">
        {initials.length > 0 && (
          <div className="flex -space-x-2">
            {initials.map((letter, i) => (
              <div
                key={i}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold text-white"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {letter}
              </div>
            ))}
          </div>
        )}
        {count > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {count}+ devs on the waitlist
          </span>
        )}
        <span className="hidden sm:inline text-border">|</span>
        <span className="hidden sm:inline">Free tier. No credit card.</span>
      </div>
    </div>
  );
}
