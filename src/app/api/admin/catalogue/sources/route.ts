import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const schema = z.object({
  sourceAuthority: z.enum(["find-an-apprenticeship-api-v2", "discover-uni-hesa"]),
  permissionBasis: z.enum(["api-terms-confirmed", "open-licence-confirmed", "direct-permission-confirmed"]),
  note: z.string().trim().min(10).max(1000),
}).superRefine((value, context) => {
  const expected = value.sourceAuthority === "find-an-apprenticeship-api-v2"
    ? ["api-terms-confirmed", "direct-permission-confirmed"]
    : ["open-licence-confirmed", "direct-permission-confirmed"];
  if (!expected.includes(value.permissionBasis)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["permissionBasis"], message: "Choose a permission basis that matches this source." });
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const parsed = schema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Confirm the permission basis and add a short audit note.");
  const result = await createAdminClient().rpc("attest_catalogue_source", {
    p_source_authority: parsed.data.sourceAuthority,
    p_reviewer_id: context.user.id,
    p_permission_basis: parsed.data.permissionBasis,
    p_note: parsed.data.note,
  });
  if (result.error) return apiError("The source confirmation could not be recorded.", 409, "attestation-failed");
  return NextResponse.json({ attestationId: result.data });
}
