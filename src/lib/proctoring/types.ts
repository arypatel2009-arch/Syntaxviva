/**
 * SyntaXViva — Proctoring Types & Signals (Non-Camera)
 * Non-camera security mechanisms: Tab switching, window blur, fullscreen exit,
 * copy/cut/paste prevention, right-click context menu, DevTools/shortcut inspection.
 */

export type ProctoringEventType =
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
  | 'SCREENSHOT_SIGNAL';

export interface ProctoringState {
  isFullscreen: boolean;
  isMonitoring: boolean;
  warningsCount: number;
  maxWarnings: number;
  isTerminated: boolean;
  terminationReason?: string;
  recentEvent?: {
    type: ProctoringEventType;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    timestamp: string;
  };
}
