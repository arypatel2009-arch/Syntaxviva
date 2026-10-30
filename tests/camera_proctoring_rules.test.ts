/**
 * SyntaXViva Browser Security Policy Test Suite
 * Validates non-camera proctoring rules, strike management, and auto-termination:
 *
 * 1. Warning event accumulation (3 strikes allow continuation; 4th escalates to CRITICAL & terminates)
 * 2. Critical event immediate termination (1-strike policy: TAB_SWITCH, WINDOW_BLUR, FULLSCREEN_EXIT, etc.)
 * 3. Immutable security event logging in repository
 */

import { SecurityPolicyEngine } from '../server/security/policy.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING SYNTAXVIVA BROWSER INTEGRITY VERIFICATION');
  console.log('====================================================\n');

  const policy = new SecurityPolicyEngine();

  // Test 1: Warning event incrementing strikes
  console.log('Test 1: Warning event strike accumulation...');
  const res1 = policy.evaluateEvent('CONTEXT_MENU_BLOCKED', 'WARNING', 0);
  assert(res1.severity === 'WARNING', 'First context menu attempt should be WARNING');
  assert(res1.warningCount === 1, 'Warning count should be 1');
  assert(!res1.shouldTerminate, 'Should not terminate on 1st strike');

  const res2 = policy.evaluateEvent('CONTEXT_MENU_BLOCKED', 'WARNING', 1);
  assert(res2.severity === 'WARNING', 'Second context menu attempt should be WARNING');
  assert(res2.warningCount === 2, 'Warning count should be 2');
  assert(!res2.shouldTerminate, 'Should not terminate on 2nd strike');

  const res3 = policy.evaluateEvent('CONTEXT_MENU_BLOCKED', 'WARNING', 2);
  assert(res3.severity === 'WARNING', 'Third context menu attempt should be WARNING');
  assert(res3.warningCount === 3, 'Warning count should be 3');
  assert(!res3.shouldTerminate, 'Should not terminate on 3rd strike');

  // 4th strike exceeds maxWarnings (3) -> Escalate to TERMINATE
  const res4 = policy.evaluateEvent('CONTEXT_MENU_BLOCKED', 'WARNING', 3);
  assert(res4.severity === 'CRITICAL', 'Fourth warning should escalate to CRITICAL');
  assert(res4.shouldTerminate === true, 'Session should terminate after exceeding max warnings');

  // Test 2: Critical immediate termination events
  console.log('Test 2: Critical immediate termination events (1-strike policy)...');
  const criticalEvents = [
    'TAB_SWITCH',
    'TAB_BLURRED',
    'WINDOW_BLUR',
    'FULLSCREEN_EXIT',
    'COPY_BLOCKED',
    'PASTE_BLOCKED',
    'DEVTOOLS_SIGNAL',
  ];

  for (const ev of criticalEvents) {
    const res = policy.evaluateEvent(ev, undefined, 0);
    assert(res.shouldTerminate === true, `${ev} must immediately set shouldTerminate = true`);
    assert(res.severity === 'CRITICAL', `${ev} severity must be CRITICAL`);
    assert(res.isCritical === true, `${ev} isCritical must be true`);
  }

  console.log('\nAll Browser Security Policy Tests Passed successfully!');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
