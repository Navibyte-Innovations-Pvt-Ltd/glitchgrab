-- Scope wallet idempotency keys to the wallet.
--
-- refKey was globally unique. Platforms pick their own keys, so two of them
-- both sending "topup-1" made the second call match the first's row — the
-- caller read back another platform's balance and their credit was silently
-- skipped. Cross-tenant disclosure plus lost money.

DROP INDEX IF EXISTS "WaWalletTxn_refKey_key";
CREATE UNIQUE INDEX "WaWalletTxn_walletId_refKey_key" ON "WaWalletTxn"("walletId", "refKey");
