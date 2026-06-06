-- AiEnhanceLog: tracks before/after text for every AI enhance call
-- Allows auditing whether Gemini is preserving user intent

CREATE TABLE "AiEnhanceLog" (
    "id"           TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "enhancedText" TEXT NOT NULL,
    "changed"      BOOLEAN NOT NULL,
    "pageUrl"      TEXT,
    "apiTokenId"   TEXT,
    "userId"       TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEnhanceLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "AiEnhanceLog"
    ADD CONSTRAINT "AiEnhanceLog_apiTokenId_fkey"
    FOREIGN KEY ("apiTokenId") REFERENCES "ApiToken"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiEnhanceLog"
    ADD CONSTRAINT "AiEnhanceLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
