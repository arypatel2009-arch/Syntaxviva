import { Router, Response } from 'express';
import { getRepository } from '../repository/index.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt.js';

export const inquiriesRouter = Router();

const VALID_ROLES = ['Faculty', 'HOD', 'Institution Administrator', 'Other'];
const VALID_INQUIRY_TYPES = ['Pro plan pricing', 'Institutional pricing', 'Product demo', 'Other'];
const VALID_USAGE_TYPES = ['Individual faculty', 'Small department', 'Entire institution'];
const VALID_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'];

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 1. PUBLIC: Submit a Book a Call Inquiry
inquiriesRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      institution,
      email,
      phone,
      role,
      inquiryType,
      expectedUsage,
      preferredTime,
      message,
    } = req.body || {};

    // Input sanitization & validation
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanInstitution = typeof institution === 'string' ? institution.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanRole = typeof role === 'string' ? role.trim() : 'Faculty';
    const cleanInquiryType = typeof inquiryType === 'string' ? inquiryType.trim() : 'Pro plan pricing';
    const cleanExpectedUsage = typeof expectedUsage === 'string' ? expectedUsage.trim() : 'Individual faculty';
    const cleanPreferredTime = typeof preferredTime === 'string' ? preferredTime.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters).' });
      return;
    }

    if (!cleanInstitution || cleanInstitution.length < 2) {
      res.status(400).json({ error: 'Please enter a valid institution or organization name.' });
      return;
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid institutional email address.' });
      return;
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      res.status(400).json({ error: 'Please enter a valid contact phone number with country code.' });
      return;
    }

    const repo = getRepository();

    // Duplicate submission protection (check within last 5 minutes)
    const recent = await repo.getRecentInquiryByContact(cleanEmail, cleanPhone, 300000);
    if (recent) {
      res.status(429).json({
        error: 'An inquiry from this email or phone number was recently submitted. Please wait a few minutes before submitting another request.',
        alreadySubmitted: true,
        inquiryId: recent.id,
      });
      return;
    }

    const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const created = await repo.createInquiry({
      id: inquiryId,
      name: cleanName,
      institution: cleanInstitution,
      email: cleanEmail,
      phone: cleanPhone,
      role: VALID_ROLES.includes(cleanRole) ? cleanRole : 'Faculty',
      inquiry_type: VALID_INQUIRY_TYPES.includes(cleanInquiryType) ? cleanInquiryType : 'Pro plan pricing',
      expected_usage: VALID_USAGE_TYPES.includes(cleanExpectedUsage) ? cleanExpectedUsage : 'Individual faculty',
      preferred_time: cleanPreferredTime || null,
      message: cleanMessage || null,
      status: 'NEW',
    });

    res.status(201).json({
      success: true,
      inquiryId: created.id,
      message: 'Your inquiry has been stored securely. Click below to continue on WhatsApp.',
    });
  } catch (err: any) {
    console.error('[SyntaXViva Inquiries] Error processing inquiry:', err);
    res.status(500).json({ error: 'Failed to process inquiry submission. Please try again.' });
  }
});

// 2. PROTECTED ADMIN: Get all submitted inquiries
inquiriesRouter.get('/admin/list', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const repo = getRepository();
    const inquiries = await repo.getInquiries(statusFilter ? { status: statusFilter } : undefined);
    res.json({ inquiries });
  } catch (err: any) {
    console.error('[SyntaXViva Inquiries] Error fetching admin inquiries:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries list.' });
  }
});

// 3. PROTECTED ADMIN: Update inquiry status (NEW, CONTACTED, CLOSED)
inquiriesRouter.patch('/admin/:id/status', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status value. Must be one of [${VALID_STATUSES.join(', ')}].` });
      return;
    }

    const repo = getRepository();
    const updated = await repo.updateInquiryStatus(id, status as any);

    if (!updated) {
      res.status(404).json({ error: 'Inquiry record not found.' });
      return;
    }

    res.json({ success: true, inquiry: updated });
  } catch (err: any) {
    console.error('[SyntaXViva Inquiries] Error updating inquiry status:', err);
    res.status(500).json({ error: 'Failed to update inquiry status.' });
  }
});
