export { WaError, insufficientFunds, type WaErrorCode } from "./errors";
export {
  generateWaPlatformKey,
  hashWaPlatformKey,
  authenticatePlatform,
  resolveTenant,
  requireTenant,
  type AuthedPlatform,
} from "./auth";
export {
  getOrCreateWallet,
  getBalance,
  credit,
  chargeMessage,
  holdFunds,
  settleHold,
  refund,
  type WalletBalance,
  type ChargeResult,
} from "./wallet";
export {
  resolvePrice,
  setPrices,
  listCurrentPrices,
  type ResolvedPrice,
  type PriceRuleInput,
} from "./pricing";
export {
  WA_GRAPH_VERSION,
  WaGraphError,
  exchangeCodeForToken,
  debugToken,
  listWabaPhoneNumbers,
  subscribeAppToWaba,
  registerPhoneNumber,
  shareCreditLine,
} from "./graph";
export {
  EMBEDDED_SIGNUP_SCOPES,
  buildSignupLaunch,
  completeSignup,
  getTenantToken,
  refreshTenantNumbers,
  type CompleteSignupResult,
} from "./onboarding";
export {
  verifyWebhookSignature,
  ingestWebhook,
  markEventProcessed,
  type RoutedEvent,
  type WebhookPayload,
} from "./webhook";
export {
  saveTemplate,
  submitTemplate,
  syncTemplates,
  removeTemplate,
  type TemplateDraft,
  type SyncResult,
} from "./templates";
export { sendTemplate, sendText, type SendResult } from "./send";
export {
  SERVICE_WINDOW_MS,
  normalizeContact,
  detectOptOut,
  recordInbound,
  recordOutbound,
  getWindowState,
  markConversationRead,
  type WindowState,
} from "./conversations";
export {
  createRule,
  updateRule,
  deleteRule,
  listRules,
  matchRule,
  type RuleInput,
  type MatchedRule,
} from "./autoreply";
export {
  upsertAgent,
  listAgents,
  deactivateAgent,
  requireAgent,
  type AgentInput,
} from "./agents";
export { issueStreamTicket, verifyStreamTicket, type TicketClaims } from "./stream-ticket";
