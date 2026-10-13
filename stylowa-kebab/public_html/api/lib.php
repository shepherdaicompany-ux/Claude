<?php
/**
 * Stylowa Kebab — wspólna logika API (baza, menu, sloty czasowe, zamówienia).
 */
declare(strict_types=1);

require __DIR__ . '/config.php';

date_default_timezone_set(APP_TIMEZONE);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const STATUSES = ['nowe', 'przyjete', 'przygotowanie', 'gotowe', 'wydane', 'anulowane'];

const DEFAULT_SETTINGS = [
    'ordering_enabled' => '1',
    'slot_minutes'     => '15',
    'slot_capacity'    => '8',
    'lead_minutes'     => '20',
    'days_ahead'       => '2',
    'packaging_fee'    => '100',
    'hours'            => '{"1":["10:00","22:00"],"2":["10:00","22:00"],"3":["10:00","22:00"],"4":["10:00","22:00"],"5":["10:00","23:00"],"6":["10:00","23:00"],"0":["13:00","21:00"]}',
    'option_groups'    => '',
    'notice'           => '',
    'phone'            => '+48 698 563 103',
    'admin_hash'       => '',
];

// ---------------------------------------------------------------- odpowiedzi

function out(array $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): never
{
    out(['ok' => false, 'error' => $msg], $code);
}

function body(): array
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input') ?: '';
        $b = json_decode($raw, true);
        if (!is_array($b)) $b = [];
    }
    return $b;
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Wymagane żądanie POST.', 405);
}

function clientIp(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

set_exception_handler(function (Throwable $e) {
    error_log('[stylowa] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    out(['ok' => false, 'error' => 'Błąd serwera. Spróbuj ponownie za chwilę.'], 500);
});

// ---------------------------------------------------------------- baza

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!extension_loaded('pdo_sqlite')) fail('Serwer nie ma włączonego rozszerzenia pdo_sqlite.', 500);

    $dir = dirname(DB_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $fresh = !file_exists(DB_FILE);

    $pdo = new PDO('sqlite:' . DB_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    migrate($pdo);
    if ($fresh || !(int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn()) seedMenu($pdo);
    return $pdo;
}

function migrate(PDO $pdo): void
{
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, descr TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '',
  food INTEGER NOT NULL DEFAULT 0, opts INTEGER NOT NULL DEFAULT 0, adult INTEGER NOT NULL DEFAULT 0,
  extras INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, cat TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL, size TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL, deposit INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  date TEXT NOT NULL, slot TEXT NOT NULL,
  type TEXT NOT NULL, source TEXT NOT NULL, payment TEXT NOT NULL DEFAULT 'gotowka',
  name TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nowe', total INTEGER NOT NULL, portions INTEGER NOT NULL,
  items_json TEXT NOT NULL, ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_date ON orders(date, slot);
CREATE TABLE IF NOT EXISTS blocks (date TEXT NOT NULL, slot TEXT NOT NULL, PRIMARY KEY(date, slot));
CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
SQL);
}

function seedMenu(PDO $pdo): void
{
    $seed = json_decode((string)@file_get_contents(MENU_SEED_FILE), true);
    if (!is_array($seed)) return;
    $pdo->beginTransaction();
    $c = $pdo->prepare('INSERT OR REPLACE INTO categories (id,name,descr,icon,food,opts,adult,extras,sort) VALUES (?,?,?,?,?,?,?,?,?)');
    $i = $pdo->prepare('INSERT OR REPLACE INTO items (id,cat,name,size,price,deposit,active,sort) VALUES (?,?,?,?,?,?,1,?)');
    foreach ($seed['categories'] as $ci => $cat) {
        $c->execute([$cat['id'], $cat['name'], $cat['desc'] ?? '', $cat['icon'] ?? '', (int)!empty($cat['food']),
            (int)!empty($cat['opts']), (int)!empty($cat['adult']), (int)!empty($cat['extras']), $ci]);
        foreach ($cat['items'] as $ii => $it) {
            $i->execute([$it['id'], $cat['id'], $it['name'], $it['size'] ?? '', (int)round($it['price'] * 100),
                (int)round(($it['deposit'] ?? 0) * 100), $ii]);
        }
    }
    $pdo->prepare('INSERT OR IGNORE INTO settings (k,v) VALUES (?,?)')->execute(['option_groups', $seed['optionGroups'] ?? '']);
    $pdo->commit();
}

// ---------------------------------------------------------------- ustawienia

function settings(): array
{
    static $s = null;
    if ($s === null) {
        $s = DEFAULT_SETTINGS;
        foreach (db()->query('SELECT k, v FROM settings') as $r) $s[$r['k']] = $r['v'];
    }
    return $s;
}

function setting(string $k): string
{
    return settings()[$k] ?? '';
}

function saveSetting(string $k, string $v): void
{
    db()->prepare('INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]);
}

function hoursMap(): array
{
    $h = json_decode(setting('hours'), true);
    return is_array($h) ? $h : json_decode(DEFAULT_SETTINGS['hours'], true);
}

/** Grupy opcji, np. "Sos: łagodny, ostry" → [['name'=>'Sos','choices'=>['łagodny','ostry']]] */
function optionGroups(): array
{
    $groups = [];
    foreach (preg_split('/\R/', setting('option_groups')) as $line) {
        if (!str_contains($line, ':')) continue;
        [$name, $list] = array_map('trim', explode(':', $line, 2));
        $choices = array_values(array_filter(array_map('trim', explode(',', $list)), 'strlen'));
        if ($name !== '' && $choices) $groups[] = ['name' => $name, 'choices' => $choices];
    }
    return $groups;
}

function publicSettings(): array
{
    return [
        'ordering'     => setting('ordering_enabled') === '1',
        'hours'        => hoursMap(),
        'slotMinutes'  => (int)setting('slot_minutes'),
        'slotCapacity' => (int)setting('slot_capacity'),
        'leadMinutes'  => (int)setting('lead_minutes'),
        'daysAhead'    => (int)setting('days_ahead'),
        'packagingFee' => (int)setting('packaging_fee'),
        'notice'       => setting('notice'),
        'phone'        => setting('phone'),
    ];
}

// ---------------------------------------------------------------- menu

function menu(bool $withInactive = false): array
{
    $cats = [];
    foreach (db()->query('SELECT * FROM categories ORDER BY sort, name') as $c) {
        $cats[$c['id']] = [
            'id' => $c['id'], 'name' => $c['name'], 'desc' => $c['descr'], 'icon' => $c['icon'],
            'food' => (bool)$c['food'], 'opts' => (bool)$c['opts'], 'adult' => (bool)$c['adult'],
            'extras' => (bool)$c['extras'], 'items' => [],
        ];
    }
    $sql = 'SELECT * FROM items' . ($withInactive ? '' : ' WHERE active = 1') . ' ORDER BY sort, price';
    foreach (db()->query($sql) as $i) {
        if (!isset($cats[$i['cat']])) continue;
        $cats[$i['cat']]['items'][] = [
            'id' => $i['id'], 'name' => $i['name'], 'size' => $i['size'], 'price' => (int)$i['price'],
            'deposit' => (int)$i['deposit'], 'active' => (bool)$i['active'], 'sort' => (int)$i['sort'],
        ];
    }
    return array_values($cats);
}

// ---------------------------------------------------------------- sloty

function toMin(string $hhmm): int
{
    [$h, $m] = array_map('intval', explode(':', $hhmm));
    return $h * 60 + $m;
}

function fromMin(int $m): string
{
    return sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
}

function validDate(string $d): bool
{
    $dt = DateTime::createFromFormat('!Y-m-d', $d);
    return $dt && $dt->format('Y-m-d') === $d;
}

/** Godziny otwarcia danego dnia albo null, gdy zamknięte. */
function dayHours(string $date): ?array
{
    $w = (string)(int)date('w', strtotime($date));
    $h = hoursMap()[$w] ?? null;
    return (is_array($h) && count($h) === 2 && $h[0] && $h[1]) ? $h : null;
}

/**
 * Lista slotów dnia z obłożeniem.
 * $forPublic: uwzględnia czas przygotowania (lead) i wyłącza sloty z przeszłości.
 */
function daySlots(string $date, bool $forPublic = true): array
{
    $hours = dayHours($date);
    if (!$hours) return [];
    $step = max(5, (int)setting('slot_minutes'));
    $cap = max(1, (int)setting('slot_capacity'));
    $lead = $forPublic ? (int)setting('lead_minutes') : 0;

    $used = [];
    $orders = [];
    $q = db()->prepare("SELECT id, slot, portions FROM orders WHERE date = ? AND status != 'anulowane'");
    $q->execute([$date]);
    foreach ($q as $r) {
        $used[$r['slot']] = ($used[$r['slot']] ?? 0) + (int)$r['portions'];
        $orders[$r['slot']][] = (int)$r['id'];
    }
    $blocked = [];
    $b = db()->prepare('SELECT slot FROM blocks WHERE date = ?');
    $b->execute([$date]);
    foreach ($b as $r) $blocked[$r['slot']] = true;
    $dayBlocked = isset($blocked['*']);

    $nowMin = (date('Y-m-d') === $date) ? (int)date('G') * 60 + (int)date('i') : ($date < date('Y-m-d') ? 100000 : -1);
    $open = toMin($hours[0]);
    $close = toMin($hours[1]);
    if ($close <= $open) $close += 24 * 60;

    $slots = [];
    for ($m = $open; $m <= $close - $step; $m += $step) {
        $t = fromMin($m % (24 * 60));
        $u = $used[$t] ?? 0;
        $state = 'free';
        if ($dayBlocked || isset($blocked[$t])) $state = 'blocked';
        elseif ($m < $nowMin + $lead) $state = 'past';
        elseif ($u >= $cap) $state = 'full';
        $slots[] = ['t' => $t, 'state' => $state, 'used' => $u, 'cap' => $cap, 'left' => max(0, $cap - $u),
            'blocked' => isset($blocked[$t]), 'orders' => $orders[$t] ?? []];
    }
    return $slots;
}

function slotAccepts(array $slot, int $portions): bool
{
    if ($slot['state'] !== 'free') return false;
    return $slot['used'] === 0 || $slot['used'] + $portions <= $slot['cap'];
}

function orderDays(): array
{
    $days = [];
    $n = max(0, min(14, (int)setting('days_ahead')));
    for ($i = 0; $i <= $n; $i++) {
        $d = date('Y-m-d', strtotime("+$i day"));
        $days[] = ['date' => $d, 'open' => dayHours($d) !== null, 'hours' => dayHours($d)];
    }
    return $days;
}

// ---------------------------------------------------------------- zamówienia

/**
 * Waliduje koszyk wg cen z bazy. Zwraca [linie, suma, porcje].
 * Ceny z przeglądarki są ignorowane.
 */
function priceCart(array $cart, string $type): array
{
    if (!$cart) fail('Koszyk jest pusty.');
    if (count($cart) > 60) fail('Za dużo pozycji w zamówieniu.');

    $menu = menu(true);
    $items = [];
    $extras = [];
    foreach ($menu as $c) {
        foreach ($c['items'] as $i) {
            $items[$i['id']] = $i + ['cat' => $c];
            if ($c['extras']) $extras[$i['id']] = $i;
        }
    }
    $groups = [];
    foreach (optionGroups() as $g) $groups[$g['name']] = $g['choices'];
    $pack = (int)setting('packaging_fee');

    $lines = [];
    $total = 0;
    $portions = 0;
    foreach ($cart as $row) {
        $id = (string)($row['id'] ?? '');
        $qty = (int)($row['qty'] ?? 0);
        if (!isset($items[$id]) || $items[$id]['cat']['extras']) fail('Pozycja „' . $id . '” nie istnieje w menu.');
        $it = $items[$id];
        if (!$it['active']) fail('„' . $it['name'] . '” jest chwilowo niedostępne.');
        if ($qty < 1 || $qty > 30) fail('Nieprawidłowa ilość dla „' . $it['name'] . '”.');

        $unit = $it['price'];
        $opts = [];
        $ex = [];
        if ($it['cat']['opts']) {
            foreach ((array)($row['opts'] ?? []) as $g => $v) {
                if (isset($groups[$g]) && in_array($v, $groups[$g], true)) $opts[$g] = $v;
            }
            foreach (array_unique((array)($row['extras'] ?? [])) as $eid) {
                if (!isset($extras[$eid]) || !$extras[$eid]['active']) continue;
                $ex[] = ['id' => $eid, 'name' => $extras[$eid]['name'], 'price' => $extras[$eid]['price']];
                $unit += $extras[$eid]['price'];
            }
        }
        $line = $unit * $qty + $it['deposit'] * $qty;
        $isFood = $it['cat']['food'];
        if ($type === 'wynos' && $isFood) $line += $pack * $qty;
        if ($isFood) $portions += $qty;
        $total += $line;
        $lines[] = [
            'id' => $id, 'name' => $it['name'], 'qty' => $qty, 'unit' => $unit, 'deposit' => $it['deposit'],
            'packaging' => ($type === 'wynos' && $isFood) ? $pack : 0, 'opts' => $opts, 'extras' => $ex,
            'note' => mb_substr(trim((string)($row['note'] ?? '')), 0, 120), 'line' => $line, 'food' => $isFood,
        ];
    }
    return [$lines, $total, $portions];
}

function cleanPhone(string $p): string
{
    return preg_replace('/[^\d+]/', '', $p) ?? '';
}

/**
 * Tworzy zamówienie. $manual = zamówienie wpisane w panelu (telefon / na miejscu):
 * pomija czas przygotowania, włącznik zamówień online i pozwala przekroczyć limit slotu.
 */
function createOrder(array $in, bool $manual): array
{
    $name = trim((string)($in['name'] ?? ''));
    $phone = cleanPhone((string)($in['phone'] ?? ''));
    $type = ($in['type'] ?? '') === 'na_miejscu' ? 'na_miejscu' : 'wynos';
    $date = (string)($in['date'] ?? '');
    $slot = (string)($in['slot'] ?? '');
    $payment = in_array($in['payment'] ?? '', ['gotowka', 'karta'], true) ? $in['payment'] : 'gotowka';
    $notes = mb_substr(trim((string)($in['notes'] ?? '')), 0, 400);
    $source = $manual ? (in_array($in['source'] ?? '', ['telefon', 'lokal'], true) ? $in['source'] : 'telefon') : 'online';

    if (!$manual) {
        if (setting('ordering_enabled') !== '1') fail('Zamówienia online są chwilowo wstrzymane. Zadzwoń do nas: ' . setting('phone'));
        if (!empty($in['website'])) fail('Nie udało się złożyć zamówienia.');
        if (mb_strlen($name) < 2 || mb_strlen($name) > 60) fail('Podaj imię (2–60 znaków).');
        if (strlen(preg_replace('/\D/', '', $phone)) < 9) fail('Podaj poprawny numer telefonu.');
        $since = date('Y-m-d H:i:s', time() - 1800);
        $rl = db()->prepare("SELECT COUNT(*) FROM orders WHERE ip = ? AND created_at > ? AND source = 'online'");
        $rl->execute([clientIp(), $since]);
        if ((int)$rl->fetchColumn() >= ORDER_RATE_LIMIT) fail('Za dużo zamówień w krótkim czasie. Zadzwoń do nas: ' . setting('phone'), 429);
    } else {
        if ($name === '') $name = $source === 'lokal' ? 'Gość w lokalu' : 'Zamówienie telefoniczne';
        $name = mb_substr($name, 0, 60);
    }
    if (!validDate($date)) fail('Wybierz dzień odbioru.');
    if (!preg_match('/^\d{2}:\d{2}$/', $slot)) fail('Wybierz godzinę odbioru.');

    [$lines, $total, $portions] = priceCart((array)($in['items'] ?? []), $type);

    $pdo = db();
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        if (!$manual) {
            $allowed = array_column(orderDays(), 'date');
            if (!in_array($date, $allowed, true)) fail('Ten dzień nie jest dostępny do zamówień.');
        }
        $slots = daySlots($date, !$manual);
        $found = null;
        foreach ($slots as $s) if ($s['t'] === $slot) $found = $s;
        if (!$manual) {
            if (!$found) fail('W tym dniu lub o tej godzinie lokal jest zamknięty.');
            if ($found['state'] === 'past') fail('Na ' . $slot . ' nie zdążymy już przygotować zamówienia. Wybierz późniejszą godzinę.', 409);
            if ($found['state'] === 'blocked') fail('Godzina ' . $slot . ' jest niedostępna. Wybierz inną.', 409);
            if (!slotAccepts($found, $portions)) fail('Godzina ' . $slot . ' właśnie się zapełniła. Wybierz inną.', 409);
        }
        $now = date('Y-m-d H:i:s');
        $token = bin2hex(random_bytes(12));
        $status = $manual && in_array($in['status'] ?? '', STATUSES, true) ? $in['status'] : ($manual ? 'przyjete' : 'nowe');
        $pdo->prepare('INSERT INTO orders (token,created_at,updated_at,date,slot,type,source,payment,name,phone,notes,status,total,portions,items_json,ip)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
            $token, $now, $now, $date, $slot, $type, $source, $payment, $name, $phone, $notes, $status, $total, $portions,
            json_encode($lines, JSON_UNESCAPED_UNICODE), clientIp(),
        ]);
        $id = (int)$pdo->lastInsertId();
        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        $pdo->exec('ROLLBACK');
        throw $e;
    }
    return getOrder($id);
}

function rowToOrder(array $r): array
{
    return [
        'id' => (int)$r['id'], 'number' => orderNumber((int)$r['id']), 'token' => $r['token'],
        'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at'], 'date' => $r['date'], 'slot' => $r['slot'],
        'type' => $r['type'], 'source' => $r['source'], 'payment' => $r['payment'], 'name' => $r['name'],
        'phone' => $r['phone'], 'notes' => $r['notes'], 'status' => $r['status'], 'total' => (int)$r['total'],
        'portions' => (int)$r['portions'], 'items' => json_decode($r['items_json'], true) ?: [],
    ];
}

function orderNumber(int $id): string
{
    return '#' . str_pad((string)$id, 3, '0', STR_PAD_LEFT);
}

function getOrder(int $id): ?array
{
    $q = db()->prepare('SELECT * FROM orders WHERE id = ?');
    $q->execute([$id]);
    $r = $q->fetch();
    return $r ? rowToOrder($r) : null;
}
