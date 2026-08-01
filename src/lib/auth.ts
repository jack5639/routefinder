import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";

export async function requireUser(returnTo = "/app") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  }

  return user;
}
