'use strict';

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'CLARITA <noreply@clarita.app>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

// Envia ou loga no console em dev
async function sendEmail({ to, subject, html }) {
  if (resend) {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(`Resend error: ${error.message}`);
  } else {
    console.log('\n=== EMAIL (dev) ===');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    // Extract URLs from HTML for debugging
    const urlMatch = html.match(/href="([^"]+)"/);
    if (urlMatch) console.log(`Link: ${urlMatch[1]}`);
    console.log('==================\n');
  }
}

// Escape user-controlled strings before HTML interpolation
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapTemplate(content) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#16a34a;font-size:26px;margin:0;">CLARITA</h1>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Plataforma de Saúde Mental</p>
      </div>
      <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
        ${content}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
        CLARITA · Plataforma de Saúde Mental
      </p>
    </div>
  `;
}

async function sendPasswordResetEmail(email, resetToken, userName) {
  const url = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'CLARITA — Redefinição de Senha',
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá, ${userName}!</h2>
      <p style="color:#4b5563;line-height:1.6;">Recebemos uma solicitação para redefinir sua senha.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${url}" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Redefinir Senha
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Este link expira em 1 hora. Ignore este email se não foi você.</p>
    `),
  });
}

async function sendWelcomeEmail(email, firstName, role) {
  const roleLabel = role === 'patient' ? 'paciente' : role === 'psychologist' ? 'psicólogo(a)' : 'psiquiatra';
  await sendEmail({
    to: email,
    subject: 'Bem-vindo(a) ao CLARITA!',
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá, ${firstName}! 👋</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Sua conta como <strong>${roleLabel}</strong> foi criada com sucesso.<br>
        Acesse a plataforma e comece a acompanhar sua saúde mental.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/login" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Acessar o Clarita
        </a>
      </div>
    `),
  });
}

async function sendPatientInviteEmail(email, professionalName, patientName, inviteUrl) {
  await sendEmail({
    to: email,
    subject: `${professionalName} te convidou para o CLARITA`,
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Olá${patientName ? ', ' + patientName : ''}!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        <strong>${professionalName}</strong> te convidou para acompanhar sua saúde mental pelo CLARITA.<br>
        Crie sua conta gratuitamente e comece a registrar seus check-ins diários.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Aceitar Convite
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Se não conhece este profissional, ignore este email.</p>
    `),
  });
}

async function sendCriticalAlertEmail(professionalEmail, professionalName, patientName, alertMessage) {
  await sendEmail({
    to: professionalEmail,
    subject: `⚠️ Alerta clínico — ${patientName}`,
    html: wrapTemplate(`
      <h2 style="color:#dc2626;margin:0 0 12px;">⚠️ Alerta Clínico</h2>
      <p style="color:#4b5563;line-height:1.6;">Olá, <strong>${escapeHtml(professionalName)}</strong>.</p>
      <p style="color:#4b5563;line-height:1.6;">
        O sistema detectou um alerta para o paciente <strong>${escapeHtml(patientName)}</strong>:
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="color:#991b1b;margin:0;">${escapeHtml(alertMessage)}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/patients" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Ver Paciente
        </a>
      </div>
    `),
  });
}

async function sendNoCheckinReminderEmail(professionalEmail, professionalName, patients) {
  const rows = patients
    .map(p => `<tr>
      <td style="padding:8px 12px;color:#1f2937;">${escapeHtml(p.name)}</td>
      <td style="padding:8px 12px;color:#6b7280;">${escapeHtml(String(p.days_since))} dias sem check-in</td>
    </tr>`)
    .join('');

  await sendEmail({
    to: professionalEmail,
    subject: `Pacientes sem check-in — ${patients.length} paciente(s)`,
    html: wrapTemplate(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Pacientes sem check-in recente</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Olá, <strong>${professionalName}</strong>. Os seguintes pacientes não fizeram check-in nos últimos 3 dias:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#374151;font-weight:600;">Paciente</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;font-weight:600;">Última atividade</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/patients" style="background:#22c55e;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Ver Pacientes
        </a>
      </div>
    `),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPatientInviteEmail,
  sendCriticalAlertEmail,
  sendNoCheckinReminderEmail,
};
