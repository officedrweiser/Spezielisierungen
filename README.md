# Website Kanzlei Dr. Martin Weiser

Moderne, responsive Website für die Rechtsanwaltskanzlei Dr. Martin Weiser (Wien). Statische Seiten (HTML/CSS/JS) plus ein kleiner Node/Express-Server für das Kontaktformular.

## Lokal starten

```bash
npm install
npm start
```

Die Seite läuft danach unter http://localhost:3000

## Kontaktformular / E-Mail-Versand konfigurieren

> **Schritt-für-Schritt-Anleitung ohne Vorkenntnisse:**
> [ANLEITUNG-KONTAKTFORMULAR.md](ANLEITUNG-KONTAKTFORMULAR.md)

Das Formular sendet serverseitig eine E-Mail an `office@drweiser.at`. Es gibt
zwei gleichwertige Server-Varianten – benötigt wird nur **eine**:

| | PHP-Variante | Node-Variante |
|---|---|---|
| Datei | `public/api/contact.php` | `server/server.js` |
| Voraussetzung | beliebiges Webhosting mit PHP | Node.js-Hoster |
| Konfiguration | `public/api/config.php` | `.env` |

Beide beantworten `POST /api/contact` mit identischer Logik (Pflichtfeld-Prüfung,
Honeypot, Drosselung auf 10 Anfragen/15 Min., `Reply-To` auf die anfragende
Person). Das Frontend spricht immer `/api/contact` an und weicht automatisch
auf `/api/contact.php` aus, falls kein Rewrite greift.

**PHP-Variante:**

```bash
cp public/api/config.example.php public/api/config.php
# SMTP-Zugangsdaten eintragen, Inhalt von public/ per FTP hochladen
```

**Node-Variante:**

```bash
cp .env.example .env
# SMTP_HOST, SMTP_USER, SMTP_PASS etc. eintragen
npm start
```

Ohne SMTP-Zugangsdaten wird die E-Mail bei der Node-Variante **nicht**
verschickt, sondern nur in der Server-Konsole protokolliert (praktisch zum
lokalen Testen).

### Absenderadresse beachten

`drweiser.at` ist mit **DMARC `p=reject`** und **SPF `-all`** geschützt, die
Mails laufen über `mx.at.heitl.com`. Als Absender (`SMTP_FROM` bzw. `from`)
darf deshalb nur eine Adresse stehen, für die das verwendete SMTP-Postfach
tatsächlich senden darf – im Regelfall `office@drweiser.at`. Erfundene
Absender werden von empfangenden Servern abgewiesen.

## Projektstruktur

```
public/                    statische Website (HTML, CSS, JS, Bilder)
public/.htaccess            Apache-Konfiguration (Rewrite, 404, Schutz der config.php)
public/api/contact.php      Kontakt-Endpunkt für PHP-Webhosting
public/api/config.php       SMTP-Zugangsdaten (nicht in Git, aus config.example.php erstellen)
server/server.js            Express-Server: liefert /public aus + POST /api/contact
server/mailer.js            E-Mail-Versand (Nodemailer)
```

## Cookie-Banner: Google Ads und Google Maps

Das Cookie-Fenster hat drei Kategorien: „Technisch notwendige" (immer aktiv), „Google Ads" und „Google Maps" (beide einzeln über einen Schalter aktivierbar). Google Analytics und Google Tag Manager werden nicht verwendet (10/2026 entschieden).

- **Google Ads:** Der Google-Tag des Kanzlei-Kontos (`GOOGLE_ADS_ID = 'AW-17321921080'` in `public/assets/js/main.js`) lädt erst nach Zustimmung. Remarketing (`ad_personalization`) und die Übermittlung von Nutzerdaten (`ad_user_data`) bleiben abgelehnt. Grund: Im Google-Ads-Konto ist die automatische Erfassung vom Nutzer bereitgestellter Daten eingeschaltet, sonst ginge die E-Mail-Adresse aus dem Kontaktformular gehasht an Google. Bei Widerruf werden die `_gcl_`-Cookies gelöscht.
- **Google Maps:** Die Karte auf der Kontaktseite lädt erst nach Zustimmung oder nach Klick auf „Karte laden“.

Kommt ein Dienst dazu, gehören seine Adressen in **beide** CSP-Kopien (`server/server.js` und `public/.htaccess`) und der Dienst in die Datenschutzerklärung.

## Noch zu erledigen vor dem Live-Gang

- **Porträtfoto Dr. Weiser**: Auf der Seite „Über uns" ist bewusst ein Platzhalter statt eines KI-generierten Fotos eingebaut. Bitte ein echtes Foto liefern und den Platzhalter-Block in `public/ueber-uns.html` (`.portrait-placeholder`) ersetzen.
- **SMTP-Zugangsdaten** für den produktiven Mailversand hinterlegen (siehe [ANLEITUNG-KONTAKTFORMULAR.md](ANLEITUNG-KONTAKTFORMULAR.md)).
- **Google-Maps-Einbettung** auf der Kontaktseite verwendet die einbettungsfähige Maps-URL ohne API-Key – bitte nach dem Deployment einmal live prüfen.
- Alle übrigen Bilder (Büro-/Rechtsmotive) sind KI-generiert (GPT Image 2 / Seedance 2.0) und rein atmosphärisch – kein echtes Foto der Kanzleiräume oder von Dr. Weiser.

## Rechtliche Inhalte

Impressum und Datenschutzerklärung basieren auf den Inhalten der bisherigen Website (drweiser.at) und wurden um den neuen Kontaktformular-Passus ergänzt. Bitte vor Live-Schaltung von der Kanzlei/einer Rechtsberatung final freigeben lassen.
