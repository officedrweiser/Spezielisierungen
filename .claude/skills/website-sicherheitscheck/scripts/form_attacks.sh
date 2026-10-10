#!/usr/bin/env bash
# Greift das Kontaktformular eines LOKALEN Testservers an (testenv.sh) und prüft die Antworten.
# Aufruf: bash form_attacks.sh http://127.0.0.1:8088/api/contact
#         bash form_attacks.sh http://127.0.0.1:8088/api/contact spambremse
#           (zählt nur, ab welcher Anfrage gesperrt wird – vorher Testumgebung neu starten,
#            damit der Zähler bei null beginnt)
# Danach: python3 -I inspect_mails.py <arbeitsordner>/mails.txt  (prüft die echten Kopfzeilen)
set -u
URL="${1:-}"; MODE="${2:-angriffe}"
case "$URL" in http://localhost*|http://127.*) ;; *) echo "Nur gegen lokale Testserver (localhost/127.x) – nie gegen das Live-Formular."; exit 2;; esac
ORIGIN="$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')"
TMP=$(mktemp); trap 'rm -f "$TMP" "$TMP.json"' EXIT
pass=0; fail=0
check() {  # Beschreibung, erwartete Codes (|-getrennt), curl-Argumente…
  local desc="$1" expect="$2"; shift 2
  local code; code=$(curl -s -o "$TMP" -w '%{http_code}' --max-time 15 "$@")
  if printf '%s' "$code" | grep -q -E "^($expect)$"; then pass=$((pass+1)); r="ok"; else fail=$((fail+1)); r="ABWEICHUNG"; fi
  printf '  [%s] %-58s -> %s %s\n' "$r" "$desc" "$code" "$(head -c 70 "$TMP" | tr '\n' ' ')"
}
J=(-H 'Content-Type: application/json' -H "Origin: $ORIGIN")

if [ "$MODE" = "spambremse" ]; then
  echo "== Spam-Bremse: ab welcher Anfrage wird gesperrt? (max. 60)"
  for i in $(seq 1 60); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" "${J[@]}" -d '{"name":"A","email":"a@b.at","message":"x","privacy":true}')
    if [ "$code" = "429" ]; then echo "  $((i-1)) Anfragen durchgelassen, Anfrage $i gesperrt (429)"; exit 0; fi
  done
  echo "  [!] Nach 60 Anfragen keine Sperre"; exit 1
fi

echo "== Gültige Anfrage"
check "Normale Anfrage" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Max Muster","email":"max@example.com","topic":"Erbrecht","message":"Testnachricht","privacy":true}'
echo "== Kopfzeilen-Einschleusung (Antwort 200 ok – entscheidend ist inspect_mails.py)"
check "Zeilenumbruch + Bcc im Namen" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Max\r\nBcc: opfer@example.com","email":"max@example.com","message":"Hallo","privacy":true}'
check "Zeilenumbruch + Bcc im Rechtsgebiet" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"max@example.com","topic":"Erbrecht\r\nBcc: opfer@example.com","message":"Hallo","privacy":true}'
check "Zeilenumbruch + Bcc in der E-Mail-Adresse" "400" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"max@example.com\r\nBcc: x@example.com","message":"Hallo","privacy":true}'
check "Adress-Trick im Namen (\"<evil@…>,\")" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Max \"<evil@example.com>, ","email":"max@example.com","message":"Hallo","privacy":true}'
check "Schadcode + SMTP-Punkt-Trick in Nachricht" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"max@example.com","message":"<script>alert(1)</script><img src=x onerror=alert(1)>\n.\nRCPT TO:<x@evil.example>","privacy":true}'
echo "== Pflichtfelder / Prüfungen"
check "Ungültige E-Mail" "400" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"keine-adresse","message":"x","privacy":true}'
check "Datenschutz nicht bestätigt" "400" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"max@example.com","message":"x","privacy":false}'
check "Leere Nachricht" "400" -X POST "$URL" "${J[@]}" -d '{"name":"Max","email":"max@example.com","message":"","privacy":true}'
check "Nachricht über 5000 Zeichen" "400|413" -X POST "$URL" "${J[@]}" -d "{\"name\":\"Max\",\"email\":\"max@example.com\",\"message\":\"$(head -c 6000 /dev/zero | tr '\0' 'x')\",\"privacy\":true}"
python3 -c "import json;print(json.dumps({'name':'A','email':'a@b.at','message':'x','topic':'T'*50000,'privacy':True}))" > "$TMP.json"
check "Übergroße Anfrage (50 KB)" "413" -X POST "$URL" "${J[@]}" --data-binary @"$TMP.json"
check "Honeypot-Feld ausgefüllt (Bot) – still verworfen" "200" -X POST "$URL" "${J[@]}" -d '{"name":"Bot","email":"bot@example.com","message":"spam","privacy":true,"website":"http://spam.example"}'
echo "== Anfragen von fremden Websites (CSRF)"
check "JSON von fremder Website" "403" -X POST "$URL" -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{"name":"A","email":"a@b.at","message":"x","privacy":true}'
check "Klassisches Formular von fremder Website" "403" -X POST "$URL" -H 'Origin: https://evil.example' --data 'name=A&email=a@b.at&message=x&privacy=1'
check "Origin 'null' (Sandbox/Datei)" "403" -X POST "$URL" -H 'Content-Type: application/json' -H 'Origin: null' -d '{"name":"A","email":"a@b.at","message":"x","privacy":true}'
echo "== Methode"
check "GET auf den Formular-Endpunkt" "404|405" "$URL"
echo
echo "Ergebnis: $pass wie erwartet, $fail Abweichungen"
echo "Spam-Bremse separat prüfen: Testumgebung neu starten, dann mit Zusatz \"spambremse\" aufrufen."
