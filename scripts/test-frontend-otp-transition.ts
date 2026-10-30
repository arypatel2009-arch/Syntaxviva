import { JSDOM } from 'jsdom';

// 1. Setup DOM environment before importing React components
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://syntaxviva.online/login',
  pretendToBeVisual: true,
});

const windowProps = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'localStorage',
  'sessionStorage',
  'location',
  'history',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'ClipboardEvent',
];

for (const prop of windowProps) {
  Object.defineProperty(globalThis, prop, {
    value: (dom.window as any)[prop],
    writable: true,
    configurable: true,
  });
}

// Mock window.scrollTo
dom.window.scrollTo = () => {};

// Mock fetch for backend calls
const mockBackendUrl = 'https://syntaxviva.onrender.com';
let loginCalled = false;
let loginPayload: any = null;

(global as any).fetch = async (url: string, options: any = {}) => {
  const urlStr = String(url);

  if (urlStr.includes('/api/auth/login')) {
    loginCalled = true;
    loginPayload = options.body ? JSON.parse(options.body) : null;
    console.log('[Test Mock Fetch] Intercepted POST /api/auth/login with email:', loginPayload?.email);
    
    // Simulate real backend 403 Forbidden payload for unverified user
    const responsePayload = {
      error: 'Please verify your email address before signing in.',
      code: 'email_not_verified',
      requiresOtp: true,
      email: loginPayload?.email || 'patelary320@gmail.com',
    };

    return {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => JSON.stringify(responsePayload),
      json: async () => responsePayload,
      headers: new Map([['content-type', 'application/json']]),
    } as any;
  }

  // Fallback
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({}),
    json: async () => ({}),
    headers: new Map(),
  } as any;
};

async function runFrontendOtpTransitionTest() {
  console.log('\n========================================================================');
  console.log('🧪 FRONTEND UI STATE TRANSITION TEST: UNVERIFIED LOGIN -> OTP SCREEN');
  console.log('========================================================================\n');

  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  // Dynamically import React and components AFTER JSDOM globals are attached
  const { default: React, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { AuthProvider } = await import('../src/context/AuthContext.tsx');
  const { AuthPage } = await import('../src/components/auth/AuthPage.tsx');

  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);

  console.log('[Test Setup] Rendering <AuthProvider><AuthPage initialMode="login" /></AuthProvider> into JSDOM...');
  
  await act(async () => {
    root.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(AuthPage, { initialMode: 'login' })
      )
    );
  });

  // Verify initial Login screen rendered
  const initialHeading = container.querySelector('h1')?.textContent || '';
  console.log(`[DOM Check] Initial Screen Heading: "${initialHeading}"`);
  if (!initialHeading.includes('Welcome Back')) {
    throw new Error(`Expected initial heading to be "Welcome Back", found: "${initialHeading}"`);
  }

  // Find inputs
  const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
  const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
  const form = container.querySelector('form') as HTMLFormElement;
  const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;

  if (!emailInput || !passwordInput || !form) {
    throw new Error('Sign-In form elements (email, password, or form) not found in DOM!');
  }

  console.log('[Test Action] Populating unverified user credentials...');
  const testEmail = 'patelary320@gmail.com';
  const testPassword = 'Password123#';

  function changeInput(input: HTMLInputElement, value: string) {
    const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    const tracker = (input as any)._valueTracker;
    if (tracker) {
      tracker.setValue('');
    }
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  }

  await act(async () => {
    changeInput(emailInput, testEmail);
    changeInput(passwordInput, testPassword);
  });

  console.log(`[DOM Check] Email input DOM value: "${emailInput.value}", Password input DOM value: "${passwordInput.value ? 'SET' : 'EMPTY'}"`);
  console.log(`[Test Action] Submitting login form with email: "${testEmail}"...`);

  await act(async () => {
    if (submitButton) {
      submitButton.click();
    } else {
      form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    }
  });

  // Give React time to process async promise & state transition
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  console.log('\n[DOM Inspection] Checking updated UI state after HTTP 403 response...');

  // 1. Assert Heading has transitioned to OTP screen
  const updatedHeading = container.querySelector('h1')?.textContent || '';
  console.log(`- Screen Heading: "${updatedHeading}"`);
  if (!updatedHeading.includes('Verify Security Code')) {
    throw new Error(`Expected heading "Verify Security Code", but found "${updatedHeading}". UI failed to switch mode to 'verify-otp'!`);
  }
  console.log('  ✅ Assertion 1 Passed: Heading switched to "Verify Security Code".');

  // 2. Assert exactly 6 OTP digit boxes are rendered in the DOM
  const numericInputs = Array.from(
    container.querySelectorAll('input[inputmode="numeric"], input[pattern="\\[0-9\\]*"]')
  );
  console.log(`- 6-Digit OTP Input Boxes Count: ${numericInputs.length}`);
  if (numericInputs.length !== 6) {
    throw new Error(`Expected exactly 6 OTP input boxes, found ${numericInputs.length}!`);
  }
  console.log('  ✅ Assertion 2 Passed: Exactly 6 individual OTP input boxes are rendered.');

  // 3. Assert green success notification banner is rendered
  const greenBanner = container.querySelector('.bg-emerald-50, .border-emerald-300, .border-emerald-200');
  const greenBannerText = greenBanner?.textContent || '';
  console.log(`- Green Notification Banner Text: "${greenBannerText.trim()}"`);
  if (!greenBannerText.includes('6-digit verification code')) {
    throw new Error(`Expected green notification banner containing "6-digit verification code", found: "${greenBannerText}"`);
  }
  console.log('  ✅ Assertion 3 Passed: Green notification banner is visible with expected copy.');

  // 4. Assert "Verify & Continue" button is rendered
  const buttons = Array.from(container.querySelectorAll('button'));
  const verifyButton = buttons.find((b) => b.textContent?.includes('Verify & Continue'));
  if (!verifyButton) {
    throw new Error('Expected "Verify & Continue" submit button in DOM, but it was not found!');
  }
  console.log(`- Verify Button: "${verifyButton.textContent?.trim()}" (disabled: ${verifyButton.disabled})`);
  console.log('  ✅ Assertion 4 Passed: "Verify & Continue" button is rendered and interactive.');

  // 5. Assert Email field in OTP screen retains user email
  const currentEmailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
  console.log(`- Preserved Email in OTP View: "${currentEmailInput?.value}"`);
  if (currentEmailInput?.value !== testEmail) {
    throw new Error(`Expected email field to retain "${testEmail}", found: "${currentEmailInput?.value}"`);
  }
  console.log('  ✅ Assertion 5 Passed: Email is automatically retained in OTP screen.');

  console.log('\n========================================================================');
  console.log('🎉 ALL 5 FRONTEND UI STATE TRANSITION ASSERTIONS PASSED 100%! 🎉');
  console.log('========================================================================\n');

  root.unmount();
  process.exit(0);
}

runFrontendOtpTransitionTest().catch((err) => {
  console.error('\n❌ FRONTEND OTP TRANSITION TEST FAILED:', err);
  process.exit(1);
});
