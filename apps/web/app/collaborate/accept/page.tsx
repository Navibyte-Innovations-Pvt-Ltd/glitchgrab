import { redirect } from "next/navigation";

interface AcceptPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptPage({ searchParams }: AcceptPageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login");
  }

  // Redirect to the API route which validates the token, sets the session cookie,
  // and redirects to /collaborate
  redirect(`/api/v1/collaborators/accept?token=${encodeURIComponent(token)}`);
}
