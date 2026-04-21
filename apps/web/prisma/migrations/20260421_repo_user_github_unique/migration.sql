-- Scope Repo.githubId uniqueness per user so multiple users can connect the same GitHub repo.
-- Previous constraint: Repo.githubId globally unique (one user could block all others).

-- DropIndex
DROP INDEX "Repo_githubId_key";

-- CreateIndex
CREATE INDEX "Repo_githubId_idx" ON "Repo"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_userId_githubId_key" ON "Repo"("userId", "githubId");
