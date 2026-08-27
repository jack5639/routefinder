-- The source-ingestion RPC reads a JSON text state into the opportunity_state
-- enum. Allow assignment conversion while retaining enum validation.
create cast (text as public.opportunity_state) with inout as assignment;
