import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace-shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return <WorkspaceShell email={user.email}>{children}</WorkspaceShell>;
}
