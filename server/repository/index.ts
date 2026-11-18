/**
 * SyntaXViva Phase 2 — Repository Factory and Dual Database Orchestration
 * Provides pluggable, resilient data access targeting Supabase PostgreSQL
 * with SQLite fallback and zero data loss guarantee.
 */

import { IApplicationRepository } from './types.js';
import { SqliteApplicationRepository } from './sqliteRepository.js';
import { SupabaseApplicationRepository } from './supabaseRepository.js';

let activeRepo: IApplicationRepository | null = null;
let currentDriver: 'supabase' | 'sqlite' = 'sqlite';

export function getDatabaseProvider(): 'supabase' | 'sqlite' {
  const envProvider = (process.env.DATABASE_PROVIDER || '').toLowerCase().trim();
  if (envProvider === 'supabase') return 'supabase';
  return 'sqlite';
}

export async function initRepository(): Promise<IApplicationRepository> {
  const provider = getDatabaseProvider();

  if (provider === 'supabase') {
    const supabaseRepo = new SupabaseApplicationRepository();
    const isSupabaseReady = await supabaseRepo.isAvailable();

    if (!isSupabaseReady) {
      throw new Error(
        '[SyntaXViva Phase 4C] DATABASE_PROVIDER=supabase configured, but Supabase connection or schema is unavailable. Silent fallback to SQLite is strictly forbidden in Phase 4C.'
      );
    }

    console.log('[SyntaXViva Phase 4C] Initialized Supabase PostgreSQL repository as primary application store (DATABASE_PROVIDER=supabase).');
    activeRepo = supabaseRepo;
    currentDriver = 'supabase';
    return activeRepo;
  }

  console.log('[SyntaXViva Phase 4C] Primary storage initialized to SQLite local repository (DATABASE_PROVIDER=sqlite).');
  activeRepo = new SqliteApplicationRepository();
  currentDriver = 'sqlite';
  return activeRepo;
}

export function getRepository(): IApplicationRepository {
  if (!activeRepo) {
    const provider = getDatabaseProvider();
    if (provider === 'supabase') {
      activeRepo = new SupabaseApplicationRepository();
      currentDriver = 'supabase';
    } else {
      activeRepo = new SqliteApplicationRepository();
      currentDriver = 'sqlite';
    }
  }
  return activeRepo;
}

export function setRepository(repo: IApplicationRepository, driver: 'supabase' | 'sqlite') {
  activeRepo = repo;
  currentDriver = driver;
}

export function getActiveDriver(): 'supabase' | 'sqlite' {
  return currentDriver;
}

export * from './types.js';
export { SqliteApplicationRepository } from './sqliteRepository.js';
export { SupabaseApplicationRepository } from './supabaseRepository.js';
