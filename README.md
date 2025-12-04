# LearnLynk – Technical Assessment

Complete full-stack CRM application demonstrating database design, security policies, backend functions, and responsive frontend with real-time updates.

## Project Structure

```
├── backend/
│   ├── schema.sql                    # PostgreSQL schema with 3 tables and 9 indexes
│   ├── rls_policies.sql              # Row-Level Security for multi-tenant access
│   └── edge-functions/
│       └── create-task/index.ts      # Serverless task creation with validation
├── pages/
│   ├── _app.tsx                      # React Query provider setup
│   └── dashboard/today.tsx           # Task dashboard with real-time updates
├── styles/
│   └── globals.css                   # Base CSS reset and styling
├── .env.local                        # Supabase credentials
├── package.json                      # Dependencies and scripts
├── tailwind.config.js                # Tailwind CSS configuration
└── tsconfig.json                     # TypeScript configuration
```

## Implementation Summary

### 1. Database Schema (`backend/schema.sql`)

**Three main tables:**
- **leads**: Prospects with owner/team assignment, multi-tenant support
- **applications**: Conversion events linked to leads with cascade delete
- **tasks**: Work items with type constraints (call/email/review) and date validation

**Key features:**
- UUID primary keys with auto-generation
- Foreign key relationships with ON DELETE CASCADE
- CHECK constraints: task types restricted to valid enum, due_at ≥ created_at
- 9 performance indexes for common queries
- REPLICA IDENTITY FULL for Supabase Realtime support

### 2. Row-Level Security Policies (`backend/rls_policies.sql`)

**Enforces multi-tenant isolation on leads table:**
- **SELECT**: Admins see all tenant leads; counselors see own/team leads only
- **INSERT**: Only admins/counselors can create leads
- **UPDATE**: Owners and team members can edit their leads
- **DELETE**: Admins only

Policies extract tenant_id and user roles from Supabase JWT claims.

### 3. Edge Function (`backend/edge-functions/create-task/index.ts`)

TypeScript serverless function for task creation:
- Input validation (task type, UUID format, future dates)
- Automatic tenant_id lookup from application
- Supabase Realtime event broadcasting
- CORS preflight support
- Comprehensive error handling (400/500 responses)

### 4. Frontend Dashboard (`pages/dashboard/today.tsx`)

React component with real-time task management:
- React Query for efficient data fetching (60s refetch, 30s stale time)
- Displays pending tasks due today
- Mark Complete functionality with optimistic updates
- Loading/error states
- Task statistics (total, pending, completed counts)
- Responsive design with Tailwind CSS
- Time formatting for user's locale

### 5. Stripe Checkout Implementation Guide

**Integration flow for application fees:**

1. **Payment Initiation**: Create `payment_requests` record with application_id, amount, status='pending'
2. **Stripe Session**: Generate Stripe Checkout Session, store session_id and checkout_url
3. **Webhook Handler**: Listen for `checkout.session.completed` to verify payment success
4. **Update Status**: Set `payment_requests.status='paid'` and record `paid_at` timestamp
5. **Application State**: Transition application from 'pending_payment' to 'active'
6. **Failure Handling**: Handle `checkout.session.expired` for retry scenarios

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account (https://supabase.com)

### Environment Configuration

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get credentials from Supabase project > Settings > API.

### Database Initialization

1. Open Supabase SQL Editor: https://app.supabase.com
2. Create new query, paste entire `backend/schema.sql`, click **Run**
   - Creates tables, indexes, constraints, and test data
3. Create another query, paste `backend/rls_policies.sql`, click **Run**
   - Enables Row-Level Security on leads table
4. Database is ready!

### Frontend Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/dashboard/today` to view the tasks dashboard.

Test data is pre-populated:
- 1 lead (John Smith)
- 1 application
- 2 pending tasks (call in 2h, email in 4h)
- 1 completed task (review)

### Edge Function Deployment

```bash
supabase functions deploy create-task
```

Deploys the TypeScript function to handle task creation requests.

---

## Technical Decisions

1. **Multi-tenancy**: All tables include `tenant_id` for secure data isolation via RLS
2. **Type Safety**: Full TypeScript implementation with strict type definitions
3. **Real-time Updates**: REPLICA IDENTITY FULL enables Supabase Realtime for live task updates
4. **Validation**: Comprehensive input validation at both Edge Function and frontend
5. **Performance**: Indexes on common query patterns (tenant_id, status, due_at)
6. **Responsive UI**: Mobile-friendly design using Tailwind CSS utility classes
7. **State Management**: React Query for efficient server state and caching

## Testing Notes

- Database constraints validated (task type enum, date validation)
- RLS policies tested with different user roles
- Edge Function handles edge cases (invalid UUID, past dates, missing fields)
- Frontend gracefully handles loading, error, and success states
- Dashboard displays correct pending task count and statistics

---

**Status**: Complete and ready for production  
**Last Updated**: December 4, 2025


1. **Multi-tenancy**: All tables include `tenant_id` for tenant isolation via RLS
2. **Team-based Access**: Supports both individual ownership and team assignment for leads
3. **Type Safety**: Full TypeScript implementation with type definitions
4. **Validation**: Comprehensive input validation at both Edge Function and frontend levels
5. **Real-time Updates**: Supabase Realtime for instant task notifications
6. **Responsive UI**: Tailwind CSS for professional, mobile-friendly design

## Testing Notes

- Schema constraints validated (e.g., task type enum, date range checks)
- RLS policies tested with different user roles (admin/counselor)
- Edge Function handles edge cases (invalid UUID, past dates, missing fields)
- Frontend gracefully handles loading, error, and success states

---

**Completed**: December 4, 2025
