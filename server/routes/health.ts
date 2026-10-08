import { Router, Request, Response } from 'express';
import { getActiveDriver, getRepository } from '../repository/index.js';
import { SupabaseApplicationRepository } from '../repository/supabaseRepository.js';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = getActiveDriver();
    const isSupabase = driver === 'supabase';

    let supabaseReachable = false;
    let tables: string[] = [];
    let recordCounts: any = null;

    if (isSupabase) {
      const supabaseRepo = new SupabaseApplicationRepository();
      supabaseReachable = await supabaseRepo.isAvailable();

      tables = [
        'profiles',
        'assignments',
        'assignment_test_cases',
        'student_attempts',
        'attempt_mutations',
        'phase2_challenges',
        'phase2_evaluations',
        'security_events',
        'proctoring_events',
        'faculty_division_sessions',
        'audit_logs',
        'mutation_registry',
      ];

      // Query active repository safely for stats without querying SQLite
      try {
        const repo = getRepository();
        const mutTypes = await repo.getMutationTypes();
        recordCounts = {
          mutationTypes: mutTypes.length,
        };
      } catch {
        recordCounts = null;
      }
    } else {
      // Local development SQLite mode only
      try {
        const { dbGet, dbQuery } = await import('../db/database.js');
        const userCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count ?? 0;
        const profileCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM profiles')?.count ?? 0;
        const assignmentCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM assignments')?.count ?? 0;
        const attemptCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM student_attempts')?.count ?? 0;
        const mutationCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM mutation_registry')?.count ?? 0;

        tables = dbQuery<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).map(t => t.name);

        recordCounts = {
          users: userCount,
          profiles: profileCount,
          assignments: assignmentCount,
          attempts: attemptCount,
          mutationTypes: mutationCount,
        };
      } catch {
        tables = [];
        recordCounts = null;
      }

      try {
        const supabaseRepo = new SupabaseApplicationRepository();
        supabaseReachable = await supabaseRepo.isAvailable();
      } catch {
        supabaseReachable = false;
      }
    }

    res.json({
      status: 'ok',
      platform: 'SyntaXViva',
      phase: 'PHASE 6B - Production Hardened Architecture',
      database: {
        primaryDriver: driver,
        supabaseReachable,
        sqliteFallbackAvailable: !isSupabase,
        tables,
        recordCounts,
      },
      auth: {
        authority: 'Supabase Auth (auth.users)',
        sessionStrategy: 'Supabase Bearer Token (Permanent UUID)',
        rlsEnforced: true,
      },
      serverTime: new Date().toISOString(),
      version: '2.5.0-hardened',
    });
  } catch (err: any) {
    console.error('Health check error:', err);
    res.status(500).json({
      status: 'error',
      error: 'Health check failure.',
    });
  }
});

