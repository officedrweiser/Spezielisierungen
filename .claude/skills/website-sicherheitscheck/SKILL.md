---
name: website-sicherheitscheck
description: Sicherheitscheck der Kanzlei-Website drweiser.at – Zugangsdaten im Repo, Abhängigkeiten, Server (Node, PHP, Apache/.htaccess), Header/CSP, HTTPS, Angriffe aufs Kontaktformular in lokalen Testumgebungen, Spam-Bremse, Cookie-Banner-Sperre, Daten an Dritte vor Zustimmung, Live-Seite, GitHub-Sichtbarkeit; behebt unsichtbare Mängel und schreibt einen verständlichen deutschen Bericht. Verwende den Skill IMMER bei "Ist die Website sicher?", Sicherheitscheck, Security-Check, Pentest, Schwachstellen, DSGVO-Technik, Cookie-Banner-Prüfung, Spam-Schutz, nach dem Hochladen/Deployment und nach Änderungen an Formular, .htaccess, server.js, contact.php, Cookie-Banner oder eingebundenen Diensten (Google Maps, Analytics, Schriften) – auch wenn "Sicherheit" nicht fällt. Also for "security audit", "is the site secure", "check headers/CSP".
---

# Website-Sicherheitscheck

Dieser Skill prüft die Website der Kanzlei Dr. Weiser so, wie ein Angreifer und wie eine
Datenschutzbehörde sie ansehen würden. Danach behebt er, was sich unsichtbar beheben lässt,
und erklärt dem Auftraggeber den Rest in einfachem Deutsch. Der Auftraggeber ist kein
Techniker: Er arbeitet unter Windows/PowerShell und startet die Seite lokal mit
`npm.cmd start`.

## Grundregeln – und warum sie gelten

1. **Das Live-Kontaktformular wird nie angegriffen.** Jede Testanfrage dort landet als echte
   E-Mail im Kanzlei-Postfach. Die Spam-Bremse würde danach echte Mandanten aussperren. Und
   Angriffe auf fremde Hosting-Server sind heikel, auch wenn sie gut gemeint sind. Alle
   Angriffe laufen deshalb gegen lokale Testserver aus `testenv.sh`. Die Skripte verweigern
   alles, was nicht `localhost`/`127.x` ist. Diese Sperre bleibt drin. Live wird nur gelesen
   (`live_check.sh`).
2. **Unsichtbare technische Mängel direkt beheben, Sichtbares erst nach Rückfrage.**
   Unsichtbar sind z. B. Header, Server-Code, .htaccess und Abhängigkeiten. Sie lassen sich
   gefahrlos reparieren und erneut testen. Bei allem anderen fragst du zuerst und zeigst
   Screenshots: was man auf der Seite sieht, rechtliche Texte, das Verhalten des
   Cookie-Banners, das Ein- oder Ausbauen von Diensten wie Google Maps. Der Auftraggeber
   achtet sehr genau auf das Erscheinungsbild und will solche Entscheidungen selbst treffen.
3. **Fotos werden nie bearbeitet.** Zuschneiden auf das Format ist erlaubt. Aufhellen,
   Abdunkeln, Filter oder Farbänderungen sind tabu. Das gilt auch, wenn eine
   „Sicherheits“-Maßnahme Bilder betrifft, z. B. das Entfernen von Metadaten: erst fragen.
4. **Keine HTTPS-Weiterleitung in die `.htaccess` schreiben.** Bei A1 sitzt ein nginx vor
   dem Apache. Apache sieht deshalb oft nur `http` und würde endlos umleiten, und die Seite
   wäre weg. Empfohlen wird stattdessen „HTTPS erzwingen“ im A1-Kundencenter (Anleitung in
   `ANLEITUNG-KONTAKTFORMULAR.md`).
5. **Zugangsdaten gehören nie ins Repository.** `public/api/config.php` und `.env` stehen
   in `.gitignore` und bleiben dort. Taucht ein echtes Passwort im Git-Verlauf auf, hilft
   Löschen nicht mehr: Das Passwort muss beim Anbieter geändert werden, zumal das
   Repository bisher öffentlich war.
6. **Ehrlich berichten.** Jede Korrektur wird mit demselben Skript erneut geprüft, bevor sie
   als „behoben“ gilt. Was in der Prüfumgebung nicht prüfbar war, steht so im Bericht. Ein
   Beispiel: das Zertifikat, weil der Sandbox eine Zwischenzertifizierungsstelle fehlt.

## Aufbau der Website (was geprüft wird)

| Teil | Datei(en) | Zweck |
|---|---|---|
| Seiten | `public/*.html`, `public/assets/` | statisches HTML/CSS/JS, Schriften selbst gehostet |
| Cookie-Banner | `public/assets/js/main.js` | sperrt die Seite bis zur Entscheidung, lädt GA/GTM erst nach Zustimmung |
| Node-Server | `server/server.js`, `server/mailer.js` | Variante 1: Express + nodemailer, Header-Middleware, Spam-Bremse |
| PHP-Endpunkt | `public/api/contact.php` (+ `config.php` nur am Server) | Variante 2 (A1-Webhosting): eigener SMTP-Client |
| Apache | `public/.htaccess` | Header, Sperren für Konfig-/Backup-Dateien, Umschreiben auf contact.php |
| Anleitung | `ANLEITUNG-KONTAKTFORMULAR.md` | Hochladen, Zugangsdaten, HTTPS-Einstellung |

Ändert sich die Struktur (neue Seiten, neue Dienste), passe die Listen in den Skripten an.
Betroffen sind `PAGES` in `browser_check.js` und die Pfadliste in `probe_server.sh`.

## Entscheidungen des Auftraggebers (Stand 10/2026)

Diese Punkte sind entschieden. Schlage sie nicht erneut als To-do vor, sondern prüfe nur, ob
der vereinbarte Zustand noch stimmt:

- **Google-Karte auf der Kontaktseite lädt ohne Klick.** Eine Zwei-Klick-Lösung ist nicht
  gewünscht. Die Skripte melden die Karte deshalb nur als `[i]`. Andere Dienste von Dritten
  vor der Zustimmung bleiben ein Befund. Offen bleibt nur: Die Karte muss in der
  Datenschutzerklärung stehen.
- **Die Datenschutzerklärung ist vor der Cookie-Entscheidung lesbar.** Das ist der Lesemodus:
  `<main data-cookie-readable>` in `datenschutz.html`, die Klasse `html.cookie-reading`, und
  das Fenster sitzt unten. Text, Scrollen und externe Links sind frei. Kopfzeile, Fußzeile,
  Menü und Links auf andere Seiten bleiben gesperrt. Alle anderen Seiten sind voll gesperrt.
- **GitHub wird nach der Veröffentlichung privat gestellt.** Solange es öffentlich ist,
  steht das im Bericht nur als Erinnerung.
- **HTTPS wird im A1-Kundencenter erzwungen.** Nach der Umstellung prüfst du das mit
  `live_check.sh`.

## Ablauf

Alle Befehle laufen aus dem Projektordner. Als Arbeitsordner dient ein Unterordner des
Scratchpads, z. B. `W=<scratchpad>/sectest`, sonst `W=$(mktemp -d)`. Dort landen Logs und
mitgeschriebene E-Mails. `S=.claude/skills/website-sicherheitscheck/scripts`.

Die Skripte brauchen bash, curl, python3, node, php und apache2. Sie sind für die
Linux-Cloud-Umgebung gedacht. `testenv.sh` installiert Apache und mod_php bei Bedarf selbst.
Für den PHP-Modus fehlt ggf. `apt-get install -y php-cli`. Ohne Linux (z. B. lokal unter
Windows) prüfst du die Punkte aus `references/pruefkatalog.md` von Hand.

### 1. Lage erfassen
- `git log --oneline -15` und `git status`: Was hat sich seit dem letzten Check geändert?
- Neue externe Dienste, Formularfelder oder Seiten? Dann zuerst die betroffenen Abschnitte
  im Prüfkatalog lesen.

### 2. Statische Prüfung (ohne Server)
```bash
bash $S/static_audit.sh .
```
Geprüft werden: Zugangsdaten im Git-Verlauf, `.gitignore`, `npm audit`, Node-Version,
externe Hosts und was davon schon beim Seitenaufruf lädt, Inline-Skripte,
`innerHTML`/`eval`, `target=_blank` ohne `noopener`, `http://`-Links und die Punkte der
.htaccess. Jedes `[!]` wird verfolgt. Ein Fund im Git-Verlauf ist erst dann Entwarnung,
wenn du dir die Zeile angesehen hast: Platzhalter wie `IhrPasswort` sind harmlos.

### 3. Server-Varianten prüfen (Node, PHP, Apache)
Für jede Variante gilt derselbe Ablauf: starten, Dateien abklopfen, Formular angreifen,
E-Mails auswerten, stoppen.
```bash
bash $S/testenv.sh start node   "$W"     # -> http://localhost:3100
bash $S/probe_server.sh http://localhost:3100
bash $S/form_attacks.sh http://localhost:3100/api/contact
python3 -I $S/inspect_mails.py "$W/mails.txt"
bash $S/testenv.sh stop "$W"
```
- `php`: Port 8088, URL `http://127.0.0.1:8088/api/contact`. Damit wird `contact.php` mit
  einem Router getestet, der die Umschreibe-Regel nachahmt. Der eingebaute PHP-Server
  ignoriert die `.htaccess`. `probe_server.sh` zeigt hier deshalb fehlende Header und
  ausgelieferte Dateien. Das ist kein Befund. Bewerte hier nur das Formular
  (`form_attacks.sh`, `inspect_mails.py`), Dateischutz und Header nur im Apache-Modus.
- `apache`: Port 8090. Das ist echter Apache mit der echten `.htaccess`. Absichtlich
  hinterlegt sind `config.php.bak`, `config.php~`, `.env` usw. mit dem Wort „GEHEIM“, und
  Ordnerlisten sind eingeschaltet. So zeigt sich, ob die .htaccess wirklich schützt.
  Antwortet die Startseite mit 500, ist die .htaccess kaputt. Das wäre live ein Totalausfall
  und hat Vorrang vor allem anderen. Der Hinweis `Server: Apache/… (Ubuntu)` stammt vom
  Testserver. Bei A1 antwortet nginx, und per .htaccess lässt sich das ohnehin nicht ändern.
- `probe_server.sh` meldet `<<< INHALT AUSGELIEFERT` oder `<<< ORDNERLISTE` als echte
  Lücke. Erwartet werden 403/404/405, nie Quelltext.
- `form_attacks.sh` führt 16 Prüfungen durch. Erwartet wird bei allen `[ok]`. Jede
  `ABWEICHUNG` wird untersucht.
- `inspect_mails.py` zeigt, was wirklich verschickt würde. Prüfe die echten Kopfzeilen und
  Umschlag-Empfänger: Ein „Bcc:“ im Nachrichtentext ist harmlos, ein Bcc-Header ist es nicht.

### 4. Spam-Bremse (je Variante, frisch gestartet)
Der Zähler muss bei null beginnen. Starte deshalb die Testumgebung vorher neu:
```bash
bash $S/testenv.sh stop "$W"; bash $S/testenv.sh start php "$W"
bash $S/form_attacks.sh http://127.0.0.1:8088/api/contact spambremse
```
Soll-Wert: **20 Anfragen in 15 Minuten** werden durchgelassen, die 21. bekommt 429. Der
Wert steht in `server.js` (`max`) und `contact.php` (`RATE_LIMIT_MAX`), und beide müssen
gleich sein.

### 5. Browser-Prüfung (Cookie-Banner, Dritte, Funktion)
```bash
bash $S/testenv.sh start node "$W"
NODE_PATH="$(npm root -g)" node $S/browser_check.js http://localhost:3100
bash $S/testenv.sh stop "$W"
```
- Teil 1 prüft, ob eine Seite **vor** der Zustimmung etwas von Dritten lädt (Google &
  Co.). Jede solche Verbindung überträgt die IP-Adresse und ist ohne Einwilligung
  DSGVO-relevant.
- Teil 2 prüft die Cookie-Sperre auf Computer und Handy. Getestet werden: Erstbesuch,
  Tab-Taste, Scrollen, Zurück-Taste (bfcache), Entscheidung in einem Tab und erneut
  geöffnete Einstellungen. Jeder Weg, der ohne Entscheidung auf die Website führt, ist ein
  Befund. Der Auftraggeber hat genau das ausdrücklich verlangt.
- Für den Datenschutz-Link aus dem Fenster gilt der Lesemodus. Der Text muss lesbar und
  scrollbar sein, und sein Ende darf nicht vom Fenster verdeckt werden. Ein Mausklick auf
  das Menü darf nicht wegführen, und die Tab-Taste darf keine gesperrten Teile erreichen.
- Teil 3 prüft nach der Zustimmung: Konsolen- und CSP-Fehler, ob die Schriften vom eigenen
  Server kommen, das Formular über die Oberfläche, das Handy-Menü und horizontales Scrollen.

### 6. Live-Website (nur lesend)
```bash
bash $S/live_check.sh drweiser.at officedrweiser/Spezielisierungen
```
Geprüft werden: http→https-Weiterleitung, Zertifikat und Ablaufdatum, Header, eine
Stichprobe geschützter Pfade, welche Version live läuft (alte WordPress-Seite oder dieses
Repository) und die GitHub-Sichtbarkeit. Für HTTPS und GitHub gelten die Entscheidungen
oben: Solange die neue Seite nicht online ist, kommen sie in den Bericht nur als Erinnerung
für die Veröffentlichung. Ist die neue Seite live, sind sie echte To-dos.

**Achtung:** Läuft live noch WordPress, betreffen die Header-Befunde die alte Seite und
nicht das Repository. Trenne das im Bericht klar. Ein `[?]` beim Zertifikat in der Sandbox
ist kein Befund. Verweise zur Gegenprobe auf SSL Labs oder das Schloss im Browser.

### 7. Beheben und erneut prüfen
- Unsichtbares (Header, Server-Code, .htaccess, Abhängigkeiten) beheben und dabei **Node
  und PHP/.htaccess gleich halten**. CSP, Header, Limits und erlaubte Rechtsgebiete stehen
  doppelt. Danach den betreffenden Schritt erneut ausführen.
- Abhängigkeiten aktualisierst du mit `npm audit fix` (ohne `--force`). Danach startest du
  den Node-Server und schickst ein Formular an die Testumgebung.
- Für Sichtbares oder Rechtliches beschreibst du eine Lösung mit Screenshot und fragst den
  Auftraggeber. Beispiele: Google Maps als Zwei-Klick-Lösung, Text in der
  Datenschutzerklärung, Verhalten des Banners.
- Sichtbare Änderungen an Seiten prüfst du nach dem Umbau mit Screenshots (Playwright,
  Desktop 1440 px und Handy 390 px). Halte Tabs, Banner und Überschriften gleich hoch und
  auf einer Ebene, wie der Auftraggeber es eingestellt hat.

### 8. Aufräumen, festhalten, berichten
- `bash $S/testenv.sh stop "$W"`. Danach darf kein Testserver mehr laufen: Prüfe mit
  `pgrep -f "^node server/server.js"` und dem Apache-Port 8090.
- Korrekturen auf dem vorgesehenen Branch committen und pushen.
- Den Bericht nach `references/bericht-vorlage.md` erstellen.

## Bericht

Der Bericht ist für einen Rechtsanwalt geschrieben, nicht für einen Techniker: kurze Sätze,
Fachwörter nur mit Erklärung, jeder Punkt mit „Was bedeutet das für Sie?“. Liefere ihn als
Word-Dokument, wenn der Auftraggeber eines möchte (docx-Skill). Sonst reicht die Antwort im
Chat. Die Struktur steht in `references/bericht-vorlage.md`.

- Rechtliche Einschätzungen (DSGVO, ECG, TKG) formulierst du als technischen Hinweis, nicht
  als Rechtsrat. Der Auftraggeber ist selbst Jurist und entscheidet.
- Gib nie Zugangsdaten, Passwörter oder Benutzernamen aus Funden in Dateien wieder, die ins
  Repository gehen. Im Chat an den Auftraggeber ist das in Ordnung.

## Stolperfallen

- **`pkill -f muster` beendet die eigene Shell**, weil das Muster im eigenen Befehl steht
  (Exit 144). Beende Prozesse deshalb über die PIDs, die `testenv.sh` speichert, oder mit
  `pgrep -f "^node server/server.js"`.
- **Zertifikat in der Sandbox:** Hier fehlt die Let's-Encrypt-Kette YR2, deshalb schlägt die
  Prüfung nur lokal fehl. Nutze `-k` ausschließlich zur Diagnose, nie in Code oder Anleitungen.
- **Schriften und Google-Dienste in der Sandbox:** Das Netz der Sandbox blockiert manche
  Google-Adressen. Eine nicht ladende Karte ist dort kein CSP-Fehler. Prüfe in der Konsole,
  ob „Content Security Policy“ in der Meldung steht.
- **Fokus auf `BODY`** bei der Tab-Prüfung bedeutet: Der Fokus ist in der Browser-Leiste,
  nicht auf der Seite. Das ist kein Leck.
- **Weiches Scrollen:** Die Seite hat `scroll-behavior: smooth`. Ein `scrollTo()` im Test
  läuft noch, während du schon scrollst, und setzt danach wieder auf 0 zurück. Das sieht
  dann aus wie „lässt sich nicht scrollen“. In Tests deshalb `behavior: 'instant'` verwenden.
- **Spam-Zähler:** Wiederholte Läufe ohne Neustart zählen weiter. PHP speichert den Zähler
  unter `sys_get_temp_dir()/drweiser-contact`, und `testenv.sh start php` leert ihn.
- **Apache-Testordner:** Er liegt unter `/var/www/website-sicherheitscheck-test`, weil
  `www-data` das Scratchpad nicht lesen darf. Sonst gäbe es überall 403, was nach Schutz
  aussieht, aber keiner ist.
- **CSP erweitern statt abschalten:** Kommt ein neuer Dienst dazu, trägst du genau dessen
  Adressen in **beide** CSP-Kopien ein (`server.js` und `.htaccess`). `'unsafe-inline'` für
  Skripte bleibt draußen. Inline-Skripte gehören in `main.js`.

## Nachschlagen

- `references/pruefkatalog.md`: alle Prüfbereiche mit Begründung, Prüfweg, Soll-Zustand
  und typischen Fehlern. Lies den passenden Abschnitt, bevor du etwas behebst oder bewertest.
- `references/bericht-vorlage.md`: Aufbau und Tonfall des Berichts, mit Beispielformulierungen.
