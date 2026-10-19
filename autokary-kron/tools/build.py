"""Buduje strony HTML Autokary Kron do folderu public_html.

Uruchom: python3 tools/build.py
Treści (usługi, FAQ, dane kontaktowe) zmieniasz w tym pliku, a potem budujesz ponownie.
"""
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public_html"

SITE = {
    "name": "Autokary Kron",
    "phone": "505 434 624",
    "tel": "+48505434624",
    "email": "kontakt@autokarykron.pl",
    "domain": "https://autokarykron.pl",
    "area": "Cała Polska",
    "hours": "Pon–Ndz, 7:00–21:00",
}

# ---------------------------------------------------------------- ikony (styl liniowy 24×24)
ICONS = {
    "phone": '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    "pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "star": '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    "school": '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
    "tent": '<path d="M3.5 21 14 3M20.5 21 10 3M15.5 21 12 15l-3.5 6M2 21h20"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    "snow": '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    "rings": '<circle cx="9" cy="14" r="6"/><circle cx="15" cy="14" r="6"/><path d="m9 4 1.5-2h3L15 4l-3 3z"/>',
    "briefcase": '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    "route": '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    "seat": '<path d="M7 18V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7h4a2 2 0 0 1 2 2v4"/><path d="M5 18h16M7 18v3M19 18v3"/>',
    "fan": '<path d="M12 12c-3-3-3-8 0-9 3 1 3 6 0 9zM12 12c3 3 8 3 9 0-1-3-6-3-9 0zM12 12c3 3 3 8 0 9-3-1-3-6 0-9zM12 12c-3-3-8-3-9 0 1 3 6 3 9 0z"/>',
    "usb": '<rect x="7" y="2" width="10" height="8" rx="1"/><path d="M10 6h.01M14 6h.01M5 10h14v4a7 7 0 0 1-14 0zM12 21v1"/>',
    "tv": '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="m17 2-5 5-5-5"/>',
    "cup": '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    "bag": '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M8 21v1M16 21v1M9 11v6M15 11v6"/>',
    "belt": '<path d="M5 3l14 18M19 3 9.5 15.5"/><rect x="7" y="13" width="6" height="5" rx="1" transform="rotate(-38 10 15.5)"/>',
    "mic": '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0M12 17v5M8 22h8"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    "award": '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
    "doc": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "bus": '<path d="M8 6v6M16 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
    "flower": '<circle cx="12" cy="12" r="3"/><path d="M12 9a3 3 0 1 1 3-3M15 12a3 3 0 1 1 3 3M12 15a3 3 0 1 1-3 3M9 12a3 3 0 1 1-3-3M12 15v7"/>',
    "heart": '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    "map": '<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    "receipt": '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    "mountain": '<path d="m8 3 4 8 5-5 5 15H2z"/>',
    "wave": '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    "chat": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "close": '<path d="M18 6 6 18M6 6l12 12"/>',
    "chev": '<path d="m6 9 6 6 6-6"/>',
    "up": '<path d="m18 15-6-6-6 6"/>',
    "facebook": '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
}


def sprite():
    syms = "".join(
        f'<symbol id="i-{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONS.items()
    )
    return f'<svg class="sprite" aria-hidden="true" style="display:none">{syms}</svg>'


def ic(name, cls="i"):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{name}"/></svg>'


def e(s):
    return html.escape(s, quote=True)


def media(img, label, cls="", lightbox=False, ratio=""):
    """Miejsce na zdjęcie. Gdy plik `img` istnieje na serwerze, JS pokaże zdjęcie;
    gdy go nie ma – zostaje elegancki placeholder z opisem i nazwą pliku."""
    lb = ' data-lightbox' if lightbox else ""
    st = f' style="--ratio:{ratio}"' if ratio else ""
    return (
        f'<div class="media {cls}" data-img="{img}" data-label="{e(label)}"{lb}{st}>'
        f'<div class="media__ph">{ic("camera")}<span class="media__lbl">{e(label)}</span>'
        f'<span class="media__file">{img.split("/")[-1]}</span></div></div>'
    )


# ---------------------------------------------------------------- usługi
SERVICES = [
    {
        "slug": "wyjazdy-integracyjne",
        "h2": 'Razem od <em class="gold-text">pierwszego kilometra</em>',
        "title": "Wyjazdy integracyjne",
        "icon": "users",
        "short": "Klub sportowy, parafia, stowarzyszenie czy paczka znajomych — dowieziemy całą ekipę razem, wygodnie i bez stresu.",
        "eyebrow": "Grupy zorganizowane",
        "lead": "Wspólna podróż to początek dobrej integracji. Zajmiemy się transportem, a Wy skupcie się na tym, po co jedziecie.",
        "intro": [
            "Organizujesz wyjazd dla klubu, stowarzyszenia, koła gospodyń, grupy seniorów, parafii albo po prostu dla znajomych? Autokar to najprostszy sposób, żeby wszyscy dojechali razem — bez szukania miejsc parkingowych, dzielenia się samochodami i zastanawiania, kto prowadzi w drodze powrotnej.",
            "Trasę ustalamy indywidualnie: od jednodniowych wypadów w okolicy, przez wycieczki krajoznawcze, po kilkudniowe wyjazdy z programem zwiedzania. Odbieramy grupę spod wskazanego adresu i odwozimy z powrotem pod drzwi.",
        ],
        "points": [
            ("route", "Trasa szyta na miarę", "Przystanki, punkty zbiórki i godziny ustalamy z Tobą — plan dopasowany do grupy, nie odwrotnie."),
            ("bag", "Miejsce na bagaż i sprzęt", "Pojemny luk bagażowy zmieści walizki, torby sportowe, sprzęt i rekwizyty."),
            ("mic", "Mikrofon dla przewodnika", "Nagłośnienie na pokładzie — idealne do przekazywania informacji całej grupie."),
            ("clock", "Elastyczne godziny", "Wczesny wyjazd, późny powrót? Dopasujemy się do Waszego programu."),
        ],
        "for": ["Kluby sportowe i drużyny", "Stowarzyszenia i fundacje", "Parafie i pielgrzymki", "Grupy seniorów", "Koła zainteresowań", "Wyjazdy znajomych i rodzin"],
        "imgs": [("integracja-1.jpg", "Grupa przy autokarze"), ("integracja-2.jpg", "Wnętrze autokaru z pasażerami"), ("integracja-3.jpg", "Autokar w trasie")],
    },
    {
        "slug": "zielone-szkoly",
        "h2": 'Bezpieczna podróż, <em class="gold-text">spokojni rodzice</em>',
        "title": "Zielone szkoły",
        "icon": "school",
        "short": "Wycieczki szkolne i zielone szkoły z bezpieczeństwem na pierwszym miejscu. Rodzice spokojni, nauczyciele odciążeni.",
        "eyebrow": "Wycieczki szkolne",
        "lead": "Wieziemy to, co najcenniejsze. Dlatego bezpieczeństwo dzieci jest dla nas absolutnym priorytetem — od zbiórki pod szkołą aż do powrotu.",
        "intro": [
            "Zielona szkoła, wycieczka klasowa, wyjazd do teatru albo na zawody — dowozimy uczniów sprawnie i bezpiecznie. Autokar jest regularnie serwisowany, a przed każdym wyjazdem sprawdzany. Na życzenie szkoły podstawiamy go do kontroli drogowej przed wyjazdem.",
            "Wiemy, ile pracy wymaga zorganizowanie wycieczki szkolnej. Dlatego ustalamy wszystko z wyprzedzeniem, trzymamy się harmonogramu i jesteśmy w stałym kontakcie z opiekunami grupy.",
        ],
        "points": [
            ("shield", "Bezpieczeństwo przede wszystkim", "Sprawny technicznie autokar, pasy bezpieczeństwa i doświadczony, spokojny kierowca."),
            ("check", "Kontrola przed wyjazdem", "Na życzenie szkoły podstawiamy autokar do kontroli przed wycieczką."),
            ("clock", "Punktualność", "Jesteśmy na miejscu zbiórki przed czasem — harmonogram wycieczki nie ucierpi."),
            ("receipt", "Dokumenty dla szkoły", "Wystawiamy fakturę i pomagamy w formalnościach związanych z przewozem."),
        ],
        "for": ["Zielone szkoły", "Wycieczki klasowe jednodniowe", "Wycieczki wielodniowe", "Wyjścia do kina, teatru, muzeum", "Zawody i olimpiady", "Przedszkola"],
        "imgs": [("szkola-1.jpg", "Uczniowie wsiadający do autokaru"), ("szkola-2.jpg", "Wycieczka szkolna w terenie"), ("szkola-3.jpg", "Autokar pod szkołą")],
    },
    {
        "slug": "wyjazdy-kolonijne",
        "h2": 'Wakacje zaczynają się <em class="gold-text">w autokarze</em>',
        "title": "Wyjazdy kolonijne",
        "icon": "tent",
        "short": "Przewóz dzieci i młodzieży na kolonie i obozy oraz wycieczki fakultatywne w trakcie turnusu.",
        "eyebrow": "Kolonie i obozy",
        "lead": "Wakacyjna przygoda zaczyna się już w autokarze. Dowieziemy uczestników na kolonie i obozy, a potem bezpiecznie z powrotem do domu.",
        "intro": [
            "Współpracujemy z organizatorami wypoczynku, szkołami, parafiami i biurami podróży. Realizujemy przewozy na kolonie, obozy sportowe, harcerskie i językowe — zarówno w jedną stronę, jak i w obie.",
            "Podczas turnusu możemy też obsłużyć wycieczki fakultatywne: wypad do aquaparku, parku rozrywki czy na zwiedzanie okolicy. Duży luk bagażowy pomieści bagaże całej grupy.",
        ],
        "points": [
            ("shield", "Bezpieczny przewóz dzieci", "Autokar przygotowany do przewozu grup zorganizowanych dzieci i młodzieży."),
            ("bag", "Dużo miejsca na bagaż", "Walizki, śpiwory, sprzęt sportowy — wszystko pojedzie razem z grupą."),
            ("map", "Wycieczki w trakcie turnusu", "Obsługujemy wyjazdy fakultatywne w okolicy miejsca kolonii."),
            ("calendar", "Rezerwacja z wyprzedzeniem", "Sezon wakacyjny to gorący czas — zarezerwuj termin wcześniej."),
        ],
        "for": ["Kolonie letnie", "Obozy sportowe", "Obozy harcerskie", "Obozy językowe", "Półkolonie", "Wycieczki fakultatywne"],
        "imgs": [("kolonie-1.jpg", "Dzieci z bagażami przy autokarze"), ("kolonie-2.jpg", "Ośrodek kolonijny"), ("kolonie-3.jpg", "Wycieczka w trakcie kolonii")],
    },
    {
        "slug": "wyjazdy-letnie-zimowe",
        "h2": 'Morze latem, <em class="gold-text">stok zimą</em>',
        "title": "Wyjazdy letnie i zimowe",
        "icon": "mountain",
        "short": "Nad morze, nad jeziora, w góry i na narty. Komfortowo o każdej porze roku — z miejscem na cały sprzęt.",
        "eyebrow": "Lato i zima",
        "lead": "Morze latem, stok zimą — niezależnie od kierunku, zawieziemy Was komfortowo i bezpiecznie, o każdej porze roku.",
        "intro": [
            "Latem jeździmy nad morze, nad jeziora i na Mazury, zimą — w góry i na narty. Wycieczki jednodniowe i dłuższe wyjazdy, transfery do ośrodków, hoteli i pensjonatów.",
            "Zimowe trasy wymagają doświadczenia. Autokar ma opony zimowe, a kierowca zna specyfikę jazdy w górach i w trudnych warunkach. Narty, deski i buty narciarskie bez problemu zmieszczą się w luku bagażowym.",
        ],
        "points": [
            ("sun", "Wyjazdy wakacyjne", "Morze, jeziora, parki rozrywki — komfortowa podróż z klimatyzacją."),
            ("snow", "Wyjazdy na narty", "Opony zimowe, doświadczony kierowca i miejsce na sprzęt narciarski."),
            ("bag", "Sprzęt bez ograniczeń", "Narty, deski, rowery w pokrowcach, walizki — zabierzecie wszystko, co trzeba."),
            ("seat", "Komfort na długich trasach", "Wygodne, regulowane fotele i postoje zgodnie z przepisami i Waszymi potrzebami."),
        ],
        "for": ["Wyjazdy nad morze", "Wycieczki nad jeziora", "Wyjazdy w góry", "Wyjazdy narciarskie", "Ferie zimowe", "Transfery do ośrodków"],
        "imgs": [("lato-1.jpg", "Autokar nad morzem"), ("zima-1.jpg", "Autokar w zimowym krajobrazie"), ("zima-2.jpg", "Narty w luku bagażowym")],
    },
    {
        "slug": "sluby-wesela-pogrzeby",
        "h2": 'W dniu radości i <em class="gold-text">w chwili pożegnania</em>',
        "title": "Śluby, wesela, pogrzeby",
        "icon": "rings",
        "short": "Transport gości weselnych i uczestników uroczystości żałobnych. Punktualnie, elegancko i z wyczuciem.",
        "eyebrow": "Uroczystości",
        "lead": "Ważne chwile wymagają spokoju. Zadbamy o to, by wszyscy goście dotarli na miejsce na czas — elegancko w dniu radości i z należytym taktem w dniu pożegnania.",
        "intro": [
            "Na ślubie i weselu najważniejsi są goście. Dowieziemy ich z kościoła lub urzędu na salę weselną, a po zabawie bezpiecznie rozwieziemy do domów lub hoteli — także w kilku nocnych kursach. Nikt nie musi martwić się o powrót, a wszyscy mogą świętować bez ograniczeń.",
            "Organizujemy również przewóz uczestników uroczystości pogrzebowych: z domu lub kościoła na cmentarz i na stypę. Działamy dyskretnie, punktualnie i z pełnym szacunkiem dla rodziny i bliskich.",
        ],
        "points": [
            ("heart", "Transport gości weselnych", "Kościół lub USC → sala → powrót do domów i hoteli. Także kursy nocne."),
            ("flower", "Dekoracja na życzenie", "Wstążki i kwiaty na autokarze — dopasujemy się do stylu uroczystości."),
            ("users", "Uroczystości żałobne", "Dyskretny i punktualny przewóz rodziny i bliskich na cmentarz i stypę."),
            ("clock", "Precyzyjny harmonogram", "Ustalamy godziny co do minuty, by żaden moment uroczystości nie ucierpiał."),
        ],
        "for": ["Transport gości na ślub", "Rozwożenie gości po weselu", "Poprawiny", "Chrzciny i komunie", "Jubileusze i rocznice", "Uroczystości pogrzebowe"],
        "imgs": [("wesele-1.jpg", "Udekorowany autokar weselny"), ("wesele-2.jpg", "Goście weselni przy autokarze"), ("uroczystosci-1.jpg", "Autokar – uroczystości")],
    },
    {
        "slug": "integracje-firmowe",
        "h2": 'Transport, który robi <em class="gold-text">dobre wrażenie</em>',
        "title": "Integracje firmowe",
        "icon": "briefcase",
        "short": "Wyjazdy integracyjne, eventy, konferencje i transfery dla firm. Profesjonalnie, na czas, z fakturą VAT.",
        "eyebrow": "Dla firm",
        "lead": "Zespół, który dojeżdża razem, zaczyna integrację już w drodze. Zapewnimy firmie sprawny i reprezentacyjny transport na każde wydarzenie.",
        "intro": [
            "Realizujemy transport na wyjazdy integracyjne, imprezy firmowe, szkolenia, konferencje i targi. Obsługujemy też transfery z i na lotnisko oraz przewozy gości i kontrahentów.",
            "Dla firm liczy się przewidywalność. Ustalamy szczegóły z jedną osobą kontaktową, trzymamy się harmonogramu i wystawiamy fakturę VAT. Przy wydarzeniach cyklicznych możemy przygotować stałą ofertę.",
        ],
        "points": [
            ("briefcase", "Eventy i team building", "Transport na wyjazdy integracyjne, imprezy firmowe i wydarzenia plenerowe."),
            ("map", "Konferencje i targi", "Przewóz uczestników i gości — także w obie strony, w kilku kursach."),
            ("route", "Transfery lotniskowe", "Odbiór i odwóz z lotniska dla gości, delegacji i pracowników."),
            ("receipt", "Faktura VAT", "Przejrzyste rozliczenie i możliwość stałej współpracy dla firm."),
        ],
        "for": ["Wyjazdy integracyjne", "Imprezy firmowe", "Szkolenia i konferencje", "Targi branżowe", "Transfery lotniskowe", "Wyjazdy motywacyjne"],
        "imgs": [("firma-1.jpg", "Zespół firmowy przy autokarze"), ("firma-2.jpg", "Event firmowy"), ("firma-3.jpg", "Autokar pod hotelem / centrum konferencyjnym")],
    },
]

EQUIPMENT = [
    ("fan", "Klimatyzacja", "Przyjemna temperatura latem i zimą"),
    ("seat", "Wygodne fotele", "Regulowane oparcia, dużo miejsca na nogi"),
    ("belt", "Pasy bezpieczeństwa", "Przy każdym siedzeniu"),
    ("bag", "Duży luk bagażowy", "Walizki, narty, sprzęt sportowy"),
    ("tv", "Monitory i DVD", "Filmy i muzyka w czasie podróży"),
    ("mic", "Nagłośnienie", "Mikrofon dla przewodnika i opiekunów"),
    ("usb", "Gniazda USB", "Ładowanie telefonów w trasie"),
    ("cup", "Barek / lodówka", "Napoje zawsze pod ręką"),
]

CERTS = [
    ("licencja.jpg", "Licencja na przewóz osób", "Uprawnienia do wykonywania krajowego transportu drogowego osób."),
    ("certyfikat-kompetencji.jpg", "Certyfikat kompetencji zawodowych", "Potwierdzenie kwalifikacji do zarządzania przewozem osób."),
    ("kwalifikacja-kierowcy.jpg", "Kwalifikacja zawodowa kierowcy", "Świadectwo kwalifikacji i aktualne szkolenia okresowe."),
    ("badanie-techniczne.jpg", "Badanie techniczne autokaru", "Aktualne badanie techniczne pojazdu."),
    ("ubezpieczenie.jpg", "Ubezpieczenie OC i NNW", "Ochrona pasażerów w trakcie każdej podróży."),
    ("certyfikat-6.jpg", "Kolejny certyfikat", "Miejsce na następny dokument lub wyróżnienie."),
]

FAQ = [
    ("Ile osób zabiera autokar?", "Dokładną liczbę miejsc podamy przy wycenie — zadzwoń, a od razu powiemy, czy autokar pomieści całą Twoją grupę."),
    ("Jak wcześnie trzeba zarezerwować przejazd?", "Im wcześniej, tym lepiej — szczególnie w sezonie wycieczek szkolnych (maj–czerwiec), wakacji i ślubów. Przy wolnym terminie realizujemy też zlecenia na ostatnią chwilę."),
    ("Jak liczona jest cena przejazdu?", "Cena zależy głównie od długości trasy, czasu wynajmu i liczby dni. Wycena jest bezpłatna i niezobowiązująca — wystarczy telefon lub formularz."),
    ("Czy jeździcie także na długie trasy i za granicę?", "Realizujemy przejazdy na terenie całej Polski. O trasy zagraniczne zapytaj telefonicznie — ustalimy szczegóły indywidualnie."),
    ("Czy wystawiacie fakturę VAT?", "Tak, do każdego przejazdu wystawiamy fakturę — dla firm, szkół i instytucji oraz osób prywatnych."),
    ("Czy autokar może przejść kontrolę przed wycieczką szkolną?", "Tak. Na życzenie szkoły lub organizatora podstawiamy autokar do kontroli drogowej przed wyjazdem."),
]

NAV = [
    ("index.html", "Start", "home"),
    ("index.html#oferta", "Oferta", "oferta"),
    ("autokar.html", "Nasz autokar", "autokar"),
    ("certyfikaty.html", "Certyfikaty", "certyfikaty"),
    ("kontakt.html", "Kontakt", "kontakt"),
]


# ---------------------------------------------------------------- szkielet strony
def header(active):
    items = []
    for href, label, key in NAV:
        cls = "nav__a is-active" if key == active else "nav__a"
        if key == "oferta":
            sub = "".join(
                f'<a class="sub__a" href="{s["slug"]}.html">{ic(s["icon"])}<span>{s["title"]}</span></a>'
                for s in SERVICES
            )
            items.append(
                f'<li class="nav__li has-sub"><a class="{cls}" href="{href}">{label}{ic("chev", "i i--chev")}</a>'
                f'<div class="sub"><div class="sub__in">{sub}</div></div></li>'
            )
        else:
            items.append(f'<li class="nav__li"><a class="{cls}" href="{href}">{label}</a></li>')
    mob_services = "".join(
        f'<a class="mnav__sub" href="{s["slug"]}.html">{ic(s["icon"])}{s["title"]}</a>' for s in SERVICES
    )
    mob_main = "".join(
        f'<a class="mnav__a{" is-active" if k == active else ""}" href="{h}" style="--i:{n}">{l}</a>'
        + (f'<div class="mnav__subs" style="--i:{n}">{mob_services}</div>' if k == "oferta" else "")
        for n, (h, l, k) in enumerate(NAV)
    )
    return f"""
<a class="skip" href="#main">Przejdź do treści</a>
<div class="progress" aria-hidden="true"></div>
<header class="hdr" id="top">
  <div class="container hdr__in">
    <a class="hdr__logo" href="index.html" aria-label="Autokary Kron — strona główna">
      <img src="assets/img/logo.svg" alt="Autokary Kron — 505 434 624" width="125" height="80">
    </a>
    <nav class="nav" aria-label="Menu główne"><ul class="nav__ul">{''.join(items)}</ul></nav>
    <a class="btn btn--gold btn--sm hdr__call" href="tel:{SITE['tel']}">{ic('phone')}<span>{SITE['phone']}</span></a>
    <button class="burger" type="button" aria-label="Otwórz menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mnav" id="mnav" aria-hidden="true">
  <div class="mnav__in">
    {mob_main}
    <a class="btn btn--gold mnav__call" href="tel:{SITE['tel']}">{ic('phone')} Zadzwoń: {SITE['phone']}</a>
  </div>
</div>"""


def footer():
    srv = "".join(f'<li><a href="{s["slug"]}.html">{s["title"]}</a></li>' for s in SERVICES)
    return f"""
<footer class="ftr">
  <div class="ftr__glow" aria-hidden="true"></div>
  <div class="container ftr__grid">
    <div class="ftr__brand">
      <img src="assets/img/logo.svg" alt="Autokary Kron" width="220" height="141" loading="lazy">
      <p>Wynajem autokaru z kierowcą. Wycieczki szkolne, kolonie, wyjazdy firmowe i uroczystości — komfortowo, bezpiecznie, na czas.</p>
    </div>
    <div>
      <h3 class="ftr__h">Oferta</h3>
      <ul class="ftr__ul">{srv}</ul>
    </div>
    <div>
      <h3 class="ftr__h">Na skróty</h3>
      <ul class="ftr__ul">
        <li><a href="index.html">Strona główna</a></li>
        <li><a href="autokar.html">Nasz autokar</a></li>
        <li><a href="certyfikaty.html">Certyfikaty</a></li>
        <li><a href="kontakt.html">Kontakt i wycena</a></li>
        <li><a href="polityka-prywatnosci.html">Polityka prywatności</a></li>
      </ul>
    </div>
    <div>
      <h3 class="ftr__h">Kontakt</h3>
      <ul class="ftr__ul ftr__contact">
        <li><a href="tel:{SITE['tel']}">{ic('phone')}{SITE['phone']}</a></li>
        <li><a href="mailto:{SITE['email']}">{ic('mail')}{SITE['email']}</a></li>
        <li><span>{ic('map')}{SITE['area']}</span></li>
        <li><span>{ic('clock')}{SITE['hours']}</span></li>
      </ul>
    </div>
  </div>
  <div class="container ftr__bottom">
    <span>© <span data-year>2026</span> Autokary Kron. Wszelkie prawa zastrzeżone.</span>
    <a href="#top" class="ftr__top">Do góry {ic('up')}</a>
  </div>
</footer>
<a class="callbar" href="tel:{SITE['tel']}">{ic('phone')}<span>Zadzwoń teraz</span><strong>{SITE['phone']}</strong></a>
<a class="totop" href="#top" aria-label="Przewiń do góry"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="totop__track" cx="22" cy="22" r="20"/><circle class="totop__bar" cx="22" cy="22" r="20"/></svg>{ic('up')}</a>
<div class="lb" aria-hidden="true" role="dialog" aria-label="Podgląd zdjęcia">
  <button class="lb__close" type="button" aria-label="Zamknij">{ic('close')}</button>
  <button class="lb__nav lb__prev" type="button" aria-label="Poprzednie">{ic('arrow')}</button>
  <div class="lb__stage"></div>
  <button class="lb__nav lb__next" type="button" aria-label="Następne">{ic('arrow')}</button>
  <p class="lb__cap"></p>
</div>"""


def page(fname, title, desc, body, active="", schema=None, base=False):
    full_title = title if "Autokary Kron" in title else f"{title} | Autokary Kron"
    ld = ""
    if schema:
        ld = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
    url = f'{SITE["domain"]}/{"" if fname == "index.html" else fname}'
    doc = f"""<!doctype html>
<html lang="pl" class="no-js">
<head>
<meta charset="utf-8">
<script>(function(d){{d.classList.remove("no-js");try{{if(sessionStorage.getItem("kron-visited"))d.classList.add("no-preloader")}}catch(e){{}}}})(document.documentElement)</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#0a0907">
{'<base href="/">' if base else ''}
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE['domain']}/assets/img/og-image.png">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=1">
{ld}
</head>
<body class="page-{active or 'other'}">
{sprite()}
<div class="preloader" aria-hidden="true"><img src="assets/img/logo.svg" alt="" width="260" height="166"><span class="preloader__bar"></span></div>
<div class="cursor-glow" aria-hidden="true"></div>
{header(active)}
<main id="main">
{body}
</main>
{footer()}
<script src="assets/js/main.js?v=1" defer></script>
</body>
</html>
"""
    (OUT / fname).write_text(doc, encoding="utf-8")


# ---------------------------------------------------------------- sekcje wielokrotnego użytku
def bus_road():
    """Pas drogi z jadącym złotym autokarem (animacja przy przewijaniu)."""
    return f"""
<div class="road" aria-hidden="true">
  <div class="road__line"></div>
  <svg class="road__bus" viewBox="0 0 520 170">
    <defs><linearGradient id="busG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset=".5" stop-color="#c8901f"/><stop offset="1" stop-color="#8a5d12"/></linearGradient></defs>
    <path class="bus__body" d="M18 128V34c0-11 8-18 19-18h388c22 0 38 10 48 30l26 54c4 8 5 15 5 22v6c0 8-6 13-13 13H18z"/>
    <path class="bus__glass" d="M40 32h66v42H40zM116 32h66v42h-66zM192 32h66v42h-66zM268 32h66v42h-66zM344 32h50v42h-50z"/>
    <path class="bus__glass" d="M404 32h22c14 0 24 6 31 18l18 38h-71z"/>
    <path class="bus__line" d="M18 92h486M404 32v96"/>
    <path class="bus__lamp" d="M488 108h18"/>
    <g class="bus__wheel" style="transform-origin:110px 130px"><circle cx="110" cy="130" r="22"/><path d="M110 112v36M92 130h36M97 117l26 26M123 117l-26 26"/></g>
    <g class="bus__wheel" style="transform-origin:400px 130px"><circle cx="400" cy="130" r="22"/><path d="M400 112v36M382 130h36M387 117l26 26M413 117l-26 26"/></g>
    <text x="220" y="116" class="bus__txt">KRON</text>
  </svg>
</div>"""


def marquee():
    words = [s["title"] for s in SERVICES] + ["Wynajem autokaru z kierowcą", "Cała Polska"]
    row = "".join(f'<span>{w}</span><i>★</i>' for w in words)
    return f'<div class="marquee" aria-hidden="true"><div class="marquee__track">{row}{row}</div></div>'


def service_cards(exclude=None, heading=True):
    cards = []
    n = 0
    for s in SERVICES:
        if s["slug"] == exclude:
            continue
        cards.append(f"""
      <a class="scard tilt" href="{s['slug']}.html" data-reveal style="--d:{n * 80}ms">
        {media('assets/img/zdjecia/' + s['slug'] + '.jpg', s['title'] + ' — zdjęcie', 'scard__img')}
        <div class="scard__body">
          <span class="scard__ic">{ic(s['icon'])}</span>
          <h3 class="scard__t">{s['title']}</h3>
          <p class="scard__p">{s['short']}</p>
          <span class="scard__more">Szczegóły {ic('arrow')}</span>
        </div>
        <span class="tilt__glare" aria-hidden="true"></span>
      </a>""")
        n += 1
    return "".join(cards)


def cta_band(title="Zaplanujmy razem Twój wyjazd", text="Zadzwoń lub napisz — przygotujemy bezpłatną wycenę dopasowaną do Twojej trasy i grupy."):
    return f"""
<section class="cta">
  <div class="container">
    <div class="cta__box" data-reveal="zoom">
      <div class="cta__stars" aria-hidden="true">★ ★ ★ ★ ★</div>
      <h2 class="cta__t">{title}</h2>
      <p class="cta__p">{text}</p>
      <div class="cta__btns">
        <a class="btn btn--gold btn--lg" href="tel:{SITE['tel']}">{ic('phone')} {SITE['phone']}</a>
        <a class="btn btn--ghost btn--lg" href="kontakt.html#wycena">{ic('mail')} Zapytaj o wycenę</a>
      </div>
    </div>
  </div>
</section>"""


def quote_form(compact=False):
    opts = "".join(f"<option>{s['title']}</option>" for s in SERVICES) + "<option>Inny przejazd</option>"
    return f"""
<form class="form" action="send.php" method="post" novalidate data-form>
  <div class="form__grid">
    <label class="field"><span>Imię i nazwisko *</span><input name="name" required autocomplete="name" placeholder="Jan Kowalski"></label>
    <label class="field"><span>Telefon *</span><input name="phone" type="tel" required autocomplete="tel" placeholder="np. 600 000 000"></label>
    <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" placeholder="adres@email.pl"></label>
    <label class="field"><span>Rodzaj przejazdu</span><select name="service">{opts}</select></label>
    <label class="field"><span>Data wyjazdu</span><input name="date" type="date"></label>
    <label class="field"><span>Liczba osób</span><input name="people" type="number" min="1" max="99" placeholder="np. 40"></label>
    <label class="field field--wide"><span>Trasa (skąd — dokąd)</span><input name="route" placeholder="np. Kraków — Zakopane — Kraków"></label>
    <label class="field field--wide"><span>Wiadomość</span><textarea name="message" rows="{3 if compact else 4}" placeholder="Godziny, przystanki, dodatkowe informacje…"></textarea></label>
  </div>
  <label class="hp" aria-hidden="true">Nie wypełniaj<input name="website" tabindex="-1" autocomplete="off"></label>
  <input type="hidden" name="t" value="">
  <label class="check"><input type="checkbox" name="consent" required><span>Wyrażam zgodę na przetwarzanie moich danych w celu przygotowania wyceny i kontaktu. <a href="polityka-prywatnosci.html">Polityka prywatności</a>. *</span></label>
  <div class="form__foot">
    <button class="btn btn--gold btn--lg" type="submit">{ic('arrow')} Wyślij zapytanie</button>
    <p class="form__msg" role="status" aria-live="polite"></p>
  </div>
</form>"""


def faq_list(items):
    return "".join(
        f"""<details class="faq__item" data-reveal style="--d:{i * 60}ms"><summary><span>{q}</span><span class="faq__ic">{ic('plus')}</span></summary><div class="faq__a"><p>{a}</p></div></details>"""
        for i, (q, a) in enumerate(items)
    )


def page_hero(eyebrow, title, lead, img, crumbs, label="Zdjęcie w tle nagłówka (1920×800)", deco="star"):
    cr = " <span>/</span> ".join(
        f'<a href="{h}">{t}</a>' if h else f"<span aria-current=\"page\">{t}</span>" for t, h in crumbs
    )
    return f"""
<section class="phero">
  <div class="phero__bg">{media(img, label, 'media--bg')}</div>
  <div class="phero__shade" aria-hidden="true"></div>
  <canvas class="dust" aria-hidden="true"></canvas>
  <div class="phero__deco" aria-hidden="true">{ic(deco)}</div>
  <div class="container phero__in">
    <nav class="crumbs" aria-label="Okruszki">{cr}</nav>
    <p class="eyebrow" data-reveal>{eyebrow}</p>
    <h1 class="phero__t" data-split>{title}</h1>
    <p class="phero__lead" data-reveal style="--d:200ms">{lead}</p>
    <div class="phero__cta" data-reveal style="--d:300ms">
      <a class="btn btn--gold" href="tel:{SITE['tel']}">{ic('phone')} {SITE['phone']}</a>
      <a class="btn btn--ghost" href="kontakt.html#wycena">Bezpłatna wycena {ic('arrow')}</a>
    </div>
  </div>
</section>"""


def section_head(eyebrow, title, text="", center=True):
    p = f'<p class="sh__p" data-reveal style="--d:160ms">{text}</p>' if text else ""
    return f"""<div class="sh{' sh--c' if center else ''}">
      <p class="eyebrow" data-reveal>{eyebrow}</p>
      <h2 class="sh__t" data-reveal style="--d:80ms">{title}</h2>{p}
    </div>"""


# ---------------------------------------------------------------- strony
def build_index():
    why = [
        ("shield", "Bezpieczeństwo", "Sprawny technicznie, regularnie serwisowany autokar i pasy przy każdym fotelu."),
        ("star", "Komfort klasy premium", "Klimatyzacja, wygodne fotele i spokojna jazda — podróż to część przyjemności."),
        ("clock", "Punktualność", "Jesteśmy na miejscu przed czasem. Twój harmonogram jest dla nas święty."),
        ("users", "Indywidualne podejście", "Rozmawiasz bezpośrednio z przewoźnikiem — bez pośredników i call center."),
    ]
    why_html = "".join(
        f"""<div class="feat" data-reveal style="--d:{i * 90}ms"><span class="feat__ic">{ic(icn)}</span><h3 class="feat__t">{t}</h3><p class="feat__p">{p}</p></div>"""
        for i, (icn, t, p) in enumerate(why)
    )
    steps = [
        ("phone", "Kontakt", "Zadzwoń lub wypełnij formularz — podaj trasę, termin i liczbę osób."),
        ("receipt", "Wycena", "Przygotujemy bezpłatną, przejrzystą wycenę bez ukrytych kosztów."),
        ("calendar", "Rezerwacja", "Potwierdzamy termin i ustalamy szczegóły: godziny, przystanki, bagaż."),
        ("bus", "Podróż", "Podstawiamy autokar na czas. Wy wsiadacie i cieszycie się drogą."),
    ]
    steps_html = "".join(
        f"""<li class="step" data-reveal style="--d:{i * 120}ms"><span class="step__n">0{i + 1}</span><span class="step__ic">{ic(icn)}</span><h3 class="step__t">{t}</h3><p class="step__p">{p}</p></li>"""
        for i, (icn, t, p) in enumerate(steps)
    )
    eq_html = "".join(
        f'<li class="eq" data-reveal style="--d:{i * 50}ms">{ic(icn)}<div><strong>{t}</strong><span>{p}</span></div></li>'
        for i, (icn, t, p) in enumerate(EQUIPMENT[:6])
    )
    certs_html = "".join(
        f"""<div class="cert" data-reveal style="--d:{i * 90}ms">{media('assets/img/certyfikaty/' + f, t, 'cert__img', lightbox=True, ratio='3/4')}<div class="cert__body"><h3>{t}</h3><span class="badge">Wkrótce</span></div></div>"""
        for i, (f, t, _) in enumerate(CERTS[:3])
    )
    body = f"""
<section class="hero">
  <div class="hero__bg">{media('assets/img/zdjecia/hero.jpg', 'Zdjęcie główne — autokar w trasie (1920×1080)', 'media--bg')}</div>
  <div class="hero__shade" aria-hidden="true"></div>
  <canvas class="dust" aria-hidden="true"></canvas>
  <div class="hero__rays" aria-hidden="true"></div>
  <div class="container hero__in">
    <div class="hero__txt">
      <p class="eyebrow" data-reveal>{ic('star')} Wynajem autokaru z kierowcą</p>
      <h1 class="hero__t" data-split>Podróżuj w klasie <em class="gold-text">pięciu gwiazdek</em></h1>
      <p class="hero__lead" data-reveal style="--d:350ms">Wycieczki szkolne, kolonie, wyjazdy firmowe i uroczystości rodzinne. Komfortowy autokar, doświadczony kierowca i punktualność, na której możesz polegać.</p>
      <div class="hero__cta" data-reveal style="--d:450ms">
        <a class="btn btn--gold btn--lg" href="tel:{SITE['tel']}">{ic('phone')} {SITE['phone']}</a>
        <a class="btn btn--ghost btn--lg" href="kontakt.html#wycena">Bezpłatna wycena {ic('arrow')}</a>
      </div>
      <ul class="hero__ticks" data-reveal style="--d:550ms">
        <li>{ic('check')} Szybka wycena</li><li>{ic('check')} {SITE['area']}</li><li>{ic('check')} Faktura VAT</li>
      </ul>
    </div>
    <div class="hero__logo" data-reveal="zoom" style="--d:200ms">
      <div class="hero__halo" aria-hidden="true"></div>
      <img src="assets/img/logo.svg" alt="Autokary Kron — tel. 505 434 624" width="560" height="358">
    </div>
  </div>
  <a class="hero__scroll" href="#oferta" aria-label="Przewiń do oferty"><span></span></a>
</section>
{marquee()}

<section class="sec" id="oferta">
  <div class="container">
    {section_head('Nasza oferta', 'Dokąd <em class="gold-text">jedziemy</em> razem?', 'Jeden autokar, pełne zaangażowanie. Każde zlecenie traktujemy indywidualnie — od wycieczki szkolnej po wesele.')}
    <div class="grid3">{service_cards()}</div>
  </div>
</section>

{bus_road()}

<section class="sec sec--alt" id="dlaczego">
  <div class="container split">
    <div class="split__media" data-reveal="left">
      {media('assets/img/zdjecia/o-nas.jpg', 'Zdjęcie: kierowca przy autokarze (1200×1400)', 'media--tall', lightbox=True)}
      <div class="split__badge" data-reveal="zoom" style="--d:300ms"><span class="split__stars">★★★★★</span><strong>Standard</strong><span>w każdej podróży</span></div>
    </div>
    <div class="split__txt">
      {section_head('Dlaczego Autokary Kron', 'Mały przewoźnik, <em class="gold-text">wielka dbałość</em>', 'Nie jesteśmy anonimową flotą. Masz bezpośredni kontakt z przewoźnikiem, a nasz autokar i kierowca są w pełni do Twojej dyspozycji. Dbamy o każdy szczegół, bo od tego zależy nasza opinia.', center=False)}
      <div class="feats">{why_html}</div>
      <div class="stats" data-reveal>
        <div class="stat"><strong data-count="5">5</strong><span>gwiazdek standardu</span></div>
        <div class="stat"><strong>7/7</strong><span>dni w tygodniu</span></div>
        <div class="stat"><strong data-count="100" data-suffix="%">100%</strong><span>indywidualnie</span></div>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="autokar">
  <div class="container">
    {section_head('Nasz autokar', 'Komfort, który <em class="gold-text">poczujesz</em> od pierwszego kilometra', 'Nowoczesny, zadbany autokar przygotowany na krótkie i długie trasy. Zobacz, co czeka na Ciebie na pokładzie.')}
    <div class="bus">
      <div class="bus__gallery" data-reveal="left">
        {media('assets/img/zdjecia/autokar-1.jpg', 'Autokar — widok z boku (1600×1000)', 'bus__main', lightbox=True)}
        {media('assets/img/zdjecia/autokar-2.jpg', 'Wnętrze autokaru', 'bus__thumb', lightbox=True)}
        {media('assets/img/zdjecia/autokar-3.jpg', 'Fotele pasażerów', 'bus__thumb', lightbox=True)}
        {media('assets/img/zdjecia/autokar-4.jpg', 'Autokar z przodu', 'bus__thumb', lightbox=True)}
      </div>
      <div class="bus__info" data-reveal="right">
        <ul class="eqs">{eq_html}</ul>
        <a class="btn btn--ghost" href="autokar.html">Zobacz cały autokar {ic('arrow')}</a>
      </div>
    </div>
  </div>
</section>

<section class="sec sec--alt" id="jak">
  <div class="container">
    {section_head('Jak to działa', 'Cztery kroki do <em class="gold-text">udanej podróży</em>')}
    <ol class="steps"><span class="steps__line" aria-hidden="true"></span>{steps_html}</ol>
  </div>
</section>

<section class="sec" id="certyfikaty">
  <div class="container">
    {section_head('Certyfikaty i uprawnienia', 'Bezpieczeństwo <em class="gold-text">potwierdzone</em> dokumentami', 'Działamy legalnie i odpowiedzialnie. Komplet uprawnień i dokumentów przewoźnika znajdziesz w zakładce Certyfikaty.')}
    <div class="grid3 grid3--certs">{certs_html}</div>
    <div class="center"><a class="btn btn--ghost" href="certyfikaty.html">Wszystkie certyfikaty {ic('arrow')}</a></div>
  </div>
</section>

{cta_band()}

<section class="sec" id="faq">
  <div class="container narrow">
    {section_head('Pytania i odpowiedzi', 'Najczęściej <em class="gold-text">pytacie</em> o…')}
    <div class="faq">{faq_list(FAQ)}</div>
  </div>
</section>

<section class="sec sec--alt" id="kontakt">
  <div class="container contact">
    <div class="contact__info">
      {section_head('Kontakt', 'Zapytaj o <em class="gold-text">bezpłatną wycenę</em>', 'Najszybciej telefonicznie. Możesz też zostawić zapytanie — oddzwonimy z wyceną.', center=False)}
      <a class="bigphone" href="tel:{SITE['tel']}" data-reveal>{ic('phone')}<span><small>Zadzwoń</small>{SITE['phone']}</span></a>
      <ul class="clist" data-reveal style="--d:120ms">
        <li>{ic('mail')}<a href="mailto:{SITE['email']}">{SITE['email']}</a></li>
        <li>{ic('map')}<span>Przewozy na terenie całej Polski</span></li>
        <li>{ic('clock')}<span>{SITE['hours']}</span></li>
      </ul>
    </div>
    <div class="contact__form" data-reveal="right" id="wycena">{quote_form(compact=True)}</div>
  </div>
</section>
"""
    schema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": SITE["name"],
        "description": "Wynajem autokaru z kierowcą: wyjazdy integracyjne, zielone szkoły, kolonie, wyjazdy letnie i zimowe, śluby, wesela, pogrzeby, integracje firmowe.",
        "telephone": SITE["tel"],
        "email": SITE["email"],
        "url": SITE["domain"],
        "logo": SITE["domain"] + "/assets/img/logo.png",
        "image": SITE["domain"] + "/assets/img/og-image.png",
        "areaServed": "PL",
    }
    page(
        "index.html",
        "Autokary Kron — wynajem autokaru z kierowcą | 505 434 624",
        "Autokary Kron — wynajem autokaru z kierowcą. Wyjazdy integracyjne, zielone szkoły, kolonie, wyjazdy letnie i zimowe, śluby, wesela, pogrzeby i integracje firmowe. Tel. 505 434 624.",
        body,
        "home",
        schema,
    )


def build_service(s):
    points = "".join(
        f'<div class="feat" data-reveal style="--d:{i * 90}ms"><span class="feat__ic">{ic(icn)}</span><h3 class="feat__t">{t}</h3><p class="feat__p">{p}</p></div>'
        for i, (icn, t, p) in enumerate(s["points"])
    )
    who = "".join(f'<li data-reveal style="--d:{i * 50}ms">{ic("check")}{w}</li>' for i, w in enumerate(s["for"]))
    gallery = "".join(
        media("assets/img/zdjecia/" + f, lbl, "gal__item", lightbox=True) for f, lbl in s["imgs"]
    )
    intro = "".join(f'<p data-reveal style="--d:{i * 100}ms">{p}</p>' for i, p in enumerate(s["intro"]))
    body = f"""
{page_hero(ic(s['icon']) + ' ' + s['eyebrow'], s['title'], s['lead'], 'assets/img/zdjecia/' + s['slug'] + '-naglowek.jpg', [('Start', 'index.html'), ('Oferta', 'index.html#oferta'), (s['title'], '')], deco=s['icon'])}

<section class="sec">
  <div class="container split split--rev">
    <div class="split__txt prose">
      {section_head('O usłudze', s['h2'], center=False)}
      {intro}
      <div class="hero__cta" data-reveal style="--d:200ms">
        <a class="btn btn--gold" href="kontakt.html#wycena">Zapytaj o termin {ic('arrow')}</a>
      </div>
    </div>
    <div class="split__media" data-reveal="right">
      {media('assets/img/zdjecia/' + s['slug'] + '.jpg', s['title'] + ' — zdjęcie główne (1200×1400)', 'media--tall', lightbox=True)}
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="container">
    {section_head('Co zapewniamy', 'Wszystko, czego <em class="gold-text">potrzebujesz</em>')}
    <div class="feats feats--4">{points}</div>
  </div>
</section>

<section class="sec">
  <div class="container who">
    <div>
      {section_head('Dla kogo', 'Realizujemy m.in.', center=False)}
      <ul class="who__list">{who}</ul>
    </div>
    <div class="gal" data-reveal="right">{gallery}</div>
  </div>
</section>

{bus_road()}
{cta_band('Zarezerwuj autokar — ' + s['title'].lower(), 'Podaj termin, trasę i liczbę osób. Bezpłatna wycena, bez zobowiązań.')}

<section class="sec sec--alt">
  <div class="container">
    {section_head('Zobacz też', 'Pozostałe <em class="gold-text">usługi</em>')}
    <div class="grid3 grid3--more">{service_cards(exclude=s['slug'])}</div>
  </div>
</section>
"""
    page(
        s["slug"] + ".html",
        s["title"] + " — przewóz autokarem",
        f"{s['title']} — wynajem autokaru z kierowcą. {s['short']} Tel. {SITE['phone']}.",
        body,
        "oferta",
    )


def build_autokar():
    eq = "".join(
        f'<div class="feat feat--sm" data-reveal style="--d:{i * 60}ms"><span class="feat__ic">{ic(icn)}</span><h3 class="feat__t">{t}</h3><p class="feat__p">{p}</p></div>'
        for i, (icn, t, p) in enumerate(EQUIPMENT)
    )
    specs = [
        ("Marka i model", "do uzupełnienia"),
        ("Liczba miejsc", "do uzupełnienia"),
        ("Rok produkcji", "do uzupełnienia"),
        ("Norma emisji spalin", "do uzupełnienia"),
        ("Luk bagażowy", "pojemny, na walizki i sprzęt"),
        ("Zasięg przewozów", SITE["area"]),
    ]
    spec_rows = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in specs)
    gallery = "".join(
        media(f"assets/img/zdjecia/autokar-{i}.jpg", lbl, "gal__item", lightbox=True)
        for i, lbl in [(1, "Autokar — widok z boku"), (2, "Wnętrze autokaru"), (3, "Fotele pasażerów"), (4, "Autokar z przodu"), (5, "Luk bagażowy"), (6, "Stanowisko kierowcy")]
    )
    body = f"""
{page_hero(ic('bus') + ' Flota', 'Nasz autokar', 'Jeden autokar — w pełni do Twojej dyspozycji. Zadbany, komfortowy i przygotowany na każdą trasę.', 'assets/img/zdjecia/autokar-naglowek.jpg', [('Start', 'index.html'), ('Nasz autokar', '')], deco='bus')}

<section class="sec">
  <div class="container">
    {section_head('Galeria', 'Zobacz nasz <em class="gold-text">autokar</em>', 'Kliknij zdjęcie, aby je powiększyć.')}
    <div class="gal gal--6">{gallery}</div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="container">
    {section_head('Wyposażenie', 'Na pokładzie <em class="gold-text">znajdziesz</em>')}
    <div class="feats feats--4">{eq}</div>
  </div>
</section>

<section class="sec">
  <div class="container split split--top">
    <div class="split__txt">
      {section_head('Dane techniczne', 'Specyfikacja', 'Szczegółowe dane autokaru — chętnie odpowiemy też na pytania telefonicznie.', center=False)}
      <table class="spec" data-reveal><tbody>{spec_rows}</tbody></table>
    </div>
    <div class="split__txt">
      {section_head('Bezpieczeństwo', 'Dbamy o każdy <em class="gold-text">kilometr</em>', center=False)}
      <ul class="who__list who__list--1">
        <li data-reveal>{ic('wrench')}Regularny serwis i przeglądy techniczne</li>
        <li data-reveal style="--d:60ms">{ic('belt')}Pasy bezpieczeństwa przy każdym fotelu</li>
        <li data-reveal style="--d:120ms">{ic('check')}Możliwość kontroli autokaru przed wyjazdem</li>
        <li data-reveal style="--d:180ms">{ic('clock')}Przestrzeganie czasu pracy kierowcy i przerw</li>
        <li data-reveal style="--d:240ms">{ic('shield')}Ubezpieczenie OC i NNW pasażerów</li>
      </ul>
    </div>
  </div>
</section>

{bus_road()}
{cta_band()}
"""
    page(
        "autokar.html",
        "Nasz autokar — wyposażenie i galeria",
        "Poznaj autokar Autokary Kron: klimatyzacja, wygodne fotele, pasy bezpieczeństwa, duży luk bagażowy. Galeria zdjęć i wyposażenie. Tel. 505 434 624.",
        body,
        "autokar",
    )


def build_certs():
    cards = "".join(
        f"""<div class="cert" data-reveal style="--d:{(i % 3) * 90}ms">{media('assets/img/certyfikaty/' + f, t, 'cert__img', lightbox=True, ratio='3/4')}<div class="cert__body"><h3>{t}</h3><p>{d}</p><span class="badge">Wkrótce</span></div></div>"""
        for i, (f, t, d) in enumerate(CERTS)
    )
    body = f"""
{page_hero(ic('award') + ' Dokumenty', 'Certyfikaty i uprawnienia', 'Przewóz osób to odpowiedzialność. Dlatego działamy w oparciu o wymagane licencje, uprawnienia i ubezpieczenia.', 'assets/img/zdjecia/certyfikaty-naglowek.jpg', [('Start', 'index.html'), ('Certyfikaty', '')], deco='award')}

<section class="sec">
  <div class="container">
    {section_head('Nasze dokumenty', 'Przejrzystość i <em class="gold-text">zaufanie</em>', 'Poniżej znajdziesz certyfikaty i uprawnienia przewoźnika. Kliknij dokument, aby go powiększyć. Kolejne dokumenty są w przygotowaniu.')}
    <div class="grid3 grid3--certs">{cards}</div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="container narrow center-text">
    {section_head('Dla szkół i instytucji', 'Potrzebujesz kopii dokumentów?', 'Szkoły, organizatorzy wypoczynku i firmy często potrzebują kopii uprawnień przewoźnika do dokumentacji wycieczki. Prześlemy je na życzenie — wystarczy telefon lub e-mail.')}
    <div class="cta__btns" data-reveal>
      <a class="btn btn--gold" href="tel:{SITE['tel']}">{ic('phone')} {SITE['phone']}</a>
      <a class="btn btn--ghost" href="mailto:{SITE['email']}">{ic('mail')} {SITE['email']}</a>
    </div>
  </div>
</section>
"""
    page(
        "certyfikaty.html",
        "Certyfikaty i uprawnienia przewoźnika",
        "Certyfikaty, licencje i uprawnienia Autokary Kron. Bezpieczny, legalny przewóz osób autokarem. Tel. 505 434 624.",
        body,
        "certyfikaty",
    )


def build_contact():
    body = f"""
{page_hero(ic('chat') + ' Kontakt', 'Kontakt i wycena', 'Zadzwoń albo zostaw zapytanie — przygotujemy bezpłatną wycenę dopasowaną do Twojej trasy.', 'assets/img/zdjecia/kontakt-naglowek.jpg', [('Start', 'index.html'), ('Kontakt', '')], deco='phone')}

<section class="sec">
  <div class="container">
    <div class="ccards">
      <a class="ccard tilt" href="tel:{SITE['tel']}" data-reveal><span class="feat__ic">{ic('phone')}</span><h3>Telefon</h3><p>{SITE['phone']}</p><span class="tilt__glare" aria-hidden="true"></span></a>
      <a class="ccard tilt" href="mailto:{SITE['email']}" data-reveal style="--d:90ms"><span class="feat__ic">{ic('mail')}</span><h3>E-mail</h3><p>{SITE['email']}</p><span class="tilt__glare" aria-hidden="true"></span></a>
      <div class="ccard tilt" data-reveal style="--d:180ms"><span class="feat__ic">{ic('clock')}</span><h3>Godziny kontaktu</h3><p>{SITE['hours']}</p><span class="tilt__glare" aria-hidden="true"></span></div>
      <div class="ccard tilt" data-reveal style="--d:270ms"><span class="feat__ic">{ic('map')}</span><h3>Zasięg</h3><p>{SITE['area']}</p><span class="tilt__glare" aria-hidden="true"></span></div>
    </div>
  </div>
</section>

<section class="sec sec--alt" id="wycena">
  <div class="container contact">
    <div class="contact__info">
      {section_head('Formularz', 'Zapytanie o <em class="gold-text">wycenę</em>', 'Im więcej szczegółów podasz, tym dokładniejsza będzie wycena. Odpowiadamy najszybciej, jak to możliwe — zwykle tego samego dnia.', center=False)}
      <ul class="who__list who__list--1">
        <li data-reveal>{ic('check')}Wycena bezpłatna i niezobowiązująca</li>
        <li data-reveal style="--d:60ms">{ic('check')}Bezpośredni kontakt z przewoźnikiem</li>
        <li data-reveal style="--d:120ms">{ic('check')}Faktura VAT do każdego przejazdu</li>
      </ul>
      <div class="map" data-reveal>{media('assets/img/zdjecia/mapa.jpg', 'Miejsce na mapę / zdjęcie siedziby', 'media--map')}</div>
    </div>
    <div class="contact__form" data-reveal="right">{quote_form()}</div>
  </div>
</section>
"""
    page(
        "kontakt.html",
        "Kontakt — wycena przejazdu autokarem",
        "Skontaktuj się z Autokary Kron: tel. 505 434 624. Bezpłatna wycena wynajmu autokaru z kierowcą.",
        body,
        "kontakt",
    )


def build_privacy():
    body = f"""
{page_hero(ic('doc') + ' Informacje', 'Polityka prywatności', 'Zasady przetwarzania danych osobowych w serwisie Autokary Kron.', 'assets/img/zdjecia/kontakt-naglowek.jpg', [('Start', 'index.html'), ('Polityka prywatności', '')], deco='doc')}
<section class="sec">
  <div class="container narrow prose legal">
    <h2>1. Administrator danych</h2>
    <p>Administratorem danych osobowych jest Autokary Kron [pełna nazwa firmy, adres, NIP — do uzupełnienia], tel. {SITE['phone']}, e-mail: {SITE['email']}.</p>
    <h2>2. Cel i podstawa przetwarzania</h2>
    <p>Dane podane w formularzu kontaktowym lub przekazane telefonicznie (imię i nazwisko, telefon, e-mail, szczegóły przejazdu) przetwarzamy w celu przygotowania wyceny, odpowiedzi na zapytanie i realizacji usługi przewozu (art. 6 ust. 1 lit. a, b i f RODO).</p>
    <h2>3. Okres przechowywania</h2>
    <p>Dane przechowujemy przez czas potrzebny do obsługi zapytania, a w przypadku zawarcia umowy — przez okres wymagany przepisami prawa (m.in. podatkowymi).</p>
    <h2>4. Odbiorcy danych</h2>
    <p>Dane mogą być powierzane wyłącznie podmiotom wspierającym nas technicznie (np. dostawcy hostingu i poczty e-mail). Nie sprzedajemy danych i nie przekazujemy ich do celów marketingowych.</p>
    <h2>5. Twoje prawa</h2>
    <p>Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia, wniesienia sprzeciwu oraz cofnięcia zgody w dowolnym momencie. Przysługuje Ci też prawo wniesienia skargi do Prezesa UODO.</p>
    <h2>6. Pliki cookies</h2>
    <p>Strona nie używa plików cookies do celów marketingowych ani analitycznych. Czcionki ładowane są z serwerów Google Fonts.</p>
  </div>
</section>
"""
    page("polityka-prywatnosci.html", "Polityka prywatności", "Polityka prywatności serwisu Autokary Kron.", body)


def build_404():
    body = f"""
<section class="nf">
  <canvas class="dust" aria-hidden="true"></canvas>
  <div class="container center-text">
    <p class="nf__code gold-text">404</p>
    <h1 class="sh__t">Zjechaliśmy z trasy</h1>
    <p class="sh__p">Takiej strony nie ma. Wróć na stronę główną albo zadzwoń — chętnie pomożemy.</p>
    <div class="cta__btns">
      <a class="btn btn--gold" href="index.html">Strona główna {ic('arrow')}</a>
      <a class="btn btn--ghost" href="tel:{SITE['tel']}">{ic('phone')} {SITE['phone']}</a>
    </div>
  </div>
</section>
"""
    page("404.html", "Nie znaleziono strony", "Strona nie istnieje.", body, base=True)


def build_extras():
    pages = ["", "autokar.html", "certyfikaty.html", "kontakt.html"] + [s["slug"] + ".html" for s in SERVICES]
    urls = "".join(f"<url><loc>{SITE['domain']}/{p}</loc></url>" for p in pages)
    (OUT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n',
        encoding="utf-8",
    )
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE['domain']}/sitemap.xml\n", encoding="utf-8")


if __name__ == "__main__":
    build_index()
    for s in SERVICES:
        build_service(s)
    build_autokar()
    build_certs()
    build_contact()
    build_privacy()
    build_404()
    build_extras()
    print("Zbudowano:", ", ".join(sorted(p.name for p in OUT.glob("*.html"))))
