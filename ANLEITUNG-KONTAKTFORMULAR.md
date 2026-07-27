# Kontaktformular live schalten – Schritt für Schritt

Ziel: Jede Anfrage über das Formular auf `/kontakt.html` landet als E-Mail im
Postfach **office@drweiser.at**.

> **Wichtig vorweg:** Alle hier beschriebenen Dateien liegen auf dem Branch
> **`claude/kontaktformular-setup-q89qii`**, nicht auf dem Standard-Branch des
> Repositories. Details dazu in Schritt 2.

Diese Anleitung setzt **keine** Programmierkenntnisse voraus. Sie brauchen nur:

- Zugang zu Ihrem Webhosting (FTP-Zugangsdaten oder Hosting-Login)
- die SMTP-Zugangsdaten Ihres E-Mail-Postfachs (bekommen Sie von Ihrem
  IT-Betreuer – siehe Schritt 1)

Rechnen Sie mit ca. 45–60 Minuten, davon der Großteil Wartezeit auf die
Antwort Ihres IT-Betreuers.

---

## Vorab: Wie das Formular technisch funktioniert

Ein Kontaktformular kann E-Mails **nicht** direkt aus dem Browser der
Besucherin verschicken. Es braucht immer ein kleines Programm auf dem Server,
das die Eingaben entgegennimmt und die E-Mail verschickt.

Dieses Projekt bringt dieses Programm **in zwei Ausführungen** mit – Sie
brauchen nur **eine** davon:

| | Weg A: PHP | Weg B: Node.js |
|---|---|---|
| Datei | `public/api/contact.php` | `server/server.js` |
| Läuft auf | jedem normalen Webhosting | speziellem Node.js-Hoster |
| Aufwand | Dateien hochladen, fertig | neuer Hosting-Vertrag nötig |
| Empfehlung | **✅ für Sie** | nur falls schon vorhanden |

**Wählen Sie Weg A.** Ihre Website läuft laut DNS-Abfrage derzeit auf einem
klassischen Webhosting-Paket (`pl016.a1webhosting.at`, also A1 Webhosting).
Dort ist PHP standardmäßig verfügbar, Node.js dagegen praktisch nie. Weg A
funktioniert damit ohne neuen Vertrag und ohne Zusatzkosten.

Weg B ist am Ende dieser Anleitung beschrieben – falls Sie später doch auf
einen Node.js-Hoster wechseln.

---

## Wichtig zu wissen: Ihre Domain ist streng geschützt

Bei der Prüfung Ihrer Domain habe ich Folgendes gefunden:

- **E-Mail-Anbieter**: Ihre Mails laufen über `mx.at.heitl.com` – das ist die
  Firma Heitl IT, vermutlich mit einem „Hosted Exchange"-Postfach.
- **DMARC-Regel**: `p=reject`
- **SPF-Regel**: endet auf `-all`

**Was das im Klartext heißt:** Ihre Domain ist so eingestellt, dass E-Mails,
die *nicht* über Ihren echten Mailserver verschickt werden, von empfangenden
Servern **hart abgewiesen** werden. Das ist gut gegen Betrugsmails – bedeutet
aber: Das Formular muss die E-Mail über Ihr echtes Postfach verschicken.

**Daraus folgen zwei Regeln, die Sie unbedingt einhalten müssen:**

1. Sie brauchen die echten **SMTP-Zugangsdaten** Ihres Postfachs (Schritt 1).
   Ohne diese wird es nicht zuverlässig funktionieren.
2. Als Absender muss **office@drweiser.at** eingetragen sein – also genau die
   Adresse, deren Zugangsdaten Sie verwenden. Erfundene Absender wie
   `website@drweiser.at` werden abgelehnt, wenn es dieses Postfach nicht gibt.

> Die eigentliche Anfrage bleibt trotzdem beantwortbar: Die E-Mail wird zwar
> von `office@drweiser.at` verschickt, trägt aber die Adresse der anfragenden
> Person als **Antwort-an**. Ein Klick auf „Antworten" in Outlook geht also
> direkt an die Mandantin bzw. den Mandanten.

---

## Schritt 1: SMTP-Zugangsdaten besorgen

Das ist der einzige Schritt, den Sie nicht allein erledigen können. Schreiben
Sie Ihrem IT-Betreuer (Heitl IT) eine E-Mail. Vorlage zum Kopieren:

> **Betreff:** SMTP-Zugangsdaten für Kontaktformular drweiser.at
>
> Guten Tag,
>
> auf unserer Website soll ein Kontaktformular eingerichtet werden, das
> Anfragen per E-Mail an office@drweiser.at zustellt.
>
> Bitte senden Sie mir dafür die SMTP-Versanddaten des Postfachs
> office@drweiser.at:
>
> - SMTP-Server (Hostname)
> - Port (587 oder 465)
> - Verschlüsselung (STARTTLS oder SSL/TLS)
> - Benutzername
> - Passwort bzw. App-Passwort
>
> Falls für automatisierten Versand ein eigenes Postfach oder ein
> App-Passwort sinnvoller ist, richten Sie das bitte gerne so ein und geben
> Sie mir die entsprechenden Daten.
>
> Vielen Dank!

Sie bekommen dann fünf Angaben zurück, z. B. in dieser Art:

```
Server:         smtp.example-provider.at
Port:           587
Verschlüsselung: STARTTLS
Benutzername:   office@drweiser.at
Passwort:       xxxxxxxxxxxx
```

**Bewahren Sie diese Daten sicher auf** – wer sie hat, kann in Ihrem Namen
E-Mails verschicken. Nicht per unverschlüsselter Mail weiterleiten, nicht in
Dokumente kopieren, die geteilt werden.

---

## Schritt 2: Projektdateien auf den Computer laden

> ### ⚠️ Unbedingt den richtigen Branch verwenden
>
> Das Repository hat mehrere Entwicklungsstände („Branches"). Das
> Kontaktformular liegt auf dem Branch
> **`claude/kontaktformular-setup-q89qii`**.
>
> Wenn Sie GitHub einfach öffnen, landen Sie auf einem **anderen** Branch –
> dort fehlt der Ordner `public/api`, und die ZIP-Datei wäre unbrauchbar.

**Der einfachste Weg – direkter Download-Link:**

```
https://github.com/officedrweiser/Spezielisierungen/archive/refs/heads/claude/kontaktformular-setup-q89qii.zip
```

Diesen Link in die Adresszeile des Browsers kopieren, Enter drücken – der
Download startet sofort mit dem richtigen Stand.

**Alternativ über die Oberfläche:**

1. Repository öffnen:
   `https://github.com/officedrweiser/Spezielisierungen`
2. Oben links steht ein Auswahlfeld mit einem Branch-Namen (Symbol: kleine
   Verzweigung). Daraufklicken und
   **`claude/kontaktformular-setup-q89qii`** auswählen.
3. Zur Kontrolle: In der Dateiliste muss jetzt der Ordner **`public`** und
   darin **`api`** zu sehen sein. Fehlt er, ist noch der falsche Branch aktiv.
4. Grüner Button **`Code`** → **`Download ZIP`**.

Anschließend die ZIP-Datei entpacken (Rechtsklick → „Alle extrahieren…").

> **Kontrolle nach dem Entpacken:** Im Ordner muss der Pfad
> `public/api/contact.php` existieren. Wenn nicht, wurde der falsche Branch
> heruntergeladen – noch einmal mit dem Direktlink oben versuchen.

Sie haben jetzt einen Ordner mit u. a. diesen Unterordnern:

```
public/          ← das ist die Website (dieser Inhalt kommt auf den Server)
server/          ← nur für Weg B (Node.js) – wird bei Weg A nicht gebraucht
```

---

## Schritt 3: Zugangsdaten eintragen

1. Öffnen Sie den Ordner `public` → `api`.
2. Dort liegt die Datei **`config.example.php`**.
3. Erstellen Sie eine **Kopie** davon (Rechtsklick → Kopieren → Einfügen).
4. Benennen Sie die Kopie in genau **`config.php`** um.
   *(Falls Windows die Endung `.php` ausblendet: Explorer → Ansicht →
   Häkchen bei „Dateinamenerweiterungen" setzen.)*
5. Öffnen Sie `config.php` mit einem **reinen Texteditor** – unter Windows
   „Editor"/Notepad, am Mac „TextEdit". **Nicht** mit Word öffnen, Word
   zerstört die Datei.
6. Tragen Sie die Daten aus Schritt 1 ein. Nachher soll es so aussehen
   (Beispielwerte – nehmen Sie Ihre echten):

```php
<?php
return [
    'recipient' => 'office@drweiser.at',

    'from'      => 'office@drweiser.at',
    'from_name' => 'Website-Kontaktformular',

    'smtp_host'   => 'smtp.example-provider.at',
    'smtp_port'   => 587,
    'smtp_secure' => 'tls',
    'smtp_user'   => 'office@drweiser.at',
    'smtp_pass'   => 'IhrPasswortHier',
];
```

**Worauf Sie achten müssen:**

- Alle Werte stehen zwischen `'` Hochkommas – die dürfen nicht wegfallen.
- Am Zeilenende steht ein **Komma**.
- Nur bei `smtp_port` steht die Zahl **ohne** Hochkommas.
- Bei Port **587** → `'smtp_secure' => 'tls'`
- Bei Port **465** → `'smtp_secure' => 'ssl'`
- Enthält Ihr Passwort ein Hochkomma `'`, schreiben Sie davor einen
  Backslash: `\'`

Speichern und schließen.

---

## Schritt 4: Dateien auf den Server hochladen

Sie brauchen ein FTP-Programm. Empfehlung: **FileZilla**
(kostenlos, https://filezilla-project.org – „FileZilla Client" wählen).

Die FTP-Zugangsdaten (Server, Benutzername, Passwort) finden Sie im
Kundenbereich Ihres Hosters oder in den Unterlagen von der Einrichtung. Falls
nicht auffindbar: beim Hoster bzw. IT-Betreuer anfordern.

1. FileZilla öffnen, oben Server/Benutzername/Passwort eintragen,
   **`Verbinden`**.
2. Rechts sehen Sie den Server. Wechseln Sie in den Ordner, in dem die
   Website liegt – je nach Anbieter heißt er `httpdocs`, `public_html`,
   `html` oder `www`. Erkennungsmerkmal: Dort liegt die bestehende
   `index.html` bzw. `index.php`.
3. **Sicherung machen:** Markieren Sie alles in diesem Ordner, Rechtsklick →
   `Herunterladen`, und legen Sie es in einen Ordner „Sicherung alte Website"
   auf Ihrem Computer. Damit können Sie jederzeit zurück.
4. Links navigieren Sie in den entpackten Projektordner, dort hinein in
   `public`.
5. Markieren Sie **den gesamten Inhalt von `public`** (nicht den Ordner
   selbst!) – also `index.html`, `kontakt.html`, `assets`, `api`, `.htaccess`
   usw. – und ziehen Sie alles nach rechts auf den Server.

> **`.htaccess` wird nicht angezeigt?** In FileZilla oben im Menü:
> `Server` → `Erzwinge Anzeigen versteckter Dateien`. Diese Datei ist
> wichtig – ohne sie funktioniert das Formular zwar trotzdem (es gibt einen
> eingebauten Notfallweg), aber die 404-Fehlerseite greift nicht.

6. Warten, bis die Übertragung fertig ist (unten „Erfolgreiche
   Übertragungen").

Auf dem Server muss es danach so aussehen:

```
httpdocs/
├── .htaccess
├── index.html
├── kontakt.html
├── impressum.html
├── datenschutz.html
├── leistungen.html
├── ueber-uns.html
├── 404.html
├── api/
│   ├── contact.php
│   ├── config.php          ← Ihre Zugangsdaten
│   └── config.example.php
└── assets/
```

---

## Schritt 5: Testen

1. Rufen Sie **https://www.drweiser.at/kontakt.html** auf.
   *(Drücken Sie `Strg`+`F5` bzw. `Cmd`+`Shift`+`R`, damit nicht die alte
   Seite aus dem Zwischenspeicher kommt.)*
2. Füllen Sie das Formular mit Ihren eigenen Daten aus, Häkchen bei der
   Datenschutzerklärung setzen, **`Anfrage senden`**.
3. Erwartetes Ergebnis: grüne Meldung
   *„Vielen Dank! Ihre Anfrage wurde übermittelt…"*
4. Schauen Sie in **office@drweiser.at**. Die E-Mail sollte binnen ein bis
   zwei Minuten da sein.
   **Auch im Spam-Ordner nachsehen** – und die Absenderadresse ggf. als
   „kein Spam" markieren.
5. Klicken Sie in der erhaltenen E-Mail auf **Antworten**: Als Empfänger muss
   die Adresse erscheinen, die Sie im Formular eingetragen haben. So können
   Sie Anfragen später direkt beantworten.

### Testen Sie zusätzlich diese Fälle

| Test | Erwartetes Ergebnis |
|---|---|
| Absenden ohne Häkchen bei Datenschutz | rote Meldung, keine E-Mail |
| Absenden mit „abc" im E-Mail-Feld | rote Meldung „gültige E-Mail-Adresse" |
| Absenden vom Handy | funktioniert genauso |

---

## Wenn etwas nicht klappt

### Rote Meldung: „Ihre Anfrage konnte nicht gesendet werden…"

Das Formular hat den Server erreicht, der E-Mail-Versand ist gescheitert –
fast immer ein Tippfehler in `config.php`. Prüfen Sie der Reihe nach:

1. Heißt die Datei wirklich `config.php` und nicht `config.php.txt`?
2. Stimmen Server, Port und Benutzername exakt (auf Leerzeichen achten,
   die beim Kopieren gerne mitkommen)?
3. Passt die Verschlüsselung zum Port? 587 → `tls`, 465 → `ssl`.
4. Ist das Passwort korrekt? Testen Sie es, indem Sie sich mit denselben
   Daten im Webmail Ihres Anbieters anmelden.

Den genauen technischen Grund finden Sie im **Fehlerprotokoll** Ihres
Hostings (im Kundenbereich meist unter „Logs" / „Fehlerprotokoll" /
`error_log`). Dort steht eine Zeile, die mit `[contact]` beginnt. Diese Zeile
können Sie Ihrem IT-Betreuer schicken – sie sagt ihm sofort, woran es liegt.

### Gar keine Meldung, oder es passiert nichts

Dann kommt das Formular nicht bis zum Server durch:

- Liegt `contact.php` wirklich im Unterordner `api`?
- Rufen Sie testweise `https://www.drweiser.at/api/contact.php` direkt im
  Browser auf. Erwartete Ausgabe:
  `{"error":"Methode nicht erlaubt."}` — **das ist die richtige Antwort!**
  Sie beweist, dass PHP läuft.
  - Erscheint stattdessen **Programmcode** (`<?php …`), unterstützt Ihr
    Hosting kein PHP → Anbieter kontaktieren oder Weg B wählen.
  - Erscheint **404 / Seite nicht gefunden**, liegt die Datei am falschen Ort.

### E-Mail kommt an, landet aber im Spam

1. In Outlook den Absender als vertrauenswürdig markieren.
2. Ihren IT-Betreuer bitten, für die Website-Mails **DKIM** einzurichten.
   Das ist der saubere Weg und dauert für einen Profi wenige Minuten.

### Es kommen Spam-Anfragen über das Formular

Zwei Schutzmechanismen sind bereits aktiv: ein unsichtbares Fallenfeld für
Bots und eine Begrenzung auf 10 Anfragen pro Viertelstunde und Absender.
Sollte es trotzdem überhandnehmen, melden Sie sich – dann bauen wir eine
zusätzliche Rechenaufgabe oder ein Captcha ein.

---

## Wichtig für den Datenschutz

Über das Formular verarbeiten Sie personenbezogene Daten. Zwei Punkte sind
noch offen und sollten vor dem Livegang geklärt werden:

- **Datenschutzerklärung**: Der Passus zum Kontaktformular ist in
  `datenschutz.html` bereits enthalten, sollte aber von Ihnen final
  freigegeben werden.
- **Aufbewahrung**: Legen Sie intern fest, wie lange Formularanfragen im
  Postfach bleiben, und löschen Sie sie danach.

Ein Vorteil dieser Lösung: Die Daten laufen **ausschließlich über Ihren
eigenen Server und Ihr eigenes Postfach**. Es ist kein externer
Formular-Dienstleister eingebunden, für den Sie einen
Auftragsverarbeitungsvertrag bräuchten.

---

## Weg B: Betrieb auf einem Node.js-Hoster

Nur relevant, falls Sie die Website auf einen Node.js-fähigen Anbieter legen
(z. B. Render, Railway, Hetzner mit eigenem Server). Der PHP-Teil wird dann
nicht verwendet.

1. Repository beim Anbieter verbinden.
2. Build-Befehl: `npm install` — Start-Befehl: `npm start`
3. Folgende Umgebungsvariablen („Environment Variables") setzen:

   | Name | Wert |
   |---|---|
   | `CONTACT_RECIPIENT` | `office@drweiser.at` |
   | `SMTP_FROM` | `office@drweiser.at` |
   | `SMTP_HOST` | Server aus Schritt 1 |
   | `SMTP_PORT` | `587` |
   | `SMTP_SECURE` | `false` (bei Port 465: `true`) |
   | `SMTP_USER` | `office@drweiser.at` |
   | `SMTP_PASS` | Ihr Passwort |

4. Deployen und wie in Schritt 5 testen.

Lokal ausprobieren geht so:

```bash
npm install
cp .env.example .env      # Werte eintragen
npm start                 # http://localhost:3000
```

Ohne SMTP-Daten wird dabei bewusst **keine** E-Mail verschickt, der Inhalt
erscheint stattdessen im Terminal – praktisch zum Testen des Ablaufs.

---

## Checkliste

- [ ] SMTP-Zugangsdaten vom IT-Betreuer erhalten
- [ ] `config.php` aus `config.example.php` erstellt und ausgefüllt
- [ ] Sicherung der alten Website heruntergeladen
- [ ] Inhalt von `public/` auf den Server hochgeladen (inkl. `.htaccess`)
- [ ] Testanfrage abgeschickt → grüne Meldung erschienen
- [ ] E-Mail in office@drweiser.at angekommen
- [ ] „Antworten" geht an die anfragende Person
- [ ] Fehlerfälle getestet (ohne Häkchen, ungültige E-Mail)
- [ ] Datenschutzerklärung freigegeben
