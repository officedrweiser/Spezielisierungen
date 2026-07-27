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

// public/api/*.php ist der Ersatz-Endpunkt für klassisches PHP-Webhosting.
// Unter Node übernimmt POST /api/contact weiter unten – die PHP-Dateien
// dürfen hier keinesfalls als Klartext ausgeliefert werden.
app.use((req, res, next) => {
  if (req.path.toLowerCase().endsWith('.php')) {
    return res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
      if (err) res.status(404).send('Seite nicht gefunden.');
    });
  }
  next();
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const topic = String(body.topic || '').trim();
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

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
    if (err) res.status(404).send('Seite nicht gefunden.');
  });
});

app.listen(PORT, () => {
  console.log(`Website läuft auf http://localhost:${PORT}`);
});
