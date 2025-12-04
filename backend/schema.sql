-- LearnLynk CRM Database Schema
-- PostgreSQL setup for Supabase with multi-tenant support

-- Main leads table - tracks all prospects in the system
-- Each lead belongs to a specific tenant and is owned by a team member
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  owner_id        UUID NOT NULL,
  team_id         UUID,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  stage           TEXT DEFAULT 'new',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Applications table - stores conversion events
-- When a lead submits an application, we create a record here
-- Linked to leads table with cascade delete for data consistency
CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  lead_id         UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table - work items that team members need to complete
-- Each task is tied to an application and has a due date
-- We enforce specific task types (call, email, review) to maintain data quality
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  application_id  UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',
  due_at          TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only allow specific task types in our system
  CONSTRAINT task_type_valid 
    CHECK (type IN ('call', 'email', 'review')),
  -- Tasks can't have a due date before they're created
  CONSTRAINT task_due_at_valid 
    CHECK (due_at >= created_at)
);

-- Performance indexes - these speed up common queries
-- Tenants query leads frequently, so we index by tenant_id
CREATE INDEX idx_leads_tenant_id 
  ON leads (tenant_id);

-- Staff members often check their assigned leads
CREATE INDEX idx_leads_tenant_owner 
  ON leads (tenant_id, owner_id);

-- Sales dashboards filter by lead stage a lot
CREATE INDEX idx_leads_tenant_stage 
  ON leads (tenant_id, stage);

-- Activity reports need historical data sorted by date
CREATE INDEX idx_leads_tenant_created_desc 
  ON leads (tenant_id, created_at DESC);

-- Quick lookup of all applications for a tenant
CREATE INDEX idx_applications_tenant_id 
  ON applications (tenant_id);

-- Finding applications for a specific lead
CREATE INDEX idx_applications_tenant_lead 
  ON applications (tenant_id, lead_id);

-- Finding all tasks in a workspace
CREATE INDEX idx_tasks_tenant_id 
  ON tasks (tenant_id);

-- Looking up tasks by due date for calendars and reminders
CREATE INDEX idx_tasks_tenant_due 
  ON tasks (tenant_id, due_at);

-- Filtering pending tasks with upcoming deadlines
CREATE INDEX idx_tasks_tenant_status_due 
  ON tasks (tenant_id, status, due_at);

-- Enable Supabase Realtime for live updates
-- Users will see task changes in real-time on their dashboards
ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER TABLE applications REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;

-- Sample test data for development and testing
-- These records help verify the dashboard is working correctly

INSERT INTO leads (id, tenant_id, owner_id, team_id, name, email, phone, stage, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'John Smith', 'john@example.com', '+1-555-123-4567', 'qualified', now(), now());

INSERT INTO applications (id, tenant_id, lead_id, status, created_at, updated_at)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'pending', now(), now());

-- Three test tasks to display on the dashboard
-- One call due soon, one email due later, one already completed
INSERT INTO tasks (id, tenant_id, application_id, type, status, due_at, created_at, updated_at)
VALUES 
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'call', 'pending', now() + interval '2 hours', now(), now()),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'email', 'pending', now() + interval '4 hours', now(), now()),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'review', 'completed', now() - interval '1 hour', now() - interval '1 hour', now() - interval '1 hour');
