export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Repo {
  id: string;
  githubId: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  description: string | null;
  createdAt: string;
  tokenCount: number;
  reportCount: number;
}

export interface Issue {
  githubNumber: number;
  githubUrl: string;
  title: string;
  labels: string[];
  severity: string | null;
  state?: "open" | "closed";
}

export interface Report {
  id: string;
  source: "SDK_AUTO" | "SDK_USER_REPORT" | "DASHBOARD_UPLOAD" | "HANDWRITTEN_NOTE" | "MCP" | "COLLABORATOR";
  status: "PENDING" | "PROCESSING" | "CREATED" | "DUPLICATE" | "FAILED";
  rawInput: string | null;
  errorStack: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  createdAt: string;
  reporterPrimaryKey: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  repo: {
    id: string;
    fullName: string;
    owner: string;
    name: string;
  };
  issue: Issue | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
