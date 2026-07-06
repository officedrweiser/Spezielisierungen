# Website Kanzlei Dr. Martin Weiser

Moderne, responsive Website für die Rechtsanwaltskanzlei Dr. Martin Weiser (Wien). Statische Seiten (HTML/CSS/JS) plus ein kleiner Node/Express-Server für das Kontaktformular.

## Lokal starten

```bash
npm install
npm start
```

Die Seite läuft danach unter http://localhost:3000

## Kontaktformular / E-Mail-Versand konfigurieren

Das Formular sendet serverseitig eine E-Mail an `office@drweiser.at`. Ohne SMTP-Zugangsdaten wird die E-Mail **nicht** verschickt, sondern nur in der Server-Konsole protokolliert (praktisch zum lokalen Testen, siehe Terminal-Ausgabe nach dem Absenden).

Für den echten Versand `.env` aus `.env.example` anlegen und mit den SMTP-Zugangsdaten des Hosting-/E-Mail-Anbieters befüllen:

```bash
cp .env.example .env
# SMTP_HOST, SMTP_USER, SMTP_PASS etc. eintragen
npm start
```

Funktioniert mit jedem SMTP-Anbieter (z. B. des Webhosters, Microsoft 365, Google Workspace, SendGrid/Mailgun SMTP-Relay etc.).

## Projektstruktur

```
public/              statische Website (HTML, CSS, JS, Bilder, Video)
server/server.js      Express-Server: liefert /public aus + POST /api/contact
server/mailer.js       E-Mail-Versand (Nodemailer)
```

## Noch zu erledigen vor dem Live-Gang

- **Porträtfoto Dr. Weiser**: Auf der Seite „Über uns" ist bewusst ein Platzhalter statt eines KI-generierten Fotos eingebaut. Bitte ein echtes Foto liefern und den Platzhalter-Block in `public/ueber-uns.html` (`.portrait-placeholder`) ersetzen.
- **SMTP-Zugangsdaten** für den produktiven Mailversand hinterlegen (siehe oben).
- **Google-Maps-Einbettung** auf der Kontaktseite verwendet die einbettungsfähige Maps-URL ohne API-Key – bitte nach dem Deployment einmal live prüfen.
- Alle übrigen Bilder (Büro-/Rechtsmotive) sind KI-generiert (GPT Image 2 / Seedance 2.0) und rein atmosphärisch – kein echtes Foto der Kanzleiräume oder von Dr. Weiser.

## Rechtliche Inhalte

Impressum und Datenschutzerklärung basieren auf den Inhalten der bisherigen Website (drweiser.at) und wurden um den neuen Kontaktformular-Passus ergänzt. Bitte vor Live-Schaltung von der Kanzlei/einer Rechtsberatung final freigeben lassen.
