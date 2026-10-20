<?php
/**
 * Autokary Kron — wysyłka formularza wyceny na e-mail.
 * Zapytania trafiają na skrzynkę firmy podaną w $TO.
 */
$TO   = 'kron@onet.pl';
$FROM = 'formularz@' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'autokarykron.pl');

header('Content-Type: application/json; charset=utf-8');

function out($ok, $error = '') {
    if (!$ok) http_response_code(400);
    echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(false, 'Nieprawidłowe żądanie.');

// ochrona przed botami: ukryte pole + minimalny czas wypełnienia (3 s)
if (!empty($_POST['website'])) out(true);
$t = (int)($_POST['t'] ?? 0);
if ($t > 0 && (microtime(true) * 1000 - $t) < 3000) out(false, 'Zbyt szybko — spróbuj ponownie.');

$clean = function ($key, $max = 200) {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
};

$name    = $clean('name', 120);
$phone   = $clean('phone', 40);
$email   = $clean('email', 160);
$service = $clean('service', 80);
$date    = $clean('date', 20);
$people  = $clean('people', 10);
$route   = $clean('route', 300);
$message = $clean('message', 3000);

if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 9) out(false, 'Podaj imię i poprawny numer telefonu.');
if (empty($_POST['consent'])) out(false, 'Potwierdź zapoznanie się z Regulaminem i Polityką prywatności.');
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';

$body  = "Nowe zapytanie ze strony autokarykron.pl\n\n";
$body .= "Imię i nazwisko: $name\n";
$body .= "Telefon: $phone\n";
$body .= "E-mail: " . ($email ?: '—') . "\n";
$body .= "Rodzaj przejazdu: " . ($service ?: '—') . "\n";
$body .= "Data wyjazdu: " . ($date ?: '—') . "\n";
$body .= "Liczba osób: " . ($people ?: '—') . "\n";
$body .= "Trasa: " . ($route ?: '—') . "\n\n";
$body .= "Wiadomość:\n" . ($message ?: '—') . "\n\n";
$body .= "---\nWysłano: " . date('Y-m-d H:i') . " | IP: " . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";

$subject = '=?UTF-8?B?' . base64_encode("Zapytanie o wycenę: $service — $name") . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: Autokary Kron <' . $FROM . '>',
];
if ($email) $headers[] = 'Reply-To: ' . $email;

$sent = @mail($TO, $subject, $body, implode("\r\n", $headers), '-f' . $FROM);
$sent ? out(true) : out(false, 'Serwer nie wysłał wiadomości.');
