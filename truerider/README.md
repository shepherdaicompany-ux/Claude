# True Rider — nowy sklep (front)

Nowa odsłona sklepu [truerider.eu](https://truerider.eu/) zbudowana na pełnym katalogu z obecnego Shopera:
**537 produktów** (367 dostępnych od ręki), **145 kategorii**, warianty kolor/rozmiar ze stanami magazynowymi,
ceny, promocje z ceną Omnibus, opisy, tabele rozmiarów, zdjęcia i 25 stron informacyjnych.

Na tym etapie to sam sklep (front). CMS i CRM (panel zamówień, edycja produktów, płatności) dojdą w kolejnym etapie.

## Co działa

- **Strona główna**: intro z logotypem, hero z rotacją zdjęć i złotymi iskrami (nawiązanie do linii Diamond/Sparkle),
  pasek USP, indeks segmentów z obrazem podążającym za kursorem, nowości/polecane, przypięta pozioma galeria kolekcji
  (GSAP ScrollTrigger), Thermo, komplety „jeździec + koń”, personalizacja, technologie, opinie, aktualności, #trueriderteam.
- **Mega menu** z pełnym drzewem kategorii (Kobieta, Młodzież, Mężczyzna, Dla konia, Do stajni, Personalizacja) + menu mobilne.
- **Listingi kategorii**: opis kategorii, podkategorie, filtry (rozmiar, kolor, cena, tylko dostępne), sortowanie,
  gęstość siatki, „pokaż więcej”, szybkie dodawanie rozmiaru z karty, drugie zdjęcie na hover, odznaki (Nowość, −%, Ostatnie sztuki, Wyprzedane).
- **Karta produktu**: galeria z zoomem i lightboxem (swipe na telefonie), inne kolory tego samego modelu,
  wybór wariantu z dostępnością każdego rozmiaru („ostatnia sztuka”), cena Omnibus przy promocji, tabela rozmiarów w oknie,
  opis i sekcje (szczegóły, skład, kraj pochodzenia), film produktu, „powiadom o dostępności”, przyklejony pasek zakupu na telefonie,
  „uzupełnij stylizację” i ostatnio oglądane.
- **Wyszukiwarka** natychmiastowa (bez polskich znaków też działa), strona wyników.
- **Ulubione**, **koszyk** (szuflada z animacją „lotu” produktu), **zamówienie** z paskiem postępu w formie parkuru,
  walidacją, metodami dostawy i płatności jak w obecnym sklepie (DPD, InPost, odbiór w Mierzynie; BLIK, PayU, karta, PayPo, PayPal, przelew, pobranie),
  kodem rabatowym (`TRUERIDER5` z newslettera), potwierdzeniem zamówienia z rozetą.
- **Strony informacyjne**: O nas, FAQ (akordeon), kontakt, dostawa, zwroty, regulamin, polityki itd.
- Czyste adresy identyczne jak w obecnym sklepie (`/kobieta`, `/kategoria/legginsy`, `/legginsy-marta-rose-gold-diamond`, `/strona/faq`)
  — przenosiny nie zgubią pozycji w Google ani linków z Instagrama.

Zamówienia, ulubione i koszyk zapisują się na razie w przeglądarce klienta (`localStorage`). Przekazanie zamówień do CRM
i bramki płatności to zadanie kolejnego etapu.

## Struktura

```
truerider/
  public_html/            ← to wgrywamy na hosting
    index.html            ← szkielet: nagłówek, menu, koszyk, wyszukiwarka, stopka
    .htaccess             ← czyste adresy (wszystko → index.html), cache, kompresja
    assets/css/style.css  ← cały wygląd (tokeny kolorów i fontów na górze pliku)
    assets/js/core.js     ← dane, obrazy, koszyk/ulubione, router
    assets/js/ui.js       ← nagłówek, mega menu, wyszukiwarka, koszyk, karta produktu, animacje
    assets/js/views.js    ← strona główna, kategorie, produkt, strony info, 404
    assets/js/checkout.js ← zamówienie i potwierdzenie
    assets/js/main.js     ← start aplikacji
    assets/data/          ← katalog wygenerowany z Shopera (catalog.json, details/*.json, pages.json)
    assets/img/           ← zdjęcia sekcji redakcyjnych
  tools/                  ← skrypty: pobranie katalogu, budowa danych, podgląd, testy
```

## Uruchomienie lokalnie

```
python3 tools/serve.py 8080      # http://localhost:8080
```

## Wgranie na hosting

1. Wgraj **zawartość** folderu `public_html` do katalogu domeny (razem z ukrytym `.htaccess`).
2. Hosting musi mieć Apache z `mod_rewrite` (standard na cyber_Folks, home.pl, nazwa.pl).
3. Gdy domena ma SSL, odkomentuj w `.htaccess` dwie linie wymuszające HTTPS.

Zdjęcia produktów są teraz pobierane z serwera obrazów obecnego sklepu (`truerider.eu/environment/cache/images/…`).
Przy przeprowadzce zdjęcia trzeba przenieść na nowy serwer — skrypt `tools/fetch_images.py` już to umie,
a adres serwera obrazów zmienia się w jednym miejscu (`CDN` w `assets/js/core.js`).

## Odświeżenie katalogu z Shopera

```
mkdir work && cd work
# sitemapy: https://truerider.eu/console/integration/execute/name/GoogleSitemap → zapisz jako sm_p1.xml, sm_p2.xml, sm_c.xml, sm_col.xml, sm_i.xml oraz home.html (strona główna)
python3 ../tools/scrape_shoper.py . 3
python3 ../tools/parse_shoper.py .
python3 ../tools/build_data.py parsed ../public_html home.html
```

## Podgląd bez serwera (link do obejrzenia)

`tools/build_preview.py` składa wersję, która nie potrzebuje ani serwera obrazów Shopera, ani `.htaccess`:
zdjęcia są spakowane w pliki `assets/pack/*.bin`, a adresy działają przez `#/…`.

```
python3 tools/fetch_images.py public_html/assets/data work/imgs 6
python3 tools/fetch_rich_images.py public_html/assets/data work/imgs_rich
python3 tools/build_preview.py public_html work/imgs work/imgs_rich work/preview
```

## Testy

```
node tools/shot.js http://127.0.0.1:8080 out / /kategoria/legginsy /legginsy-marta-rose-gold-diamond   # zrzuty + błędy konsoli
node tools/flow.js http://127.0.0.1:8080 out    # menu → wyszukiwarka → filtry → produkt → koszyk → zamówienie
```
