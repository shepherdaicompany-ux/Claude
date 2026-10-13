<?php
/**
 * Stylowa Kebab — API panelu (/panel). Wymaga zalogowania.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

session_name('STYLOWA_PANEL');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
]);
session_start();

$a = $_GET['a'] ?? '';

// ---------------------------------------------------------------- logowanie

if ($a === 'me') {
    out(['ok' => true, 'auth' => !empty($_SESSION['admin']), 'csrf' => csrf(), 'defaultPassword' => setting('admin_hash') === '']);
}

if ($a === 'login') {
    requirePost();
    $ip = clientIp();
    $pdo = db();
    $pdo->prepare('DELETE FROM login_attempts WHERE ts < ?')->execute([time() - 900]);
    $c = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ?');
    $c->execute([$ip]);
    if ((int)$c->fetchColumn() >= 8) fail('Za dużo prób logowania. Odczekaj 15 minut.', 429);

    $pass = (string)(body()['password'] ?? '');
    $hash = setting('admin_hash');
    $okPass = $hash !== '' ? password_verify($pass, $hash) : hash_equals(PANEL_DEFAULT_PASSWORD, $pass);
    if (!$okPass) {
        $pdo->prepare('INSERT INTO login_attempts (ip, ts) VALUES (?, ?)')->execute([$ip, time()]);
        usleep(400000);
        fail('Nieprawidłowe hasło.', 401);
    }
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'defaultPassword' => $hash === '']);
}

if (empty($_SESSION['admin'])) fail('Zaloguj się ponownie.', 401);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && !hash_equals(csrf(), (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) {
    fail('Sesja wygasła. Odśwież stronę.', 403);
}

function csrf(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}

// ---------------------------------------------------------------- akcje

$b = body();

switch ($a) {
    case 'logout':
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);

    case 'bootstrap':
        out(['ok' => true, 'categories' => menu(true), 'options' => optionGroups(), 'settings' => adminSettings(),
            'now' => date('Y-m-d H:i'), 'today' => date('Y-m-d')]);

    case 'orders':
        $where = [];
        $args = [];
        if (!empty($_GET['date'])) { $where[] = 'date = ?'; $args[] = $_GET['date']; }
        if (!empty($_GET['from'])) { $where[] = 'date >= ?'; $args[] = $_GET['from']; }
        if (!empty($_GET['to'])) { $where[] = 'date <= ?'; $args[] = $_GET['to']; }
        if (!empty($_GET['status'])) { $where[] = 'status = ?'; $args[] = $_GET['status']; }
        if (!empty($_GET['q'])) {
            $where[] = '(name LIKE ? OR phone LIKE ? OR CAST(id AS TEXT) = ?)';
            $q = '%' . $_GET['q'] . '%';
            array_push($args, $q, $q, ltrim((string)$_GET['q'], '#0'));
        }
        $sql = 'SELECT * FROM orders' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY date DESC, slot ASC, id ASC LIMIT 500';
        $st = db()->prepare($sql);
        $st->execute($args);
        out(['ok' => true, 'orders' => array_map('rowToOrder', $st->fetchAll())]);

    case 'poll':
        // Aktywne zamówienia (dziś i przyszłe, niezakończone) + najnowsze ID do powiadomień.
        $st = db()->prepare("SELECT * FROM orders WHERE (date >= ? AND status NOT IN ('wydane','anulowane')) OR (date = ?) ORDER BY date, slot, id");
        $today = date('Y-m-d');
        $st->execute([$today, $today]);
        $latest = (int)db()->query('SELECT COALESCE(MAX(id),0) FROM orders')->fetchColumn();
        out(['ok' => true, 'orders' => array_map('rowToOrder', $st->fetchAll()), 'latestId' => $latest,
            'ordering' => setting('ordering_enabled') === '1', 'now' => date('Y-m-d H:i'), 'today' => $today]);

    case 'slots':
        $date = (string)($_GET['date'] ?? date('Y-m-d'));
        if (!validDate($date)) fail('Nieprawidłowa data.');
        $days = [];
        for ($i = -1; $i <= 6; $i++) {
            $d = date('Y-m-d', strtotime("$date $i day"));
            $c = db()->prepare("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE date = ? AND status != 'anulowane'");
            $c->execute([$d]);
            $r = $c->fetch();
            $days[] = ['date' => $d, 'count' => (int)$r['n'], 'sum' => (int)$r['s'], 'open' => dayHours($d) !== null];
        }
        $bl = db()->prepare("SELECT 1 FROM blocks WHERE date = ? AND slot = '*'");
        $bl->execute([$date]);
        out(['ok' => true, 'date' => $date, 'hours' => dayHours($date), 'dayBlocked' => (bool)$bl->fetchColumn(),
            'slots' => daySlots($date, false), 'days' => $days]);

    case 'order_create':
        requirePost();
        out(['ok' => true, 'order' => createOrder($b, true)]);

    case 'order_update':
        requirePost();
        $id = (int)($b['id'] ?? 0);
        $o = getOrder($id) ?? fail('Nie ma takiego zamówienia.', 404);
        $fields = [];
        $args = [];
        if (isset($b['status'])) {
            if (!in_array($b['status'], STATUSES, true)) fail('Nieznany status.');
            $fields[] = 'status = ?'; $args[] = $b['status'];
        }
        if (isset($b['date'])) {
            if (!validDate((string)$b['date'])) fail('Nieprawidłowa data.');
            $fields[] = 'date = ?'; $args[] = $b['date'];
        }
        if (isset($b['slot'])) {
            if (!preg_match('/^\d{2}:\d{2}$/', (string)$b['slot'])) fail('Nieprawidłowa godzina.');
            $fields[] = 'slot = ?'; $args[] = $b['slot'];
        }
        foreach (['name' => 60, 'notes' => 400] as $f => $len) {
            if (isset($b[$f])) { $fields[] = "$f = ?"; $args[] = mb_substr(trim((string)$b[$f]), 0, $len); }
        }
        if (isset($b['phone'])) { $fields[] = 'phone = ?'; $args[] = cleanPhone((string)$b['phone']); }
        if (isset($b['payment']) && in_array($b['payment'], ['gotowka', 'karta'], true)) { $fields[] = 'payment = ?'; $args[] = $b['payment']; }
        if (!$fields) fail('Brak zmian.');
        $fields[] = 'updated_at = ?'; $args[] = date('Y-m-d H:i:s');
        $args[] = $id;
        db()->prepare('UPDATE orders SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($args);
        out(['ok' => true, 'order' => getOrder($id)]);

    case 'order_delete':
        requirePost();
        db()->prepare('DELETE FROM orders WHERE id = ?')->execute([(int)($b['id'] ?? 0)]);
        out(['ok' => true]);

    case 'block':
        requirePost();
        $date = (string)($b['date'] ?? '');
        $slot = (string)($b['slot'] ?? '');
        if (!validDate($date) || !($slot === '*' || preg_match('/^\d{2}:\d{2}$/', $slot))) fail('Nieprawidłowy slot.');
        if (!empty($b['on'])) db()->prepare('INSERT OR IGNORE INTO blocks (date, slot) VALUES (?, ?)')->execute([$date, $slot]);
        else db()->prepare('DELETE FROM blocks WHERE date = ? AND slot = ?')->execute([$date, $slot]);
        out(['ok' => true]);

    case 'item_save':
        requirePost();
        $it = (array)($b['item'] ?? []);
        $cat = (string)($it['cat'] ?? '');
        $chk = db()->prepare('SELECT 1 FROM categories WHERE id = ?');
        $chk->execute([$cat]);
        if (!$chk->fetchColumn()) fail('Nieznana kategoria.');
        $name = trim((string)($it['name'] ?? ''));
        if ($name === '') fail('Podaj nazwę pozycji.');
        $price = (int)round((float)str_replace(',', '.', (string)($it['price'] ?? 0)) * 100);
        if ($price < 0 || $price > 100000) fail('Nieprawidłowa cena.');
        $deposit = (int)round((float)str_replace(',', '.', (string)($it['deposit'] ?? 0)) * 100);
        $id = (string)($it['id'] ?? '');
        if ($id === '') {
            $id = $cat . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
            $sort = (int)db()->query('SELECT COALESCE(MAX(sort),0)+1 FROM items')->fetchColumn();
            db()->prepare('INSERT INTO items (id,cat,name,size,price,deposit,active,sort) VALUES (?,?,?,?,?,?,?,?)')
                ->execute([$id, $cat, $name, trim((string)($it['size'] ?? '')), $price, $deposit, empty($it['active']) ? 0 : 1, $sort]);
        } else {
            db()->prepare('UPDATE items SET cat=?, name=?, size=?, price=?, deposit=?, active=? WHERE id=?')
                ->execute([$cat, $name, trim((string)($it['size'] ?? '')), $price, $deposit, empty($it['active']) ? 0 : 1, $id]);
        }
        out(['ok' => true, 'categories' => menu(true)]);

    case 'item_delete':
        requirePost();
        db()->prepare('DELETE FROM items WHERE id = ?')->execute([(string)($b['id'] ?? '')]);
        out(['ok' => true, 'categories' => menu(true)]);

    case 'settings_save':
        requirePost();
        $s = (array)($b['settings'] ?? []);
        $ints = ['slot_minutes' => [5, 120], 'slot_capacity' => [1, 200], 'lead_minutes' => [0, 600], 'days_ahead' => [0, 14], 'packaging_fee' => [0, 10000]];
        foreach ($ints as $k => [$min, $max]) {
            if (isset($s[$k])) saveSetting($k, (string)max($min, min($max, (int)$s[$k])));
        }
        if (isset($s['ordering_enabled'])) saveSetting('ordering_enabled', $s['ordering_enabled'] ? '1' : '0');
        foreach (['option_groups' => 2000, 'notice' => 300, 'phone' => 30] as $k => $len) {
            if (isset($s[$k])) saveSetting($k, mb_substr(trim((string)$s[$k]), 0, $len));
        }
        if (isset($s['hours']) && is_array($s['hours'])) {
            $h = [];
            foreach (['0', '1', '2', '3', '4', '5', '6'] as $d) {
                $v = $s['hours'][$d] ?? null;
                $h[$d] = (is_array($v) && preg_match('/^\d{2}:\d{2}$/', (string)$v[0]) && preg_match('/^\d{2}:\d{2}$/', (string)$v[1])) ? [$v[0], $v[1]] : null;
            }
            saveSetting('hours', json_encode($h));
        }
        out(['ok' => true]);

    case 'password':
        requirePost();
        $cur = (string)($b['current'] ?? '');
        $next = (string)($b['next'] ?? '');
        $hash = setting('admin_hash');
        $okPass = $hash !== '' ? password_verify($cur, $hash) : hash_equals(PANEL_DEFAULT_PASSWORD, $cur);
        if (!$okPass) fail('Obecne hasło jest nieprawidłowe.');
        if (mb_strlen($next) < 8) fail('Nowe hasło musi mieć co najmniej 8 znaków.');
        saveSetting('admin_hash', password_hash($next, PASSWORD_DEFAULT));
        out(['ok' => true]);

    case 'stats':
        $from = (string)($_GET['from'] ?? date('Y-m-d', strtotime('-6 day')));
        $to = (string)($_GET['to'] ?? date('Y-m-d'));
        $st = db()->prepare("SELECT * FROM orders WHERE date BETWEEN ? AND ? AND status != 'anulowane'");
        $st->execute([$from, $to]);
        $byDay = [];
        $top = [];
        $count = 0;
        $sum = 0;
        $src = ['online' => 0, 'telefon' => 0, 'lokal' => 0];
        foreach ($st as $r) {
            $count++;
            $sum += (int)$r['total'];
            $byDay[$r['date']] = ($byDay[$r['date']] ?? 0) + (int)$r['total'];
            $src[$r['source']] = ($src[$r['source']] ?? 0) + 1;
            foreach (json_decode($r['items_json'], true) ?: [] as $l) $top[$l['name']] = ($top[$l['name']] ?? 0) + (int)$l['qty'];
        }
        arsort($top);
        out(['ok' => true, 'count' => $count, 'sum' => $sum, 'byDay' => $byDay, 'sources' => $src,
            'top' => array_slice(array_map(fn($k, $v) => ['name' => $k, 'qty' => $v], array_keys($top), $top), 0, 8)]);

    default:
        fail('Nieznana akcja.', 404);
}

function adminSettings(): array
{
    $s = settings();
    unset($s['admin_hash']);
    $s['hours'] = hoursMap();
    return $s;
}
