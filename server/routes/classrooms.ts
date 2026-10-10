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

/**
 * POST /api/classrooms/join
 * Student joins a classroom using a 6-character alphanumeric join code.
 * Strict multi-tenant verification:
 * 1. Code exists
 * 2. Student's college matches classroom's college (cross-college rejected with 403 Forbidden)
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
      const studentInst = (studentProfile?.institution_id || (studentProfile as any)?.institution || '').trim();

      if (!studentInst) {
        res.status(400).json({
          error: 'Profile incomplete: Please ensure your college/institution is set on your profile before enrolling.',
          code: 'profile_incomplete',
        });
        return;
      }

      const studentCollege = await repo.getOrCreateCollege(studentInst);
      const classroomCollege = await repo.getCollegeById(classroom.college_id);

      // Hierarchical Tenant Isolation Check:
      // Compare college IDs and names (case-insensitive)
      const isCollegeMatch =
        classroom.college_id === studentCollege.id ||
        (classroomCollege && classroomCollege.name.toLowerCase().trim() === studentInst.toLowerCase());

      if (!isCollegeMatch) {
        res.status(403).json({
          error: 'Cross-college enrollment forbidden: You cannot join a classroom from a different college/institution.',
          code: 'cross_college_forbidden',
        });
        return;
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
          collegeName: classroomCollege?.name || studentCollege.name,
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
      const facultyInst = (profile?.institution_id || '').trim().toLowerCase();
      const classroomCollege = await repo.getCollegeById(classroom.college_id);
      const isOwnClassroom = classroom.faculty_id === user.userId;
      const isSameCollege = classroomCollege && classroomCollege.name.toLowerCase() === facultyInst;

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
        const facultyInst = (profile?.institution_id || '').trim().toLowerCase();
        const classroomCollege = await repo.getCollegeById(classroom.college_id);
        const isSameCollege = classroomCollege && classroomCollege.name.toLowerCase() === facultyInst;

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
