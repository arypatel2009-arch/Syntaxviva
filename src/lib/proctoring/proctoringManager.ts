/**
 * Centralized Client-Side Proctoring Manager (Non-Camera)
 * Enforces browser integrity without webcam/camera:
 * - Tab switching / page visibility change
 * - Window blur / lost focus
 * - Fullscreen mode exit
 * - Prohibited clipboard actions (copy/cut/paste prevention)
 * - Right-click context menu prevention
 * - DevTools and screenshot keyboard shortcut restrictions
 * - Server-side security event logging and warning tally
 */

import { api } from '../api.ts';
import { ProctoringEventType, ProctoringState } from './types.ts';

export interface ProctoringManagerCallbacks {
  onStateChange: (state: ProctoringState) => void;
  onWarning: (message: string, count: number, max: number) => void;
  onTerminated: (reason: string) => void;
}

export class ProctoringManager {
  private assignmentId: string;
  private challengeId?: string;
  private callbacks: ProctoringManagerCallbacks;

  private isRunning = false;
  private recentEventTimestamps = new Map<string, number>();

  private state: ProctoringState = {
    isFullscreen: false,
    isMonitoring: false,
    warningsCount: 0,
    maxWarnings: 3,
    isTerminated: false,
  };

  constructor(
    assignmentId: string,
    challengeId: string | undefined,
    callbacks: ProctoringManagerCallbacks
  ) {
    this.assignmentId = assignmentId;
    this.challengeId = challengeId;
    this.callbacks = callbacks;
  }

  public setChallengeId(challengeId: string): void {
    this.challengeId = challengeId;
  }

  public setInitialWarningsCount(count: number): void {
    this.updateState({ warningsCount: count });
  }

  public getState(): ProctoringState {
    return { ...this.state };
  }

  private updateState(partial: Partial<ProctoringState>): void {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStateChange(this.state);
  }

  /**
   * Starts non-camera browser integrity monitoring.
   */
  public startMonitoring(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.attachDomListeners();
    this.updateState({
      isMonitoring: true,
      isFullscreen: !!document.fullscreenElement,
    });
  }

  /**
   * Reports a violation directly.
   */
  public reportViolation(
    type: ProctoringEventType,
    severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING',
    metadata: any = {}
  ): void {
    this.reportEvent({
      eventType: type,
      severity,
      metadata,
    });
  }

  /**
   * Attach browser event listeners.
   */
  private attachDomListeners(): void {
    // 1. Visibility change (tab switch / minimization)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 2. Window blur & focus
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);

    // 3. Fullscreen change
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    // 4. Prohibited clipboard actions (copy, cut, paste)
    document.addEventListener('copy', this.handleCopy, true);
    document.addEventListener('cut', this.handleCut, true);
    document.addEventListener('paste', this.handlePaste, true);

    // 5. Context menu
    document.addEventListener('contextmenu', this.handleContextMenu, true);

    // 6. Keyboard shortcuts & DevTools/screenshot inspection
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden && this.isRunning && !this.state.isTerminated) {
      this.reportEvent({
        eventType: 'TAB_SWITCH',
        severity: 'CRITICAL',
        metadata: {
          action: 'Document visibility hidden / backgrounded',
          reason: 'Exam Cancelled: Student minimized window or switched browser tab',
        },
      });
    }
  };

  private handleWindowBlur = (): void => {
    if (this.isRunning && !this.state.isTerminated) {
      this.reportEvent({
        eventType: 'WINDOW_BLUR',
        severity: 'CRITICAL',
        metadata: {
          action: 'Assessment window lost focus during active challenge',
          reason: 'Exam Cancelled: Student minimized window or switched focus away from assignment',
        },
      });
    }
  };

  private handleWindowFocus = (): void => {
    // Focus restored
  };

  private handleFullscreenChange = (): void => {
    const isFull = !!document.fullscreenElement;
    this.updateState({ isFullscreen: isFull });

    if (!isFull && this.isRunning && !this.state.isTerminated) {
      this.reportEvent({
        eventType: 'FULLSCREEN_EXIT',
        severity: 'CRITICAL',
        metadata: { action: 'User exited mandatory fullscreen mode during active challenge' },
      });
    }
  };

  private handleCopy = (e: ClipboardEvent): void => {
    if (!this.isRunning || this.state.isTerminated) return;
    e.preventDefault();
    e.stopPropagation();
    this.reportEvent({
      eventType: 'COPY_ATTEMPT',
      severity: 'CRITICAL',
      metadata: { action: 'Prohibited code copy attempt during active challenge' },
    });
  };

  private handleCut = (e: ClipboardEvent): void => {
    if (!this.isRunning || this.state.isTerminated) return;
    e.preventDefault();
    e.stopPropagation();
    this.reportEvent({
      eventType: 'CUT_ATTEMPT',
      severity: 'CRITICAL',
      metadata: { action: 'Prohibited code cut attempt during active challenge' },
    });
  };

  private handlePaste = (e: ClipboardEvent): void => {
    if (!this.isRunning || this.state.isTerminated) return;
    e.preventDefault();
    e.stopPropagation();
    this.reportEvent({
      eventType: 'PASTE_ATTEMPT',
      severity: 'CRITICAL',
      metadata: { action: 'Prohibited external code paste attempt during active challenge' },
    });
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (this.isRunning && !this.state.isTerminated) {
      this.reportEvent({
        eventType: 'CONTEXT_MENU_ATTEMPT',
        severity: 'WARNING',
        metadata: { action: 'Blocked context menu attempt' },
        debounceMs: 2000,
      });
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isRunning || this.state.isTerminated) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // DevTools & source inspection shortcuts
    if (
      e.key === 'F12' ||
      (isCtrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (isCtrlOrCmd && key === 'u')
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.reportEvent({
        eventType: 'SUSPICIOUS_KEYBOARD_SHORTCUT',
        severity: 'CRITICAL',
        metadata: { keyCombination: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey },
      });
      return;
    }

    // Screenshot shortcuts
    if (
      e.key === 'PrintScreen' ||
      (isCtrlOrCmd && e.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5'))
    ) {
      this.reportEvent({
        eventType: 'SCREENSHOT_SIGNAL',
        severity: 'CRITICAL',
        metadata: { keyCombination: e.key, description: 'Screenshot shortcut blocked' },
      });
    }
  };

  /**
   * Internal reporter with client-side rate limiting and server submission.
   */
  private async reportEvent(params: {
    eventType: ProctoringEventType;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    metadata?: any;
    debounceMs?: number;
  }): Promise<void> {
    const { eventType, severity, metadata, debounceMs = 2500 } = params;

    const now = Date.now();
    const lastTrigger = this.recentEventTimestamps.get(eventType) || 0;
    if (now - lastTrigger < debounceMs) {
      return;
    }
    this.recentEventTimestamps.set(eventType, now);

    const message = this.formatEventMessage(eventType);
    const nowIso = new Date(now).toISOString();

    let newWarningsCount = this.state.warningsCount;
    let isTerminated = this.state.isTerminated;

    if (severity === 'WARNING') {
      newWarningsCount += 1;
      this.callbacks.onWarning(message, newWarningsCount, this.state.maxWarnings);
      if (newWarningsCount > this.state.maxWarnings) {
        isTerminated = true;
      }
    } else if (severity === 'CRITICAL') {
      isTerminated = true;
    }

    this.updateState({
      warningsCount: newWarningsCount,
      isTerminated,
      terminationReason: isTerminated ? message : undefined,
      recentEvent: {
        type: eventType,
        severity,
        message,
        timestamp: nowIso,
      },
    });

    if (isTerminated) {
      this.callbacks.onTerminated(message);
    }

    try {
      const serverRes = await api.reportPhase2SecurityEvent(this.assignmentId, {
        challengeId: this.challengeId,
        eventType,
        severity,
        metadata: {
          ...metadata,
          localWarningsCount: newWarningsCount,
          isTerminated,
        },
        clientTimestamp: nowIso,
      });

      if (serverRes.terminated && !this.state.isTerminated) {
        this.updateState({ isTerminated: true, terminationReason: serverRes.message });
        this.callbacks.onTerminated(serverRes.message || message);
      }
    } catch (err) {
      console.warn('Failed to send security event to server:', err);
    }
  }

  private formatEventMessage(type: ProctoringEventType): string {
    switch (type) {
      case 'PASTE_ATTEMPT':
      case 'PASTE_BLOCKED':
        return 'Exam Cancelled: Prohibited code paste attempt during exam.';
      case 'COPY_ATTEMPT':
      case 'COPY_BLOCKED':
        return 'Exam Cancelled: Prohibited code copy attempt during exam.';
      case 'CUT_ATTEMPT':
      case 'CUT_BLOCKED':
        return 'Exam Cancelled: Prohibited code cut attempt during exam.';
      case 'TAB_SWITCH':
      case 'PAGE_HIDDEN':
      case 'TAB_BLURRED':
        return 'Exam Cancelled: Student minimized window or switched browser tab.';
      case 'WINDOW_BLUR':
        return 'Exam Cancelled: Student minimized window or switched focus away from assignment.';
      case 'FULLSCREEN_EXIT':
        return 'Exam Cancelled: Student exited required fullscreen mode.';
      case 'CONTEXT_MENU_ATTEMPT':
      case 'CONTEXT_MENU_BLOCKED':
        return 'Right-click context menu is disabled.';
      case 'SUSPICIOUS_KEYBOARD_SHORTCUT':
        return 'Exam Cancelled: Restricted keyboard shortcut blocked.';
      case 'SCREENSHOT_SIGNAL':
        return 'Exam Cancelled: Screenshot shortcut detected.';
      default:
        return `Exam Cancelled: Security violation (${type})`;
    }
  }

  /**
   * Teardown and resource cleanup.
   */
  public stop(): void {
    this.isRunning = false;

    // Remove DOM listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('copy', this.handleCopy, true);
    document.removeEventListener('cut', this.handleCut, true);
    document.removeEventListener('paste', this.handlePaste, true);
    document.removeEventListener('contextmenu', this.handleContextMenu, true);
    window.removeEventListener('keydown', this.handleKeyDown, true);

    this.updateState({ isMonitoring: false });
  }
}
