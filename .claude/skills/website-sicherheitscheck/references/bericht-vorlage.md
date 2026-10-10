# Bericht-Vorlage

Der Leser ist Rechtsanwalt, kein Techniker. Er will drei Dinge wissen: **Ist die Website
sicher? Was wurde schon erledigt? Was muss ich selbst tun?** Schreibe so, dass er den
Bericht ohne Rückfrage versteht und weitergeben kann.

- Kurze Sätze. Fachwörter nur mit einer Erklärung in Klammern, z. B. „CSP (eine Regel, die
  dem Browser sagt, von welchen Servern er Inhalte laden darf)“.
- Jeder Befund beantwortet: **Was** ist los? **Was bedeutet das** konkret? **Was** ist zu tun,
  und **von wem**?
- Ehrlich bleiben: „geprüft und in Ordnung“, „behoben und erneut geprüft“, „hier nicht prüfbar,
  weil …“. Keine Entwarnung ohne Nachweis.
- Rechtliches nur als technischer Hinweis („die Karte lädt ohne Einwilligung und steht nicht
  in der Datenschutzerklärung“), nicht als Rechtsrat. Die Bewertung trifft der Auftraggeber.
- Keine Zugangsdaten im Bericht. Gefundene Benutzernamen nur nennen, wenn der Bericht nicht
  ins Repository geht.

## Aufbau

```markdown
# Sicherheitscheck drweiser.at – <TT.MM.JJJJ>

## Kurzfazit
<Ampel: 🟢 sicher / 🟡 sicher, aber offene Punkte / 🔴 dringender Handlungsbedarf>
<2–3 Sätze: Gesamteindruck, wichtigster offener Punkt, ob etwas dringend ist.>

## Was geprüft wurde
- Zugangsdaten: Liegen Passwörter irgendwo im Projekt oder in seiner Geschichte?
- Software-Bausteine: Haben verwendete Programmteile bekannte Sicherheitslücken?
- Server: Kommt man über Tricks an geschützte Dateien (z. B. das Mail-Passwort)?
- Kontaktformular: <n> Angriffsversuche in einer abgeschotteten Testumgebung (Spam-Versand,
  eingeschleuster Code, Fremdseiten, Überflutung). Das echte Formular wurde nicht angegriffen.
- Datenschutz: Werden vor der Cookie-Entscheidung Daten an Google & Co. übertragen? Lässt
  sich das Cookie-Fenster umgehen?
- Live-Website: Verschlüsselung, Zertifikat, Schutz-Einstellungen (nur von außen angesehen).

## Bereits behoben
| Was | Warum wichtig | Nachweis |
|---|---|---|
| <kurz> | <Folge, wenn es offen geblieben wäre> | <„erneut getestet: …“> |

## Ihre To-dos
### 1. <Titel> – <dringend / bald / bei Gelegenheit>
**Warum:** <ein bis zwei Sätze>
**So geht's:**
1. <konkreter Klickweg, z. B. „GitHub → Settings → General → ganz unten
   ‚Change visibility‘ → Private“>
2. …

## Zu entscheiden
- <Frage mit Empfehlung, z. B. „Neues Video erst nach Klick laden? Empfehlung: ja, weil …“>
- Bereits getroffene Entscheidungen (siehe SKILL.md) hier nicht erneut aufwerfen.

## In Ordnung (geprüft)
- <kurze Liste, damit sichtbar ist, was alles gut ist>

## Technischer Anhang
<gekürzte Skriptausgaben, nur die relevanten Zeilen>
```

## Dringlichkeit einordnen

| Stufe | Wann | Beispiele |
|---|---|---|
| **dringend** | Daten oder Postfach sind jetzt angreifbar | Passwort im öffentlichen Repository, `config.php` abrufbar, Formular als Spam-Schleuder nutzbar, Zertifikat abgelaufen |
| **bald** | Schwäche oder Datenschutz-Risiko, aber kein offenes Tor | keine HTTPS-Weiterleitung, neuer Drittdienst lädt ohne Einwilligung, genutzter Dienst fehlt in der Datenschutzerklärung, WordPress verrät Benutzernamen |
| **bei Gelegenheit** | Härtung, gute Praxis | `Server`-Header verrät Software, HSTS-Feinheiten, regelmäßige Wiederholung |

## Beispielformulierungen

- **HTTPS:** „Wer `http://drweiser.at` eintippt, landet auf einer unverschlüsselten Seite. Im
  Café-WLAN könnte jemand mitlesen, was in das Formular getippt wird. Das lässt sich mit einem
  Häkchen im A1-Kundencenter abstellen.“
- **Datenschutzerklärung unvollständig:** „Die Google-Karte auf der Kontaktseite lädt sofort
  und überträgt dabei die IP-Adresse an Google. So ist es gewollt. Die Datenschutzerklärung
  erwähnt die Karte aber noch nicht. Ein Absatz dazu sollte ergänzt werden.“
- **Öffentliches Repository:** „Der gesamte Quelltext der Website ist auf GitHub für jeden
  lesbar. Passwörter liegen dort nicht. Trotzdem erleichtert das Angreifern die Suche nach
  Schwachstellen.“
- **Spam-Bremse:** „Von derselben Internetadresse werden höchstens 20 Anfragen in 15 Minuten
  angenommen. Ein normaler Besucher merkt davon nichts, ein Spam-Programm wird gestoppt.“
