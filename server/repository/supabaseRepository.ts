/**
 * SyntaXViva Phase 2 — Supabase PostgreSQL Application Repository
 * Core data access implementation targeting Supabase PostgreSQL.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  IApplicationRepository,
  ProfileEntity,
  AssignmentEntity,
  StudentAttemptEntity,
  AttemptMutationEntity,
  Phase2ChallengeEntity,
  Phase2EvaluationEntity,
  SecurityEventEntity,
  FacultyDivisionSessionEntity,
  MutationRegistryEntity,
  ProctoringEventEntity,
  DashboardStatsEntity,
  ContactInquiryEntity,
  UserRole,
} from './types.js';
import { getResolvedServiceRoleKey } from '../lib/supabaseAdmin.js';

export class SupabaseApplicationRepository implements IApplicationRepository {
  private client: SupabaseClient | null = null;
  private url: string;
  private key: string;
  private _isReady: boolean | null = null;

  constructor() {
    this.url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    this.key = getResolvedServiceRoleKey();

    if (this.url && this.key) {
      this.client = createClient(this.url, this.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.client) return false;
    if (this._isReady !== null) return this._isReady;

    try {
      const { error } = await this.client.from('profiles').select('id').limit(1);
      this._isReady = !error;
      return this._isReady;
    } catch {
      this._isReady = false;
      return false;
    }
  }

  async getProfileById(id: string): Promise<ProfileEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as ProfileEntity;
  }

  async getProfileByEmail(email: string): Promise<ProfileEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('profiles').select('*').ilike('email', email.trim()).maybeSingle();
    if (error || !data) return null;
    return data as ProfileEntity;
  }

  async getStudentByAcademicRoll(
    institution: string,
    classId: string,
    divisionId: string,
    rollNumber: string
  ): Promise<ProfileEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .ilike('institution_id', institution.trim())
      .ilike('class_id', classId.trim())
      .ilike('division_id', divisionId.trim())
      .ilike('roll_number', rollNumber.trim())
      .maybeSingle();
    if (error || !data) return null;
    return data as ProfileEntity;
  }

  async upsertProfile(data: Partial<ProfileEntity> & { id: string; email: string; full_name: string }): Promise<ProfileEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const now = new Date().toISOString();
    const payload = {
      ...data,
      email: data.email.toLowerCase().trim(),
      updated_at: now,
    };
    const { data: result, error } = await this.client.from('profiles').upsert(payload).select().single();
    if (error) throw error;
    return result as ProfileEntity;
  }

  async updateProfile(id: string, updates: Partial<ProfileEntity>): Promise<ProfileEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data as ProfileEntity;
  }

  async getAssignments(filter?: { role?: UserRole; studentId?: string; status?: string }): Promise<any[]> {
    if (!this.client) return [];
    let query = this.client.from('assignments').select('*').order('created_at', { ascending: false });

    if (filter?.role === 'student') {
      query = query.in('status', ['active', 'published', 'open']);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // Transform and attach submission counts / student attempt metadata
    const result = await Promise.all(
      data.map(async (a: any) => {
        let submissionCount = 0;
        let myAttempt: any = null;

        if (this.client) {
          const { count } = await this.client
            .from('student_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', a.id);
          submissionCount = count || 0;

          if (filter?.role === 'student' && filter.studentId) {
            const { data: attempt } = await this.client
              .from('student_attempts')
              .select('id, state, submitted_at, mutation_status')
              .eq('assignment_id', a.id)
              .eq('student_id', filter.studentId)
              .limit(1)
              .maybeSingle();
            myAttempt = attempt;
          }
        }

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          language: a.language,
          requirements: a.requirements,
          starterCode: a.starter_code,
          testCasesJson: typeof a.test_cases_json === 'string' ? a.test_cases_json : JSON.stringify(a.test_cases_json || []),
          status: a.status,
          createdBy: a.created_by,
          dueDate: a.due_date || '2026-10-20',
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          submissionCount,
          myAttemptId: myAttempt?.id || null,
          myAttemptState: myAttempt?.state || null,
          mySubmittedAt: myAttempt?.submitted_at || null,
          myMutationStatus: myAttempt?.mutation_status || null,
          myPhase2Status: myAttempt?.state || null,
        };
      })
    );

    return result;
  }

  async getAssignmentById(id: string): Promise<AssignmentEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('assignments').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;

    return {
      ...data,
      due_date: data.due_date || '2026-10-20',
      test_cases_json: typeof data.test_cases_json === 'string' ? data.test_cases_json : JSON.stringify(data.test_cases_json || []),
    } as AssignmentEntity;
  }

  async createAssignment(data: Omit<AssignmentEntity, 'created_at' | 'updated_at'>): Promise<AssignmentEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    let testCases = [];
    try {
      testCases = typeof data.test_cases_json === 'string' ? JSON.parse(data.test_cases_json) : data.test_cases_json;
    } catch {
      testCases = [];
    }

    const payload = {
      id: data.id,
      title: data.title,
      description: data.description,
      language: data.language,
      requirements: data.requirements,
      starter_code: data.starter_code,
      test_cases_json: testCases,
      status: data.status || 'active',
      created_by: data.created_by,
      due_date: data.due_date || '2026-10-20',
    };

    const { data: result, error } = await this.client.from('assignments').insert(payload).select().single();
    if (error) throw error;
    return {
      ...result,
      test_cases_json: JSON.stringify(result.test_cases_json || []),
    };
  }

  async updateAssignment(id: string, data: Partial<AssignmentEntity>): Promise<AssignmentEntity | null> {
    if (!this.client) return null;
    const payload: any = { ...data, updated_at: new Date().toISOString() };
    if (payload.test_cases_json !== undefined) {
      try {
        payload.test_cases_json = typeof payload.test_cases_json === 'string' ? JSON.parse(payload.test_cases_json) : payload.test_cases_json;
      } catch {
        // preserve as is
      }
    }

    const { data: result, error } = await this.client.from('assignments').update(payload).eq('id', id).select().single();
    if (error || !result) return null;
    return {
      ...result,
      test_cases_json: typeof result.test_cases_json === 'string' ? result.test_cases_json : JSON.stringify(result.test_cases_json || []),
    };
  }

  async deleteAssignment(id: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.from('phase2_evaluations').delete().eq('assignment_id', id);
      await this.client.from('phase2_challenges').delete().eq('assignment_id', id);
      await this.client.from('student_attempts').delete().eq('assignment_id', id);
    } catch {
      // ignore if tables have cascade
    }
    const { error } = await this.client.from('assignments').delete().eq('id', id);
    return !error;
  }

  async getDashboardStats(user: { userId: string; role: UserRole }): Promise<DashboardStatsEntity> {
    if (!this.client) return {};

    if (user.role === 'faculty') {
      const { count: asgCount } = await this.client
        .from('assignments')
        .select('*', { count: 'exact', head: true });

      const { count: stdCount } = await this.client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      const { count: subCount } = await this.client
        .from('student_attempts')
        .select('*', { count: 'exact', head: true });

      const { count: compCount } = await this.client
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .in('state', ['PASSED', 'FAILED', 'LOCKED']);

      return {
        totalAssignments: asgCount || 0,
        totalStudents: stdCount || 0,
        totalSubmissions: subCount || 0,
        completedAttempts: compCount || 0,
      };
    } else {
      const { count: actCount } = await this.client
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'published', 'open']);

      const { count: myCount } = await this.client
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.userId);

      const { count: passCount } = await this.client
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.userId)
        .eq('state', 'PASSED');

      return {
        activeAssignments: actCount || 0,
        myAttempts: myCount || 0,
        passedAttempts: passCount || 0,
      };
    }
  }

  async getAttemptById(id: string): Promise<StudentAttemptEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('student_attempts').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      ...data,
      mutation_metadata_json: typeof data.mutation_metadata_json === 'object' && data.mutation_metadata_json !== null
        ? JSON.stringify(data.mutation_metadata_json)
        : data.mutation_metadata_json,
      evaluation_result_json: typeof data.evaluation_result_json === 'object' && data.evaluation_result_json !== null
        ? JSON.stringify(data.evaluation_result_json)
        : data.evaluation_result_json,
    };
  }

  async getAttemptByStudentAndAssignment(studentId: string, assignmentId: string): Promise<StudentAttemptEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('student_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      ...data,
      mutation_metadata_json: typeof data.mutation_metadata_json === 'object' && data.mutation_metadata_json !== null
        ? JSON.stringify(data.mutation_metadata_json)
        : data.mutation_metadata_json,
      evaluation_result_json: typeof data.evaluation_result_json === 'object' && data.evaluation_result_json !== null
        ? JSON.stringify(data.evaluation_result_json)
        : data.evaluation_result_json,
    };
  }

  async createAttempt(data: Partial<StudentAttemptEntity> & { id: string; assignment_id: string; student_id: string; state: string }): Promise<StudentAttemptEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const payload = {
      ...data,
      mutation_metadata_json: data.mutation_metadata_json ? JSON.parse(data.mutation_metadata_json) : null,
      evaluation_result_json: data.evaluation_result_json ? JSON.parse(data.evaluation_result_json) : null,
    };
    const { data: result, error } = await this.client.from('student_attempts').insert(payload).select().single();
    if (error) throw error;
    return {
      ...result,
      mutation_metadata_json: result.mutation_metadata_json ? JSON.stringify(result.mutation_metadata_json) : null,
      evaluation_result_json: result.evaluation_result_json ? JSON.stringify(result.evaluation_result_json) : null,
    };
  }

  async updateAttempt(id: string, updates: Partial<StudentAttemptEntity>): Promise<StudentAttemptEntity | null> {
    if (!this.client) return null;
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    if (payload.mutation_metadata_json && typeof payload.mutation_metadata_json === 'string') {
      try { payload.mutation_metadata_json = JSON.parse(payload.mutation_metadata_json); } catch {}
    }
    if (payload.evaluation_result_json && typeof payload.evaluation_result_json === 'string') {
      try { payload.evaluation_result_json = JSON.parse(payload.evaluation_result_json); } catch {}
    }

    const { data: result, error } = await this.client.from('student_attempts').update(payload).eq('id', id).select().single();
    if (error || !result) return null;
    return {
      ...result,
      mutation_metadata_json: result.mutation_metadata_json ? JSON.stringify(result.mutation_metadata_json) : null,
      evaluation_result_json: result.evaluation_result_json ? JSON.stringify(result.evaluation_result_json) : null,
    };
  }

  async getSubmissions(filter?: { assignmentId?: string; studentId?: string; facultyId?: string }): Promise<any[]> {
    if (!this.client) return [];
    let query = this.client
      .from('student_attempts')
      .select(`
        *,
        profiles!student_id (full_name, email, roll_number, class_id, division_id),
        assignments!assignment_id (title, language, created_by)
      `)
      .order('created_at', { ascending: false });

    if (filter?.assignmentId) {
      query = query.eq('assignment_id', filter.assignmentId);
    }
    if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      assignmentId: r.assignment_id,
      assignmentTitle: r.assignments?.title || 'Untitled Assignment',
      assignmentLanguage: r.assignments?.language || r.language || 'python',
      studentId: r.student_id,
      studentName: r.profiles?.full_name || 'Anonymous Student',
      studentEmail: r.profiles?.email || '',
      studentRollNumber: r.profiles?.roll_number || null,
      studentClassId: r.profiles?.class_id || null,
      studentDivisionId: r.profiles?.division_id || null,
      state: r.state,
      language: r.language,
      originalCode: r.original_code,
      mutatedCode: r.mutated_code,
      repairedCode: r.repaired_code,
      submittedCode: r.repaired_code || r.original_code || '',
      mutationType: r.mutation_type,
      mutationMetadataJson: typeof r.mutation_metadata_json === 'object' ? JSON.stringify(r.mutation_metadata_json) : r.mutation_metadata_json,
      failureReason: r.failure_reason,
      submittedAt: r.submitted_at || r.updated_at || r.created_at,
      createdAt: r.created_at,
      evaluation: r.evaluation_result_json
        ? typeof r.evaluation_result_json === 'string'
          ? JSON.parse(r.evaluation_result_json)
          : r.evaluation_result_json
        : null,
    }));
  }

  async getEnrolledStudents(_facultyId?: string): Promise<any[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('profiles')
      .select('id, full_name, email, institution_id, roll_number, class_id, division_id, created_at, updated_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const { data: attempts } = await this.client
      .from('student_attempts')
      .select('student_id, state');

    const attemptList = attempts || [];

    return data.map((r: any) => {
      const studentAttempts = attemptList.filter((a: any) => a.student_id === r.id);
      const passedAttempts = studentAttempts.filter((a: any) => a.state === 'PASSED');
      return {
        id: r.id,
        name: r.full_name,
        email: r.email,
        institution: r.institution_id,
        rollNumber: r.roll_number,
        classId: r.class_id,
        divisionId: r.division_id,
        createdAt: r.created_at,
        lastLoginAt: r.updated_at || r.created_at,
        attemptsCount: studentAttempts.length,
        passedCount: passedAttempts.length,
      };
    });
  }

  async createAttemptMutation(data: AttemptMutationEntity): Promise<AttemptMutationEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const payload = {
      ...data,
      mutation_metadata_json: data.mutation_metadata_json ? JSON.parse(data.mutation_metadata_json) : null,
    };
    const { data: result, error } = await this.client.from('attempt_mutations').insert(payload).select().single();
    if (error) throw error;
    return {
      ...result,
      mutation_metadata_json: result.mutation_metadata_json ? JSON.stringify(result.mutation_metadata_json) : null,
    };
  }

  async getAttemptMutation(attemptId: string): Promise<AttemptMutationEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('attempt_mutations')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      ...data,
      mutation_metadata_json: data.mutation_metadata_json ? JSON.stringify(data.mutation_metadata_json) : null,
    };
  }

  async getMutationTypes(): Promise<MutationRegistryEntity[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('mutation_registry').select('*').eq('is_active', true);
    if (error || !data) return [];
    return data as MutationRegistryEntity[];
  }

  async toggleMutationType(code: string): Promise<MutationRegistryEntity | null> {
    if (!this.client) return null;
    const { data: existing } = await this.client.from('mutation_registry').select('*').eq('code', code).single();
    if (!existing) return null;
    const newActive = !existing.is_active;
    const { data: updated, error } = await this.client
      .from('mutation_registry')
      .update({ is_active: newActive })
      .eq('code', code)
      .select()
      .single();
    if (error || !updated) return null;
    return updated as MutationRegistryEntity;
  }

  async getPhase2ChallengeById(id: string): Promise<Phase2ChallengeEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('phase2_challenges').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as Phase2ChallengeEntity;
  }

  async getPhase2ChallengeByAttempt(attemptId: string): Promise<Phase2ChallengeEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('phase2_challenges')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as Phase2ChallengeEntity;
  }

  async createPhase2Challenge(data: Omit<Phase2ChallengeEntity, 'created_at' | 'updated_at'>): Promise<Phase2ChallengeEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { data: result, error } = await this.client.from('phase2_challenges').insert(data).select().single();
    if (error) throw error;
    return result as Phase2ChallengeEntity;
  }

  async updatePhase2Challenge(id: string, updates: Partial<Phase2ChallengeEntity>): Promise<Phase2ChallengeEntity | null> {
    if (!this.client) return null;
    const { data: result, error } = await this.client
      .from('phase2_challenges')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !result) return null;
    return result as Phase2ChallengeEntity;
  }

  async createPhase2Evaluation(data: Omit<Phase2EvaluationEntity, 'created_at'>): Promise<Phase2EvaluationEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const payload = {
      ...data,
      execution_metadata_json: typeof data.execution_metadata_json === 'string' ? JSON.parse(data.execution_metadata_json) : data.execution_metadata_json,
    };
    const { data: result, error } = await this.client.from('phase2_evaluations').insert(payload).select().single();
    if (error) throw error;
    return {
      ...result,
      execution_metadata_json: typeof result.execution_metadata_json === 'string' ? result.execution_metadata_json : JSON.stringify(result.execution_metadata_json || {}),
    };
  }

  async getEvaluationsForAttempt(attemptId: string): Promise<Phase2EvaluationEntity[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('phase2_evaluations').select('*').eq('attempt_id', attemptId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((d: any) => ({
      ...d,
      execution_metadata_json: typeof d.execution_metadata_json === 'string' ? d.execution_metadata_json : JSON.stringify(d.execution_metadata_json || {}),
    }));
  }

  async getPhase2EvaluationByChallenge(challengeId: string): Promise<Phase2EvaluationEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('phase2_evaluations')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      ...(data as any),
      execution_metadata_json: typeof (data as any).execution_metadata_json === 'string' ? (data as any).execution_metadata_json : JSON.stringify((data as any).execution_metadata_json || {}),
    };
  }

  async recordSecurityEvent(event: Omit<SecurityEventEntity, 'created_at'>): Promise<SecurityEventEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const payload = {
      ...event,
      metadata_json: typeof event.metadata_json === 'string' ? JSON.parse(event.metadata_json) : event.metadata_json,
    };
    const { data: result, error } = await this.client.from('security_events').insert(payload).select().single();
    if (error) throw error;
    return {
      ...result,
      metadata_json: typeof result.metadata_json === 'string' ? result.metadata_json : JSON.stringify(result.metadata_json || {}),
    };
  }

  async getSecurityEventsForAttempt(attemptId: string): Promise<SecurityEventEntity[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('security_events').select('*').eq('attempt_id', attemptId).order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((d: any) => ({
      ...d,
      metadata_json: typeof d.metadata_json === 'string' ? d.metadata_json : JSON.stringify(d.metadata_json || {}),
    }));
  }

  async getFacultyDivisionSession(
    institution: string,
    classId: string,
    divisionId: string
  ): Promise<FacultyDivisionSessionEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('faculty_division_sessions')
      .select('*')
      .ilike('institution', institution.trim())
      .ilike('class_id', classId.trim())
      .ilike('division_id', divisionId.trim())
      .maybeSingle();
    if (error || !data) return null;
    return data as FacultyDivisionSessionEntity;
  }

  async upsertFacultyDivisionSession(session: FacultyDivisionSessionEntity): Promise<FacultyDivisionSessionEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { data: result, error } = await this.client.from('faculty_division_sessions').upsert(session).select().single();
    if (error) throw error;
    return result as FacultyDivisionSessionEntity;
  }

  async deleteFacultyDivisionSession(id: string): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from('faculty_division_sessions').delete().eq('id', id);
    return !error;
  }

  async claimFacultyDivisionSession(params: {
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    institution: string;
    classId: string;
    divisionId: string;
  }): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; occupiedBy?: any; error?: string }> {
    if (!this.client) return { success: false, error: 'Database client unavailable' };

    const cleanInst = params.institution.trim();
    const cleanClass = params.classId.trim();
    const cleanDiv = params.divisionId.trim();

    // Check for existing session
    const { data: existing } = await this.client
      .from('faculty_division_sessions')
      .select('*')
      .ilike('institution', cleanInst)
      .ilike('class_id', cleanClass)
      .ilike('division_id', cleanDiv)
      .maybeSingle();

    const now = new Date();
    const leaseDurationMs = 5 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();

    if (existing) {
      const existingExpires = new Date(existing.expires_at);
      if (existingExpires.getTime() > now.getTime() && existing.faculty_id !== params.facultyId) {
        return {
          success: false,
          occupiedBy: existing,
          error: `Division '${cleanDiv}' in '${cleanClass}' is currently being proctored by ${existing.faculty_name} (${existing.faculty_email}). Exclusive session active until ${existing.expires_at}.`,
        };
      }

      // Claim or refresh session
      const { data: updated, error } = await this.client
        .from('faculty_division_sessions')
        .update({
          faculty_id: params.facultyId,
          faculty_name: params.facultyName,
          faculty_email: params.facultyEmail,
          last_heartbeat: now.toISOString(),
          expires_at: expiresAt,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !updated) {
        return { success: false, error: error?.message || 'Failed to claim session' };
      }
      return { success: true, session: updated as FacultyDivisionSessionEntity };
    }

    // Insert new session claim
    const sessionId = `fds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: FacultyDivisionSessionEntity = {
      id: sessionId,
      faculty_id: params.facultyId,
      faculty_name: params.facultyName,
      faculty_email: params.facultyEmail,
      institution: cleanInst,
      class_id: cleanClass,
      division_id: cleanDiv,
      last_heartbeat: now.toISOString(),
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    const { data: created, error } = await this.client
      .from('faculty_division_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error || !created) {
      return { success: false, error: error?.message || 'Failed to claim session' };
    }
    return { success: true, session: created as FacultyDivisionSessionEntity };
  }

  async heartbeatFacultyDivisionSession(
    facultyId: string,
    institution: string,
    classId: string,
    divisionId: string
  ): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; error?: string }> {
    if (!this.client) return { success: false, error: 'Database client unavailable' };

    const cleanInst = institution.trim();
    const cleanClass = classId.trim();
    const cleanDiv = divisionId.trim();

    const { data: existing } = await this.client
      .from('faculty_division_sessions')
      .select('*')
      .ilike('institution', cleanInst)
      .ilike('class_id', cleanClass)
      .ilike('division_id', cleanDiv)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: 'No active session found to refresh.' };
    }

    if (existing.faculty_id !== facultyId) {
      return { success: false, error: 'Cannot heartbeat a session owned by another faculty.' };
    }

    const now = new Date();
    const leaseDurationMs = 5 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();

    const { data: refreshed, error } = await this.client
      .from('faculty_division_sessions')
      .update({
        last_heartbeat: now.toISOString(),
        expires_at: expiresAt,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !refreshed) {
      return { success: false, error: error?.message || 'Failed to refresh heartbeat' };
    }
    return { success: true, session: refreshed as FacultyDivisionSessionEntity };
  }

  async releaseFacultyDivisionSession(facultyId: string): Promise<{ success: boolean }> {
    if (!this.client) return { success: false };
    const { error } = await this.client
      .from('faculty_division_sessions')
      .delete()
      .eq('faculty_id', facultyId);
    return { success: !error };
  }

  async recordProctoringEvent(event: Omit<ProctoringEventEntity, 'created_at'>): Promise<ProctoringEventEntity> {
    if (!this.client) throw new Error('Database client unavailable');
    const now = new Date().toISOString();
    let details: any = {};
    try {
      const raw = (event as any).metadata_json || event.details_json;
      details = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch {
      details = {};
    }

    const payload = {
      id: event.id,
      attempt_id: event.attempt_id,
      event_type: event.event_type,
      severity: event.severity,
      phase: (event as any).phase || 'PHASE2',
      metadata_json: details,
    };

    const { data: result, error } = await this.client.from('proctoring_events').insert(payload).select().single();
    if (error) throw error;
    const jsonStr = typeof (result.details_json || result.metadata_json) === 'string'
      ? (result.details_json || result.metadata_json)
      : JSON.stringify(result.details_json || result.metadata_json || {});
    return {
      id: result.id,
      attempt_id: result.attempt_id,
      event_type: result.event_type,
      severity: result.severity,
      details_json: jsonStr,
      created_at: result.created_at || now,
    };
  }

  async getProctoringEventsForAttempt(attemptId: string): Promise<ProctoringEventEntity[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('proctoring_events')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      attempt_id: d.attempt_id,
      event_type: d.event_type,
      severity: d.severity,
      details_json: typeof (d.details_json || d.metadata_json) === 'string' ? (d.details_json || d.metadata_json) : JSON.stringify(d.details_json || d.metadata_json || {}),
      created_at: d.created_at,
    }));
  }

  async createInquiry(inquiry: Omit<ContactInquiryEntity, 'created_at' | 'updated_at'>): Promise<ContactInquiryEntity> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const now = new Date().toISOString();
    const payload = {
      ...inquiry,
      created_at: now,
      updated_at: now,
    };
    const { data: result, error } = await this.client.from('contact_inquiries').insert(payload).select().single();
    if (error) throw error;
    return result as ContactInquiryEntity;
  }

  async getInquiries(filter?: { status?: string }): Promise<ContactInquiryEntity[]> {
    if (!this.client) return [];
    let query = this.client.from('contact_inquiries').select('*');
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as ContactInquiryEntity[];
  }

  async updateInquiryStatus(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED'): Promise<ContactInquiryEntity | null> {
    if (!this.client) return null;
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('contact_inquiries')
      .update({ status, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data as ContactInquiryEntity;
  }

  async getRecentInquiryByContact(email: string, phone: string, withinMs: number = 300000): Promise<ContactInquiryEntity | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('contact_inquiries')
      .select('*')
      .or(`email.ilike.${email},phone.eq.${phone}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const rec = data[0] as ContactInquiryEntity;
    const recTime = new Date(rec.created_at).getTime();
    if (Date.now() - recTime <= withinMs) {
      return rec;
    }
    return null;
  }
}
