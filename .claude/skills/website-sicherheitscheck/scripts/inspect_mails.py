"""Wertet die vom Test-Mailserver mitgeschriebenen E-Mails aus:
tatsächliche Empfänger, eingeschleuste Kopfzeilen, entschärftes HTML.

Aufruf: python3 -I inspect_mails.py <mails.txt> [erwarteter-empfaenger]
"""
import email
import email.header
import re
import sys

path = sys.argv[1]
expected = (sys.argv[2] if len(sys.argv) > 2 else 'office@drweiser.at').lower()
try:
    raw = open(path, encoding='utf-8').read()
except FileNotFoundError:
    print('Keine E-Mails mitgeschrieben (Datei fehlt) – wurde überhaupt eine Anfrage angenommen?')
    sys.exit(1)
blocks = raw.split('=== ENVELOPE ')[1:]
if not blocks:
    print('Keine E-Mails mitgeschrieben.')
    sys.exit(1)

problems = 0
for i, block in enumerate(blocks, 1):
    env, msg = block.split('\n', 1)
    head = re.split(r'\r?\n\r?\n', msg, maxsplit=1)[0]
    m = email.message_from_string(msg)
    rcpts = re.findall(r'RCPT TO:\s*<([^>]+)>', env, re.I)
    extra_hdrs = [h for h in ('Bcc', 'Cc') if re.search(rf'^{h}:', head, re.I | re.M)]
    subject = str(email.header.make_header(email.header.decode_header(m['Subject'] or '')))
    html_parts = [p.get_payload(decode=True).decode('utf-8', 'replace') for p in m.walk() if p.get_content_type() == 'text/html']
    raw_script = any(re.search(r'<script|<img[^>]+onerror|javascript:', h, re.I) for h in html_parts)
    wrong_rcpt = [r for r in rcpts if r.lower() != expected]
    ok = not extra_hdrs and not wrong_rcpt and not raw_script
    problems += 0 if ok else 1
    print(f'Mail {i}: {"ok" if ok else "PROBLEM"}')
    print(f'   Empfänger laut Umschlag: {", ".join(rcpts)}' + (f'  <-- FREMDE EMPFÄNGER {wrong_rcpt}' if wrong_rcpt else ''))
    print(f'   eingeschleuste Kopfzeilen: {", ".join(extra_hdrs) if extra_hdrs else "keine"}')
    print(f'   Reply-To: {m["Reply-To"]} | Betreff: {subject[:100]}')
    print(f'   HTML-Teil enthält ausführbaren Code: {"JA" if raw_script else "nein"}')
print(f'\nErgebnis: {len(blocks)} E-Mails, {problems} mit Problemen')
sys.exit(1 if problems else 0)
