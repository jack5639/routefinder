import { z } from "zod";

export const campaignCodeSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,23}$/);

export function normaliseCampaignCode(value: unknown) {
  const parsed = campaignCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
