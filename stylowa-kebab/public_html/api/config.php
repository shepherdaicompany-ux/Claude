<?php
/**
 * Stylowa Kebab — konfiguracja.
 *
 * Domyślne hasło do panelu (/panel). Po pierwszym logowaniu zmień je
 * w zakładce Ustawienia — nowe hasło zapisuje się w bazie i zastępuje to poniżej.
 */
const PANEL_DEFAULT_PASSWORD = 'stylowa2026';

/** Strefa czasowa lokalu. */
const APP_TIMEZONE = 'Europe/Warsaw';

/** Plik bazy danych SQLite (tworzy się sam przy pierwszym uruchomieniu). */
define('DB_FILE', dirname(__DIR__) . '/data/stylowa.sqlite');

/** Domyślne menu, którym baza jest wypełniana przy pierwszym uruchomieniu. */
define('MENU_SEED_FILE', dirname(__DIR__) . '/assets/data/menu.json');

/** Limit zamówień online z jednego adresu IP w ciągu 30 minut. */
const ORDER_RATE_LIMIT = 6;
