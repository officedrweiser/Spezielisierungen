require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendContactMail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Sicherheits-Header für alle Antworten (dieselben Werte wie in public/.htaccess).
// Google Tag Manager/Analytics (erst nach Cookie-Zustimmung) und die Google-Karte
// auf der Kontaktseite sind ausdrücklich erlaubt, alles andere nur vom eigenen Server.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ');

app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  });
  next();
});

function sendNotFound(res) {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
    if (err) res.status(404).send('Seite nicht gefunden.');
  });
}

// public/api/ enthält den Ersatz-Endpunkt für klassisches PHP-Webhosting
// (und ggf. config.php mit Zugangsdaten). Unter Node übernimmt POST
// /api/contact weiter unten – aus diesem Ordner wird nie eine Datei
// ausgeliefert. Geprüft wird der dekodierte Pfad, damit Tricks wie
// /api/contact%2ephp nicht an der Sperre vorbeikommen.
app.use((req, res, next) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(req.path).toLowerCase();
  } catch (err) {
    return sendNotFound(res);
  }
  const isApiFile = decodedPath.startsWith('/api/') && !(req.method === 'POST' && /^\/api\/contact\/?$/.test(decodedPath));
  if (isApiFile || decodedPath.includes('.php')) {
    return sendNotFound(res);
  }
  next();
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nur die Rechtsgebiete aus dem Auswahlfeld des Formulars werden übernommen.
const ALLOWED_TOPICS = [
  'Vertragsrecht',
  'Liegenschaftsrecht / Immobilienrecht',
  'Erbrecht',
  'Vermögensverwaltung',
  'Wirtschaftsrecht / Gesellschaftsgründung',
  'Familienrecht',
  'Sonstiges'
];

// Anfragen, die ein Browser von einer fremden Website aus abschickt, ablehnen.
function isForeignOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host.toLowerCase() !== String(req.get('host') || '').toLowerCase();
  } catch (err) {
    return true;
  }
}

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  if (isForeignOrigin(req)) {
    return res.status(403).json({ error: 'Anfrage nicht erlaubt.' });
  }
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const topicInput = String(body.topic || '').trim();
  const topic = ALLOWED_TOPICS.includes(topicInput) ? topicInput : '';
  const message = String(body.message || '').trim();
  const privacy = Boolean(body.privacy);
  const honeypot = String(body.website || '').trim();

  // Spam-Falle: unsichtbares Feld, das nur Bots ausfüllen. Wir tun so, als
  // wäre alles gut gelaufen, verschicken aber keine E-Mail.
  if (honeypot) {
    return res.json({ ok: true });
  }

  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Bitte geben Sie Ihren Namen an.' });
  }
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' });
  }
  if (phone.length > 40) {
    return res.status(400).json({ error: 'Die Telefonnummer ist zu lang.' });
  }
  if (!message || message.length > 5000) {
    return res.status(400).json({ error: 'Bitte geben Sie eine Nachricht ein (max. 5000 Zeichen).' });
  }
  if (!privacy) {
    return res.status(400).json({ error: 'Bitte bestätigen Sie die Datenschutzerklärung.' });
  }

  try {
    await sendContactMail({ name, email, phone, topic, message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Versand fehlgeschlagen:', err.message);
    return res.status(502).json({ error: 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder rufen Sie uns an.' });
  }
});

app.use((req, res) => sendNotFound(res));

app.listen(PORT, () => {
  console.log(`Website läuft auf http://localhost:${PORT}`);
});
