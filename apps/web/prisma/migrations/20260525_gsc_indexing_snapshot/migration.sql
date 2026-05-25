-- Indexing history snapshots: one row per sync or reindex event.
CREATE TABLE IF NOT EXISTS "GscIndexingSnapshot" (
  "id"              TEXT NOT NULL,
  "propertyId"      TEXT NOT NULL,
  "kind"            TEXT NOT NULL,
  "indexedCount"    INTEGER NOT NULL DEFAULT 0,
  "notIndexedCount" INTEGER NOT NULL DEFAULT 0,
  "totalChecked"    INTEGER NOT NULL DEFAULT 0,
  "submittedCount"  INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GscIndexingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GscIndexingSnapshot_propertyId_createdAt_idx"
  ON "GscIndexingSnapshot" ("propertyId", "createdAt");

ALTER TABLE "GscIndexingSnapshot"
  ADD CONSTRAINT "GscIndexingSnapshot_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "GscProperty"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
