#!/usr/bin/env bash
# Statische Prüfung des Projekts (kein Server nötig).
# Aufruf: bash static_audit.sh [Projektordner]   (Standard: aktueller Ordner)
# Gibt Befunde als Klartext aus; "[!]" markiert Auffälligkeiten, "[ok]" Unauffälliges.
set -u
ROOT="${1:-.}"
cd "$ROOT" || { echo "Ordner nicht gefunden: $ROOT"; exit 1; }
PUB="public"
[ -d "$PUB" ] || PUB="."

section() { printf '\n== %s\n' "$1"; }

section "1. Zugangsdaten im Git-Verlauf"
if git rev-parse --git-dir >/dev/null 2>&1; then
  added=$(git log --all --diff-filter=A --name-only --format="" 2>/dev/null \
    | grep -i -E "(^|/)\.env$|(^|/)config\.php$|\.pem$|\.key$|\.p12$|id_rsa|credentials" | sort -u)
  if [ -n "$added" ]; then echo "[!] Diese Dateien waren irgendwann eingecheckt:"; echo "$added" | sed 's/^/    /'
  else echo "[ok] Keine typischen Zugangsdaten-Dateien (.env, config.php, Schlüssel) im Verlauf"; fi
  # Passwort-artige Zuweisungen, die nicht offensichtlich Platzhalter sind
  hits=$(git log --all -p 2>/dev/null | grep -E "^\+" \
    | grep -i -E "(smtp_pass|SMTP_PASS|password|passwort|api[_-]?key|secret|token)['\"]?\s*(=>|=|:)\s*['\"]?[^'\"[:space:],;]{6,}" \
    | grep -v -i -E "IhrPasswort|example|beispiel|xxxx|changeme|placeholder|GEHEIM|process\.env|\\\$config|getenv|<|\(\)" | sort -u | head -20)
  if [ -n "$hits" ]; then echo "[!] Mögliche echte Zugangsdaten im Verlauf (prüfen!):"; echo "$hits" | cut -c1-160 | sed 's/^/    /'
  else echo "[ok] Keine Passwort-/Schlüssel-Zuweisungen mit echten Werten gefunden"; fi
else
  echo "[?] Kein Git-Repository"
fi

section "2. .gitignore schützt Zugangsdaten-Dateien"
for f in ".env" "public/api/config.php"; do
  if git check-ignore -q "$f" 2>/dev/null; then echo "[ok] $f wird von Git ignoriert"
  else echo "[!] $f wird NICHT ignoriert"; fi
done
tracked=$(git ls-files 2>/dev/null | grep -E "(^|/)\.env$|api/config\.php$")
[ -n "$tracked" ] && echo "[!] Aktuell eingecheckt: $tracked"

section "3. Abhängigkeiten (npm audit, nur Produktion)"
if [ -f package.json ] && command -v npm >/dev/null; then
  npm audit --omit=dev --json 2>/dev/null | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("[?] npm audit lieferte keine auswertbare Antwort (Netzwerk?)"); sys.exit()
v = d.get("metadata", {}).get("vulnerabilities", {})
total = v.get("total", 0)
print(("[!] " if total else "[ok] ") + "Schwachstellen: " + ", ".join(f"{k} {v.get(k,0)}" for k in ("critical","high","moderate","low")))
for name, info in d.get("vulnerabilities", {}).items():
    fix = info.get("fixAvailable")
    fixs = ("Update verfügbar" + (" (große Version)" if isinstance(fix, dict) and fix.get("isSemVerMajor") else "")) if fix else "kein Fix"
    titles = [x.get("title") for x in info.get("via", []) if isinstance(x, dict)][:2]
    sev = info.get("severity")
    print(f"    - {name} ({sev}): {fixs}; " + " | ".join(t for t in titles if t))
'
  node -e 'try{const e=require("./package.json").engines;console.log("    Node-Anforderung laut package.json:", e&&e.node||"(keine)")}catch(x){}'
else
  echo "[?] Kein package.json oder npm nicht verfügbar"
fi

section "4. Externe Inhalte in Seiten, Skripten, Styles"
hosts=$(grep -r -h -o -E "https?://[a-zA-Z0-9.-]+" "$PUB" --include=*.html --include=*.js --include=*.css 2>/dev/null | sed -E 's#https?://##' | sort | uniq -c | sort -rn)
echo "$hosts" | sed 's/^/    /'
echo "    Hinweis: Hosts in <link>/<script>/<iframe>/url() werden beim Seitenaufruf geladen;"
echo "    reine Links (<a href>) nicht. Für Google Fonts/Maps/Analytics vor Zustimmung -> Datenschutz-Befund."
python3 - "$PUB" <<'INNER'
import re, sys, glob, os
for fn in sorted(glob.glob(os.path.join(sys.argv[1], "*.html"))):
    html = open(fn, encoding="utf-8").read()
    for m in re.finditer(r"<(link|script|iframe|img|source|video)\b([^>]*)>", html, re.S | re.I):
        tag, attrs = m.group(1).lower(), m.group(2)
        if tag == "link" and not re.search(r'rel="(stylesheet|preload|preconnect|icon)"', attrs):
            continue
        u = re.search(r'(?:src|href)="(https?://[^"]+)"', attrs)
        if not u:
            continue
        name = os.path.basename(fn)
        # Entscheidung des Auftraggebers (10/2026): Google-Karte auf der Kontaktseite ohne Klick
        if name == "kontakt.html" and tag == "iframe" and re.match(r"https://(www|maps)\.google\.com/maps", u.group(1)):
            ds = os.path.join(sys.argv[1], "datenschutz.html")
            listed = os.path.exists(ds) and "Google Maps" in open(ds, encoding="utf-8").read()
            print(f"[i] {name}: Google-Karte lädt beim Aufruf – bewusst so entschieden")
            print("[ok] Google Maps steht in der Datenschutzerklärung" if listed
                  else "[!] Google Maps fehlt in der Datenschutzerklärung (datenschutz.html) – ergänzen")
        else:
            print(f"[!] {name}: <{tag}> lädt beim Aufruf {u.group(1)[:90]}")
INNER

section "5. Inline-Code (relevant für Content-Security-Policy)"
n_inline=$(grep -c -E "<script>|<script [^s]*>" "$PUB"/*.html 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
n_handlers=$(grep -o -h -E ' on(click|load|error|submit|change|input|mouseover)=' "$PUB"/*.html 2>/dev/null | wc -l)
echo "    Inline-<script>-Blöcke: $n_inline | Inline-Ereignisse (onclick= …): $n_handlers"
[ "$n_inline" -gt 0 ] || [ "$n_handlers" -gt 0 ] && echo "[!] Inline-Code verhindert eine strenge CSP ohne 'unsafe-inline'"

section "6. Riskante Muster im eigenen JavaScript"
grep -n -E "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function\(" "$PUB"/assets/js/*.js 2>/dev/null | sed 's/^/[!] /' || true
grep -q -E "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function\(" "$PUB"/assets/js/*.js 2>/dev/null || echo "[ok] Kein innerHTML/eval/document.write"

section "7. Links"
nb=$(grep -o -h -E '<a [^>]*target="_blank"[^>]*>' "$PUB"/*.html 2>/dev/null | grep -v -c noopener)
[ "$nb" -gt 0 ] && echo "[!] $nb Links mit target=_blank ohne rel=noopener" || echo "[ok] Alle target=_blank-Links mit rel=noopener"
http=$(grep -o -h -E '(src|href|action)="http://[^"]+' "$PUB"/*.html 2>/dev/null | sort -u)
[ -n "$http" ] && { echo "[!] Unverschlüsselte http://-Verweise:"; echo "$http" | sed 's/^/    /'; } || echo "[ok] Keine http://-Verweise"

section "8. Webhosting-Konfiguration (.htaccess)"
if [ -f "$PUB/.htaccess" ]; then
  for pat in "Options -Indexes:Ordnerauflistung aus" "config:Schutz für config-Dateien" "Content-Security-Policy:CSP" "X-Frame-Options:Clickjacking-Schutz" "X-Content-Type-Options:nosniff" "Strict-Transport-Security:HSTS" "Referrer-Policy:Referrer-Policy"; do
    key="${pat%%:*}"; label="${pat#*:}"
    grep -q -- "$key" "$PUB/.htaccess" && echo "[ok] $label" || echo "[!] fehlt: $label ($key)"
  done
else
  echo "[?] Keine $PUB/.htaccess"
fi
echo
