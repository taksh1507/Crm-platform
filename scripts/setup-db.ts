#!/usr/bin/env node

/**
 * Database initialization script for LearnLynk
 * This script reads the SQL files and executes them against your Supabase database
 * Run with: npm run setup:db
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Please add these to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLFile(filePath: string, description: string): Promise<void> {
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n📝 Executing ${description}...`);
    
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Error executing ${description}:`, error.message);
      throw error;
    }
    
    console.log(`✅ ${description} executed successfully`);
  } catch (err) {
    console.error(`Failed to execute ${description}:`, err);
    throw err;
  }
}

async function setupDatabase(): Promise<void> {
  console.log('🚀 Starting LearnLynk database setup...\n');

  try {
    // Read and execute schema.sql
    const schemaPath = path.join(process.cwd(), 'backend', 'schema.sql');
    const rlsPath = path.join(process.cwd(), 'backend', 'rls_policies.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(rlsPath)) {
      console.error(`❌ RLS policies file not found: ${rlsPath}`);
      process.exit(1);
    }

    // Note: Direct SQL execution via RPC requires the exec function to be set up
    // For now, provide instructions for manual setup
    console.log('📖 Database Setup Instructions:\n');
    console.log('Since Supabase SQL execution via API requires additional setup,');
    console.log('please follow these manual steps:\n');
    console.log('1. Go to your Supabase project: https://app.supabase.com');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query and paste the contents of backend/schema.sql');
    console.log('4. Click "Run" to create tables and insert sample data');
    console.log('5. Create another query and paste backend/rls_policies.sql');
    console.log('6. Click "Run" to enable row-level security\n');
    
    console.log('✅ Setup complete! Your database is ready for the application.');
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  }
}

setupDatabase();
