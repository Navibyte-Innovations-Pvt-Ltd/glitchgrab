-- NarrationTelemetry: persistent training/feedback record per narration generation.
-- Unlike CaptureSession (which expires), this survives so we can analyze how much
-- refinement scripts need and improve the model. One row per capture session;
-- the generate route writes the initial row, the refine route appends each turn.

-- CreateTable
CREATE TABLE "NarrationTelemetry" (
    "id"                TEXT NOT NULL,
    "sessionId"         TEXT NOT NULL,
    -- input context
    "events"            JSONB NOT NULL,
    "meta"              JSONB,
    "appName"           TEXT,
    "lang"              TEXT,
    "gender"            TEXT,
    "durationSec"       INTEGER,
    "eventCount"        INTEGER NOT NULL DEFAULT 0,
    "hasNotes"          BOOLEAN NOT NULL DEFAULT false,
    "noteCount"         INTEGER NOT NULL DEFAULT 0,
    "noteAnswers"       JSONB,
    -- initial generation
    "model"             TEXT NOT NULL,
    "genLatencyMs"      INTEGER NOT NULL DEFAULT 0,
    "initialScript"     TEXT NOT NULL DEFAULT '',
    "initialChars"      INTEGER NOT NULL DEFAULT 0,
    "wasEmpty"          BOOLEAN NOT NULL DEFAULT false,
    "wasRoman"          BOOLEAN NOT NULL DEFAULT false,
    "devanagariRetried" BOOLEAN NOT NULL DEFAULT false,
    "devanagariRatio"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    -- refinements (appended by the refine route)
    "refinements"       JSONB NOT NULL DEFAULT '[]',
    "refineCount"       INTEGER NOT NULL DEFAULT 0,
    "finalScript"       TEXT NOT NULL DEFAULT '',
    "finalChars"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NarrationTelemetry_pkey" PRIMARY KEY ("id")
);

-- One telemetry row per capture session (generate upserts, refine updates).
CREATE UNIQUE INDEX "NarrationTelemetry_sessionId_key" ON "NarrationTelemetry"("sessionId");

-- Analytics: per-product and time-ordered queries.
CREATE INDEX "NarrationTelemetry_appName_idx" ON "NarrationTelemetry"("appName");
CREATE INDEX "NarrationTelemetry_createdAt_idx" ON "NarrationTelemetry"("createdAt");
