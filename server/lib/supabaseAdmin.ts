/**
 * SyntaXViva Phase 4B — Backend Supabase Admin Client
 *
 * CRITICAL SECURITY ARCHITECTURE RULES:
 * 1. This module is STRICTLY server-side only.
 * 2. Uses process.env.SUPABASE_SERVICE_ROLE_KEY for privileged operations (e.g. migration, administrative verifications).
 * 3. NEVER import this file from frontend code (/src/*).
 * 4. NEVER expose SUPABASE_SERVICE_ROLE_KEY to Vite env (do NOT prefix with VITE_).
 * 5. NEVER return service role keys, tokens, or hashes in any API responses.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let adminClientInstance: SupabaseClient | null = null;

export function getResolvedServiceRoleKey(): string {
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // If the key is absent or was mistakenly set to the public anon/publishable key, check .env
  if (!key || key.startsWith('sb_publishable_')) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
        if (match && match[1]) {
          const fileKey = match[1].trim().replace(/^["']|["']$/g, '');
          if (fileKey && !fileKey.startsWith('sb_publishable_')) {
            return fileKey;
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return key || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const apiKey = getResolvedServiceRoleKey();

  if (!supabaseUrl || !apiKey) {
    return null;
  }

  adminClientInstance = createClient(supabaseUrl, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClientInstance;
}

export function isSupabaseServiceRoleAvailable(): boolean {
  const key = getResolvedServiceRoleKey();
  return Boolean(key && !key.startsWith('sb_publishable_'));
}
