<?php
/**
 * Stylowa Kebab — publiczne API strony (menu, wolne godziny, składanie zamówień, status).
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$a = $_GET['a'] ?? '';

switch ($a) {
    case 'ping':
        db();
        out(['ok' => true, 'backend' => 'php', 'now' => date('Y-m-d H:i')]);

    case 'menu':
        out(['ok' => true, 'categories' => menu(), 'options' => optionGroups(), 'settings' => publicSettings(),
            'days' => orderDays(), 'now' => date('Y-m-d H:i')]);

    case 'slots':
        $date = (string)($_GET['date'] ?? date('Y-m-d'));
        if (!validDate($date)) fail('Nieprawidłowa data.');
        $portions = max(0, (int)($_GET['portions'] ?? 1));
        $slots = array_map(fn($s) => [
            't' => $s['t'],
            'state' => $s['state'] === 'free' && !slotAccepts($s, $portions) ? 'full' : $s['state'],
            'left' => $s['left'],
        ], daySlots($date));
        out(['ok' => true, 'date' => $date, 'slots' => $slots, 'days' => orderDays()]);

    case 'order':
        requirePost();
        $o = createOrder(body(), false);
        out(['ok' => true, 'order' => publicOrder($o)]);

    case 'status':
        $token = (string)($_GET['token'] ?? '');
        if (!preg_match('/^[a-f0-9]{24}$/', $token)) fail('Nie znaleziono zamówienia.', 404);
        $q = db()->prepare('SELECT * FROM orders WHERE token = ?');
        $q->execute([$token]);
        $r = $q->fetch();
        if (!$r) fail('Nie znaleziono zamówienia.', 404);
        out(['ok' => true, 'order' => publicOrder(rowToOrder($r))]);

    default:
        fail('Nieznana akcja.', 404);
}

function publicOrder(array $o): array
{
    unset($o['id']);
    return $o;
}
