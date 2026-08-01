import { redirect } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/supabase/admin";
import { ReviewConsole } from "./review-console";

export default async function CatalogueAdminPage() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/app");
  return <><PageHeading eyebrow="Internal review" title="Catalogue publication" description="Draft, reverify, publish, withdraw, and investigate source conflicts. Publishing fails closed until facts and requirements are verified." /><ReviewConsole /></>;
}
