'use strict';

const nodemailer = require('nodemailer');

// In development, use Ethereal (fake SMTP) or console logging
// In production, configure with real SMTP
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Development: log to console
  return null;
};

const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #16a34a; font-size: 28px; margin: 0;">CLARITA</h1>
        <p style="color: #6b7280; margin: 4px 0 0;">Plataforma de Saúde Mental</p>
      </div>
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin: 0 0 16px;">Olá, ${userName}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #22c55e; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
        </p>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
        CLARITA - Plataforma de Saúde Mental
      </p>
    </div>
  `;

  const transporter = createTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CLARITA" <noreply@clarita.com>',
      to: email,
      subject: 'CLARITA - Redefinição de Senha',
      html: htmlContent,
    });
  } else {
    // Development: log the reset link to console
    console.log('\n========================================');
    console.log('EMAIL DE RECUPERAÇÃO DE SENHA');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Link: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log('========================================\n');
  }
};

module.exports = { sendPasswordResetEmail };
