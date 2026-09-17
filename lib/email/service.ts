import { Resend } from 'resend';
import { escapeHtml } from '@/lib/utils';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; id?: string }> {
  if (!resend) {
    console.info('[email:no-op]', params.subject, '→', params.to);
    return { sent: false };
  }
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Kitchen-me <orders@kitchen-me.com>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error('[email:error]', err);
    return { sent: false };
  }
}

export async function sendOrderConfirmation(params: {
  email: string;
  name: string;
  orderNumber: string;
  total: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const orderNumber = escapeHtml(params.orderNumber);
  const total = escapeHtml(params.total);
  await sendEmail({
    to: params.email,
    subject: `Order confirmed — #${params.orderNumber}`,
    html: `<p>Hi ${name},</p><p>Thank you for your Kitchen-me order <strong>#${orderNumber}</strong>.</p><p>Total: ${total} (tax included)</p><p>— The Kitchen-me team</p>`,
  });
}

export async function sendShippingUpdate(params: {
  email: string;
  name: string;
  orderNumber: string;
  trackingNumber: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const orderNumber = escapeHtml(params.orderNumber);
  const trackingNumber = escapeHtml(params.trackingNumber);
  await sendEmail({
    to: params.email,
    subject: `Your order has shipped — #${params.orderNumber}`,
    html: `<p>Hi ${name},</p><p>Order <strong>#${orderNumber}</strong> is on its way.</p><p>Tracking: <code>${trackingNumber}</code></p><p>— The Kitchen-me team</p>`,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const resetUrl = escapeHtml(params.resetUrl);
  await sendEmail({
    to: params.email,
    subject: 'Reset your Kitchen-me password',
    html: `<p>Hi ${name},</p><p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 2 hours. If you didn't request a reset, ignore this email.</p><p>— The Kitchen-me team</p>`,
  });
}

export async function sendWelcomeVerificationEmail(params: {
  email: string;
  name: string;
  verifyUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const verifyUrl = escapeHtml(params.verifyUrl);
  await sendEmail({
    to: params.email,
    subject: 'Verify your Kitchen-me account',
    html: `<p>Hi ${name},</p><p>Welcome to Kitchen-me! Please verify your email to activate your account.</p><p><a href="${verifyUrl}">Verify email</a></p><p>This link expires in 24 hours.</p><p>— The Kitchen-me team</p>`,
  });
}
