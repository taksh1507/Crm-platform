import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Safety check - only allow from localhost during development
  const host = req.headers.host || '';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    return res.status(403).json({ error: 'Forbidden - only available on localhost' });
  }

  try {
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (!checkError && existingTables && existingTables.length > 0) {
      const tableNames = existingTables.map((t: any) => t.table_name);
      if (tableNames.includes('leads')) {
        // Tables likely already set up, just ensure test data exists
        return await insertTestData(supabase, res);
      }
    }

    // Create leads table
    const leadsTableSql = `
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        owner_id UUID NOT NULL,
        team_id UUID,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        stage TEXT DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Create applications table
    const applicationsTableSql = `
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        lead_id UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Create tasks table
    const tasksTableSql = `
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        due_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT task_type_valid CHECK (type IN ('call', 'email', 'review')),
        CONSTRAINT task_due_at_valid CHECK (due_at >= created_at)
      );
    `;

    // Execute table creations
    for (const sql of [leadsTableSql, applicationsTableSql, tasksTableSql]) {
      try {
        const { error } = await supabase.rpc('execute_sql', { query: sql });
        // Continue even if RPC fails - tables might be created via other means
      } catch (e) {
        // Ignore errors - tables might already exist
      }
    }

    // Insert test data
    return await insertTestData(supabase, res);
  } catch (err: any) {
    console.error('Setup error:', err);
    return res.status(500).json({
      error: 'Failed to initialize database',
      message: err.message,
    });
  }
}

async function insertTestData(supabase: any, res: any) {
  try {
    // Define fixed UUIDs for test data
    const leadId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '550e8400-e29b-41d4-a716-446655440001';
    const ownerId = '550e8400-e29b-41d4-a716-446655440002';
    const applicationId = '660e8400-e29b-41d4-a716-446655440000';

    // Check if test data already exists and needs fixing
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();

    if (existingLead) {
      // Data exists - check if tasks have correct status
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('application_id', applicationId);

      // Check if we have 2 pending and 1 completed task
      const pendingCount = tasks?.filter((t: any) => t.status === 'pending').length || 0;
      const completedCount = tasks?.filter((t: any) => t.status === 'completed').length || 0;
      
      if (pendingCount === 2 && completedCount === 1) {
        // Tasks are already correct
        return res.status(200).json({
          message: 'Database already initialized with correct test data',
          status: 'ready',
        });
      }

      // Fix the task statuses - delete old ones
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('application_id', applicationId);

      if (deleteError) throw deleteError;

      // Re-insert with correct statuses
      const now = new Date();
      const correctedTasks = [
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          tenant_id: tenantId,
          application_id: applicationId,
          type: 'call',
          status: 'pending',
          due_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          tenant_id: tenantId,
          application_id: applicationId,
          type: 'email',
          status: 'pending',
          due_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          tenant_id: tenantId,
          application_id: applicationId,
          type: 'review',
          status: 'completed',
          due_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          updated_at: now.toISOString(),
        },
      ];

      const { error: tasksError } = await supabase.from('tasks').insert(correctedTasks);
      if (tasksError) throw tasksError;

      return res.status(200).json({
        message: 'Database test data corrected successfully',
        status: 'ready',
      });
    }

    // Insert lead
    const { error: leadError } = await supabase.from('leads').insert({
      id: leadId,
      tenant_id: tenantId,
      owner_id: ownerId,
      team_id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1-555-123-4567',
      stage: 'qualified',
    });

    if (leadError) throw leadError;

    // Insert application
    const { error: appError } = await supabase.from('applications').insert({
      id: applicationId,
      tenant_id: tenantId,
      lead_id: leadId,
      status: 'pending',
    });

    if (appError) throw appError;

    // Delete existing test tasks if they exist (for clean reset)
    await supabase.from('tasks').delete().eq('application_id', applicationId);

    // Insert tasks
    const now = new Date();
    const tasks = [
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        tenant_id: tenantId,
        application_id: applicationId,
        type: 'call',
        status: 'pending',
        due_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        tenant_id: tenantId,
        application_id: applicationId,
        type: 'email',
        status: 'pending',
        due_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        tenant_id: tenantId,
        application_id: applicationId,
        type: 'review',
        status: 'completed',
        due_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        updated_at: now.toISOString(),
      },
    ];

    const { error: tasksError } = await supabase.from('tasks').insert(tasks);

    if (tasksError) throw tasksError;

    return res.status(200).json({
      message: 'Database initialized successfully with test data',
      status: 'ready',
      data: {
        lead: leadId,
        application: applicationId,
        tasks: tasks.length,
      },
    });
  } catch (err: any) {
    console.error('Test data insertion error:', err);
    return res.status(500).json({
      error: 'Failed to insert test data',
      message: err.message,
    });
  }
}
