#!/usr/bin/env bash
# Versucht über einen LOKALEN Testserver an geschützte Dateien zu kommen und prüft Header.
# Aufruf: bash probe_server.sh http://localhost:3000
# Nur gegen lokale Testserver verwenden (nicht gegen die Live-Website).
set -u
BASE="${1:-http://localhost:3000}"
case "$BASE" in http://localhost*|http://127.*) ;; *) echo "Nur für lokale Testserver (localhost/127.x)."; exit 2;; esac
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

leak_check() {  # Prüft, ob die Antwort Quelltext oder Geheimnisse enthält
  if grep -q -E "<\?php|smtp_pass|SMTP_PASS|GEHEIM" "$TMP" 2>/dev/null; then echo "<<< INHALT AUSGELIEFERT"; fi
  if grep -q -i "Index of /" "$TMP" 2>/dev/null; then echo "<<< ORDNERLISTE"; fi
}

echo "== Geschützte Dateien und Umgehungstricks (erwartet: 403/404, nie Inhalt)"
for u in \
  /api/contact.php /api/contact.PHP /api/contact%2ephp /api/contact%2Ephp /api/contact.ph%70 \
  /api/contact.php%00 /api/contact.php/ /api/config.php /api/config%2ephp /api/%63onfig.php \
  /api/config.example.php /api/config.example%2ephp /api/config.php.txt /api/config.php.bak \
  "/api/config.php~" /api/config.old.php /.env /%2eenv /.htaccess /%2ehtaccess /.git/config \
  /..%2f..%2fpackage.json /..%2f.env /%2e%2e/%2e%2e/etc/passwd /package.json /server/server.js \
  /api/ /assets/ /assets/images/ /assets/fonts/; do
  code=$(curl -s -o "$TMP" -w '%{http_code}' --max-time 10 "$BASE$u")
  flag=$(leak_check)
  if [ "$code" = "200" ] && [ -z "$flag" ]; then
    case "$u" in
      */) flag="(200 – Inhalt prüfen)";;
      *) flag="(200 – Inhalt prüfen: $(head -c 60 "$TMP" | tr '\n' ' '))";;
    esac
  fi
  printf '  %-34s %s %s\n' "$u" "$code" "$flag"
done

echo
echo "== Sicherheits-Header auf der Startseite"
hdr=$(curl -s -D - -o /dev/null --max-time 10 "$BASE/")
for h in Content-Security-Policy X-Frame-Options X-Content-Type-Options Referrer-Policy Permissions-Policy Strict-Transport-Security X-Powered-By Server; do
  line=$(printf '%s' "$hdr" | grep -i "^$h:" | tr -d '\r' | cut -c1-120)
  case "$h" in
    X-Powered-By|Server) [ -n "$line" ] && echo "  [i] $line (verrät Software – möglichst entfernen)";;
    Strict-Transport-Security) [ -n "$line" ] && echo "  [ok] $line" || echo "  [i] $h fehlt (bei http:// normal; nur über HTTPS sinnvoll)";;
    *) [ -n "$line" ] && echo "  [ok] $line" || echo "  [!] $h fehlt";;
  esac
done

echo
echo "== Nicht vorhandene Seite"
curl -s -o "$TMP" -w '  /gibt-es-nicht -> %{http_code}\n' --max-time 10 "$BASE/gibt-es-nicht"
grep -q -i -E "stack|at .*\.js:|Error:|Warning:|Fatal" "$TMP" && echo "  [!] Fehlerseite verrät technische Details" || echo "  [ok] Keine technischen Details auf der Fehlerseite"
