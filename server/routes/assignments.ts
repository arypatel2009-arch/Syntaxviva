import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getRepository } from '../repository/index.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt.js';
import { DEFAULT_LARGEST_NUMBER_TEST_CASES, resolveAssignmentTestCases } from '../execution/evaluator.js';

export const assignmentsRouter = Router();

export interface AssignmentNotificationRecord {
  id: string;
  assignmentId: string;
  title: string;
  assignmentTitle: string;
  language: string;
  dueDate: string;
  message: string;
  targetStudentIds: string[];
  notifiedStudentCount: number;
  dismissedBy: string[];
  readBy: string[];
  createdAt: string;
}

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

function loadNotifications(): AssignmentNotificationRecord[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[SyntaXViva] Could not read notifications file:', err);
  }
  return [];
}

function saveNotifications(list: AssignmentNotificationRecord[]): void {
  try {
    const dir = path.dirname(NOTIFICATIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SyntaXViva] Could not write notifications file:', err);
  }
}

// Get notifications for logged-in user
assignmentsRouter.get('/meta/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user!.userId || (req.user as any).id || '');
    const all = loadNotifications();
    const visible = all
      .filter((n) => !(n.dismissedBy || []).includes(userId))
      .map((n) => ({
        id: n.id,
        assignmentId: n.assignmentId,
        title: n.title,
        assignmentTitle: n.assignmentTitle,
        language: n.language,
        dueDate: n.dueDate,
        message: n.message,
        notifiedStudentCount: n.notifiedStudentCount,
        unread: !(n.readBy || []).includes(userId),
        createdAt: n.createdAt,
      }));
    res.json({ notifications: visible });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.json({ notifications: [] });
  }
});

// Mark all notifications as read
assignmentsRouter.post('/meta/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user!.userId || (req.user as any).id || '');
    const all = loadNotifications();
    const updated = all.map((n) => ({
      ...n,
      readBy: Array.from(new Set([...(n.readBy || []), userId])),
    }));
    saveNotifications(updated);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Delete a single notification for the current user
assignmentsRouter.delete('/meta/notifications/:notifId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user!.userId || (req.user as any).id || '');
    const { notifId } = req.params;
    const all = loadNotifications();
    const updated = all.map((n) =>
      n.id === notifId
        ? { ...n, dismissedBy: Array.from(new Set([...(n.dismissedBy || []), userId])) }
        : n
    );
    saveNotifications(updated);
    res.json({ success: true, id: notifId });
  } catch (err) {
    res.json({ success: false });
  }
});

// Delete/clear all notifications for the current user
assignmentsRouter.delete('/meta/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user!.userId || (req.user as any).id || '');
    const all = loadNotifications();
    const updated = all.map((n) => ({
      ...n,
      dismissedBy: Array.from(new Set([...(n.dismissedBy || []), userId])),
    }));
    saveNotifications(updated);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Get assignments list
assignmentsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const repo = getRepository();
    const studentId = user.userId || (user as any).id;
    const assignments = await repo.getAssignments({ role: user.role, studentId });
    res.json({ assignments });
  } catch (err: any) {
    console.error('Error querying assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
});

// Get single assignment
assignmentsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const rawAssignment = await repo.getAssignmentById(id);

    if (!rawAssignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    const assignment: any = {
      ...rawAssignment,
      testCasesJson: rawAssignment.test_cases_json || (rawAssignment as any).testCasesJson || '[]',
      starterCode: rawAssignment.starter_code || (rawAssignment as any).starterCode || '',
      dueDate: rawAssignment.due_date || (rawAssignment as any).dueDate || '2026-10-20',
      phase2Unlocked: Boolean(rawAssignment.phase2_unlocked || (rawAssignment as any).phase2Unlocked),
      createdBy: rawAssignment.created_by || (rawAssignment as any).createdBy,
      createdAt: rawAssignment.created_at || (rawAssignment as any).createdAt,
      updatedAt: rawAssignment.updated_at || (rawAssignment as any).updatedAt,
      createdByName: (rawAssignment as any).createdByName || (rawAssignment as any).created_by_name || 'Faculty',
    };

    // Never expose hidden test cases to students
    if (req.user?.role === 'student' && assignment.testCasesJson) {
      try {
        const parsed = JSON.parse(assignment.testCasesJson);
        const resolved = resolveAssignmentTestCases(
          Array.isArray(parsed) ? parsed : [],
          assignment.title,
          assignment.description
        );
        const masked = resolved
          .filter((t: any) => !t.is_hidden && !t.isHidden)
          .map((t: any) => ({
            input: t.input,
            expected: t.expected,
            description: t.description,
            is_hidden: false,
          }));
        assignment.testCasesJson = JSON.stringify(masked);
      } catch (e) {
        assignment.testCasesJson = '[]';
      }
    }

    res.json({ assignment });
  } catch (err: any) {
    console.error('Error fetching assignment:', err);
    res.status(500).json({ error: 'Failed to fetch assignment details.' });
  }
});

// Create assignment (Faculty only)
assignmentsRouter.post('/', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      language = 'python',
      requirements = '',
      starterCode = '',
      testCases = [],
      dueDate,
    } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Assignment title is required.' });
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim()
        : cleanTitle;
    const cleanLanguage =
      typeof language === 'string' && language.trim().length > 0
        ? language.trim().toLowerCase()
        : 'python';
    const cleanRequirements =
      typeof requirements === 'string' ? requirements.trim() : '';
    const cleanStarterCode =
      typeof starterCode === 'string' ? starterCode : '';

    let parsedTestCases = Array.isArray(testCases) ? testCases : [];
    if (typeof testCases === 'string') {
      try {
        parsedTestCases = JSON.parse(testCases);
      } catch {
        parsedTestCases = [];
      }
    }

    const testCasesJson = JSON.stringify(
      parsedTestCases.map((tc: any) => ({
        input: typeof tc?.input === 'string' ? tc.input : (tc?.input !== undefined && tc?.input !== null ? String(tc.input) : ''),
        expected: typeof tc?.expected === 'string' ? tc.expected : (tc?.expected !== undefined && tc?.expected !== null ? String(tc.expected) : ''),
        description: tc?.description || '',
        is_hidden: Boolean(tc?.is_hidden || tc?.isHidden),
      }))
    );

    const repo = getRepository();

    // Faculty Profile Completion Gate: Block assignment creation if profile is incomplete
    if (req.user?.role === 'faculty') {
      const facultyProfile = await repo.getProfileById(req.user.userId);
      const isFacultyProfileComplete = Boolean(
        facultyProfile &&
        facultyProfile.full_name?.trim() &&
        facultyProfile.full_name.trim().length >= 2 &&
        facultyProfile.institution_id?.trim()
      );

      if (!isFacultyProfileComplete) {
        res.status(403).json({
          error: 'Profile incomplete! You must complete your faculty profile (Full Name and Institution) before creating new lab assignments.',
          code: 'profile_incomplete',
          isProfileIncomplete: true,
        });
        return;
      }
    }



    const finalDueDate =
      typeof dueDate === 'string' && dueDate.trim().length > 0
        ? dueDate.trim()
        : '2026-12-31';

    const assignmentId = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const created = await repo.createAssignment({
      id: assignmentId,
      title: cleanTitle,
      description: cleanDescription,
      language: cleanLanguage,
      requirements: cleanRequirements,
      starter_code: cleanStarterCode,
      test_cases_json: testCasesJson,
      status: 'active',
      created_by: req.user!.userId,
      due_date: finalDueDate,
    });

    // Notify all students who have logged into their account
    let notifiedCount = 0;
    try {
      const loggedInStudents = await repo.getEnrolledStudents().catch(() => []);
      notifiedCount = loggedInStudents.length;
      const targetStudentIds = loggedInStudents.map((s: any) => String(s.id));
      const newNotification: AssignmentNotificationRecord = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assignmentId: created.id,
        title: `New Assignment: ${created.title}`,
        assignmentTitle: created.title,
        language: created.language,
        dueDate: created.due_date || finalDueDate,
        message: `New ${created.language.toUpperCase()} lab assignment published.`,
        targetStudentIds,
        notifiedStudentCount: loggedInStudents.length,
        dismissedBy: [],
        readBy: [],
        createdAt: new Date().toISOString(),
      };
      const existingNotifs = loadNotifications();
      saveNotifications([newNotification, ...existingNotifs]);
    } catch (notifErr) {
      console.warn('Could not save assignment notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      notifiedStudentCount: notifiedCount,
      assignment: {
        id: created.id,
        title: created.title,
        description: created.description,
        language: created.language,
        requirements: created.requirements,
        starterCode: created.starter_code,
        testCasesJson: created.test_cases_json,
        status: created.status,
        phase2Unlocked: Boolean(created.phase2_unlocked),
        createdBy: created.created_by,
        dueDate: created.due_date,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      },
    });
  } catch (err: any) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: err?.message || 'Failed to create assignment.' });
  }
});

// Update assignment deadline (Faculty only)
assignmentsRouter.put('/:id/deadline', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dueDate } = req.body;

    if (!dueDate || typeof dueDate !== 'string' || !dueDate.trim()) {
      res.status(400).json({ error: 'Valid deadline date is required.' });
      return;
    }

    const repo = getRepository();
    const updated = await repo.updateAssignment(id, { due_date: dueDate.trim() });

    if (!updated) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Update or create notification for all logged-in students with the new deadline
    const loggedInStudents = await repo.getEnrolledStudents().catch(() => []);
    const allNotifs = loadNotifications();
    const existingIdx = allNotifs.findIndex((n) => n.assignmentId === id);
    if (existingIdx >= 0) {
      allNotifs[existingIdx] = {
        ...allNotifs[existingIdx],
        dueDate: updated.due_date,
        notifiedStudentCount: loggedInStudents.length,
        readBy: [], // mark unread again so students see the updated deadline
        dismissedBy: [],
        createdAt: new Date().toISOString(),
      };
      saveNotifications(allNotifs);
    } else {
      const asg = await repo.getAssignmentById(id);
      const newNotif: AssignmentNotificationRecord = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assignmentId: id,
        title: `Assignment Deadline Updated: ${asg?.title || 'Lab Assignment'}`,
        assignmentTitle: asg?.title || 'Lab Assignment',
        language: asg?.language || 'python',
        dueDate: updated.due_date,
        message: `Faculty updated the submission deadline.`,
        targetStudentIds: loggedInStudents.map((s: any) => String(s.id)),
        notifiedStudentCount: loggedInStudents.length,
        dismissedBy: [],
        readBy: [],
        createdAt: new Date().toISOString(),
      };
      saveNotifications([newNotif, ...allNotifs]);
    }

    res.json({
      success: true,
      dueDate: updated.due_date,
      notifiedStudentCount: loggedInStudents.length,
    });
  } catch (err: any) {
    console.error('Error updating assignment deadline:', err);
    res.status(500).json({ error: 'Failed to update assignment deadline.' });
  }
});

// Faculty 1-Click Unlock/Lock Phase 2 for a specific assignment (unlocks for all students)
assignmentsRouter.put('/:id/phase2-unlock', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const unlocked = req.body?.unlocked !== undefined ? Boolean(req.body.unlocked) : true;
    const repo = getRepository();

    const updated = await repo.updateAssignment(id, {
      phase2_unlocked: unlocked ? 1 : 0,
      phase2Unlocked: unlocked,
    });

    if (!updated) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    const loggedInStudents = await repo.getEnrolledStudents().catch(() => []);
    if (unlocked) {
      try {
        const allNotifs = loadNotifications();
        const newNotif: AssignmentNotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          assignmentId: id,
          title: `Phase 2 Unlocked: ${updated.title}`,
          assignmentTitle: updated.title,
          language: updated.language || 'python',
          dueDate: updated.due_date || '2026-10-20',
          message: `Faculty has unlocked Phase 2 Challenge for all students on "${updated.title}".`,
          targetStudentIds: loggedInStudents.map((s: any) => String(s.id)),
          notifiedStudentCount: loggedInStudents.length,
          dismissedBy: [],
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        saveNotifications([newNotif, ...allNotifs]);
      } catch (notifErr) {
        console.warn('Could not save Phase 2 unlock notification:', notifErr);
      }
    }

    res.json({
      success: true,
      assignmentId: id,
      phase2Unlocked: unlocked,
      notifiedStudentCount: loggedInStudents.length,
    });
  } catch (err: any) {
    console.error('Error toggling Phase 2 unlock:', err);
    res.status(500).json({ error: 'Failed to toggle Phase 2 unlock status.' });
  }
});

// Faculty 1-Click Unlock/Lock Phase 2 across ALL assignments for all students
assignmentsRouter.post('/meta/unlock-all-phase2', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const unlocked = req.body?.unlocked !== undefined ? Boolean(req.body.unlocked) : true;
    const repo = getRepository();
    const assignments = await repo.getAssignments({ role: 'faculty' });

    let updatedCount = 0;
    for (const asg of assignments) {
      await repo.updateAssignment(asg.id, {
        phase2_unlocked: unlocked ? 1 : 0,
        phase2Unlocked: unlocked,
      });
      updatedCount++;
    }

    const loggedInStudents = await repo.getEnrolledStudents().catch(() => []);
    if (unlocked && assignments.length > 0) {
      try {
        const allNotifs = loadNotifications();
        const newNotif: AssignmentNotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          assignmentId: assignments[0].id,
          title: `Phase 2 Unlocked for All Assignments`,
          assignmentTitle: `${assignments.length} Active Assignments`,
          language: 'all',
          dueDate: assignments[0].dueDate || '2026-10-20',
          message: `Faculty unlocked Phase 2 Challenge across all ${assignments.length} assignments for all students.`,
          targetStudentIds: loggedInStudents.map((s: any) => String(s.id)),
          notifiedStudentCount: loggedInStudents.length,
          dismissedBy: [],
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        saveNotifications([newNotif, ...allNotifs]);
      } catch (notifErr) {
        console.warn('Could not save global Phase 2 unlock notification:', notifErr);
      }
    }

    res.json({
      success: true,
      phase2Unlocked: unlocked,
      updatedCount,
      notifiedStudentCount: loggedInStudents.length,
    });
  } catch (err: any) {
    console.error('Error unlocking all Phase 2 assignments:', err);
    res.status(500).json({ error: 'Failed to unlock Phase 2 for all assignments.' });
  }
});

// Delete assignment (Faculty only)
assignmentsRouter.delete('/:id', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const deleted = await repo.deleteAssignment(id);

    if (!deleted) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Remove notifications for deleted assignment
    const remaining = loadNotifications().filter((n) => n.assignmentId !== id);
    saveNotifications(remaining);

    res.json({
      success: true,
      id,
    });
  } catch (err: any) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ error: 'Failed to delete assignment.' });
  }
});

// Role-specific stats
assignmentsRouter.get('/meta/stats', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const repo = getRepository();
    const stats = await repo.getDashboardStats({ userId: user.userId, role: user.role });
    res.json({ stats });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// Faculty: Get all submissions across assignments
assignmentsRouter.get('/meta/all-submissions', authenticate, requireRole('faculty', 'admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const repo = getRepository();
    const submissions = await repo.getSubmissions({});
    res.json({ submissions });
  } catch (err: any) {
    console.error('Error fetching all submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// Faculty: Get enrolled students list
assignmentsRouter.get('/meta/students', authenticate, requireRole('faculty', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const repo = getRepository();
    const students = await repo.getEnrolledStudents(user.role === 'admin' ? undefined : user.userId);
    res.json({ students });
  } catch (err: any) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch enrolled students.' });
  }
});

// Faculty/Student: Get submissions for a specific assignment
assignmentsRouter.get('/:id/submissions', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const repo = getRepository();

    if (user.role === 'student') {
      const submissions = await repo.getSubmissions({ assignmentId: id, studentId: user.userId });
      res.json({ submissions });
      return;
    }

    const submissions = await repo.getSubmissions({ assignmentId: id });
    res.json({ submissions });
  } catch (err: any) {
    console.error('Error fetching assignment submissions:', err);
    res.status(500).json({ error: 'Failed to fetch assignment submissions.' });
  }
});
