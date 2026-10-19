# Autokary Kron — strona internetowa

Strona wynajmu autokaru Autokary Kron (tel. 505 434 624). Ciemny motyw czarno-złoty, animacje,
wersja na telefon. Działa na zwykłym hostingu: wystarczy wgrać pliki, bez bazy danych.

## Wgranie na hosting

1. Otwórz menedżer plików (albo FTP) i wejdź do katalogu `public_html` domeny.
2. Wgraj **zawartość** folderu `public_html` z paczki: pliki `.html`, `send.php`, `.htaccess`,
   `robots.txt`, `sitemap.xml` i folder `assets`. Plik `.htaccess` jest ukryty, więc sprawdź, czy też się wgrał.
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
| `licencja.jpg`, `certyfikat-kompetencji.jpg`, `kwalifikacja-kierowcy.jpg`, `badanie-techniczne.jpg`, `ubezpieczenie.jpg`, `certyfikat-6.jpg` | certyfikaty | pionowo, ok. 1200×1600 |

Nazwy plików pisz małymi literami, bez polskich znaków, z rozszerzeniem `.jpg`.
Zdjęcia przed wgraniem warto zmniejszyć (np. na squoosh.app) do ok. 200–400 KB.

## Do uzupełnienia przed publikacją

- **E-mail**: wszędzie jest `kontakt@autokarykron.pl`. Załóż taką skrzynkę albo zmień adres
  w `tools/build.py` (`SITE`) i w `send.php` (`$TO`).
- **Godziny kontaktu** (`Pon–Ndz, 7:00–21:00`): przykładowe, do potwierdzenia z klientem.
- **Dane techniczne autokaru** (marka, liczba miejsc, rok): na stronie `autokar.html` jest „do uzupełnienia”.
- **Wyposażenie autokaru** (klimatyzacja, DVD, USB, barek…): do sprawdzenia z klientem.
- **Polityka prywatności**: pełna nazwa firmy, adres i NIP.
- **Certyfikaty**: po wgraniu skanów usuń etykietę „Wkrótce” (w `tools/build.py`) albo zostaw ją do czasu otrzymania dokumentów.

## Formularz wyceny

Formularz wysyła e-mail przez `send.php` (funkcja `mail()` hostingu). Ma ochronę przed botami
(ukryte pole i minimalny czas wypełnienia). Jeśli wiadomości nie dochodzą, sprawdź folder SPAM
i to, czy adres nadawcy `formularz@twojadomena.pl` jest dozwolony na hostingu.

## Zmiany treści

Strony są generowane skryptem `tools/build.py`: tam są teksty usług, FAQ, wyposażenie,
certyfikaty i dane kontaktowe. Po zmianie uruchom:

```
python3 tools/build.py
```

Logo (`assets/img/logo.svg` / `logo.png`) i favicon generuje `tools/logo.py`
(wymaga `pip install fonttools skia-pathops`). Oryginalne logo klienta jest w `tools/logo-oryginal.jpg`.
