import { Resend } from 'resend';

let resendClient: Resend | null = null;

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

export const send2FAEmail = async (to: string, code: string): Promise<boolean> => {
  const from = process.env.FROM_EMAIL || 'OrderFlow <onboarding@resend.dev>';
  const resend = getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OrderFlow Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="500px" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #f97316; letter-spacing: -0.5px;">OrderFlow</h1>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">Two-Factor Authentication</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 15px; line-height: 24px; color: #e2e8f0; text-align: center;">
                      Use the following one-time verification code to complete your login. This code is valid for <strong>5 minutes</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0 28px 0;">
                    <div style="display: inline-block; background-color: #1e293b; border: 2px dashed #f97316; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #ffffff; text-align: center;">
                      ${code}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #334155; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b; text-align: center;">
                      If you did not request this code, please secure your account immediately. Never share your 2FA code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  if (!resend) {
    console.warn(`[2FA Mailer] RESEND_API_KEY is not configured. OTP code for ${to} is [${code}].`);
    return true;
  }

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject: `Your OrderFlow Login Code: ${code}`,
      html: htmlContent,
    });

    if (response.error) {
      console.error('[2FA Mailer] Resend API Error:', response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[2FA Mailer] Failed to send email:', error);
    return false;
  }
};
