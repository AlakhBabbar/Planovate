/**
 * Brevo (formerly Sendinblue) transactional email service.
 * Uses the @getbrevo/brevo SDK v5 to send OTP emails.
 */
import { BrevoClient } from '@getbrevo/brevo';

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

/**
 * Send a password-reset OTP email via Brevo template.
 * @param {string} toEmail  — recipient email
 * @param {string} toName   — recipient name
 * @param {string} otp      — 6-digit OTP code
 */
export async function sendOtpEmail(toEmail, toName, otp) {
  const result = await brevo.transactionalEmails.sendTransacEmail({
    templateId: Number(process.env.BREVO_TEMPLATE_ID),
    to: [{ email: toEmail, name: toName }],
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name:  process.env.BREVO_SENDER_NAME,
    },
    params: { otp: otp, NAME: toName },
  });

  return result;
}
