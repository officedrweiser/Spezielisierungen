#!/usr/bin/env bash
# Schaut sich die LIVE-Website von außen an – nur lesend, wie ein normaler Besucher.
# Es werden ausschließlich GET/HEAD-Anfragen auf öffentliche Seiten geschickt;
# das Kontaktformular wird NICHT angefasst.
#
# Aufruf: bash live_check.sh drweiser.at [github-besitzer/repo]
#
# Prüft: Weiterleitung http -> https, Zertifikat (Aussteller, Ablaufdatum),
# Sicherheits-Header, ob geschützte Dateien von außen erreichbar sind (nur ein paar
# GET-Anfragen, kein Durchprobieren), Server-Kennung und – optional – ob das
# GitHub-Repository öffentlich ist.
set -u
HOST="${1:-}"; REPO="${2:-}"
[ -n "$HOST" ] || { echo "Aufruf: bash live_check.sh <domain> [besitzer/repo]"; exit 2; }
HOST="$(printf '%s' "$HOST" | sed -E 's#^https?://##; s#/.*$##')"
TMP=$(mktemp); trap 'rm -f "$TMP" "$TMP.h"' EXIT
CURL=(curl -s --max-time 20 -A "Mozilla/5.0 (Sicherheitscheck, nur lesend)")

echo "== 1. Weiterleitung auf HTTPS"
read -r code loc < <("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://$HOST/")
case "$code" in
  301|302|307|308)
    if printf '%s' "$loc" | grep -q '^https://'; then echo "[ok] http://$HOST/ leitet weiter ($code) auf $loc"
    else echo "[!] http://$HOST/ leitet weiter ($code), aber nicht auf https: $loc"; fi ;;
  000) echo "[?] http://$HOST/ nicht erreichbar (Netzwerk der Prüfumgebung?)" ;;
  *)   echo "[!] http://$HOST/ antwortet mit $code statt auf https umzuleiten – Besucher können unverschlüsselt surfen."
       echo "    Lösung: im Hosting-Panel \"HTTPS erzwingen\" aktivieren (nicht per .htaccess, siehe Prüfkatalog)." ;;
esac

echo; echo "== 2. Zertifikat"
VERIFY_OK=1
if ! "${CURL[@]}" -o /dev/null "https://$HOST/"; then
  VERIFY_OK=0
  echo "[?] Zertifikat konnte hier nicht bestätigt werden. In Sandbox-Umgebungen fehlt oft eine"
  echo "    Zwischenzertifizierungsstelle – das sagt nichts über die echte Website. Gegenprobe:"
  echo "    https://www.ssllabs.com/ssltest/analyze.html?d=$HOST oder Schloss-Symbol im Browser."
fi
# Zertifikatsdaten nur zur Anzeige lesen (-k: Daten auslesen, nicht vertrauen)
"${CURL[@]}" -k -v -o /dev/null "https://$HOST/" 2>"$TMP" || true
subj=$(grep -m1 -i 'subject:' "$TMP" | sed 's/^[*[:space:]]*//')
issuer=$(grep -m1 -i 'issuer:' "$TMP" | sed 's/^[*[:space:]]*//')
expire=$(grep -m1 -i 'expire date:' "$TMP" | sed 's/^[*[:space:]]*expire date:[[:space:]]*//I')
[ -n "$subj" ] && echo "    $subj"
[ -n "$issuer" ] && echo "    $issuer"
if [ -n "$expire" ]; then
  exp_s=$(date -d "$expire" +%s 2>/dev/null || echo 0); now_s=$(date +%s)
  days=$(( (exp_s - now_s) / 86400 ))
  if [ "$exp_s" -eq 0 ]; then echo "[?] Ablaufdatum: $expire (nicht auswertbar)"
  elif [ "$days" -lt 0 ]; then echo "[!] Zertifikat ist ABGELAUFEN ($expire)"
  elif [ "$days" -lt 14 ]; then echo "[!] Zertifikat läuft in $days Tagen ab ($expire) – automatische Verlängerung prüfen"
  else echo "[ok] Zertifikat gültig bis $expire (noch $days Tage)"; fi
fi

echo; echo "== 3. Sicherheits-Header der Startseite"
"${CURL[@]}" -k -D "$TMP.h" -o /dev/null "https://$HOST/"
hdr() { grep -i -m1 "^$1:" "$TMP.h" | cut -d: -f2- | sed 's/^ *//; s/\r$//'; }
for h in Content-Security-Policy X-Content-Type-Options X-Frame-Options Referrer-Policy Permissions-Policy Strict-Transport-Security; do
  v=$(hdr "$h")
  if [ -n "$v" ]; then echo "[ok] $h: $(printf '%s' "$v" | cut -c1-90)"
  else echo "[!] $h fehlt"; fi
done
for h in Server X-Powered-By; do
  v=$(hdr "$h"); [ -n "$v" ] && echo "[i] $h: $v  (verrät Software – meist harmlos, solange keine Versionsnummer dabei ist)"
done
if ! grep -q -i '^content-security-policy:' "$TMP.h"; then
  echo "    Hinweis: Fehlen ALLE Header, ist die .htaccess vermutlich nicht hochgeladen oder mod_headers ist aus."
fi

echo; echo "== 4. Geschützte Dateien von außen (nur Stichprobe, erwartet 403/404)"
for u in /api/config.php /api/config.example.php /.env /.htaccess /.git/config /package.json /server/server.js /api/; do
  c=$("${CURL[@]}" -k -o "$TMP" -w '%{http_code}' "https://$HOST$u")
  if grep -q -E "<\?php|smtp_pass|SMTP_PASS|\[core\]" "$TMP" 2>/dev/null; then echo "[!] $u -> $c  INHALT WIRD AUSGELIEFERT"
  elif grep -q -i "Index of /" "$TMP" 2>/dev/null; then echo "[!] $u -> $c  ORDNERLISTE sichtbar"
  elif [ "$c" = "200" ] && [ "$u" != "/api/config.php" ]; then echo "[?] $u -> 200 (Inhalt prüfen – ggf. nur die 404-Seite mit falschem Code)"
  else echo "[ok] $u -> $c"; fi
done
# config.php darf ausgeführt werden (leere Antwort), aber nie Quelltext zeigen – oben abgedeckt.

echo; echo "== 5. Welche Website-Version läuft live?"
"${CURL[@]}" -k -o "$TMP" "https://$HOST/"
if grep -q 'wp-content' "$TMP"; then
  ver=$(grep -o -i -E '<meta name="generator" content="WordPress [0-9.]+' "$TMP" | grep -o -E '[0-9.]+$')
  echo "[i] Live läuft eine WordPress-Seite${ver:+ (Version $ver laut Quelltext)} – NICHT die Version aus diesem Repository."
  echo "    Die Header-Befunde oben betreffen also die WordPress-Seite. Bis zur Umstellung gilt:"
  echo "    WordPress, Theme und Plugins aktuell halten; Admin-Zugang mit starkem Passwort + 2FA."
  c=$("${CURL[@]}" -k -o "$TMP" -w '%{http_code}' "https://$HOST/wp-json/wp/v2/users")
  if [ "$c" = "200" ] && grep -q '"slug"' "$TMP"; then
    echo "[!] /wp-json/wp/v2/users zeigt Benutzernamen: $(grep -o '"slug":"[^"]*"' "$TMP" | cut -d'"' -f4 | tr '\n' ' ')"
    echo "    (erleichtert das Erraten von Passwörtern – per Sicherheits-Plugin abschaltbar)"
  else echo "[ok] Benutzerliste über die WordPress-Schnittstelle nicht abrufbar ($c)"; fi
  c=$("${CURL[@]}" -k -o "$TMP" -w '%{http_code}' "https://$HOST/xmlrpc.php")
  if grep -q -i 'XML-RPC server accepts POST' "$TMP"; then
    echo "[!] /xmlrpc.php ist aktiv (beliebtes Ziel für Passwort-Angriffe; wird meist nicht gebraucht)"
  else echo "[ok] /xmlrpc.php nicht aktiv ($c)"; fi
elif grep -q 'cookie-banner' "$TMP"; then
  echo "[ok] Live läuft die Version aus diesem Repository (Cookie-Banner gefunden)"
else
  echo "[?] Version nicht eindeutig erkennbar – Quelltext der Startseite ansehen"
fi

if [ -n "$REPO" ]; then
  echo; echo "== 6. GitHub-Repository $REPO"
  c=$(curl -s --max-time 20 -o "$TMP" -w '%{http_code}' "https://api.github.com/repos/$REPO")
  case "$c" in
    200) if grep -q '"private": *false' "$TMP"; then
           echo "[!] Repository ist ÖFFENTLICH – jeder kann den Quelltext und den Verlauf lesen."
           echo "    Empfehlung: GitHub -> Settings -> General -> Danger Zone -> Change visibility -> Private."
         else echo "[ok] Repository ist privat"; fi ;;
    404) echo "[ok] Repository ist von außen nicht sichtbar (privat oder nicht vorhanden)" ;;
    *)   echo "[?] GitHub-Abfrage ergab $c – Sichtbarkeit bitte selbst prüfen" ;;
  esac
fi
if [ "$VERIFY_OK" != 1 ]; then
  echo; echo "Hinweis: Abschnitte 3–4 wurden ohne Zertifikatsprüfung gelesen (nur zur Diagnose)."
fi
