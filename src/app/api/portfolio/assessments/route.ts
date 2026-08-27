import { NextResponse } from "next/server";

import { apiError, getApiContext } from "@/lib/api-context";
import type { Opportunity, Qualification, Requirement, StudentProfile } from "@/lib/mvp/types";
import { buildRequirementGraph } from "@/lib/mvp/evidence-graph";
import { assessOpportunityRequirements } from "@/lib/mvp/requirement-assessment";
import { assessOpportunity } from "@/lib/scoring/decision-views";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";
import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";
import { parseOpportunitySnapshot } from "@/lib/mvp/opportunity-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = Record<string, unknown>;

function requirementFromRow(row: Row): Requirement {
  return {
    id: String(row.id),
    opportunityId: String(row.opportunity_id),
    kind: row.kind as Requirement["kind"],
    label: String(row.label),
    structuredValue: (row.structured_value as Record<string, unknown> | null) ?? undefined,
    supportingText: String(row.supporting_text),
    sourceUrl: String(row.source_url),
    retrievedAt: String(row.retrieved_at),
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    freshness: row.freshness as Requirement["freshness"],
    conflict: Boolean(row.conflict),
    publicationState: row.publication_state as Requirement["publicationState"],
    hardRequirement: Boolean(row.hard_requirement),
  };
}

function opportunityFromRow(row: Row): Opportunity {
  return {
    id: String(row.id),
    kind: row.kind as Opportunity["kind"],
    sector: row.sector as Opportunity["sector"],
    title: String(row.title),
    providerName: String(row.provider_name),
    location: String(row.location),
    summary: String(row.summary),
    deadline: row.deadline ? String(row.deadline) : undefined,
    applicationUrl: String(row.application_url),
    sourceUrl: String(row.source_url),
    retrievedAt: String(row.retrieved_at),
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    freshness: row.freshness as Opportunity["freshness"],
    state: row.state as Opportunity["state"],
    publicationState: row.publication_state as Opportunity["publicationState"],
    requirements: ((row.requirements as Row[] | null) ?? []).map(requirementFromRow),
  };
}

export async function GET() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to view your decision views.", 401, "unauthorised");
  const [profileResult, qualificationResult, portfolioResult, linksResult, evidenceResult] = await Promise.all([
    context.supabase.from("profiles").select("*").eq("id", context.user.id).maybeSingle(),
    context.supabase.from("qualifications").select("*").eq("user_id", context.user.id),
    context.supabase
      .from("portfolio_items")
      .select(
        `id,user_id,opportunity_id,opportunity_snapshot,external_title,external_url,active,created_at,updated_at,opportunities(${publicOpportunityWithRequirements}),applications(*)`,
      )
      .eq("user_id", context.user.id)
      .eq("active", true),
    context.supabase.from("evidence_requirement_links").select("*").eq("user_id", context.user.id),
    context.supabase.from("evidence_items").select("*").eq("user_id", context.user.id),
  ]);

  if (!profileResult.data || profileResult.data.application_cycle !== launchApplicationCycle) return apiError(`Complete the ${launchApplicationCycle} readiness check first.`, 409, "profile-required");
  if (qualificationResult.error || portfolioResult.error || linksResult.error || evidenceResult.error) {
    return apiError("Decision views are temporarily unavailable.", 503, "unavailable");
  }

  const profileRow = profileResult.data;
  const profile: StudentProfile = {
    id: context.user.id,
    currentStage: profileRow.current_stage,
    applicationCycle: profileRow.application_cycle,
    homeRegion: profileRow.home_region,
    maxTravelMinutes: profileRow.max_travel_minutes,
    relocationPreference: profileRow.relocation_preference,
    routeIntent: profileRow.route_intent,
    sectors: profileRow.sectors,
    workStyles: profileRow.work_styles,
    financialPreference: profileRow.financial_preference,
    constraints: profileRow.constraints,
    qualificationsComplete: profileRow.qualifications_complete ?? false,
    experienceSummary: profileRow.experience_summary ?? undefined,
  };
  const qualifications: Qualification[] = (qualificationResult.data ?? []).map((row) => ({
    id: row.id,
    qualificationType: row.qualification_type,
    subject: row.subject,
    grade: row.grade ?? undefined,
    status: row.status,
  }));
  const links = linksResult.data ?? [];
  const evidence = (evidenceResult.data ?? []).map((item) => ({
    id: item.id,
    evidenceType: item.evidence_type,
    happened: item.happened,
    contribution: item.contribution,
    outcome: item.outcome,
    learned: item.learned,
    supportingDetail: item.supporting_detail ?? undefined,
    evidenceDate: item.evidence_date ?? undefined,
    archived: item.archived,
  }));
  const portfolioSize = portfolioResult.data?.length ?? 0;
  const hiddenIds = (portfolioResult.data ?? []).flatMap((item) => {
    const visible = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
    return item.opportunity_id && !visible ? [item.opportunity_id] : [];
  });
  const admin = createAdminClient();
  const hiddenResult = hiddenIds.length
    ? await admin.from("opportunities").select(publicOpportunityWithRequirements).in("id", hiddenIds)
    : { data: [], error: null };
  if (hiddenResult.error) return apiError("Saved opportunity status is temporarily unavailable.", 503, "unavailable");
  const hiddenById = new Map((hiddenResult.data ?? []).map((row: Row) => [String(row.id), row]));
  const items = (portfolioResult.data ?? []).map((item) => {
    const publicRow = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
    const opportunityRow = publicRow ?? (item.opportunity_id ? hiddenById.get(item.opportunity_id) : null);
    const snapshot = parseOpportunitySnapshot(item.opportunity_snapshot);
    if (!opportunityRow) {
      return {
        id: item.id,
        title: snapshot?.title ?? item.external_title ?? "Saved opportunity",
        providerName: snapshot?.providerName,
        externalUrl: snapshot?.sourceUrl ?? item.external_url,
        needsChecking: true,
        savedStatus: {
          code: snapshot ? "catalogue-unavailable" : "external",
          message: snapshot
            ? "This saved reviewed record is no longer available in the current catalogue. Do not rely on it to apply; check the official source and choose a current option if needed."
            : "This external link has not been reviewed by Routefinder. Confirm every material fact directly.",
          doNotApply: Boolean(snapshot),
        },
        assessment: null,
        requirements: [],
      };
    }
    const opportunity = opportunityFromRow(opportunityRow as unknown as Row);
    const assessmentLinks = links.map((link) => ({
      requirementId: link.requirement_id,
      evidenceId: link.evidence_id,
      coverage: link.coverage,
      confirmedByStudent: link.confirmed_by_student,
      missingSpecificity: link.missing_specificity ?? undefined,
      assessmentVersion: link.assessment_version,
      archived: evidence.find((item) => item.id === link.evidence_id)?.archived,
    }));
    const requirementAssessment = assessOpportunityRequirements(
      opportunity,
      qualifications,
      profile.qualificationsComplete,
      assessmentLinks,
    );
    return {
      id: item.id,
      title: opportunity.title,
      providerName: opportunity.providerName,
      externalUrl: opportunity.sourceUrl,
      needsChecking: !publicRow,
      savedStatus: publicRow ? {
        code: "current",
        message: "This record is currently open, reviewed, and fresh enough for public discovery. Always recheck the official page before applying.",
        doNotApply: false,
      } : {
        code: "catalogue-changed",
        message: "This saved reviewed record no longer passes the public catalogue safety checks. Do not rely on it to apply; check the official source for closure, deadline, freshness, conflicts, or a pending review.",
        doNotApply: true,
      },
      requirements: opportunity.requirements,
      application: item.applications?.[0] ?? null,
      graph: buildRequirementGraph(
        opportunity,
        evidence,
        links.map((link) => ({
          id: link.id,
          evidenceId: link.evidence_id,
          requirementId: link.requirement_id,
          relevance: link.relevance,
          coverage: link.coverage,
          missingSpecificity: link.missing_specificity ?? undefined,
          confirmedByStudent: link.confirmed_by_student,
          assessmentVersion: link.assessment_version,
        })),
        requirementAssessment,
      ),
      assessment: assessOpportunity({
        profile,
        qualifications,
        opportunity,
        evidenceLinks: assessmentLinks,
        portfolioSize,
        requirementAssessment,
      }),
    };
  });
  return NextResponse.json({ items });
}
