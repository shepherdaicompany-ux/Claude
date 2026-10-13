# Stylowa Kebab — strona + system zamówień + panel

Strona lokalu Stylowa Kebab (Poczdamska 3F, Głogów) z zamawianiem online na wybraną godzinę
i panelem do obsługi zamówień pod adresem `/panel` (również `/crm` i `/admin`).

## Wgranie na hosting (cyber_Folks)

1. Wejdź do menedżera plików (albo FTP) i otwórz katalog `public_html` swojej domeny.
2. Wgraj **zawartość** folderu `public_html` z tej paczki (pliki `index.html`, `.htaccess` oraz foldery
   `api`, `assets`, `data`, `panel`). Pliki `.htaccess` są ukryte — upewnij się, że też się wgrały.
3. W panelu DirectAdmin ustaw PHP **8.1 lub nowsze** (Zarządzanie PHP → wersja). Rozszerzenie `pdo_sqlite`
   jest na cyber_Folks domyślnie włączone.
4. Otwórz `https://twojadomena.pl` — strona działa. Baza zamówień (`data/stylowa.sqlite`) utworzy się sama
   przy pierwszym wejściu. Folder `data` musi mieć prawa zapisu (domyślne 755 wystarcza).
5. Otwórz `https://twojadomena.pl/panel`, zaloguj się hasłem **`stylowa2026`** i od razu zmień je
   w zakładce **Ustawienia → Hasło do panelu**.
6. Gdy domena ma certyfikat SSL, odkomentuj w `public_html/.htaccess` dwie linie wymuszające HTTPS.

Nie trzeba zakładać bazy MySQL ani niczego konfigurować — wszystko działa po wgraniu plików.

## Jak działa system zamówień

- Klient wybiera dania (rozmiar, mięso, sos, dodatki), sposób odbioru, **dzień i godzinę**.
- Doba jest podzielona na sloty (domyślnie co 15 minut, w godzinach otwarcia). Każdy slot ma
  **pojemność w porcjach** (domyślnie 8 dań, napoje się nie liczą). Zapełniony slot znika z wyboru.
- Klient nie wybierze godziny bliższej niż **czas przygotowania** (domyślnie 20 min).
- Ceny liczy serwer na podstawie menu z bazy — nie da się ich podmienić w przeglądarce.
- Po złożeniu zamówienia klient widzi numer i **status na żywo** (Wysłane → Przyjęte → W przygotowaniu → Gotowe).

## Panel (`/panel`)

- **Na żywo** — tablica zamówień (Nowe / Przyjęte / W przygotowaniu / Gotowe), jedno kliknięcie przesuwa
  zamówienie dalej. Nowe zamówienia online pojawiają się same (odświeżanie co 8 s) z dźwiękiem
  — włącz go ikoną dzwonka.
- **Kalendarz** — oś dnia ze slotami i obłożeniem kuchni. Przycisk `+` dodaje zamówienie na daną godzinę,
  kłódka blokuje slot dla zamówień online, można też zablokować cały dzień.
- **Nowe** — szybkie wpisanie zamówienia telefonicznego lub z kasy. Zajmuje slot w kalendarzu tak samo jak
  zamówienie online (w panelu można przekroczyć pojemność — pokaże ostrzeżenie).
- **Historia** — wyszukiwanie po dacie, statusie, imieniu, telefonie i numerze + statystyki utargu.
- **Menu** — zmiana cen, nazw, dostępności, dodawanie i usuwanie pozycji.
- **Ustawienia** — godziny otwarcia, długość i pojemność slotu, czas przygotowania, opłata za opakowanie,
  opcje dań (mięso/sos), komunikat na stronie, hasło. Włącznik **Online** u góry wstrzymuje zamówienia przez stronę.
- W szczegółach zamówienia: zmiana statusu, przesunięcie terminu, edycja danych, druk bonu, usunięcie.

## Do sprawdzenia z właścicielem

- Opcje „Mięso: kurczak, wołowina, mieszane” i „Sos: łagodny, czosnkowy, ostry, mieszany” są przykładowe —
  popraw je w Ustawieniach na to, co lokal faktycznie podaje.
- Opisy dań zostały napisane na potrzeby strony; menu i ceny są 1:1 z karty lokalu.
- Zdjęcia lokalu pochodzą z ich Instagrama (@stylowa.kebab). Zdjęcia dań warto dodać, gdy będą gotowe.

## Pliki

```
public_html/
├── index.html            strona
├── .htaccess             zabezpieczenia, przekierowanie /crm → /panel
├── assets/               style, skrypty, zdjęcia, menu startowe (data/menu.json)
├── api/                  backend PHP (public.php — strona, admin.php — panel)
│   └── config.php        domyślne hasło, strefa czasowa, limity
├── data/                 baza SQLite (tworzy się sama, zablokowana z zewnątrz)
└── panel/                panel obsługi zamówień
```

Kopia zapasowa: wystarczy pobrać plik `public_html/data/stylowa.sqlite`.
Reset do menu startowego: usuń ten plik (skasuje też zamówienia).

Bez PHP (np. po otwarciu plików lokalnie) strona i panel przechodzą w **tryb podglądu** — zamówienia
zapisują się wtedy tylko w przeglądarce. Na hostingu z PHP tryb podglądu się nie włącza.
