<?php
/**
 * Kontaktformular-Endpunkt für klassisches PHP-Webhosting (z. B. A1, World4You,
 * easyname, Plesk/cPanel-Pakete). Er macht exakt dasselbe wie der Node-Server
 * unter server/server.js, benötigt aber keinen Node.js-Hoster.
 *
 * Zugangsdaten kommen aus config.php (siehe config.example.php).
 * Diese Datei selbst muss NICHT bearbeitet werden.
 */

declare(strict_types=1);

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 200;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 900; // 15 Minuten

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => 'Methode nicht erlaubt.']);
}

$config = load_config();

if (!rate_limit_ok(client_ip())) {
    respond(429, ['error' => 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.']);
}

$input = read_input();

$name    = trim((string) ($input['name'] ?? ''));
$email   = trim((string) ($input['email'] ?? ''));
$phone   = trim((string) ($input['phone'] ?? ''));
$topic   = trim((string) ($input['topic'] ?? ''));
$message = trim((string) ($input['message'] ?? ''));
$privacy = !empty($input['privacy']) && $input['privacy'] !== 'false';
$honeypot = trim((string) ($input['website'] ?? ''));

// Spam-Falle: unsichtbares Feld, das nur Bots ausfüllen. Wir tun so, als wäre
// alles gut gelaufen, verschicken aber keine E-Mail.
if ($honeypot !== '') {
    respond(200, ['ok' => true]);
}

if ($name === '' || mb_strlen_safe($name) > MAX_NAME_LENGTH) {
    respond(400, ['error' => 'Bitte geben Sie Ihren Namen an.']);
}
if ($email === '' || mb_strlen_safe($email) > MAX_EMAIL_LENGTH || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['error' => 'Bitte geben Sie eine gültige E-Mail-Adresse an.']);
}
if (mb_strlen_safe($phone) > MAX_PHONE_LENGTH) {
    respond(400, ['error' => 'Die Telefonnummer ist zu lang.']);
}
if ($message === '' || mb_strlen_safe($message) > MAX_MESSAGE_LENGTH) {
    respond(400, ['error' => 'Bitte geben Sie eine Nachricht ein (max. 5000 Zeichen).']);
}
if (!$privacy) {
    respond(400, ['error' => 'Bitte bestätigen Sie die Datenschutzerklärung.']);
}

try {
    send_contact_mail($config, [
        'name'    => $name,
        'email'   => $email,
        'phone'   => $phone,
        'topic'   => $topic,
        'message' => $message,
    ]);
} catch (Throwable $e) {
    error_log('[contact] Versand fehlgeschlagen: ' . $e->getMessage());
    respond(502, ['error' => 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder rufen Sie uns an.']);
}

respond(200, ['ok' => true]);


/* ------------------------------------------------------------------ */
/* Hilfsfunktionen                                                     */
/* ------------------------------------------------------------------ */

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function load_config(): array
{
    $defaults = [
        'recipient'   => 'office@drweiser.at',
        'from'        => '', // leer -> unten aus smtp_user bzw. recipient abgeleitet
        'from_name'   => 'Website-Kontaktformular',
        'smtp_host'   => '',
        'smtp_port'   => 587,
        'smtp_secure' => 'tls', // 'tls' = STARTTLS (Port 587), 'ssl' = Port 465, '' = ohne Verschlüsselung
        'smtp_user'   => '',
        'smtp_pass'   => '',
    ];

    $file = __DIR__ . '/config.php';
    $custom = is_file($file) ? require $file : [];
    if (!is_array($custom)) {
        $custom = [];
    }

    $config = array_merge($defaults, array_filter($custom, static fn($v) => $v !== null));

    // drweiser.at ist mit DMARC "p=reject" und SPF "-all" geschützt. Als
    // Absender darf deshalb nur eine Adresse stehen, für die das SMTP-Postfach
    // auch wirklich senden darf – sonst weist der empfangende Server die Mail ab.
    if (trim((string) $config['from']) === '') {
        $config['from'] = $config['smtp_user'] !== '' ? $config['smtp_user'] : $config['recipient'];
    }

    return $config;
}

function read_input(): array
{
    $raw = file_get_contents('php://input');
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    // Fallback für ein klassisches Formular-POST ohne JavaScript.
    return is_array($_POST) ? $_POST : [];
}

function mb_strlen_safe(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/**
 * Einfache Drosselung: max. RATE_LIMIT_MAX Anfragen pro IP im Zeitfenster.
 * Bewusst dateibasiert, damit keine Datenbank nötig ist.
 */
function rate_limit_ok(string $ip): bool
{
    $dir = sys_get_temp_dir() . '/drweiser-contact';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true; // Drosselung nicht möglich -> Formular trotzdem nutzbar lassen
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return true;
    }

    $allowed = true;
    if (flock($handle, LOCK_EX)) {
        $contents = stream_get_contents($handle);
        $hits = json_decode((string) $contents, true);
        $hits = is_array($hits) ? $hits : [];

        $now = time();
        $hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - RATE_LIMIT_WINDOW));

        if (count($hits) >= RATE_LIMIT_MAX) {
            $allowed = false;
        } else {
            $hits[] = $now;
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($hits));
        fflush($handle);
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    return $allowed;
}

function strip_header_breaks(string $value): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $value));
}

function encode_header(string $value): string
{
    $value = strip_header_breaks($value);
    if ($value === '' || preg_match('/^[\x20-\x7E]*$/', $value)) {
        return $value;
    }
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
    }

    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function encode_address(string $name, string $address): string
{
    $address = strip_header_breaks($address);
    $name = strip_header_breaks($name);
    if ($name === '') {
        return $address;
    }

    $encoded = encode_header($name);
    if ($encoded !== $name) {
        // RFC-2047-kodierte Wörter dürfen nicht in Anführungszeichen stehen,
        // sonst zeigen Mailprogramme den Rohtext "=?UTF-8?B?…?=" an.
        return $encoded . ' <' . $address . '>';
    }

    return '"' . str_replace(['\\', '"'], '', $name) . '" <' . $address . '>';
}

function send_contact_mail(array $config, array $fields): void
{
    $subject = 'Neue Kontaktanfrage von der Website'
        . ($fields['topic'] !== '' ? ' – ' . $fields['topic'] : '');

    $textLines = array_filter([
        'Name: ' . $fields['name'],
        'E-Mail: ' . $fields['email'],
        $fields['phone'] !== '' ? 'Telefon: ' . $fields['phone'] : null,
        $fields['topic'] !== '' ? 'Rechtsgebiet: ' . $fields['topic'] : null,
        '',
        'Nachricht:',
        $fields['message'],
    ], static fn($line) => $line !== null);
    $text = implode("\r\n", $textLines);

    $esc = static fn(string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
    $html = '<p><strong>Name:</strong> ' . $esc($fields['name']) . '</p>'
        . '<p><strong>E-Mail:</strong> ' . $esc($fields['email']) . '</p>'
        . ($fields['phone'] !== '' ? '<p><strong>Telefon:</strong> ' . $esc($fields['phone']) . '</p>' : '')
        . ($fields['topic'] !== '' ? '<p><strong>Rechtsgebiet:</strong> ' . $esc($fields['topic']) . '</p>' : '')
        . '<p><strong>Nachricht:</strong><br>' . nl2br($esc($fields['message'])) . '</p>';

    $boundary = 'b' . bin2hex(random_bytes(12));
    $fromDomain = substr(strrchr($config['from'], '@') ?: '@localhost', 1);

    $headers = [
        'Date'         => date('r'),
        'From'         => encode_address((string) $config['from_name'], (string) $config['from']),
        'Reply-To'     => encode_address($fields['name'], $fields['email']),
        'Message-ID'   => '<' . bin2hex(random_bytes(16)) . '@' . $fromDomain . '>',
        'MIME-Version' => '1.0',
        'Content-Type' => 'multipart/alternative; boundary="' . $boundary . '"',
    ];

    $body = '--' . $boundary . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text)) . "\r\n"
        . '--' . $boundary . "\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html)) . "\r\n"
        . '--' . $boundary . "--\r\n";

    if ((string) $config['smtp_host'] !== '') {
        smtp_send($config, $subject, $headers, $body);

        return;
    }

    // Kein SMTP hinterlegt -> PHP-eigener Mailversand des Webservers.
    $headerLines = [];
    foreach ($headers as $key => $value) {
        $headerLines[] = $key . ': ' . $value;
    }

    $ok = mail(
        strip_header_breaks((string) $config['recipient']),
        encode_header($subject),
        $body,
        implode("\r\n", $headerLines),
        '-f' . strip_header_breaks((string) $config['from'])
    );

    if (!$ok) {
        throw new RuntimeException('mail() hat den Versand abgelehnt (kein SMTP konfiguriert).');
    }
}

/* ------------------------------------------------------------------ */
/* Minimaler SMTP-Client (STARTTLS / SMTPS, AUTH LOGIN bzw. PLAIN)     */
/* ------------------------------------------------------------------ */

function smtp_send(array $config, string $subject, array $headers, string $body): void
{
    $host = (string) $config['smtp_host'];
    $port = (int) $config['smtp_port'] ?: 587;
    $secure = strtolower((string) $config['smtp_secure']);
    $recipient = strip_header_breaks((string) $config['recipient']);
    $from = strip_header_breaks((string) $config['from']);

    $target = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $context = stream_context_create(['ssl' => ['SNI_enabled' => true, 'peer_name' => $host]]);

    $socket = @stream_socket_client($target, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $context);
    if ($socket === false) {
        throw new RuntimeException(sprintf('Verbindung zu %s fehlgeschlagen (%d %s)', $target, $errno, $errstr));
    }
    stream_set_timeout($socket, 20);

    try {
        smtp_expect($socket, 220);

        $ehloName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $capabilities = smtp_command($socket, 'EHLO ' . $ehloName, 250);

        if ($secure === 'tls') {
            smtp_command($socket, 'STARTTLS', 220);
            $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $crypto |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $crypto |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }
            if (!stream_socket_enable_crypto($socket, true, $crypto)) {
                throw new RuntimeException('TLS-Verschlüsselung (STARTTLS) fehlgeschlagen.');
            }
            $capabilities = smtp_command($socket, 'EHLO ' . $ehloName, 250);
        }

        $user = (string) $config['smtp_user'];
        $pass = (string) $config['smtp_pass'];
        if ($user !== '') {
            if (stripos($capabilities, 'AUTH') !== false && stripos($capabilities, 'LOGIN') !== false) {
                smtp_command($socket, 'AUTH LOGIN', 334, true);
                smtp_command($socket, base64_encode($user), 334, true);
                smtp_command($socket, base64_encode($pass), 235, true);
            } else {
                smtp_command($socket, 'AUTH PLAIN ' . base64_encode("\0" . $user . "\0" . $pass), 235, true);
            }
        }

        smtp_command($socket, 'MAIL FROM:<' . $from . '>', 250);
        smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
        smtp_command($socket, 'DATA', 354);

        $headers['To'] = $recipient;
        $headers['Subject'] = encode_header($subject);
        $headerLines = [];
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }

        $data = implode("\r\n", $headerLines) . "\r\n\r\n" . $body;
        // Punkt am Zeilenanfang verdoppeln, sonst endet die Nachricht vorzeitig.
        $data = preg_replace('/^\./m', '..', str_replace("\n", "\r\n", str_replace("\r\n", "\n", $data)));

        fwrite($socket, $data . "\r\n.\r\n");
        smtp_expect($socket, 250);

        @fwrite($socket, "QUIT\r\n");
    } finally {
        @fclose($socket);
    }
}

/**
 * @param int|int[] $expected
 * @param bool      $sensitive Bei true wird der Befehl nie protokolliert
 *                             (er enthält Benutzername bzw. Passwort).
 */
function smtp_command($socket, string $command, $expected, bool $sensitive = false): string
{
    if (fwrite($socket, $command . "\r\n") === false) {
        throw new RuntimeException('SMTP-Befehl konnte nicht gesendet werden.');
    }

    return smtp_expect($socket, $expected, $sensitive ? 'Anmeldung (AUTH)' : $command);
}

/**
 * @param int|int[] $expected
 */
function smtp_expect($socket, $expected, string $command = 'Verbindungsaufbau'): string
{
    $response = '';
    while (($line = fgets($socket, 1024)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }

    if ($response === '') {
        throw new RuntimeException('Keine Antwort vom SMTP-Server (' . $command . ').');
    }

    $code = (int) substr($response, 0, 3);
    $expectedCodes = is_array($expected) ? $expected : [$expected];
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException(sprintf('SMTP-Fehler bei "%s": %s', $command, trim($response)));
    }

    return $response;
}
