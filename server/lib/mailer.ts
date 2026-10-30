/**
 * SyntaXViva Standalone Mailer Service
 * Direct transactional email delivery via Resend API
 * Sender: SyntaxViva <support@syntaxviva.online>
 */

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  fullName: string;
}

export async function sendOtpEmail({ to, otp, fullName }: SendOtpEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  
  if (!apiKey) {
    console.error('[Mailer] RESEND_API_KEY environment variable is missing.');
    throw new Error('Email service configuration error. RESEND_API_KEY is missing.');
  }

  const senderEmail = (process.env.MAIL_FROM || 'SyntaxViva <support@syntaxviva.online>').trim();
  const subject = `Your SyntaxViva Verification Code: ${otp}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
      color: #0f172a;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px 28px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      color: #059669;
      letter-spacing: -0.5px;
      text-align: center;
      margin-bottom: 24px;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      text-align: center;
    }
    .greeting {
      font-size: 14px;
      color: #475569;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .otp-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1.5px dashed #059669;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #065f46;
      font-family: 'SF Mono', Consolas, Monaco, monospace;
    }
    .expiry {
      font-size: 12px;
      color: #047857;
      margin-top: 8px;
      font-weight: 600;
    }
    .instructions {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SyntaXViva</div>
    <div class="title">Verify Your Academic Account</div>
    <div class="greeting">
      Hello <strong>${escapeHtml(fullName || 'User')}</strong>,<br>
      Thank you for registering on SyntaXViva. Please use the verification code below to activate your account:
    </div>
    
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="expiry">Expires in 10 minutes</div>
    </div>

    <div class="instructions">
      Enter this 6-digit code on the verification screen to complete your registration.
      If you did not request this code, you can safely ignore this email.
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} SyntaXViva Platform. Automated security dispatch.<br>
      For assistance, contact <a href="mailto:support@syntaxviva.online" style="color: #059669; text-decoration: none;">support@syntaxviva.online</a>.
    </div>
  </div>
</body>
</html>
  `;

  // Try using Resend SDK if installed, or fallback cleanly to direct HTTP fetch
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('[Mailer] Resend SDK returned error:', error);
      throw error;
    }

    console.log(`[Mailer] OTP email dispatched via Resend SDK to ${to} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (sdkErr: any) {
    // If SDK is not available or throws, use native HTTP fetch directly to Resend API
    console.warn('[Mailer] Falling back to direct Resend REST API:', sdkErr?.message || sdkErr);
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to,
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Mailer] Direct Resend API failed (${res.status}):`, errText);
      throw new Error(`Failed to deliver verification email: ${errText || res.statusText}`);
    }

    const json = (await res.json().catch(() => ({}))) as any;
    console.log(`[Mailer] OTP email dispatched via direct HTTP to ${to} (ID: ${json?.id})`);
    return { success: true, id: json?.id };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
