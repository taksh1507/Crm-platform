-- Row-Level Security Policies for LearnLynk
-- These policies enforce multi-tenant data access control

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Who can view leads?
-- Admins see all leads in their tenant
-- Counselors see leads they own or that are assigned to their teams
CREATE POLICY leads_select_policy ON leads
  FOR SELECT
  USING (
    -- Admins get full access within their tenant
    (auth.jwt() ->> 'role' = 'admin' AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    OR
    -- Counselors see their own leads
    (auth.jwt() ->> 'role' = 'counselor' AND owner_id = (auth.jwt() ->> 'user_id')::uuid)
    OR
    -- Counselors see leads assigned to their teams
    (
      auth.jwt() ->> 'role' = 'counselor'
      AND team_id IN (
        SELECT team_id 
        FROM user_teams 
        WHERE user_id = (auth.jwt() ->> 'user_id')::uuid
      )
    )
  );

-- INSERT policy: Who can create leads?
-- Only admins and counselors from the current tenant can create leads
CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role' IN ('admin', 'counselor'))
  );

-- UPDATE policy: Who can edit leads?
-- Admins can update any lead, counselors can update their own or team leads
CREATE POLICY leads_update_policy ON leads
  FOR UPDATE
  USING (
    -- Admins can modify leads in their tenant
    (auth.jwt() ->> 'role' = 'admin' AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    OR
    -- Counselors can modify leads they own
    (auth.jwt() ->> 'role' = 'counselor' AND owner_id = (auth.jwt() ->> 'user_id')::uuid)
    OR
    -- Counselors can modify team leads
    (
      auth.jwt() ->> 'role' = 'counselor'
      AND team_id IN (
        SELECT team_id 
        FROM user_teams 
        WHERE user_id = (auth.jwt() ->> 'user_id')::uuid
      )
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- DELETE policy: Only admins can remove leads
-- Regular staff cannot delete lead records to prevent data loss
CREATE POLICY leads_delete_policy ON leads
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'admin' 
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );