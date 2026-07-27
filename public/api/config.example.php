<?php
/**
 * VORLAGE für die Zugangsdaten des Kontaktformulars (PHP-Webhosting).
 *
 * So verwenden:
 *   1. Diese Datei zu  config.php  kopieren (im selben Ordner /api).
 *   2. Die Werte unten ausfüllen.
 *   3. config.php auf den Webspace hochladen – sie wird bewusst NICHT
 *      in Git eingecheckt, damit das Passwort nirgends öffentlich landet.
 */

return [
    // An diese Adresse gehen alle Kontaktanfragen.
    'recipient' => 'office@drweiser.at',

    // Absenderadresse. Muss zum SMTP-Postfach unten passen, sonst weist der
    // Mailserver die Nachricht ab (drweiser.at hat DMARC "p=reject").
    'from'      => 'office@drweiser.at',
    'from_name' => 'Website-Kontaktformular',

    // ---------------------------------------------------------------
    // SMTP-Zugangsdaten des E-Mail-Anbieters.
    // Bleibt smtp_host leer, versucht PHP den Versand über den Webserver
    // selbst (mail()). Das funktioniert oft, landet aber häufiger im Spam.
    // ---------------------------------------------------------------
    'smtp_host'   => '',      // z. B. 'smtp.office365.com' oder der Server Ihres Anbieters
    'smtp_port'   => 587,     // 587 = STARTTLS (Standard), 465 = SSL
    'smtp_secure' => 'tls',   // 'tls' bei Port 587, 'ssl' bei Port 465
    'smtp_user'   => '',      // meist die volle E-Mail-Adresse, z. B. 'office@drweiser.at'
    'smtp_pass'   => '',      // Postfach-Passwort bzw. App-Passwort
];
