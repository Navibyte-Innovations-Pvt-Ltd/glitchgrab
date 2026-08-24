-- Publisher id belongs to the account, not the extension (#332).
--
-- Every item on one publisher account shares it, so asking per extension asks
-- the same question repeatedly. Nullable because a connection is made before
-- the first extension is added — the id arrives with that one.

ALTER TABLE "StoreConnection" ADD COLUMN "publisherId" TEXT;

-- Carry across whatever the existing rows already know, so nobody is asked
-- again for a value they have already given.
UPDATE "StoreConnection" c
SET "publisherId" = e."publisherId"
FROM "StoreExtension" e
WHERE e."connectionId" = c."id" AND c."publisherId" IS NULL;

ALTER TABLE "StoreExtension" DROP COLUMN "publisherId";
