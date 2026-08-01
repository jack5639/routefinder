export const publicRequirementColumns =
  "id,opportunity_id,kind,label,structured_value,supporting_text,source_url,retrieved_at,verified_at,freshness,conflict,hard_requirement,publication_state";

export const publicOpportunityColumns =
  "id,organisation_id,kind,sector,title,provider_name,location,summary,deadline,application_url,source_url,source_authority,retrieved_at,verified_at,freshness,state,publication_state";

export const publicOpportunityWithRequirements = `${publicOpportunityColumns},requirements(${publicRequirementColumns})`;
