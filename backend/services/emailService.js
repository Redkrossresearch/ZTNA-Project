const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Lazily creates and caches the Nodemailer transporter.
 * Uses standard SMTP config from env vars (works with Gmail, SendGrid SMTP,
 * Mailtrap, SES SMTP, etc. — whatever EMAIL_HOST/PORT/USER/PASS point to).
 */
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: Number(env.EMAIL_PORT) || 587,
    secure: Number(env.EMAIL_PORT) === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  return transporter;
};

/**
 * Sends an email. Throws on failure so callers can decide how to respond
 * (e.g. return a 502 to the client rather than silently pretending it sent).
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error(
      'Email service is not configured. Set EMAIL_USER and EMAIL_PASS in .env.'
    );
  }

  const mailTransporter = getTransporter();

  const info = await mailTransporter.sendMail({
    from: `"ZTNA Security" <${env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  return info;
};

/**
 * Sends a formatted MFA OTP email.
 */
const sendOtpEmail = async ({ to, otp, purpose }) => {
  const subjectMap = {
    login_mfa_email: 'Your ZTNA Login Verification Code',
    forgot_password: 'Your ZTNA Password Reset Code',
  };

  const subject = subjectMap[purpose] || 'Your ZTNA Verification Code';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background:#0b1f3a; padding: 20px; text-align:center;">
        <h2 style="color:#ffffff; margin:0;">ZTNA Security</h2>
      </div>
      <div style="padding: 24px; color:#222;">
        <p>Hello,</p>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align:center; color:#0b1f3a;">${otp}</p>
        <p>This code will expire in <strong>5 minutes</strong>. If you did not request this code, please secure your account immediately.</p>
        <p style="font-size: 12px; color:#888; margin-top: 24px;">Do not share this code with anyone, including ZTNA support staff.</p>
      </div>
    </div>
  `;

  const text = `Your ZTNA verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`;

  return sendEmail({ to, subject, html, text });
};

module.exports = { sendEmail, sendOtpEmail };
