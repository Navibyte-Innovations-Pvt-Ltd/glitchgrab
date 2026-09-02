/** Shared shapes. Mirrors the `/api/v1/wa` responses. */

export type WaTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE";
export type WaTemplateStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED";
export type WaMessageDirection = "INBOUND" | "OUTBOUND";
export type WaMessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
export type WaConversationStatus = "OPEN" | "SNOOZED" | "CLOSED";
export type WaMatchType = "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX" | "ANY";

/**
 * Every failure carries a stable `code`, so callers branch on that rather than
 * matching on a message that may be reworded.
 */
export type WaErrorCode =
  | "UNAUTHORIZED"
  | "PLATFORM_INACTIVE"
  | "TENANT_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "NO_PRICE_RULE"
  | "INVALID_AMOUNT"
  | "DUPLICATE_REQUEST"
  | "INTERNAL";

export class WhatsappError extends Error {
  constructor(
    readonly code: WaErrorCode | string,
    message: string,
    readonly status: number,
    readonly detail?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WhatsappError";
  }

  /** The owner has run out of balance. `detail.shortfallPaise` says by how much. */
  get isInsufficientFunds(): boolean {
    return this.code === "INSUFFICIENT_FUNDS";
  }
}

export interface WaNumber {
  phoneNumberId: string;
  displayNumber: string;
  verifiedName: string;
  status: "PENDING" | "VERIFIED" | "REGISTERED" | "DISCONNECTED";
  qualityRating?: string | null;
  messagingLimitTier?: string | null;
}

export interface WaMessage {
  id: string;
  direction: WaMessageDirection;
  status: WaMessageStatus;
  contactPhone?: string;
  category?: WaTemplateCategory | null;
  payload: unknown;
  error?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface WaConversation {
  id: string;
  contactPhone: string;
  contactName?: string | null;
  windowExpiresAt?: string | null;
  /** Whether free-form text is legal right now. Computed server-side. */
  windowOpen: boolean;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  optedOut: boolean;
  status: WaConversationStatus;
  assignedAgentId?: string | null;
  unreadCount: number;
  updatedAt: string;
  lastMessage?: WaMessage | null;
}

export interface WaTemplate {
  id: string;
  name: string;
  language: string;
  category: WaTemplateCategory;
  status: WaTemplateStatus;
  rejectionReason?: string | null;
  components?: unknown;
  submittedAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface WaAgent {
  id: string;
  externalAgentId: string;
  name: string;
  email?: string | null;
  role: "AGENT" | "ADMIN";
  active: boolean;
}

export interface WaBalance {
  balancePaise: number;
  heldPaise: number;
  spendablePaise: number;
}

export interface WaSendResult {
  messageId: string;
  metaMessageId: string;
  status: "SENT";
  category: WaTemplateCategory;
  tenantPricePaise: number;
  tenantBalancePaise: number;
}

export interface WaSignupLaunch {
  appId: string;
  configId: string;
  scopes: string[];
  state: string;
}
