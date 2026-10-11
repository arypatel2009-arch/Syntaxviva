import { Router, Response } from 'express';
import { getRepository } from '../repository/index.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt.js';

export const classroomsRouter = Router();

/**
 * GET /api/classrooms
 * Returns classrooms scoped to the authenticated user:
 * - Faculty: Classrooms created by this faculty member
 * - Student: Classrooms the student is actively enrolled in
 */
classroomsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const repo = getRepository();

    if (user.role === 'faculty' || user.role === 'admin') {
      let classrooms = await repo.getClassroomsByFaculty(user.userId);
      if (classrooms.length === 0) {
        // Auto-provision initial classroom so faculty has a ready join code immediately on their dashboard
        const profile = await repo.getProfileById(user.userId);
        const institutionName = (profile?.institution_id || (profile as any)?.institution || 'SyntaXViva Academic Institute').trim();
        const college = await repo.getOrCreateCollege(institutionName);
        const joinCode = await repo.generateUniqueJoinCode();
        const autoClassroom = await repo.createClassroom({
          college_id: college.id,
          faculty_id: user.userId,
          name: `${profile?.full_name ? profile.full_name + "'s " : ''}Computer Science Lab`,
          description: 'Primary classroom cohort for lab assignments and viva assessments.',
          join_code: joinCode,
        });
        classrooms = [autoClassroom];
      }
      res.json({ classrooms });
      return;
    }

    // Student role
    const classrooms = await repo.getClassroomsByStudent(user.userId);
    res.json({ classrooms });
  } catch (err: any) {
    console.error('[SyntaXViva Classrooms] Error fetching classrooms:', err);
    res.status(500).json({ error: 'Failed to fetch classrooms.' });
  }
});

/**
 * POST /api/classrooms
 * Faculty creates a new classroom under their authenticated college scope.
 * Auto-generates a unique 6-character alphanumeric join code (e.g. "SYN789").
 */
classroomsRouter.post(
  '/',
  authenticate,
  requireRole('faculty', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { name, description } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Classroom name is required.' });
        return;
      }

      const repo = getRepository();
      const profile = await repo.getProfileById(user.userId);

      const institutionName = (profile?.institution_id || (profile as any)?.institution || '').trim();
      if (!institutionName) {
        res.status(403).json({
          error: 'Profile incomplete: You must specify your college/institution before creating classrooms.',
          code: 'profile_incomplete',
        });
        return;
      }

      // Resolve base college tenant
      const college = await repo.getOrCreateCollege(institutionName);
      const joinCode = await repo.generateUniqueJoinCode();

      const classroom = await repo.createClassroom({
        college_id: college.id,
        faculty_id: user.userId,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        join_code: joinCode,
      });

      res.status(201).json({
        success: true,
        classroom: {
          ...classroom,
          collegeName: college.name,
        },
        joinCode: classroom.join_code,
      });
    } catch (err: any) {
      console.error('[SyntaXViva Classrooms] Error creating classroom:', err);
      res.status(500).json({ error: 'Failed to create classroom.' });
    }
  }
);

export const sanitize = (name?: string | null): string => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Strips spaces, dots, dashes, and casing discrepancies
};

export const normalizeInstitution = sanitize;

/**
 * POST /api/classrooms/join
 * Student joins a classroom using a 6-character alphanumeric join code.
 * Strict multi-tenant verification:
 * 1. Code exists
 * 2. Student's college matches classroom's college (normalized cross-college comparison)
 * 3. Duplicate enrollment rejected (409 Conflict)
 */
classroomsRouter.post(
  '/join',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { joinCode } = req.body || {};

      if (!joinCode || typeof joinCode !== 'string' || !joinCode.trim()) {
        res.status(400).json({ error: 'A 6-character alphanumeric join code is required.' });
        return;
      }

      const cleanCode = joinCode.trim().toUpperCase();
      const repo = getRepository();
      const classroom = await repo.getClassroomByJoinCode(cleanCode);

      if (!classroom) {
        res.status(404).json({
          error: `No classroom found matching join code "${cleanCode}". Please verify with your faculty.`,
          code: 'classroom_not_found',
        });
        return;
      }

      // Check Student College Scope
      const studentProfile = await repo.getProfileById(user.userId);
      const classroomCollege = await repo.getCollegeById(classroom.college_id);

      let rawStudentInst = (
        studentProfile?.institution_id ||
        (studentProfile as any)?.institution ||
        (user as any)?.institution ||
        ''
      ).trim();

      // Faculty's profile institution
      let rawFacultyInst = '';
      if (classroom.faculty_id) {
        const facultyProfile = await repo.getProfileById(classroom.faculty_id);
        rawFacultyInst = (
          facultyProfile?.institution_id ||
          (facultyProfile as any)?.institution ||
          ''
        ).trim();
      }

      const rawClassroomInst = (
        classroom.college_name ||
        classroomCollege?.name ||
        rawFacultyInst ||
        (classroom as any)?.institution ||
        ''
      ).trim();

      const studentInst = sanitize(rawStudentInst);
      const classroomInst = sanitize(rawClassroomInst || rawFacultyInst);

      // Hierarchical Tenant Isolation Check:
      // Normalize institution strings prior to validation.
      // If both are defined, reject if normalized strings do not match.
      if (studentInst && classroomInst && studentInst !== classroomInst) {
        res.status(403).json({
          error: 'Cross-college enrollment forbidden: You cannot join a classroom from a different college/institution.',
          code: 'cross_college_forbidden',
        });
        return;
      }

      // If student profile lacks institution or college_id, auto-adopt classroom's college
      if ((!rawStudentInst || !studentProfile?.college_id) && classroom.college_id) {
        await repo.updateProfile(user.userId, {
          institution_id: rawStudentInst || rawClassroomInst,
          college_id: classroom.college_id,
        });
      }

      // Check Duplicate Enrollment
      const isAlreadyEnrolled = await repo.isStudentEnrolled(classroom.id, user.userId);
      if (isAlreadyEnrolled) {
        res.status(409).json({
          error: `You are already enrolled in "${classroom.name}".`,
          code: 'already_enrolled',
          classroom,
        });
        return;
      }

      // Enroll student
      const enrollment = await repo.enrollStudent(classroom.id, user.userId);

      res.status(200).json({
        success: true,
        message: `Successfully enrolled in ${classroom.name}.`,
        classroom: {
          ...classroom,
          collegeName: classroomCollege?.name || rawClassroomInst || rawStudentInst,
          college_name: classroomCollege?.name || rawClassroomInst || rawStudentInst,
          institution: rawFacultyInst || classroomCollege?.name || rawClassroomInst || rawStudentInst,
        },
        enrollment,
      });
    } catch (err: any) {
      console.error('[SyntaXViva Classrooms] Error joining classroom:', err);
      res.status(500).json({ error: 'Failed to join classroom.' });
    }
  }
);

/**
 * GET /api/classrooms/:id
 * Retrieve details for a specific classroom.
 * Scoped access verification:
 * - Student must be actively enrolled
 * - Faculty must belong to same college or own the classroom
 */
classroomsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const repo = getRepository();

    const classroom = await repo.getClassroomById(id);
    if (!classroom) {
      res.status(404).json({ error: 'Classroom not found.' });
      return;
    }

    if (user.role === 'student') {
      const isEnrolled = await repo.isStudentEnrolled(classroom.id, user.userId);
      if (!isEnrolled) {
        res.status(403).json({
          error: 'Forbidden: You are not enrolled in this classroom.',
          code: 'not_enrolled',
        });
        return;
      }
    } else if (user.role === 'faculty') {
      const profile = await repo.getProfileById(user.userId);
      const facultyInst = normalizeInstitution(profile?.institution_id || (profile as any)?.institution);
      const classroomCollege = await repo.getCollegeById(classroom.college_id);
      const classroomInst = normalizeInstitution(classroomCollege?.name || classroom.college_name);
      const isOwnClassroom = classroom.faculty_id === user.userId;
      const isSameCollege =
        (profile?.college_id && classroom.college_id === profile.college_id) ||
        (Boolean(facultyInst && classroomInst) && facultyInst === classroomInst);

      if (!isOwnClassroom && !isSameCollege) {
        res.status(403).json({
          error: 'Forbidden: You do not have permission to view classrooms from another college.',
          code: 'cross_college_forbidden',
        });
        return;
      }
    }

    res.json({ classroom });
  } catch (err: any) {
    console.error('[SyntaXViva Classrooms] Error fetching classroom:', err);
    res.status(500).json({ error: 'Failed to fetch classroom.' });
  }
});

/**
 * GET /api/classrooms/:id/students
 * Faculty views list of students actively enrolled in their classroom.
 */
classroomsRouter.get(
  '/:id/students',
  authenticate,
  requireRole('faculty', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const repo = getRepository();

      const classroom = await repo.getClassroomById(id);
      if (!classroom) {
        res.status(404).json({ error: 'Classroom not found.' });
        return;
      }

      if (user.role === 'faculty' && classroom.faculty_id !== user.userId) {
        const profile = await repo.getProfileById(user.userId);
        const facultyInst = normalizeInstitution(profile?.institution_id || (profile as any)?.institution);
        const classroomCollege = await repo.getCollegeById(classroom.college_id);
        const classroomInst = normalizeInstitution(classroomCollege?.name || classroom.college_name);
        const isSameCollege =
          (profile?.college_id && classroom.college_id === profile.college_id) ||
          (Boolean(facultyInst && classroomInst) && facultyInst === classroomInst);

        if (!isSameCollege) {
          res.status(403).json({
            error: 'Forbidden: You do not have permission to view students of a cross-college classroom.',
            code: 'cross_college_forbidden',
          });
          return;
        }
      }

      const students = await repo.getEnrollmentsByClassroom(id);
      res.json({ students });
    } catch (err: any) {
      console.error('[SyntaXViva Classrooms] Error fetching classroom students:', err);
      res.status(500).json({ error: 'Failed to fetch enrolled students.' });
    }
  }
);
