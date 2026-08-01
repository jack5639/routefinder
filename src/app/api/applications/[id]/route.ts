import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, databaseErrorIs, getMutationApiContext, parseJson } from "@/lib/api-context";

const patchSchema = z.object({
  stage: z.enum(["planned", "preparing", "submitted", "online-assessment", "interview", "assessment-centre", "decision", "offer", "declined", "withdrawn"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
  officialUrl: z.string().url().max(1000).optional(),
  nextAction: z.string().trim().max(600).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to update an application.", 401, "unauthorised");
  const parsed = patchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the application update and try again.");
  const { id } = await params;
  const { data, error } = await context.admin
    .from("applications")
    .update({
      stage: parsed.data.stage,
      deadline: parsed.data.deadline,
      official_url: parsed.data.officialUrl,
      next_action: parsed.data.nextAction,
      note: parsed.data.note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("*")
    .single();
  if (databaseErrorIs(error, "entitlement_limit:active_applications")) {
    return apiError("Your plan has reached its active application limit.", 403, "limit-reached");
  }
  if (error) return apiError("The application could not be updated.", 404, "not-found");
  if (parsed.data.stage) {
    await context.admin.from("analytics_events").insert({
      user_id: context.user.id,
      event_name: "application_stage_updated",
      properties: { stage: parsed.data.stage },
    });
  }
  return NextResponse.json({ application: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to remove an application.", 401, "unauthorised");
  const { id } = await params;
  const { error } = await context.admin.from("applications").delete().eq("id", id).eq("user_id", context.user.id);
  if (error) return apiError("The application could not be removed.", 404, "not-found");
  return new NextResponse(null, { status: 204 });
}
