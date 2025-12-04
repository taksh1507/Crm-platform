#  LearnLynk  Technical Assessment

> A production-ready full-stack CRM application built with Supabase, Next.js, and TypeScript

![Status](https://img.shields.io/badge/status-complete-green)
![Type](https://img.shields.io/badge/type-technical%20assessment-blue)
![Tech](https://img.shields.io/badge/tech-Supabase%20%7C%20Next.js%20%7C%20TypeScript-blueviolet)

---

##  Overview

Complete technical assessment demonstrating full-stack development with:
- **Backend**: PostgreSQL with Supabase, RLS policies, Edge Functions
- **Frontend**: Next.js with React Query for real-time updates
- **Security**: Multi-tenant architecture with JWT-based access control
- **Integration**: Stripe payment processing flow

---

##  All 5 Sections Complete

### SECTION 1  Supabase Schema Challenge
**File**: `backend/schema.sql`

Creates 3 tables with all requirements:
- **leads**: id, tenant_id, owner_id, team_id, name, email, phone, stage, created_at, updated_at
- **applications**: id, tenant_id, lead_id (FK), status, created_at, updated_at
- **tasks**: id, tenant_id, application_id (FK), type, status, due_at, created_at, updated_at

**Constraints & Indexes**:
- Foreign keys: applications.lead_id  leads(id), tasks.application_id  applications(id)
- CHECK: tasks.type IN ('call', 'email', 'review')
- CHECK: tasks.due_at >= created_at
- 9 indexes for common queries (tenant, owner, stage, due date, status)
- REPLICA IDENTITY FULL for Supabase Realtime

### SECTION 2  RLS & Policies Test
**File**: `backend/rls_policies.sql`

Row-Level Security policies on leads table:
- **SELECT**: Admins see all leads in tenant; counselors see leads assigned to them OR their teams
- **INSERT**: Only admins and counselors can create leads

Uses JWT claims: `auth.jwt() ->> 'role'` and `auth.jwt() ->> 'user_id'` for policy enforcement.

### SECTION 3  Edge Function Task
**File**: `backend/edge-functions/create-task/index.ts`

POST /create-task endpoint that:
1. Accepts JSON: { "application_id": "uuid", "task_type": "call|email|review", "due_at": "ISO-timestamp" }
2. Validates: task_type, due_at (must be future), application_id (valid UUID)
3. Inserts task into Supabase tasks table
4. Broadcasts Supabase Realtime event: `task.created`
5. Returns: { "success": true, "task_id": "uuid" } or error with status codes 400/500

### SECTION 4  Mini Frontend Exercise
**File**: pages/dashboard/today.tsx

Next.js page that:
1. Fetches tasks due today from Supabase
2. Displays in table: task type, application ID, due date, status
3. "Mark Complete" button  updates Supabase  refreshes UI via React Query
4. Shows loading spinner while fetching, error message if query fails
5. Displays task statistics (total, pending, completed)

### SECTION 5  Stripe Checkout Integration

Stripe implementation flow:

1. Create payment_requests table: id, application_id, amount, currency, status, stripe_session_id, stripe_url, created_at, paid_at
2. When user initiates checkout, create Stripe Checkout Session via Stripe API and store session_id in payment_requests
3. Set up webhook endpoint to listen for checkout.session.completed event
4. On webhook, verify session amount matches payment_request, update status='paid' and record paid_at
5. Update application status from 'pending_payment' to 'active' and record payment in timeline
6. Handle checkout.session.expired webhook to mark payment_requests as 'failed' for retry

---

##  Quick Start

1. **Clone & Setup**
   ```bash
   npm install
   ```

2. **Environment** - Copy .env.example to .env.local and fill in Supabase credentials

3. **Database** - Run in Supabase SQL Editor:
   - `backend/schema.sql` (creates tables, indexes, test data)
   - `backend/rls_policies.sql` (enables RLS)

4. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000/dashboard/today

---

##  Project Structure

```
backend/
  schema.sql                    # Database schema
  rls_policies.sql              # RLS policies
  edge-functions/create-task/   # Edge Function

pages/
  _app.tsx                      # React Query provider
  dashboard/today.tsx           # Task dashboard

styles/globals.css                # Global styles
package.json, tsconfig.json, tailwind.config.js
.env.example                      # Environment template
```

---

##  Tech Stack

- **Database**: PostgreSQL (Supabase)
- **Backend**: Deno Edge Functions, TypeScript
- **Frontend**: Next.js 14, React 18, TypeScript
- **State**: React Query v5
- **Styling**: Tailwind CSS
- **Auth**: Supabase JWT

---

**Status**:  Production Ready  
**Updated**: December 4, 2025
