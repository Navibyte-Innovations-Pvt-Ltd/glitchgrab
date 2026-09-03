export default async function AuthorizeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Can&apos;t connect</h1>
      <p className="text-sm text-muted-foreground">
        {reason === "redirect_uri"
          ? "The redirect address does not match what the application registered, so the request was stopped."
          : "The connection request could not be completed."}
      </p>
      <p className="text-xs text-muted-foreground">Nothing was shared. You can close this tab.</p>
    </main>
  );
}
