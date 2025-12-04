# LearnLynk – Technical Assessment

This repository contains the completed technical assessment for LearnLynk, demonstrating implementation of a full-stack application with Supabase Postgres, Edge Functions, and Next.js.

## Project Structure

```
.
├── backend/
│   ├── schema.sql                 # Database schema for leads, applications, tasks
│   ├── rls_policies.sql           # Row-Level Security policies
│   └── edge-functions/
│       └── create-task/
│           └── index.ts           # TypeScript Edge Function
├── frontend/
│   └── pages/
│       └── dashboard/
│           └── today.tsx          # React Next.js page for today's tasks
└── README.md
```

## Sections Completed

### Section 1: Database Schema (`backend/schema.sql`)

- **Leads Table**: Stores lead information with owner and team assignment
- **Applications Table**: Tracks applications linked to leads
- **Tasks Table**: Task management with type constraints (call, email, review) and date validation

Key features:
- UUID primary keys with automatic generation
- Foreign key relationships with cascade delete
- CHECK constraints for task types and date validation
- Optimized indexes for common query patterns
- REPLICA IDENTITY FULL for Supabase Realtime support

### Section 2: RLS Policies (`backend/rls_policies.sql`)

- **SELECT Policy**: 
  - Admins see all leads in their tenant
  - Counselors see their own leads OR leads assigned to their teams
- **INSERT Policy**: Users can only insert leads in their own tenant
- **UPDATE & DELETE Policies**: Additional security policies included

Uses Supabase JWT claims (`auth.jwt()`) for tenant and role-based access control.

### Section 3: Edge Function (`backend/edge-functions/create-task/index.ts`)

TypeScript Supabase Edge Function with:
- **Input Validation**: Validates task type, UUID format, and due_at timestamp
- **Business Logic**: Ensures due_at is in the future
- **Database Integration**: Creates task records with automatic tenant_id lookup
- **Realtime Events**: Broadcasts `task.created` event to tenant-specific channel
- **Error Handling**: Comprehensive 400/500 status codes with descriptive errors
- **CORS Support**: Preflight handling for cross-origin requests

### Section 4: Frontend Dashboard (`frontend/pages/dashboard/today.tsx`)

React/Next.js component featuring:
- **React Query Integration**: Efficient data fetching with caching and refetch intervals
- **Task Display**: Table showing tasks due today with type and status badges
- **Mark Complete Button**: Mutates task status with optimistic updates
- **Loading State**: Spinner while fetching data
- **Error Handling**: User-friendly error messages
- **Statistics**: Summary card showing task counts
- **Responsive Design**: Tailwind CSS with mobile-friendly layout

## Section 5: Stripe Checkout Implementation

### Stripe Checkout Flow Description

When implementing a Stripe Checkout flow for application fees in LearnLynk:

1. **Payment Request Creation**: Insert a `payment_requests` row upon user checkout initiation, storing application_id, amount, currency, and status = 'pending'.

2. **Stripe Session**: Create a Stripe Checkout Session via the Stripe API, storing the returned `stripe_checkout_session_id` and `stripe_url` in the payment_requests record for redirect.

3. **Webhook Handler**: Listen for `checkout.session.completed` webhook event from Stripe to confirm payment success (verify session amount matches stored request).

4. **Status Update**: Upon successful webhook, update `payment_requests.status = 'paid'` and record `paid_at` timestamp.

5. **Application Update**: Trigger application state transition (e.g., move from 'pending_payment' to 'active') and optionally record payment in application timeline events for audit trail.

6. **Failure Handling**: Listen for `checkout.session.expired` or payment failure scenarios to update status = 'failed' and allow user retry.

---

## Requirements & Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available at https://supabase.com)

### Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get these values from your Supabase project settings > API.

### Database Setup

**Option 1: Automatic Setup (Recommended for Development)**

1. Install dependencies: `npm install`
2. Add your Supabase credentials to `.env.local`
3. Start the dev server: `npm run dev`
4. Navigate to `http://localhost:3000/api/setup` and call it with POST (or use the setup page)
5. The database will be initialized with schema and sample test data

**Option 2: Manual Setup (Production)**

1. Go to your Supabase project's **SQL Editor** at https://app.supabase.com
2. Create a new query and paste the entire contents of `backend/schema.sql`
3. Click **Run** to create tables and insert test data
4. Create another query, paste `backend/rls_policies.sql`, and click **Run**
5. Your database is ready!

### Frontend Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/dashboard/today` to see the tasks dashboard.

### Edge Function Deployment (Optional)

```bash
supabase functions deploy create-task
```

### Frontend Setup

```bash
npm install
# or
yarn install
```

## Key Design Decisions

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
