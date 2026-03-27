"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, CheckCircle } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/contact", { name, email, message });
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setName("");
      setEmail("");
      setMessage("");
    },
  });

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle className="h-10 w-10 text-primary" />
        <p className="text-lg font-semibold">Message sent!</p>
        <p className="text-sm text-muted-foreground">We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name && email && message) mutate();
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's on your mind? Feature request, question, feedback — anything."
        required
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />
      {isError && (
        <p className="text-xs text-destructive">
          {error instanceof Error ? error.message : "Something went wrong. Try again."}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
