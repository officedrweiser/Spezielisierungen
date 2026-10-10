#!/usr/bin/env bash
# Startet/stoppt abgeschottete Testumgebungen fürs Kontaktformular – E-Mails gehen
# nur an einen Test-Mailserver (mail_sink.py), nie an ein echtes Postfach.
#
#   bash testenv.sh start node   <arbeitsordner> [projektordner]  -> http://localhost:3100
#   bash testenv.sh start php    <arbeitsordner> [projektordner]  -> http://127.0.0.1:8088
#   bash testenv.sh start apache <arbeitsordner> [projektordner]  -> http://127.0.0.1:8090
#   bash testenv.sh stop         <arbeitsordner>
#
# Mitgeschriebene E-Mails: <arbeitsordner>/mails.txt  (auswerten mit inspect_mails.py)
# Prozesse werden über gespeicherte PIDs beendet (kein pkill -f, das den eigenen
# Befehl treffen kann).
set -u
ACTION="${1:-}"; MODE="${2:-}"; WORK="${3:-}"; ROOT="${4:-$(pwd)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ "$ACTION" = "stop" ] && WORK="${2:-}"
[ -n "$WORK" ] || { echo "Arbeitsordner fehlt"; exit 2; }
mkdir -p "$WORK"
WORK="$(cd "$WORK" && pwd)"

start_sink() {
  if [ -f "$WORK/sink.pid" ] && kill -0 "$(cat "$WORK/sink.pid")" 2>/dev/null; then return; fi
  python3 -I "$HERE/mail_sink.py" "$WORK/mails.txt" 2525 > "$WORK/sink.log" 2>&1 &
  echo $! > "$WORK/sink.pid"; sleep 0.5
}

write_php_config() {  # $1 = Zielordner api/
  cat > "$1/config.php" <<'PHP'
<?php
return [
    'recipient' => 'office@drweiser.at', 'from' => 'office@drweiser.at', 'from_name' => 'Website-Kontaktformular',
    'smtp_host' => '127.0.0.1', 'smtp_port' => 2525, 'smtp_secure' => '', 'smtp_user' => 'test', 'smtp_pass' => 'test',
];
PHP
}

port_busy() { curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/" && return 0 || return 1; }

case "$ACTION" in
start)
  case "$MODE" in node) P=3100;; php) P=8088;; apache) P=8090;; *) P=0;; esac
  if [ "$P" != 0 ] && port_busy "$P"; then echo "Port $P ist schon belegt – erst 'stop' ausführen bzw. alten Prozess beenden."; exit 1; fi
  start_sink
  case "$MODE" in
  node)
    # "exec", damit die gespeicherte PID wirklich die des Servers ist (sonst bleibt er beim Stoppen übrig)
    (cd "$ROOT" && exec env PORT=3100 SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_SECURE=false SMTP_USER=test SMTP_PASS=test \
      SMTP_FROM=office@drweiser.at CONTACT_RECIPIENT=office@drweiser.at node server/server.js > "$WORK/node.log" 2>&1) &
    echo $! > "$WORK/node.pid"
    sleep 2; echo "Node-Testserver: http://localhost:3100  (Formular: POST /api/contact)";;
  php)
    rm -rf "$WORK/php" && mkdir -p "$WORK/php" && cp -r "$ROOT/public" "$WORK/php/"
    write_php_config "$WORK/php/public/api"
    cat > "$WORK/php/router.php" <<'PHP'
<?php
// bildet die RewriteRule aus .htaccess nach: /api/contact -> /api/contact.php
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/contact/?$#', $p)) { require $_SERVER['DOCUMENT_ROOT'] . '/api/contact.php'; return true; }
return false;
PHP
    rm -rf "$(php -r 'echo sys_get_temp_dir();')/drweiser-contact"   # Spam-Bremse zurücksetzen
    (cd "$WORK/php/public" && exec php -S 127.0.0.1:8088 "$WORK/php/router.php" > "$WORK/php.log" 2>&1) &
    echo $! > "$WORK/php.pid"
    sleep 1; echo "PHP-Testserver: http://127.0.0.1:8088  (Formular: POST /api/contact)"
    echo "  Hinweis: php -S ignoriert die .htaccess – Dateischutz und Header nur im Apache-Modus bewerten.";;
  apache)
    if ! command -v apache2 >/dev/null || ! ls /usr/lib/apache2/modules/libphp*.so >/dev/null 2>&1; then
      echo "Installiere Apache + PHP-Modul (einmalig) …"
      (apt-get install -y --no-install-recommends apache2 libapache2-mod-php || (apt-get update && apt-get install -y --no-install-recommends apache2 libapache2-mod-php)) > "$WORK/apt.log" 2>&1
    fi
    # Eigener Ordner unter /var/www: der Apache-Benutzer (www-data) darf Arbeitsordner
    # wie /tmp/claude-0/… oft nicht lesen – das ergäbe überall 403.
    A="/var/www/website-sicherheitscheck-test"; echo "$A" > "$WORK/apache.dir"
    rm -rf "$A" && mkdir -p "$A/run" "$A/logs" && cp -r "$ROOT/public" "$A/htdocs"
    write_php_config "$A/htdocs/api"
    # Typische Fehler beim Hochladen nachstellen: Kopien der Zugangsdaten, .env, Ordner ohne index.html
    for f in config.php.txt config.php.bak "config.php~" config.old.php; do echo "<?php // GEHEIM smtp_pass=Passwort123" > "$A/htdocs/api/$f"; done
    echo "SMTP_PASS=GEHEIM" > "$A/htdocs/.env"
    PHPMOD=$(ls /usr/lib/apache2/modules/libphp*.so | head -1)
    cat > "$A/httpd.conf" <<CONF
ServerRoot /etc/apache2
PidFile $A/run/httpd.pid
Listen 127.0.0.1:8090
ServerName localhost
LoadModule mpm_prefork_module /usr/lib/apache2/modules/mod_mpm_prefork.so
LoadModule authz_core_module /usr/lib/apache2/modules/mod_authz_core.so
LoadModule authz_host_module /usr/lib/apache2/modules/mod_authz_host.so
LoadModule dir_module /usr/lib/apache2/modules/mod_dir.so
LoadModule mime_module /usr/lib/apache2/modules/mod_mime.so
LoadModule rewrite_module /usr/lib/apache2/modules/mod_rewrite.so
LoadModule headers_module /usr/lib/apache2/modules/mod_headers.so
LoadModule autoindex_module /usr/lib/apache2/modules/mod_autoindex.so
LoadModule php_module $PHPMOD
TypesConfig /etc/mime.types
User www-data
Group www-data
ErrorLog $A/logs/error.log
LogLevel warn
DocumentRoot $A/htdocs
DirectoryIndex index.html
<Directory />
  AllowOverride None
  Require all denied
</Directory>
# Bewusst großzügig wie bei manchen Hostern (Indexes an) – die .htaccess muss das abfangen
<Directory $A/htdocs>
  Options Indexes FollowSymLinks
  AllowOverride All
  Require all granted
</Directory>
<FilesMatch \.php$>
  SetHandler application/x-httpd-php
</FilesMatch>
CONF
    chown -R www-data:www-data "$A/htdocs"
    rm -rf "$(php -r 'echo sys_get_temp_dir();')/drweiser-contact"
    if ! apache2 -f "$A/httpd.conf" -t > "$A/logs/syntax.log" 2>&1; then echo "Apache-Konfiguration fehlerhaft:"; cat "$A/logs/syntax.log"; exit 1; fi
    apache2 -f "$A/httpd.conf" -k start; sleep 1
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/)
    if [ "$code" != "200" ]; then
      echo "[!] Apache-Startseite liefert $code statt 200."
      [ "$code" = "500" ] && echo "    500 = die .htaccess enthält einen Fehler und würde die ganze Website lahmlegen!"
      tail -5 "$A/logs/error.log"; exit 1
    fi
    echo "Apache-Testserver: http://127.0.0.1:8090 (Startseite 200 – .htaccess wird fehlerfrei verarbeitet)";;
  *) echo "Modus: node | php | apache"; exit 2;;
  esac;;
stop)
  for f in node php sink; do
    if [ -f "$WORK/$f.pid" ]; then
      pid="$(cat "$WORK/$f.pid")"; kill "$pid" 2>/dev/null
      for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.2; done
      rm -f "$WORK/$f.pid"
    fi
  done
  if [ -f "$WORK/apache.dir" ]; then
    A="$(cat "$WORK/apache.dir")"
    [ -f "$A/httpd.conf" ] && apache2 -f "$A/httpd.conf" -k stop 2>/dev/null
    sleep 1; case "$A" in /var/www/website-sicherheitscheck-test) rm -rf "$A";; esac
    rm -f "$WORK/apache.dir"
  fi
  rm -rf "$(php -r 'echo sys_get_temp_dir();' 2>/dev/null)/drweiser-contact"
  echo "Testumgebungen beendet.";;
*) sed -n '2,12p' "$0"; exit 2;;
esac
