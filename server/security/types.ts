/**
 * Centralized Phase 2 Security & Proctoring Types
 * Strictly append-only, server-authoritative proctoring data structures.
 */

export type SecurityEventType =
  | 'CAMERA_PERMISSION_DENIED'
  | 'CAMERA_DISCONNECTED'
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'MULTIPLE_FACES'
  | 'SIGNIFICANT_FACE_MOVEMENT'
  | 'ATTENTION_DEVIATION'
  | 'FACE_MOVEMENT_WARNING'
  | 'PHONE_DETECTED'
  | 'PROHIBITED_OBJECT_DETECTED'
  | 'TAB_SWITCH'
  | 'PAGE_HIDDEN'
  | 'TAB_BLURRED'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'COPY_ATTEMPT'
  | 'COPY_BLOCKED'
  | 'CUT_ATTEMPT'
  | 'CUT_BLOCKED'
  | 'PASTE_ATTEMPT'
  | 'PASTE_BLOCKED'
  | 'CLIPBOARD_ATTEMPT'
  | 'CONTEXT_MENU_ATTEMPT'
  | 'CONTEXT_MENU_BLOCKED'
  | 'SUSPICIOUS_KEYBOARD_SHORTCUT'
  | 'DEVTOOLS_SIGNAL'
  | 'SCREENSHOT_SIGNAL'
  | 'CRITICAL_SECURITY_VIOLATION';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SecurityEventPayload {
  challengeId?: string;
  eventType: SecurityEventType | string;
  severity?: SecuritySeverity;
  metadata?: Record<string, any>;
  clientTimestamp?: string;
}

export interface SecurityEventRecord {
  id: string;
  attempt_id: string;
  challenge_id: string | null;
  student_id: string;
  assignment_id: string;
  event_type: SecurityEventType | string;
  severity: SecuritySeverity;
  phase: string;
  metadata_json: string;
  client_timestamp: string;
  server_timestamp: string;
  created_at: string;
}

export interface SecurityPolicyResult {
  isCritical: boolean;
  severity: SecuritySeverity;
  reason?: string;
  shouldTerminate: boolean;
  warningCount: number;
  maxWarnings: number;
}
