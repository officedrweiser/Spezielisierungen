const nodemailer = require('nodemailer');

const RECIPIENT = process.env.CONTACT_RECIPIENT || 'office@drweiser.at';

// drweiser.at ist mit DMARC "p=reject" und SPF "-all" geschützt. Als Absender
// darf deshalb nur eine Adresse stehen, für die das SMTP-Postfach auch
// wirklich senden darf – sonst weist der empfangende Server die Mail ab.
const SENDER = process.env.SMTP_FROM || process.env.SMTP_USER || RECIPIENT;

let transporterPromise = null;

function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return {
      transporter: nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: SMTP_SECURE === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      }),
      isDryRun: false
    };
  }

  // Kein SMTP konfiguriert (z.B. lokale Entwicklung ohne Zugangsdaten) ->
  // E-Mail wird nur lokal protokolliert statt tatsächlich verschickt, damit
  // sich der Formular-Ablauf ohne echte Zugangsdaten prüfen lässt.
  return {
    transporter: nodemailer.createTransport({ jsonTransport: true }),
    isDryRun: true
  };
}

function getTransporter() {
  if (!transporterPromise) transporterPromise = buildTransporter();
  return transporterPromise;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendContactMail({ name, email, phone, topic, message }) {
  const { transporter, isDryRun } = getTransporter();

  const info = await transporter.sendMail({
    from: `"Website-Kontaktformular" <${SENDER}>`,
    to: RECIPIENT,
    replyTo: email,
    subject: `Neue Kontaktanfrage von der Website${topic ? ' – ' + topic : ''}`,
    text: [
      `Name: ${name}`,
      `E-Mail: ${email}`,
      phone ? `Telefon: ${phone}` : null,
      topic ? `Rechtsgebiet: ${topic}` : null,
      '',
      'Nachricht:',
      message
    ].filter(Boolean).join('\n'),
    html: `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
      ${phone ? `<p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>` : ''}
      ${topic ? `<p><strong>Rechtsgebiet:</strong> ${escapeHtml(topic)}</p>` : ''}
      <p><strong>Nachricht:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `
  });

  if (isDryRun) {
    console.log('[mailer] Kein SMTP konfiguriert – E-Mail wurde NICHT verschickt, sondern nur protokolliert:');
    console.log('[mailer] An:', RECIPIENT, '| Von:', email, '| Betreff:', info.envelope);
    console.log(JSON.parse(info.message).text);
  }

  return info;
}

module.exports = { sendContactMail };
