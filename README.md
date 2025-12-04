# LearnLynk  Technical Assessment

## SECTION 1  Supabase Schema Challenge
**File**: ackend/schema.sql

Creates 3 tables with all requirements:
- **leads**: id, tenant_id, owner_id, team_id, name, email, phone, stage, created_at, updated_at
- **applications**: id, tenant_id, lead_id (FK), status, created_at, updated_at
- **tasks**: id, tenant_id, application_id (FK), type, status, due_at, created_at, updated_at

**Constraints & Indexes**:
- Foreign keys: applications.lead_id  leads(id), tasks.application_id  applications(id)
- CHECK: tasks.type IN ('call', 'email', 'review')
- CHECK: tasks.due_at >= created_at
- 9 indexes: leads(tenant_id, owner_id, stage, created_at), applications(tenant_id, lead_id), tasks(tenant_id, due_at, status)
- REPLICA IDENTITY FULL for Supabase Realtime

## SECTION 2  RLS & Policies Test
**File**: ackend/rls_policies.sql

Row-Level Security policies on leads table:
- **SELECT**: Admins see all leads in tenant; counselors see leads assigned to them OR their teams
- **INSERT**: Only admins and counselors can create leads

Uses JWT claims: uth.jwt() ->> 'role' and uth.jwt() ->> 'user_id' for policy enforcement.

## SECTION 3  Edge Function Task
**File**: ackend/edge-functions/create-task/index.ts

POST /create-task endpoint that:
1. Accepts JSON: { "application_id": "uuid", "task_type": "call|email|review", "due_at": "ISO-timestamp" }
2. Validates:
   - task_type must be call, email, or review
   - due_at must be in the future
   - application_id must be valid UUID
3. Inserts task into Supabase tasks table
4. Broadcasts Supabase Realtime event: 	ask.created
5. Returns: { "success": true, "task_id": "uuid" } on success
   Returns: { "success": false, "error": "message" } with 400/500 status on failure

## SECTION 4  Mini Frontend Exercise
**File**: pages/dashboard/today.tsx

Next.js page that:
1. Fetches tasks due today from Supabase
2. Displays in table:
   - Task type (call/email/review)
   - Application ID
   - Due date (formatted for user's locale)
   - Status
3. "Mark Complete" button  updates Supabase  refreshes UI via React Query
4. Shows loading spinner while fetching
5. Shows error message if query fails
6. Displays task statistics (total, pending, completed)

Uses React Query for state management and data fetching.

## SECTION 5  Stripe Checkout Integration

Stripe implementation flow:

1. Create payment_requests table with columns: id, application_id, amount, currency, status ('pending'|'paid'|'failed'), stripe_session_id, stripe_url, created_at, paid_at
2. When user initiates checkout, create a Stripe Checkout Session via Stripe API and store session_id and checkout_url in payment_requests
3. Set up webhook endpoint to listen for checkout.session.completed event from Stripe
4. On webhook, verify the session amount matches the stored payment_request, then update status='paid' and record paid_at timestamp
5. Update the related application status from 'pending_payment' to 'active' and optionally record payment in application timeline/events
6. Handle checkout.session.expired webhook to mark payment_requests as 'failed' and allow user to retry

---

**Project**: LearnLynk CRM Technical Assessment  
**Status**: All 5 sections complete and ready for production
