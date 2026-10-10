"""Test-Mailserver: nimmt E-Mails per SMTP an und schreibt sie in eine Datei,
statt sie zu verschicken. Akzeptiert jede Anmeldung (AUTH PLAIN/LOGIN).

Aufruf: python3 -I mail_sink.py <ausgabedatei> [port]   (Standard-Port 2525)
"""
import socketserver
import sys

OUT = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 2525


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        def send(line):
            self.wfile.write((line + '\r\n').encode())

        send('220 testsink ESMTP')
        in_data, buf, envelope, auth_steps = False, [], [], 0
        while True:
            raw = self.rfile.readline()
            if not raw:
                break
            line = raw.decode('utf-8', 'replace')
            if in_data:
                if line in ('.\r\n', '.\n'):
                    in_data = False
                    with open(OUT, 'a', encoding='utf-8') as f:
                        f.write('=== ENVELOPE ' + ' | '.join(envelope) + '\n' + ''.join(buf) + '\n')
                    buf, envelope = [], []
                    send('250 OK queued')
                else:
                    buf.append(line)
                continue
            if auth_steps:
                auth_steps -= 1
                send('334 UGFzc3dvcmQ6' if auth_steps else '235 Authentication successful')
                continue
            cmd = line.strip().upper()
            if cmd.startswith(('EHLO', 'HELO')):
                send('250-testsink')
                send('250-AUTH PLAIN LOGIN')
                send('250 OK')
            elif cmd.startswith('AUTH LOGIN'):
                auth_steps = 2
                send('334 VXNlcm5hbWU6')
            elif cmd.startswith('AUTH PLAIN'):
                send('235 Authentication successful')
            elif cmd.startswith(('MAIL FROM', 'RCPT TO')):
                envelope.append(line.strip())
                send('250 OK')
            elif cmd == 'DATA':
                in_data = True
                send('354 End data with <CR><LF>.<CR><LF>')
            elif cmd == 'QUIT':
                send('221 Bye')
                break
            else:
                send('250 OK')


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler) as server:
    server.serve_forever()
