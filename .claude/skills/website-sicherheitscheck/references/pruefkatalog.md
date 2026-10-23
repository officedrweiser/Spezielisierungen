# Prüfkatalog

Jeder Bereich hat vier Teile: **Warum** es wichtig ist, **Prüfen** (womit), den
**Soll-Zustand** und **Typische Fehler**. Lies den Abschnitt, bevor du einen Befund bewertest
oder behebst. Die Begründung brauchst du auch für den Bericht.

Inhalt
- A. Zugangsdaten und Repository
- B. Abhängigkeiten und Laufzeit
- C. Server-Konfiguration (Node, PHP, Apache)
- D. Sicherheits-Header und Content-Security-Policy
- E. HTTPS und Zertifikat
- F. Kontaktformular
- G. Datenschutz-Technik (Dritte, Cookie-Banner, Texte)
- H. Code im Browser
- I. Live-Website und alte WordPress-Seite
- J. Betrieb und Organisation (Checkliste für den Auftraggeber)
- K. Lücken im PHP selbst (z. B. PHP2Shell, 10/2026)

---

## A. Zugangsdaten und Repository

**Warum:** Das SMTP-Passwort des Kanzlei-Postfachs ist das wertvollste Geheimnis der
Website. Wer es hat, kann im Namen der Kanzlei E-Mails verschicken. Das Repository war
öffentlich. Alles, was je eingecheckt wurde, gilt daher als bekannt.

**Prüfen:** `static_audit.sh`, Abschnitte 1–2. Für Repository-Sichtbarkeit `live_check.sh`
mit dem Argument `besitzer/repo`.

**Soll:**
- `.env` und `public/api/config.php` stehen in `.gitignore` und sind nie im Verlauf.
- Im Repository liegen nur Vorlagen (`config.example.php`) mit Platzhaltern.
- Das Repository ist privat.
- Für den GitHub-Account des Auftraggebers ist die Zwei-Faktor-Anmeldung aktiv.

**Typische Fehler / Vorgehen bei einem Fund:**
- Ein echtes Passwort im Verlauf gilt als kompromittiert. Es muss **beim Anbieter geändert**
  werden (A1-Mailpasswort). Den Verlauf umzuschreiben genügt nicht, denn Kopien und Forks
  existieren womöglich schon. Das gehört zu den Punkten, die nur der Auftraggeber erledigen
  kann.
- Falscher Alarm: Platzhalter (`IhrPasswort`, `xxxx`, `process.env.SMTP_PASS`). Sieh dir die
  Zeile an, bevor du meldest.

## B. Abhängigkeiten und Laufzeit

**Warum:** Bekannte Lücken in Express, nodemailer usw. sind öffentlich dokumentiert und
werden automatisiert ausgenutzt.

**Prüfen:** `static_audit.sh`, Abschnitt 3, nutzt `npm audit --json` und `engines`.

**Soll:**
- 0 Schwachstellen (high/critical in jedem Fall null).
- `package.json` verlangt `"node": ">=20"`, weil nodemailer 10 Node 20 braucht.
- Die PHP-Version beim Hoster ist ≥ 8.1. `contact.php` nutzt Arrow-Functions und Typen. Das
  sieht man im A1-Kundencenter, sonst fragst du.

**Typische Fehler:**
- `npm audit fix --force` hebt Hauptversionen an und kann das Formular brechen. Arbeite ohne
  `--force` und teste das Formular danach.
- Nach einem Update vergessen, das Formular in der Testumgebung erneut zu senden.

## C. Server-Konfiguration (Node, PHP, Apache)

**Warum:** Die Website gibt es in zwei Varianten. Beide müssen gleich dicht sein, denn erst
beim Hochladen entscheidet sich, welche läuft. Die typischen Lücken: Quelltext von
`contact.php` oder `config.php` wird als Text ausgeliefert, Backup-Kopien (`config.php~`,
`.bak`) sind abrufbar oder Ordner werden aufgelistet.

**Prüfen:** `testenv.sh start node|php|apache` und danach `probe_server.sh`. Der
Apache-Modus legt absichtlich „GEHEIM“-Köder ab und schaltet Ordnerlisten ein.

**Soll:**
- Node: Aus `public/api/` wird nichts ausgeliefert, nur `POST /api/contact`. Geprüft wird der
  **dekodierte** Pfad (`%2ephp`, `%2E`, `ph%70`, Großschreibung). `x-powered-by` ist aus, und
  Unbekanntes führt zur 404-Seite.
- Apache (`.htaccess`): `Options -Indexes`. Die `FilesMatch`-Sperre greift für `config*`,
  `~`, `.bak/.old/.orig/.save/.swp/.tmp/.log/.md` und Punkt-Dateien. Dazu kommen die
  Umschreibe-Regel `api/contact`, `ErrorDocument 404` und die Header (siehe D).
- Erwartete Antworten: 403/404/405 und **nie** PHP-Quelltext, „smtp_pass“ oder „Index of /“.
- `config.php` selbst darf ausgeführt werden. Das ergibt eine leere Antwort. Schlimm wäre nur
  Quelltext.

**Typische Fehler:**
- Fehler in der .htaccess bedeuten 500 auf **allen** Seiten. Teste jede Änderung im
  Apache-Modus, bevor sie live geht.
- `<FilesMatch>` prüft nur Dateinamen und keine Ordner. Ordner schützt man durch Leere oder
  per eigener `.htaccess` mit `Require all denied`.
- Apache-Testordner im Scratchpad: Dann gibt es überall 403, weil `www-data` den Ordner nicht
  lesen darf. Das sieht nach Schutz aus, ist aber keiner. `testenv.sh` nutzt `/var/www/…`.

## D. Sicherheits-Header und Content-Security-Policy

**Warum:**
- CSP verhindert, dass eingeschleuster Code läuft oder Daten an fremde Server gehen.
- `X-Frame-Options`/`frame-ancestors` verhindern, dass eine fremde Seite die Website
  unsichtbar einbettet (Clickjacking).
- `nosniff` verhindert, dass Browser Dateitypen erraten.
- `Referrer-Policy` gibt keine vollständigen Adressen an Dritte weiter.
- `Permissions-Policy` sperrt Kamera, Mikrofon und Standort.
- HSTS merkt sich „nur verschlüsselt“.

**Prüfen:** `probe_server.sh` (lokal) und `live_check.sh` (live). `browser_check.js`,
Teil 3, meldet CSP-Blockaden in der Konsole.

**Soll:** identische Werte in `server/server.js` und `public/.htaccess`.
```
default-src 'self';
script-src 'self' https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net
  https://pagead2.googlesyndication.com https://www.google.com https://www.google.at;
font-src 'self';
connect-src 'self' https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net
  https://pagead2.googlesyndication.com https://www.google.com https://www.google.at https://ad.doubleclick.net;
frame-src https://www.google.com https://maps.google.com https://www.googletagmanager.com;
frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'
```
(In den Dateien steht das in einer Zeile.) Die Google-Adressen sind die aus Googles CSP-Leitfaden
für Google Ads (developers.google.com/tag-platform/security/guides/csp) plus die Karte.
Dazu kommen `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin` und
`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`. HSTS
`max-age=31536000` wird nur bei HTTPS gesendet: in der .htaccess über
`"expr=%{HTTPS} == 'on'"`, unter Node über den Hoster/Proxy.

**Typische Fehler:**
- Ein neuer Dienst (Karte, Video, Schrift) wird nur an einer der zwei Stellen eingetragen.
- `'unsafe-inline'` bei `script-src`, „weil sonst etwas nicht geht“. Lösung: Das Inline-Skript
  wandert nach `main.js`. `style-src 'unsafe-inline'` ist nötig, weil die Seiten
  `style="--page-hero-image:…"` nutzen, und ist vertretbar.
- `includeSubDomains`/`preload` bei HSTS ohne Rückfrage: Das betrifft auch Mail- und andere
  Subdomains und ist schwer rückgängig zu machen.
- Fehlen live **alle** Header, ist die .htaccess nicht hochgeladen, `mod_headers` fehlt, oder
  live läuft noch die alte Seite (siehe I).

## E. HTTPS und Zertifikat

**Warum:** Ohne erzwungenes HTTPS lassen sich Formulareingaben im WLAN mitlesen. Die
DSGVO verlangt Verschlüsselung für solche Daten (Art. 32).

**Prüfen:** `live_check.sh`, Abschnitte 1–2.

**Soll:**
- `http://` leitet mit 301 auf `https://` weiter.
- Das Zertifikat ist gültig und erneuert sich automatisch (Let's Encrypt, Ablauf > 14 Tage).

**Typische Fehler:**
- Weiterleitung per `.htaccess` (`RewriteCond %{HTTPS} off`): Bei A1 terminiert nginx davor
  das TLS. Apache sieht immer `http` und leitet endlos um, die Seite ist weg. **Nicht
  einbauen.** Empfehlung: „HTTPS erzwingen“ im A1-Kundencenter. Die Anleitung steht in
  `ANLEITUNG-KONTAKTFORMULAR.md`, Abschnitt „HTTPS erzwingen“.
- Zertifikatsfehler in der Sandbox (fehlende Kette YR2) als Befund melden. Mach stattdessen
  die Gegenprobe über SSL Labs.

## F. Kontaktformular

**Warum:** Das Formular ist die einzige Stelle, an der Fremde Daten an den Server schicken.
Die Risiken:
- Missbrauch als Spam-Schleuder (Header-Injection → Bcc an Tausende)
- Überflutung des Postfachs
- Einschleusen von HTML/Skript in die E-Mail
- Absenden über fremde Websites (CSRF)
- unnötig große Anfragen

**Prüfen:** `form_attacks.sh` (16 Fälle), `spambremse`-Modus und `inspect_mails.py`. Läuft
für Node **und** PHP, jeweils lokal mit Test-Mailserver.

**Soll (beide Varianten gleich):**

| Fall | Erwartet |
|---|---|
| gültige Anfrage | 200, genau eine E-Mail an `office@drweiser.at` |
| Zeilenumbruch + `Bcc:` in Name, Rechtsgebiet, E-Mail | kein Bcc/Cc-Header, kein zusätzlicher Empfänger |
| Adress-Tricks im Namen (`<`, `>`, `,`, `;`, `@`) | aus dem Anzeigenamen entfernt |
| `<script>` und SMTP-Punkt-Trick im Text | in der E-Mail maskiert (`&lt;script&gt;`), Punktzeilen verdoppelt |
| ungültige E-Mail / fehlender Datenschutz-Haken / leere Nachricht | 400 |
| Nachricht > 5000 Zeichen | 400 |
| Anfrage > 20 KB | 413 |
| Honeypot-Feld `website` ausgefüllt | 200, aber **keine** E-Mail |
| fremder `Origin` (JSON und Formular), `Origin: null` | 403 |
| GET statt POST | 404/405 |
| Rechtsgebiet nicht aus der Liste | wird verworfen (leer) |
| 21. Anfrage in 15 Minuten von derselben IP | 429 |

Umgesetzt ist das in Node (`server.js`: `ALLOWED_TOPICS`, `isForeignOrigin`, `rateLimit`
mit `max: 20`; `mailer.js`: `escapeHtml`) und in PHP (`contact.php`: `ALLOWED_TOPICS`,
`is_foreign_origin`, `RATE_LIMIT_MAX = 20`, `MAX_BODY_BYTES = 20000`, `encode_address`,
`htmlspecialchars` und CRLF-Bereinigung).

**Typische Fehler:**
- „Bcc:“ steht im **Nachrichtentext** und wird als Injection gemeldet. Maßgeblich sind nur
  die Kopfzeilen und die Umschlag-Empfänger (`inspect_mails.py`).
- Spam-Bremse ohne Neustart getestet: Der Zähler läuft vom vorigen Lauf weiter.
- Die Spam-Bremse sperrt pro IP. Bei A1 hinter nginx muss die echte Besucher-IP ankommen.
  Steht in den Logs nur die Proxy-IP, teilen sich alle Besucher einen Zähler. Diesen Punkt
  nach dem Hochladen mit dem Hoster klären.
- Fehlermeldungen geben interne Details preis (SMTP-Fehlertext, Pfade). Nach außen gehen
  nur allgemeine Meldungen, Details nur ins Server-Log.

## G. Datenschutz-Technik (Dritte, Cookie-Banner, Texte)

**Warum:** Jede Verbindung zu Google & Co. beim Seitenaufruf überträgt die IP-Adresse.
Ohne Einwilligung ist das in Österreich/EU angreifbar. Ein Beispiel ist das Google-Fonts-Urteil
LG München I 2022; die DSB in Österreich sieht das ähnlich. Für eine Kanzlei ist das
besonders peinlich.

**Prüfen:** `static_audit.sh` (externe Hosts, was beim Laden passiert) und
`browser_check.js`, Teile 1–2.

**Soll:**
- **Vor** der Entscheidung im Cookie-Banner keine Anfrage an fremde Server:
  - Schriften sind selbst gehostet (`/assets/fonts`, `fonts.css`).
  - Google Ads (`AW-17321921080`) lädt erst nach Zustimmung (Schalter „Google Ads“), ein
    Widerruf setzt die Einwilligung sofort auf „denied“.
  - Die Google-Karte auf `kontakt.html` lädt erst nach Zustimmung (Schalter „Google Maps“
    im Cookie-Fenster oder Knopf „Karte laden“) und muss in der Datenschutzerklärung stehen.
  - Jede **neue** Einbettung (Video, weitere Karte, Widget) wird wieder als Befund gemeldet.
    Biete dafür eine Zwei-Klick-Lösung an und frag den Auftraggeber.
- Cookie-Sperre: Solange keine Entscheidung gefallen ist, gibt es keinen Weg auf die Website,
  weder per Maus, Tab-Taste, Scrollen, Zurück-Taste, mehrere Tabs noch erneut geöffnete
  Einstellungen.
  - Umsetzung in `main.js`: `inert` auf allen Seitenteilen, Klasse `html.cookie-locked`,
    Fokus-Falle, `pageshow` (bfcache), `storage`-Ereignis über Tabs hinweg und das Flag
    `mw_cookie_review` für erneut geöffnete Einstellungen.
- Lesemodus der Datenschutzerklärung (vom Auftraggeber gewünscht, 10/2026):
  - Auf `datenschutz.html` (`<main data-cookie-readable>`) sind Text, Scrollen und externe
    Links frei. Das Cookie-Fenster sitzt unten, und `body` erhält Abstand nach unten, damit
    das Textende lesbar wird.
  - Kopfzeile, Fußzeile, Menü und Links auf andere Seiten bleiben gesperrt. Dafür sorgen
    `inert`, eine Klick-Sperre als Rückfallebene für alte Browser und ein kurzes
    Aufleuchten des Fensters bei Klicks auf gesperrte Teile.
  - Der Lesemodus darf auf keine andere Seite übergreifen.
- „Alle ablehnen“ ist gleichwertig sichtbar und schaltet die Seite **genauso** frei. Eine
  Cookie-Wall, bei der man nur mit Zustimmung weiterkommt, wäre unzulässig.
- Die Datenschutzerklärung nennt alle tatsächlich genutzten Dienste: Hosting (A1),
  Kontaktformular/E-Mail, Google Ads (Conversion-Messung), Google Maps, Cookie-Speicherung
  (localStorage). Neue Dienste werden dort ergänzt. Den Text formuliert der Auftraggeber.
  Du lieferst nur die technischen Fakten.

**Typische Fehler:**
- Ein neuer Link im Banner (z. B. zum Impressum) öffnet die Seite ohne Entscheidung.
  Lass jeden neuen Link im Banner durch `browser_check.js` laufen.
- `localStorage` ist gesperrt (private Fenster): Der Banner muss trotzdem erscheinen und
  sperren.
- Inhaltsblocker verstecken das Fenster: `#cookie-banner` und `#cookie-backdrop` stehen in
  der EasyList-Cookie-Liste (AdGuard, 1Blocker, Wipr in Safari, uBlock usw.). Ohne
  Gegenmaßnahme bliebe die Seite gesperrt, ohne dass ein Fenster zu sehen ist. Das war im
  10/2026 in Safari der Fall. `main.js` (`unlockIfBannerHidden`) gibt die Seite frei, wenn
  das Fenster nicht dargestellt wird, und entfernt dann auch den grauen Hintergrund. Manche
  Blocker verstecken nur das Fenster und lassen den Hintergrund stehen; zuerst war die Seite
  dann grau und nicht anklickbar. Die Prüfung läuft laufend (jede Sekunde), weil manche Blocker
  erst später greifen. Optionale Dienste bleiben ohne Zustimmung aus. Die Klassen
  bewusst **nicht** umbenennen, um Blocker zu umgehen: Wer Cookie-Fenster blockiert, will
  sie nicht sehen. `browser_check.js` prüft diesen Fall mit.
- Ein neuer Link im Text der Datenschutzerklärung auf eine andere Seite der Website wird im
  Lesemodus automatisch gesperrt. Prüfe trotzdem mit `browser_check.js`, dass er nicht
  wegführt.

## H. Code im Browser

**Warum:** Inline-Skripte und `innerHTML` mit fremden Daten sind die klassischen Einfallstore
für eingeschleusten Code (XSS).

**Prüfen:** `static_audit.sh`, Abschnitte 5–7.

**Soll:**
- Kein `<script>` ohne `src` und keine `onclick=`-Attribute in HTML.
- Kein `innerHTML`/`eval`/`document.write` mit Benutzerdaten.
- `target="_blank"` immer mit `rel="noopener"`.
- Keine `http://`-Links auf eingebundene Ressourcen (Mixed Content).

**Typische Fehler:** Die Jahreszahl im Footer per Inline-Skript. Sie ist inzwischen in
`main.js` (`#year`). Neue Seiten dürfen das alte Muster nicht wieder einführen.

## I. Live-Website und alte WordPress-Seite

**Warum:** Was im Repository sicher ist, muss auch so hochgeladen sein. Solange die alte
WordPress-Seite live ist, ist **sie** das Angriffsziel.

**Prüfen:** `live_check.sh` (nur lesend: GET-Anfragen auf öffentliche Adressen, keine
Formulare, kein Durchprobieren von Passwörtern).

**Soll (neue Seite live):**
- Alle Header aus D sind vorhanden.
- http→https-Weiterleitung, geschützte Pfade antworten mit 403/404.
- Ein Testformular schickt der Auftraggeber selbst ab, nicht der Skill.

**Soll (solange WordPress live ist):**
- WordPress, Theme und Plugins sind aktuell.
- `/wp-json/wp/v2/users` verrät keine Benutzernamen.
- `xmlrpc.php` ist abgeschaltet, sofern nicht benötigt.
- Admin-Zugang mit starkem Passwort und 2FA.

Umgesetzt wird das über ein Sicherheits-Plugin oder den Betreuer der alten Seite. Es sind
reine Empfehlungen, denn die alte Seite liegt nicht in diesem Repository.

**Typische Fehler:** Header-Befunde der WordPress-Seite dem neuen Code zuschreiben. Den
Abschnitt „Welche Website-Version läuft live?“ immer zuerst lesen.

## J. Betrieb und Organisation (Checkliste für den Auftraggeber)

Diese Punkte kann der Skill nicht selbst prüfen. Sie gehören als Fragen oder To-dos in den
Bericht:
- A1-Kundencenter und Mail-Konto: starkes, einzigartiges Passwort und 2FA, falls angeboten.
- GitHub: Repository privat, 2FA aktiv, nur nötige Personen mit Zugriff.
- HTTPS erzwingen im A1-Kundencenter (siehe E).
- Nach dem Hochladen: `config.php` nur am Server, mit Rechten 600/640, falls einstellbar.
  `config.example.php` darf zusätzlich dort liegen, die .htaccess sperrt sie.
- Datensicherung: Wer hat eine aktuelle Kopie der Website und von `config.php`?
- Postfach-Kontrolle: Kommt eine Test-Anfrage nach dem Hochladen wirklich an?
- Wiederholung: Sicherheitscheck nach jeder größeren Änderung und sonst etwa alle drei Monate.
  Abhängigkeiten veralten auch ohne Änderungen.

## K. Lücken im PHP selbst (z. B. PHP2Shell, 10/2026)

**Warum:** Im Oktober 2026 wurden mit „PHP2Shell“ (CVE-2026-109618 und CVE-2026-109619,
CVSS 9.2) zwei Lücken im PHP-Interpreter bekannt. Darüber lässt sich ohne Anmeldung Code auf
dem Server ausführen. Sie greifen schon beim Einlesen einer Anfrage, also bevor der Code der
Website läuft. Guter Code in `contact.php` allein schützt deshalb nicht.
- **109618:** Speicherüberlauf (OOM) beim Einlesen, vor allem bei Datei-Uploads (multipart).
- **109619:** Veralteter Zustand nach einem Absturz (Fatal Error, Zeitüberschreitung) wird von
  einer späteren Anfrage auf demselben Prozess weiterverwendet. Ein bestätigter Weg ist dabei
  die Upload-Fortschrittsanzeige der Sitzungen.
- **Betroffen:** jede PHP-Installation, die Webanfragen bedient (mod_php am stärksten, FPM,
  FastCGI, LiteSpeed).
- **Gepatcht ab:** 8.2.35, 8.3.36, 8.4.27, 8.5.12. PHP 8.1 und älter bekommt keine Korrektur.

**Prüfen:**
- Apache-Testumgebung: `probe_server.sh` (PHP-Reste müssen 404 liefern, nie „PHP
  AUSGEFUEHRT“) und `GUARD_SRC=Server form_attacks.sh` (Abschnitt „Schutz vor PHP-Lücken“,
  alles „(Server)“).
- `.user.ini` mit `php-cgi` gegenprüfen. Die Werte müssen greifen, und beim Start dürfen
  keine Warnungen erscheinen. Warnungen beim Start sind selbst ein Auslöser von 109619.
  ```bash
  cd <ordner mit .user.ini und t.php> && REDIRECT_STATUS=200 REQUEST_METHOD=GET \
    SCRIPT_FILENAME=$PWD/t.php DOCUMENT_ROOT=$PWD php-cgi -d display_startup_errors=1 -d error_reporting=-1
  ```
- Live: `live_check.sh`, Abschnitt PHP-Version. Verrät der Server sie nicht, prüft der
  Auftraggeber sie in Plesk bzw. im WordPress-Dashboard (Website-Zustand → Bericht → Server).

**Soll:**
- **Beim Hoster** (nur der Auftraggeber oder A1 kann das ändern): PHP mindestens in der
  gepatchten Version, keine Version ≤ 8.1. Der PHP-Handler wird „von Apache
  bereitgestellt“, damit die `.htaccess` greift.
- **`.htaccess`:**
  - Außer `api/contact.php` liefert jede `.php`-Adresse 404, auch Reste der alten
    WordPress-Seite.
  - `api/contact(.php)` erreicht PHP nur bei POST mit `Content-Type: application/json` und
    höchstens 20 000 Byte. Sonst antwortet Apache selbst mit 405, 415 bzw. 413.
- **`.user.ini`** (wirkt bei FPM/FastCGI): `session.upload_progress.enabled = 0`, kleine
  `max_input_vars` und `max_input_nesting_level`, `display_errors = 0`. Nur gültige,
  versionsübergreifende Direktiven verwenden.
- **`contact.php`:**
  - Nimmt nur JSON an (415).
  - Fängt jeden Fehler mit `try/catch (Throwable)` ab, damit es keinen Fatal Error gibt.
  - Felder müssen Text sein, sonst bleiben sie leer.
  - `json_decode` mit Tiefe 8.
  - `display_errors` aus.
- **Node:** nicht betroffen (kein PHP). `server.js` liefert nie `.php` aus und verlangt
  ebenfalls JSON.

**Typische Fehler:**
- `php_value`/`php_flag` in die `.htaccess` schreiben. Bei mod_php werden sie vor dem Start
  der Anfrage angewendet und können laut Advisory selbst Teil der Angriffskette sein. Bei
  FPM erzeugen sie sogar einen Fehler 500. Härtung gehört in die `.user.ini`.
- Die `.user.ini` mit Tippfehlern oder veralteten Direktiven füllen. Das erzeugt Warnungen
  beim Start und damit genau den Auslöser.
- Nur `api/contact` absichern: Bei FPM startet PHP auch für jede andere, sogar nicht
  vorhandene `.php`-Adresse. Deshalb gibt es die 404-Regel für alle übrigen `.php`.
- `memory_limit=-1` als Gegenmittel setzen: Das Advisory nennt es nur als
  unvollständige Notlösung, und auf geteiltem Hosting ist es riskant. Das Update beim
  Hoster ersetzt nichts.
- Beim Umzug alte WordPress-Dateien liegen lassen (`wp-config.php` mit
  Datenbankzugang). Die Anleitung verlangt, sie nach der Sicherung zu löschen.
