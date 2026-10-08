/**
 * Centralized Security Severity Policy Engine
 * Defines unambiguous thresholds and evaluation logic for all proctoring signals.
 */

import { SecurityPolicyResult, SecuritySeverity } from './types.js';

export class SecurityPolicyEngine {
  private static instance: SecurityPolicyEngine;

  // Max allowable warnings before automatic escalation to CRITICAL termination
  public readonly maxWarnings = 3;

  // Events that trigger immediate CRITICAL termination (1-strike policy)
  public readonly criticalEventTypes: ReadonlySet<string> = new Set([
    'PHONE_DETECTED',
    'PROHIBITED_OBJECT_DETECTED',
    'CAMERA_DISCONNECTED',
    'MULTIPLE_FACES_DETECTED',
    'MULTIPLE_FACES',
    'TAB_SWITCH',
    'PAGE_HIDDEN',
    'TAB_BLURRED',
    'WINDOW_BLUR',
    'WINDOW_MINIMIZED',
    'BACK_NAVIGATION',
    'BACK_BUTTON',
    'TAB_CLOSED',
    'PAGE_UNLOAD',
    'EXAM_CANCELLED',
    'FULLSCREEN_EXIT',
    'COPY_ATTEMPT',
    'COPY_BLOCKED',
    'CUT_ATTEMPT',
    'CUT_BLOCKED',
    'PASTE_ATTEMPT',
    'PASTE_BLOCKED',
    'CLIPBOARD_ATTEMPT',
    'SCREENSHOT_SIGNAL',
    'SUSPICIOUS_KEYBOARD_SHORTCUT',
    'DEVTOOLS_SIGNAL',
    'CRITICAL_SECURITY_VIOLATION',
  ]);

  // Warning/monitoring events (accumulate strikes up to maxWarnings: 1, 2, 3 continue; 4th terminates)
  public readonly warningEventTypes: ReadonlySet<string> = new Set([
    'FACE_MOVEMENT_WARNING',
    'SIGNIFICANT_FACE_MOVEMENT',
    'ATTENTION_DEVIATION',
    'FACE_NOT_DETECTED',
    'CONTEXT_MENU_ATTEMPT',
    'CONTEXT_MENU_BLOCKED',
  ]);

  public static getInstance(): SecurityPolicyEngine {
    if (!SecurityPolicyEngine.instance) {
      SecurityPolicyEngine.instance = new SecurityPolicyEngine();
    }
    return SecurityPolicyEngine.instance;
  }

  private formatHumanReadableReason(eventType: string, metadata?: Record<string, any>): string {
    if (metadata && typeof metadata.reason === 'string' && metadata.reason.trim().length > 0) {
      return metadata.reason.trim();
    }
    switch (eventType) {
      case 'BACK_NAVIGATION':
      case 'BACK_BUTTON':
        return 'Exam Cancelled: Student pressed Back button while writing assignment';
      case 'TAB_SWITCH':
      case 'PAGE_HIDDEN':
      case 'TAB_BLURRED':
      case 'WINDOW_MINIMIZED':
        return 'Exam Cancelled: Student minimized window or switched browser tab';
      case 'WINDOW_BLUR':
        return 'Exam Cancelled: Student minimized window or switched focus away from assignment';
      case 'TAB_CLOSED':
      case 'PAGE_UNLOAD':
        return 'Exam Cancelled: Student closed browser tab during assignment';
      case 'FULLSCREEN_EXIT':
        return 'Exam Cancelled: Student exited fullscreen mode during exam';
      case 'COPY_ATTEMPT':
      case 'COPY_BLOCKED':
      case 'CUT_ATTEMPT':
      case 'CUT_BLOCKED':
      case 'PASTE_ATTEMPT':
      case 'PASTE_BLOCKED':
      case 'CLIPBOARD_ATTEMPT':
        return 'Exam Cancelled: Prohibited copy/paste attempt during exam';
      case 'SCREENSHOT_SIGNAL':
        return 'Exam Cancelled: Screenshot shortcut detected during exam';
      case 'SUSPICIOUS_KEYBOARD_SHORTCUT':
      case 'DEVTOOLS_SIGNAL':
        return 'Exam Cancelled: Restricted shortcut or developer tools detected';
      default:
        return `Exam Cancelled: Security violation (${eventType})`;
    }
  }

  /**
   * Evaluates an incoming security event in the context of the attempt's violation history.
   */
  public evaluateEvent(
    eventType: string,
    clientSeverity: string | undefined,
    currentWarningCount: number,
    metadata?: Record<string, any>
  ): SecurityPolicyResult {
    // 1. Check if explicitly marked CRITICAL or belongs to immediate critical set
    if (clientSeverity === 'CRITICAL' || this.criticalEventTypes.has(eventType)) {
      return {
        isCritical: true,
        severity: 'CRITICAL',
        reason: this.formatHumanReadableReason(eventType, metadata),
        shouldTerminate: true,
        warningCount: currentWarningCount,
        maxWarnings: this.maxWarnings,
      };
    }

    // 2. Accumulate warning strikes (Three-warning policy: 1, 2, 3 continue; 4th triggers termination)
    const newWarningCount = currentWarningCount + 1;
    if (newWarningCount > this.maxWarnings) {
      return {
        isCritical: true,
        severity: 'CRITICAL',
        reason: `Exceeded allowable security warnings limit (Warning #${newWarningCount}, maximum allowed: ${this.maxWarnings}). Last event: ${eventType}`,
        shouldTerminate: true,
        warningCount: newWarningCount,
        maxWarnings: this.maxWarnings,
      };
    }

    // 3. Standard warning (Warnings 1, 2, and 3 continue the challenge)
    return {
      isCritical: false,
      severity: 'WARNING',
      reason: `Security warning recorded (${newWarningCount}/${this.maxWarnings}): ${eventType}`,
      shouldTerminate: false,
      warningCount: newWarningCount,
      maxWarnings: this.maxWarnings,
    };
  }
}
