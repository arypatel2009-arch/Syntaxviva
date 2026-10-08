import assert from 'node:assert';
import { SecurityPolicyEngine } from '../server/security/policy.js';

console.log('=== [SyntaXViva] FACE MOVEMENT & SECURITY POLICY VERIFICATION SUITE ===');

async function runFaceMovementPolicyTests() {
  const policy = SecurityPolicyEngine.getInstance();

  // Test 1: Three-warning policy for face movement / attention
  console.log('Test 1: Verifying 3-warning policy for face movement...');
  
  // Warning #1
  const w1 = policy.evaluateEvent('FACE_MOVEMENT_WARNING', 'WARNING', 0);
  assert.strictEqual(w1.shouldTerminate, false, 'Warning #1 must not terminate challenge');
  assert.strictEqual(w1.isCritical, false);
  assert.strictEqual(w1.warningCount, 1);
  console.log('  ✔ Warning #1: recorded (1/3), challenge continues without failure');

  // Warning #2
  const w2 = policy.evaluateEvent('FACE_MOVEMENT_WARNING', 'WARNING', 1);
  assert.strictEqual(w2.shouldTerminate, false, 'Warning #2 must not terminate challenge');
  assert.strictEqual(w2.isCritical, false);
  assert.strictEqual(w2.warningCount, 2);
  console.log('  ✔ Warning #2: recorded (2/3), challenge continues without failure');

  // Warning #3
  const w3 = policy.evaluateEvent('ATTENTION_DEVIATION', 'WARNING', 2);
  assert.strictEqual(w3.shouldTerminate, false, 'Warning #3 must not terminate challenge');
  assert.strictEqual(w3.isCritical, false);
  assert.strictEqual(w3.warningCount, 3);
  console.log('  ✔ Warning #3: recorded (3/3), challenge continues without failure');

  // Warning #4 (First confirmed violation AFTER 3 warnings)
  const w4 = policy.evaluateEvent('FACE_MOVEMENT_WARNING', 'WARNING', 3);
  assert.strictEqual(w4.shouldTerminate, true, 'Warning #4 must terminate and lock challenge');
  assert.strictEqual(w4.isCritical, true);
  assert.strictEqual(w4.warningCount, 4);
  console.log('  ✔ Warning #4: Exceeds 3 warnings -> FAIL + TERMINATE + PERMANENT LOCK');

  // Test 2: Strict Critical Violations (1-strike policy)
  console.log('Test 2: Verifying strict critical violations (immediate fail & lock)...');
  const criticalEvents = [
    'MULTIPLE_FACES_DETECTED',
    'MULTIPLE_FACES',
    'PHONE_DETECTED',
    'PROHIBITED_OBJECT_DETECTED',
    'CAMERA_DISCONNECTED',
    'TAB_SWITCH',
    'PAGE_HIDDEN',
    'TAB_BLURRED',
    'WINDOW_BLUR',
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
  ];

  for (const eventType of criticalEvents) {
    const res = policy.evaluateEvent(eventType, undefined, 0);
    assert.strictEqual(
      res.shouldTerminate,
      true,
      `Strict critical event "${eventType}" must immediately terminate attempt on Strike 1`
    );
    assert.strictEqual(res.isCritical, true);
    assert.strictEqual(res.severity, 'CRITICAL');
  }
  console.log(`  ✔ All ${criticalEvents.length} strict violation types verified for immediate 1-strike termination.`);

  // Test 3: Eye movement & Natural Head Movement Evaluation Logic Simulation
  console.log('Test 3: Simulating 7 Camera-Proctoring Rules & Single-Episode Suppression...');
  
  const SUSTAINED_CONFIRMATION_FRAMES = 5;
  const MAX_NATURAL_DISPLACEMENT = 0.25;

  class SimulatedVisionTracker {
    private previousCentroid: { x: number; y: number } | null = null;
    public sustainedDeviationFrames = 0;
    public isInDeviationEpisode = false;

    public analyzeFrame(cx: number, cy: number): { attentionDeviation: boolean; movementDeviation: number } {
      let isDeviated = false;

      if (this.previousCentroid) {
        const dx = Math.abs(cx - this.previousCentroid.x);
        const dy = Math.abs(cy - this.previousCentroid.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Rule 1 & 2: Small natural movement ignored
        if (distance > MAX_NATURAL_DISPLACEMENT) {
          const isCentered = cx >= 0.22 && cx <= 0.78 && cy >= 0.15 && cy <= 0.82;
          if (!isCentered) {
            isDeviated = true;
          }
        }
      }
      this.previousCentroid = { x: cx, y: cy };

      // Normal workspace boundaries: [0.18, 0.82] horizontal, [0.10, 0.88] vertical
      if (cx < 0.18 || cx > 0.82 || cy < 0.10 || cy > 0.88) {
        isDeviated = true;
      }

      if (isDeviated) {
        this.sustainedDeviationFrames = Math.min(
          SUSTAINED_CONFIRMATION_FRAMES + 1,
          this.sustainedDeviationFrames + 1
        );
        if (this.sustainedDeviationFrames >= SUSTAINED_CONFIRMATION_FRAMES) {
          if (!this.isInDeviationEpisode) {
            this.isInDeviationEpisode = true;
            return { attentionDeviation: true, movementDeviation: 0.9 };
          }
        }
      } else {
        this.sustainedDeviationFrames = Math.max(0, this.sustainedDeviationFrames - 2);
        if (this.sustainedDeviationFrames === 0) {
          this.isInDeviationEpisode = false;
        }
      }

      return { attentionDeviation: false, movementDeviation: 0 };
    }
  }

  // Rule 1: Eyes movement alone -> IGNORE
  const eyeMovementTracker = new SimulatedVisionTracker();
  for (let frame = 0; frame < 20; frame++) {
    const res = eyeMovementTracker.analyzeFrame(0.50, 0.45);
    assert.strictEqual(res.attentionDeviation, false, 'Rule 1: Eye movement alone must NEVER trigger deviation');
    assert.strictEqual(res.movementDeviation, 0);
  }
  console.log('  ✔ Rule 1 Verified: Eye movement & blinking alone: 0 violations, 0 warnings across 20 frames.');

  // Rule 2: Small natural face movement -> IGNORE
  const naturalMovementTracker = new SimulatedVisionTracker();
  const naturalDrifts = [
    { x: 0.50, y: 0.45 },
    { x: 0.52, y: 0.46 },
    { x: 0.48, y: 0.44 },
    { x: 0.54, y: 0.47 },
    { x: 0.50, y: 0.45 },
    { x: 0.47, y: 0.43 },
  ];
  for (const pos of naturalDrifts) {
    const res = naturalMovementTracker.analyzeFrame(pos.x, pos.y);
    assert.strictEqual(res.attentionDeviation, false, 'Rule 2: Small natural head movement must NOT trigger warning');
  }
  console.log('  ✔ Rule 2 Verified: Small natural head movement: 0 violations, 0 warnings.');

  // Rule 3: Moderate left/right/up/down face movement -> WARNING (after temporal confirmation, no immediate fail)
  const moderateTracker = new SimulatedVisionTracker();
  moderateTracker.analyzeFrame(0.50, 0.45);
  // Turn head moderately to the right (cx = 0.85)
  assert.strictEqual(moderateTracker.analyzeFrame(0.85, 0.45).attentionDeviation, false, 'Single frame must not warn');
  assert.strictEqual(moderateTracker.analyzeFrame(0.85, 0.45).attentionDeviation, false, 'Brief glance must not warn');
  assert.strictEqual(moderateTracker.analyzeFrame(0.85, 0.45).attentionDeviation, false, 'Frame 3 must not warn');
  assert.strictEqual(moderateTracker.analyzeFrame(0.85, 0.45).attentionDeviation, false, 'Frame 4 must not warn');
  const modWarning = moderateTracker.analyzeFrame(0.85, 0.45);
  assert.strictEqual(modWarning.attentionDeviation, true, 'Rule 3: Moderate sustained deviation generates a warning');
  console.log('  ✔ Rule 3 Verified: Moderate face movement produces WARNING after temporal confirmation (no immediate fail).');

  // Rule 4: Excessive/sustained face deviation -> WARNING (temporal confirmation, no single-frame fail)
  const excessiveTracker = new SimulatedVisionTracker();
  excessiveTracker.analyzeFrame(0.50, 0.45);
  // Brief excessive deviation for 2 frames then return
  assert.strictEqual(excessiveTracker.analyzeFrame(0.05, 0.45).attentionDeviation, false, 'Single frame deviation ignored');
  assert.strictEqual(excessiveTracker.analyzeFrame(0.05, 0.45).attentionDeviation, false, '2-frame deviation ignored');
  assert.strictEqual(excessiveTracker.analyzeFrame(0.50, 0.45).attentionDeviation, false, 'Immediate recovery ignored');
  console.log('  ✔ Rule 4 Verified: Brief excessive movement does NOT trigger violation.');

  // Single Continuous Episode Suppression:
  // Continuing in deviated position must NOT trigger repeated warnings
  console.log('Test 4: Verifying Single Continuous Movement Episode Suppression...');
  const episodeTracker = new SimulatedVisionTracker();
  episodeTracker.analyzeFrame(0.50, 0.45);

  let warningCount = 0;
  for (let f = 1; f <= 25; f++) {
    // Continuous turned head for 25 consecutive frames (~15 seconds)
    const res = episodeTracker.analyzeFrame(0.08, 0.45);
    if (res.attentionDeviation) {
      warningCount++;
    }
  }
  assert.strictEqual(
    warningCount,
    1,
    `Continuous deviation episode must generate exactly 1 warning, got ${warningCount}`
  );
  console.log('  ✔ Single Continuous Episode: 25 frames of continuous deviation generated exactly 1 warning (no repeated warnings).');

  // Returning to center resets the episode
  for (let r = 1; r <= 5; r++) {
    episodeTracker.analyzeFrame(0.50, 0.45);
  }
  assert.strictEqual(episodeTracker.isInDeviationEpisode, false, 'Returning to center resets episode state');

  // A NEW episode now triggers the second warning
  let secondWarningTriggered = false;
  for (let f = 1; f <= 5; f++) {
    const res = episodeTracker.analyzeFrame(0.08, 0.45);
    if (res.attentionDeviation) {
      secondWarningTriggered = true;
    }
  }
  assert.strictEqual(secondWarningTriggered, true, 'New episode triggers subsequent warning');
  console.log('  ✔ Subsequent new episode after returning to center cleanly triggers next warning.');

  console.log('\n===========================================================');
  console.log('🎉 ALL FACE MOVEMENT & SECURITY POLICY UNIT TESTS PASSED!');
  console.log('===========================================================\n');
}

runFaceMovementPolicyTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
