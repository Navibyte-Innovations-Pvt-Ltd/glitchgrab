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
