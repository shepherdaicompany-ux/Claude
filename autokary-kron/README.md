# Autokary Kron — strona internetowa

Strona wynajmu autokaru Autokary Kron — KRON Marcin Wojdat Usługi Transportowe, Ząbki (tel. +48 505 434 624). Ciemny motyw czarno-złoty, animacje,
wersja na telefon. Działa na zwykłym hostingu: wystarczy wgrać pliki, bez bazy danych.

## Wgranie na hosting

1. Otwórz menedżer plików (albo FTP) i wejdź do katalogu `public_html` domeny.
2. Wgraj **zawartość** folderu `public_html` z paczki: pliki `.html`, `send.php`, `.htaccess`,
   `robots.txt`, `sitemap.xml` i folder `assets` (z podfolderem `fonts`). Plik `.htaccess` jest ukryty, więc sprawdź, czy też się wgrał.
3. Otwórz domenę w przeglądarce i sprawdź, czy strona się wyświetla.
4. Gdy domena ma certyfikat SSL, odkomentuj w `.htaccess` trzy linie wymuszające HTTPS.

## Podstrony

| Plik | Zawartość |
|---|---|
| `index.html` | Strona główna: oferta, autokar, kroki, certyfikaty, FAQ, formularz wyceny |
| `wyjazdy-integracyjne.html` | Wyjazdy integracyjne |
| `zielone-szkoly.html` | Zielone szkoły |
| `wyjazdy-kolonijne.html` | Wyjazdy kolonijne |
| `wyjazdy-letnie-zimowe.html` | Wyjazdy letnie i zimowe |
| `sluby-wesela-pogrzeby.html` | Śluby, wesela, pogrzeby |
| `integracje-firmowe.html` | Integracje firmowe |
| `autokar.html` | Nasz autokar: galeria, wyposażenie, dane techniczne |
| `certyfikaty.html` | Certyfikaty i uprawnienia |
| `kontakt.html` | Kontakt i formularz wyceny |
| `regulamin.html` | Regulamin serwisu |
| `warunki-przewozu.html` | Ogólne warunki przewozu |
| `polityka-prywatnosci.html` | Polityka prywatności (RODO) |
| `404.html` | Strona błędu |

## Zdjęcia: wystarczy wgrać plik o właściwej nazwie

Każde miejsce na zdjęcie pokazuje swoją nazwę pliku (np. `autokar-1.jpg`). Gdy wgrasz zdjęcie
o tej nazwie do odpowiedniego folderu, pojawi się ono samo, bez edycji HTML. Dopóki pliku nie ma,
widać elegancki placeholder.

- Zdjęcia: `assets/img/zdjecia/`
- Certyfikaty (skany): `assets/img/certyfikaty/`

Najważniejsze pliki:

| Plik | Gdzie | Sugerowany rozmiar |
|---|---|---|
| `hero.jpg` | tło na stronie głównej | 1920×1080 |
| `o-nas.jpg` | sekcja „Dlaczego Autokary Kron” | 1200×1400 |
| `autokar-1.jpg` … `autokar-6.jpg` | galeria autokaru | 1600×1000 |
| `autokar-naglowek.jpg`, `certyfikaty-naglowek.jpg`, `kontakt-naglowek.jpg` | tła nagłówków podstron | 1920×800 |
| `<usługa>.jpg` (np. `zielone-szkoly.jpg`) | karta usługi i zdjęcie na podstronie | 1200×1400 |
| `<usługa>-naglowek.jpg` | tło nagłówka podstrony usługi | 1920×800 |
| `integracja-1.jpg`, `szkola-1.jpg`, `kolonie-1.jpg`, `lato-1.jpg`, `zima-1.jpg`, `wesele-1.jpg`, `firma-1.jpg` … | galerie na podstronach usług | 1600×1000 |
| `mapa.jpg` | strona kontaktu | 1600×900 |
| `licencja.jpg`, `certyfikat-kompetencji.jpg`, `kwalifikacja-kierowcy.jpg`, `badanie-techniczne.jpg`, `ubezpieczenie.jpg`, `ceidg.jpg` | certyfikaty | pionowo, ok. 1200×1600 |

Nazwy plików pisz małymi literami, bez polskich znaków, z rozszerzeniem `.jpg`.
Zdjęcia przed wgraniem warto zmniejszyć (np. na squoosh.app) do ok. 200–400 KB.

## Dane firmy i kontakt

- Firma: **KRON Marcin Wojdat Usługi Transportowe**, ul. Orla 4/7, 05-091 Ząbki, NIP 7162504734, REGON 545940824
- Telefon: **+48 505 434 624** (całą dobę), e-mail: **kron@onet.pl**
- Dane są w `tools/build.py` (`SITE`, `COMPANY`) — po zmianie uruchom ponownie `python3 tools/build.py`.

## Dokumenty prawne

- `polityka-prywatnosci.html` — obowiązek informacyjny RODO (art. 13 i 14), bez cookies.
- `regulamin.html` — regulamin świadczenia usług drogą elektroniczną (art. 8 ustawy o świadczeniu usług drogą elektroniczną).
- `warunki-przewozu.html` — ogólne warunki przewozu osób (zamówienie, cena, rezygnacja, bagaż, reklamacje).

Strona nie używa plików cookies ani narzędzi analitycznych, a czcionki są na serwerze strony
(`assets/fonts`), więc nie potrzeba banera cookies. Jeśli dodasz Google Analytics, Pixel Facebooka
albo mapę Google, trzeba będzie dodać baner zgody i zaktualizować politykę prywatności.

## Do potwierdzenia z klientem

- **Rezygnacja z przejazdu**: w warunkach przewozu wpisane jest „bez kosztów do 7 dni przed terminem”.
- **Wyposażenie autokaru** (klimatyzacja, DVD, USB, barek…).
- **Ubezpieczenie NNW pasażerów**: strona „Nasz autokar” i certyfikaty wspominają OC i NNW; jeśli NNW nie ma, usuń je w `tools/build.py`.
- **Dane techniczne autokaru** (marka, liczba miejsc, rok): na stronie `autokar.html` jest „do uzupełnienia”.
- **Certyfikaty**: etykieta „Wkrótce” znika sama, gdy wgrasz skan dokumentu o właściwej nazwie.

## Formularz wyceny

Formularz wysyła e-mail przez `send.php` (funkcja `mail()` hostingu). Ma ochronę przed botami
(ukryte pole i minimalny czas wypełnienia). Jeśli wiadomości nie dochodzą, sprawdź folder SPAM
i to, czy adres nadawcy `formularz@twojadomena.pl` jest dozwolony na hostingu.
Zapytania trafiają na `kron@onet.pl` (zmiana w `send.php`, zmienna `$TO`). Poczta Onet bywa
restrykcyjna — po wgraniu wyślij testowe zapytanie i dodaj nadawcę do zaufanych.

## Zmiany treści

Strony są generowane skryptem `tools/build.py`: tam są teksty usług, FAQ, wyposażenie,
certyfikaty i dane kontaktowe. Po zmianie uruchom:

```
python3 tools/build.py
```

Logo (`assets/img/logo.svg` / `logo.png`) i favicon generuje `tools/logo.py`
(wymaga `pip install fonttools skia-pathops`). Oryginalne logo klienta jest w `tools/logo-oryginal.jpg`.
