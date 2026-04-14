export interface AiInput {
  description: string;
  screenshotUrl?: string | null;
  errorStack?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  openIssues?: { number: number; title: string; state: string; body: string }[];
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  repoReadme?: string | null;
  repoDescription?: string | null;
}

export type AiAction =
  | { intent: "create"; title: string; body: string; labels: string[]; severity: string }
  | { intent: "update"; issueNumber: number; comment: string }
  | { intent: "close"; issueNumbers: number[]; comment: string }
  | {
      intent: "merge";
      keepIssue: number;
      closeIssues: number[];
      mergedTitle: string;
      mergedBody: string;
    }
  | { intent: "chat"; message: string }
  | { intent: "clarify"; questions: ClarifyQuestion[] };

export interface ClarifyQuestion {
  question: string;
  options: string[];
}
