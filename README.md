# Garmin Pulpit — PWA zdrowia i treningu

Ciemny, responsywny pulpit treningowy oparty na danych z Garmin Connect. Aplikacja
pokazuje gotowość, Body Battery, HRV, sen, VO2max, tętno spoczynkowe, obciążenie
(ACR/CTL/ATL/TSB), predykcje startowe oraz trenera AI (Gemini 2.5 Flash) z planem
tygodnia i czatem kontekstowym.

> **Część 2 + 3.** Backend (FastAPI + integracja z Garmin Connect) jest osobnym
> projektem i nie jest generowany przez tę aplikację. Frontend działa z dowolnym
> API zgodnym z opisanym kontraktem albo w trybie demo.

---

## Spis treści

1. [Funkcje](#funkcje)
2. [Stos technologiczny](#stos-technologiczny)
3. [Wymagania](#wymagania)
4. [Szybki start](#szybki-start)
5. [Konfiguracja API](#konfiguracja-api)
6. [Kontrakt endpointów](#kontrakt-endpointów)
7. [Trener AI — Gemini](#trener-ai--gemini)
8. [PWA i instalacja](#pwa-i-instalacja)
9. [Build produkcyjny](#build-produkcyjny)
10. [Wdrożenie](#wdrożenie)
11. [Zmienne środowiskowe](#zmienne-środowiskowe)
12. [Struktura projektu](#struktura-projektu)
13. [Rozwiązywanie problemów](#rozwiązywanie-problemów)
14. [Bezpieczeństwo i prywatność](#bezpieczeństwo-i-prywatność)

---

## Funkcje

### Pulpit zdrowia (`#/pulpit`)

- pierścień **gotowości treningowej** (Training Readiness) z opisem i kolorem,
- **Body Battery** (wartość, zakres dnia, naładowanie/rozładowanie) + wykres 24 h,
- **HRV** — wartość nocna, średnia 7 dni, baseline i trend 21 dni,
- **sen** — ocena, czas, fazy (głęboki/REM/lekki/czuwanie),
- **VO2max**, **RHR**, **status treningowy**, **ACR**,
- ostatnie aktywności i skrót analizy AI,
- baner trybu demo, gdy API jest niedostępne.

### Progresja i analityka (`#/analityka`)

- **CTL (Fitness)**, **ATL (Fatigue)**, **TSB (Forma)** i **ACR**,
- wykres TSB z legendą stref,
- obciążenie acute vs chronic (30 dni),
- objętość tygodniowa według dyscypliny,
- podział dyscyplin (donut),
- strefy tętna (Z1–Z5),
- fazy snu,
- tabela aktywności z filtrem zakresu 14/30/90 dni.

### Predykcje (`#/predykcje`)

- czasy na **5 km, 10 km, półmaraton i maraton**,
- model **Danielsa** na bazie VO2max oraz **wzór Riegla** na bazie ostatnich biegów,
- poziom pewności i uzasadnienie,
- edycja celów startowych i porównanie „prognoza vs cel”,
- trend VO2max.

### Trener AI (`#/trener`)

- **plan tygodniowy** generowany jako JSON i renderowany jako karty dni,
- **korekta planu** — pole tekstowe z wskazówkami (np. „przełóż long run na sobotę”),
- **czat** ze streamingiem odpowiedzi (SSE) i pełnym kontekstem metryk,
- polski system prompt, priorytet bezpieczeństwa i regeneracji,
- klucz Gemini przechowywany lokalnie w przeglądarce.

### Ustawienia (`#/ustawienia`)

- adres API (sieć lokalna / Tailscale / ten sam origin),
- **klucz API (`X-API-Key`)** wymagany przez backend,
- test połączenia i ręczne odświeżenie,
- tryb demo i automatyczne odświeżanie,
- klucz i model Gemini,
- profil zawodnika i cele startowe,
- instalacja PWA,
- eksport danych do JSON, czyszczenie danych lokalnych,
- diagnostyka (liczba dni, aktywności, zakres historii).

---

## Stos technologiczny

| Warstwa | Technologia |
| --- | --- |
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Styl | Tailwind CSS 3 (dark mode, slate/zinc + emerald/cyan/indigo) |
| Ikony | Lucide React |
| Wykresy | Recharts |
| Routing | hash routing (`#/pulpit`, `#/analityka`, …) — bez dodatkowej zależności |
| PWA | `manifest.json` + własny service worker |
| AI | Gemini API (model „auto” = najnowszy Flash) przez REST + SSE |

Brak routera i brak SDK Gemini — mniej zależności i prostszy deploy statyczny.

---

## Wymagania

- **Node.js 20+** (zalecane 22 LTS) i npm,
- backend FastAPI zgodny z [kontraktem](#kontrakt-endpointów) **albo** tryb demo,
- opcjonalnie klucz **Google AI Studio** do funkcji trenera AI,
- do instalacji PWA na telefonie: **HTTPS** (wyjątek: `localhost`).

---

## Szybki start

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev
```

Aplikacja startuje na `http://localhost:5173`.

W trybie dev żądania `/api/*` są przekierowywane przez proxy Vite na
`http://localhost:8000` (zmienna `VITE_API_PROXY_TARGET`). Dzięki temu nie trzeba
konfigurować CORS podczas developmentu.

Skrypty:

```bash
npm run dev        # serwer developerski (Vite)
npm run typecheck  # tylko TypeScript
npm run build      # typecheck + build do dist/
npm run preview    # podgląd builda na http://localhost:4173
```

Jeśli backend nie działa, aplikacja **nie pokazuje pustego ekranu** — przełącza się
na deterministyczne dane demonstracyjne i wyświetla bursztynowy baner z przyczyną.
Tryb demo można też włączyć na stałe w Ustawieniach.

---

## Konfiguracja API

Adres backendu ustawiasz w **Ustawienia → Połączenie z API** lub przez
`VITE_API_BASE_URL` w `.env` (wartość domyślna przy pierwszym uruchomieniu).

Puste pole oznacza **ten sam origin**:

- w dev — proxy Vite (`/api` → `localhost:8000`),
- w produkcji — np. nginx przepisujący `/api/` na backend (patrz [Wdrożenie](#wdrożenie)).

### Klucz API (X-API-Key)

Backend wymaga nagłówka `X-API-Key`. Wpisz go w **Ustawienia → Połączenie z API →
Klucz API (X-API-Key)**:

- klucz zapisuje się w `localStorage` tej przeglądarki (na telefonie i komputerze
  osobno),
- jest dołączany do każdego żądania jako `X-API-Key`,
- puste pole oznacza brak nagłówka,
- po zmianie klucza dane odświeżają się automatycznie.

Gdy API odpowie `401` / `403`, aplikacja pokaże w banerze **„API wymaga klucza
dostępu”** i przycisk prowadzący prosto do pola z kluczem.

> Klucz jest widoczny dla każdego, kto ma dostęp do urządzenia. Nie wpisuj go do
> `.env` ani do kodu źródłowego — `VITE_*` trafia do publicznego bundla JS.

### Sieć lokalna

```text
http://192.168.1.50:8000
```

Wymagania:

1. Backend nasłuchuje na `0.0.0.0`, nie tylko `127.0.0.1`:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. Frontend i telefon są w tej samej sieci Wi-Fi.
3. CORS po stronie FastAPI dopuszcza origin frontendu.

### Tailscale (zalecane do telefonu i PWA)

Tailscale daje prywatny adres HTTPS w obrębie Twojego tailnetu, np.:

```text
https://garmin-api.twojanazwa.ts.net
```

Możesz wystawić sam backend:

```bash
tailscale serve --bg 8000
```

albo cały frontend (nginx na porcie 8080):

```bash
tailscale serve --bg 8080
```

Adres HTTPS jest ważny, bo:

- PWA i service worker wymagają bezpiecznego kontekstu,
- iPhone nie zainstaluje aplikacji z `http://192.168.x.x`,
- mieszanie HTTPS frontendu z HTTP API jest blokowane przez przeglądarkę
  (mixed content).

### CORS w FastAPI

Przykład:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://garmin.twojanazwa.ts.net",
        "https://twojanazwa.github.io",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["X-API-Key", "Content-Type"],
)
```

Jeśli frontend i API są na tym samym origin (nginx proxy), CORS nie jest potrzebny.
Nagłówek `X-API-Key` jest niestandardowy, więc przeglądarka wysyła najpierw
`OPTIONS` — FastAPI musi go dopuścić (powyższa konfiguracja to robi).

### Test połączenia

W Ustawieniach kliknij **Testuj połączenie**. Aplikacja woła
`GET /api/v1/health/summary` z timeoutem 10 s i pokazuje status oraz opóźnienie.

---

## Kontrakt endpointów

Frontend jest tolerancyjny: akceptuje `snake_case` i `camelCase`, obiekty zagnieżdżone
(np. `dailySleepDTO`, `activityType.typeKey`) oraz kilka aliasów pól. Poniżej
**zalecany minimalny kontrakt**.

Bazowy prefiks: `/api/v1`.

### `GET /health/summary`

```json
{
  "date": "2026-11-01",
  "readiness": 77,
  "readinessLabel": "MODERATE",
  "bodyBattery": {
    "current": 67,
    "max": 94,
    "min": 16,
    "charged": 61,
    "drained": 57
  },
  "hrv": {
    "nightlyAvg": 64,
    "weeklyAvg": 60,
    "status": "BALANCED",
    "baselineLow": 50,
    "baselineHigh": 64
  },
  "sleep": {
    "score": 80,
    "durationMin": 489,
    "deepMin": 69,
    "remMin": 102,
    "lightMin": 236,
    "awakeMin": 22,
    "quality": "GOOD"
  },
  "vo2max": 54.2,
  "restingHr": 51,
  "acuteLoad": 490,
  "chronicLoad": 495,
  "acr": 0.99,
  "trainingStatus": "PRODUCTIVE",
  "steps": 12246,
  "updatedAt": "2026-11-01T06:30:00Z"
}
```

### `GET /health/history?days=120`

```json
{
  "history": [
    {
      "date": "2026-11-01",
      "readiness": 77,
      "hrv": { "nightlyAvg": 64, "weeklyAvg": 60, "status": "BALANCED" },
      "sleep": { "score": 80, "durationMin": 489, "deepMin": 69, "remMin": 102 },
      "vo2max": 54.2,
      "restingHr": 51,
      "acuteLoad": 490,
      "chronicLoad": 495,
      "acr": 0.99
    }
  ]
}
```

Może też być zwykła tablica dni. Frontend sortuje po dacie i deduplikuje.

### `GET /activities/recent?limit=60`

```json
{
  "activities": [
    {
      "id": "123",
      "name": "Bieg spokojny",
      "activityType": { "typeKey": "running" },
      "startTime": "2026-10-30T18:12:00+01:00",
      "durationSec": 3180,
      "distanceM": 9720,
      "avgHr": 141,
      "maxHr": 156,
      "calories": 612,
      "trainingLoad": 51,
      "aerobicTe": 3.1,
      "elevationGainM": 64,
      "hrZones": [120, 900, 1800, 300, 60]
    }
  ]
}
```

`hrZones` to sekundy w Z1–Z5 (5 liczb). Obsługiwane są też pola
`hrTimeInZone_1..5` oraz obiekt `{ "z1": ... }`.

### `GET /tsb?days=120`

```json
{
  "current": { "date": "2026-11-01", "ctl": 51.9, "atl": 45.9, "tsb": 6.0 },
  "history": [
    { "date": "2026-11-01", "ctl": 51.9, "atl": 45.9, "tsb": 6.0 }
  ]
}
```

Jeśli backend nie zwraca TSB, frontend liczy je sam z aktywności
(wygładzenie CTL 42 dni, ATL 7 dni, `TSB = CTL − ATL`).

### `GET /health/body-battery/today`

```json
{
  "samples": [
    { "time": "2026-11-01T06:00:00+01:00", "level": 34 },
    { "time": "2026-11-01T06:30:00+01:00", "level": 36 }
  ]
}
```

Obsługiwana jest też tablica par `[[timestamp, level], ...]`.

### `POST /sync`

Uruchamia synchronizację z Garmin Connect. Frontend czeka do 90 s.

```json
{ "status": "ok" }
```

### Zachowanie przy błędach

- `GET /health/summary` jest wymagane — jego błąd oznacza fallback do demo.
- Historia, aktywności, TSB i Body Battery są opcjonalne; ich błąd nie blokuje widoku.
- Każde żądanie ma timeout (15 s, sync 90 s) i przyjazny komunikat po polsku.

---

## Trener AI — Gemini

1. Wejdź na [Google AI Studio](https://aistudio.google.com/app/apikey) i utwórz klucz.
2. Wklej go w **Ustawienia → Trener AI — Gemini**.
3. Model zostaw na `auto` — aplikacja sama wybiera najnowszy dostępny Flash i przełącza się, gdy Google wycofa stary.

Klucz jest zapisywany w `localStorage` przeglądarki i wysyłany **bezpośrednio do
Google** (`generativelanguage.googleapis.com`). Nie przechodzi przez backend.

### Co robi trener

- Buduje kompaktowy kontekst z: gotowości, HRV, snu, Body Battery, VO2max, RHR,
  ACR, TSB, stref tętna, aktywności z 7 dni i celów zawodnika.
- **Czat** — streaming SSE, historia do 20 wiadomości, polski system prompt,
  struktura odpowiedzi: werdykt → analiza → rekomendacja.
- **Plan tygodnia** — model zwraca wyłącznie JSON, który frontend waliduje i
  renderuje. Dzień wolny ma automatycznie `load = 0` i intensywność „wolne”.
- **Korekta planu** — pole tekstowe dodaje wskazówki do promptu przy kolejnym
  generowaniu (np. zmiana dni, ograniczenie objętości, kontuzja).

### Bezpieczeństwo klucza

Klucz w przeglądarce jest widoczny dla każdego, kto ma dostęp do urządzenia.
W Google Cloud:

- ogranicz klucz do **Generative Language API**,
- jeśli to możliwe, ustaw ograniczenie domeny/HTTP referrer,
- nie commituj `.env` z kluczem,
- w aplikacji wieloużytkownikowej wdróż proxy backendowe, które ukryje klucz.

Darmowy tier Gemini ma limity zapytań — przy błędzie 429 aplikacja pokazuje
konkretny komunikat.

---

## PWA i instalacja

Aplikacja zawiera:

- `public/manifest.json` — nazwa, ikony 192/512/maskable, `display: standalone`,
  `theme_color` i `background_color: #0f172a`, skróty do widoków,
- `public/service-worker.js`:
  - nawigacja HTML — network-first z fallbackiem offline,
  - `GET /api/*` — network-first + cache ostatniej odpowiedzi,
  - assety (JS/CSS/obrazy/fonty) — stale-while-revalidate,
  - czyszczenie starych cache przy aktywacji,
- przycisk **Zainstaluj aplikację** (`beforeinstallprompt`) oraz instrukcję dla iOS.

### Instalacja

- **Android/Chrome/Edge:** menu → „Zainstaluj aplikację” lub przycisk w aplikacji.
- **iPhone/iPad:** Safari → Udostępnij → „Dodaj do ekranu początkowego”.
- Wymagany **HTTPS** (lub `localhost`). Adres Tailscale `https://…ts.net` spełnia
  ten warunek; zwykły `http://192.168.x.x` zwykle nie pozwoli na instalację.

### Automatyczne aktualizacje

Nie ma ręcznego numeru wersji do podnoszenia. Przy każdym buildzie
`vite.config.ts` wstawia do `public/service-worker.js` unikalny `BUILD_ID`
(SHA commita na GitHub Actions, w przeciwnym razie data i godzina). Dzięki temu:

1. przeglądarka wykrywa nowy plik service workera,
2. nowy worker wywołuje `skipWaiting()` i usuwa stare cache,
3. strona odświeża się sama (`controllerchange` w `src/lib/pwa.ts`).

Sprawdzanie odbywa się przy starcie, co minutę, po powrocie do karty i po
odzyskaniu sieci. W Ustawieniach jest też przycisk **Sprawdź aktualizację**,
a aktualny build widać w **Ustawienia → Dane i diagnostyka → Wersja**.

Po `git push` na `main` GitHub Actions buduje i publikuje nową wersję — nic więcej
nie trzeba robić. Jeśli widzisz starą wersję, sprawdź w zakładce Actions, czy
deploy się udał, i odśwież stronę.

---

## Build produkcyjny

```bash
npm run build
npm run preview   # http://localhost:4173
```

Wynik trafia do `dist/`. To zwykłe pliki statyczne — możesz je hostować na nginx,
Caddy, Cloudflare Pages, Netlify, Vercel, Synology itp.

Ważne:

- routing jest oparty o hash, więc nie wymaga przepisywania ścieżek, ale warto
  ustawić fallback `index.html` dla ścieżek bez hasha,
- `service-worker.js` i `manifest.json` serwuj z `Cache-Control: no-cache`,
- pliki z `assets/` mają hash w nazwie — mogą być cache'owane na długo,
- jeśli frontend i API są na różnych originach, ustaw `VITE_API_BASE_URL` **przed
  buildem** albo adres w Ustawieniach po wdrożeniu.

---

## Wdrożenie

### 1. GitHub Pages + Tailscale (zalecane)

Frontend jako statyczna PWA na GitHub Pages, backend wystawiony przez Tailscale.
Nie trzeba utrzymywać własnego serwera WWW ani Dockera.

**Frontend:**

1. Wrzuć projekt do repozytorium GitHub i wypchnij gałąź `main`.
2. W repozytorium: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Gotowy workflow `.github/workflows/deploy.yml` zbuduje projekt i opublikuje
   `dist/` przy każdym pushu na `main`.
4. Adres aplikacji: `https://twojanazwa.github.io/garmin-pulpit/`
   (albo `https://twojanazwa.github.io/`, jeśli repo nazywa się
   `twojanazwa.github.io`).

Workflow sam ustawia `VITE_BASE` (ścieżkę podkatalogu), więc manifest, ikony i
service worker działają także w repo bez własnej domeny.

**Backend:**

```bash
# Prywatnie — dostęp tylko z urządzeń zalogowanych do Tailscale (zalecane).
tailscale serve --bg 8000

# Publicznie w internecie — gdy potrzebujesz dostępu bez instalowania Tailscale.
tailscale funnel --bg 8000
```

Otrzymasz adres HTTPS, np. `https://garmin.tailxxxx.ts.net`. Wklej go w
**Ustawienia → Adres API**, a klucz w **Klucz API (X-API-Key)**.

Dlaczego `serve`, a nie `funnel`: `serve` nie wystawia API do internetu — działa
tylko w Twoim tailnecie, a certyfikat HTTPS i tak jest ważny, więc PWA instaluje
się na telefonie. `funnel` jest publiczny, więc jedyną ochroną danych jest klucz
API — ustaw długi, losowy klucz i nie udostępniaj adresu.

W FastAPI dodaj origin GitHub Pages do CORS (patrz [CORS](#cors-w-fastapi)) i
pamiętaj o `allow_headers=["X-API-Key", "Content-Type"]`.

### 2. Docker + nginx (jeden origin, bez CORS)

W katalogu projektu:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Aplikacja: `http://localhost:8080`.

Compose buduje frontend i uruchamia nginx, który:

- serwuje `dist/`,
- proxuje `/api/` na `BACKEND_URL` (domyślnie `http://host.docker.internal:8000`),
- ustawia cache dla assetów i service workera.

Zmiana adresu backendu:

```yaml
environment:
  BACKEND_URL: http://garmin-api:8000
```

Jeśli backend jest w tym samym compose, dodaj go jako usługę i użyj jej nazwy.
Na Linuksie `host.docker.internal` działa dzięki `extra_hosts: host-gateway`
(już ustawione).

Ręczny build:

```bash
docker build -f deploy/Dockerfile -t garmin-pulpit .
docker run --rm -p 8080:80 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  --add-host=host.docker.internal:host-gateway \
  garmin-pulpit
```

### 3. Static hosting (Cloudflare Pages / Netlify / Vercel)

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 20 lub 22
- **Env:** `VITE_API_BASE_URL=https://api.twoja-domena.pl` (opcjonalnie)
- **Rewrite:** wszystkie ścieżki → `/index.html` (SPA fallback)

Pamiętaj o HTTPS — inaczej PWA się nie zainstaluje.

### 4. nginx na własnym serwerze

Skopiuj `dist/` do `/var/www/garmin-pulpit` i użyj konfiguracji podobnej do
`deploy/nginx.conf`. Podmień `${BACKEND_URL}` na rzeczywisty adres i dodaj
certyfikat TLS (np. Certbot).

### 5. Tailscale

Najprostszy scenariusz domowy:

```bash
# frontend na porcie 8080 (docker compose)
tailscale serve --bg 8080

# backend na porcie 8000
tailscale serve --bg 8000
```

Otrzymasz dwa adresy HTTPS w tailnecie. W Ustawieniach aplikacji wpisz adres
backendu, a aplikację otwieraj z adresu frontendu.

---

## Zmienne środowiskowe

Plik `.env` (wzór w `.env.example`):

| Zmienna | Domyślnie | Opis |
| --- | --- | --- |
| `VITE_API_BASE_URL` | puste | Bazowy adres API. Puste = ten sam origin. |
| `VITE_BASE` | `/` | Ścieżka bazowa builda (np. `/garmin-pulpit/` dla GitHub Pages). |
| `VITE_API_PROXY_TARGET` | `http://localhost:8000` | Cel proxy Vite w trybie dev. |
| `VITE_GEMINI_API_KEY` | puste | Domyślny klucz Gemini (opcjonalnie). |
| `VITE_GEMINI_MODEL` | `auto` | Model Gemini; `auto` = najnowszy Flash. |

Uwagi:

- Zmienne `VITE_*` są **wbudowywane w build** — nie są tajne.
- Klucz `X-API-Key` celowo **nie jest** zmienną środowiskową — wpisujesz go w
  Ustawieniach, żeby nie trafił do publicznego JS.
- Ustawienia z `.env` są tylko wartościami początkowymi. Późniejsze zmiany w
  Ustawieniach zapisują się w `localStorage` i mają priorytet.
- Aby „zresetować” adres API do wartości z `.env`, wyczyść dane lokalne w
  Ustawieniach.

---

## Struktura projektu

```text
garmin-pulpit/
├─ .github/
│  └─ workflows/
│     └─ deploy.yml        # build + publikacja na GitHub Pages
├─ deploy/
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  └─ nginx.conf
├─ public/
│  ├─ manifest.json
│  ├─ service-worker.js    # auto-aktualizacja, BUILD_ID wstawiany przy buildzie
│  └─ icons/
├─ scripts/
│  └─ render-icons.mjs
├─ src/
│  ├─ components/
│  │  ├─ activities/      # lista i tabela aktywności
│  │  ├─ charts/          # Recharts: Body Battery, HRV, TSB, sen, strefy…
│  │  ├─ coach/           # plan, czat, brak klucza
│  │  ├─ dashboard/       # karty pulpitu
│  │  ├─ layout/          # sidebar, topbar, bottom nav, shell
│  │  └─ ui/              # Card, Badge, Ring, Sheet, Skeleton…
│  ├─ context/            # SettingsContext, HealthDataContext
│  ├─ hooks/              # hash route, PWA install, online status
│  ├─ lib/
│  │  ├─ api.ts           # klient API, timeouty, test połączenia
│  │  ├─ demo.ts          # deterministyczne dane demo
│  │  ├─ format.ts        # daty, liczby, tempo, czas
│  │  ├─ gemini.ts        # prompt, SSE, plan JSON
│  │  ├─ metrics.ts       # TSB, ACR, predykcje, agregacje
│  │  ├─ normalize.ts     # tolerancyjna normalizacja odpowiedzi API
│  │  ├─ pwa.ts           # rejestracja SW i automatyczne aktualizacje
│  │  └─ storage.ts       # localStorage
│  ├─ pages/              # Pulpit, Analityka, Predykcje, Trener, Ustawienia
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ types.ts
├─ index.html
├─ tailwind.config.js
├─ vite.config.ts
└─ package.json
```

---

## Rozwiązywanie problemów

### Baner „Brak połączenia z API — wyświetlam dane demonstracyjne”

- Sprawdź, czy backend działa: `curl http://localhost:8000/api/v1/health/summary`.
- W Ustawieniach kliknij **Testuj połączenie** — zobaczysz status HTTP i komunikat.
- W trybie dev upewnij się, że `VITE_API_PROXY_TARGET` wskazuje właściwy port.
- Na telefonie sprawdź, czy telefon i komputer są w tej samej sieci / tailnecie.

### 401 — brak lub zły X-API-Key

Objaw: `API odrzuciło klucz dostępu (401): Nieprawidłowy lub brakujący X-API-Key`.

- Ustawienia → **Połączenie z API** → **Klucz API (X-API-Key)**,
- wklej klucz bez spacji i cudzysłowów, opuść pole (zapisuje się automatycznie),
- kliknij **Testuj połączenie**,
- na innym urządzeniu (telefon, drugi komputer) klucz trzeba wpisać osobno —
  `localStorage` nie synchronizuje się między przeglądarkami,
- jeśli klucz jest poprawny, a nadal 401, sprawdź, czy backend czyta dokładnie
  nagłówek `X-API-Key` (nazwa jest wrażliwa na wielkość liter w niektórych
  frameworkach).

### Błąd CORS

Objaw: w konsoli „blocked by CORS policy”. Dodaj origin frontendu do
`allow_origins` w FastAPI. W trybie dev najprościej korzystać z proxy Vite i
pustego adresu API.

### Mixed content

Objaw: HTTPS frontend nie może wywołać `http://192.168…`. Rozwiązania:

- wystaw API przez HTTPS (Tailscale, reverse proxy, certyfikat),
- albo serwuj frontend po HTTP w sieci lokalnej (PWA nie zadziała).

### PWA się nie instaluje

- wymagany HTTPS (poza `localhost`),
- `manifest.json` musi być dostępny pod `/manifest.json`,
- ikony 192 i 512 muszą istnieć,
- w DevTools → Application sprawdź, czy service worker jest zarejestrowany,
- na iPhone użyj Safari (Chrome na iOS nie instaluje PWA).

### Stara wersja po wdrożeniu

Aktualizacje są automatyczne — nie ma numeru `VERSION` do podnoszenia. Jeśli
mimo to widzisz starą wersję:

- sprawdź, czy nowy build faktycznie się opublikował (GitHub Actions / hosting),
- porównaj **Ustawienia → Dane i diagnostyka → Wersja** z ostatnim commitem,
- kliknij **Sprawdź aktualizację** w Ustawieniach,
- awaryjnie: DevTools → Application → Storage → Clear site data,
- na telefonie usuń i dodaj ponownie skrót do ekranu głównego.

### Złe daty / przesunięcie strefy czasowej

Daty dzienne (`YYYY-MM-DD`) są parsowane jako **czas lokalny**, a nie UTC — dzięki
temu „1 listopada” nie zamienia się na „31 października”. Jeśli backend zwraca
daty z godziną i strefą, upewnij się, że strefa jest poprawna (`+01:00`).

### Gemini: 400 / 403 / 404 / 429

- 400 — błędny klucz lub model; sprawdź klucz w AI Studio,
- 403 — włącz Generative Language API w Google Cloud,
- 404 — model wycofany; ustaw „auto” w Ustawieniach (aplikacja sama znajdzie najnowszy Flash),
- 429 — limit darmowego tieru; odczekaj lub zmniejsz częstotliwość.

### Pusty ekran po wdrożeniu

- sprawdź, czy `dist/index.html` jest serwowany dla `/`,
- upewnij się, że pliki z `assets/` mają poprawne ścieżki — przy hostingu w
  podkatalogu (GitHub Pages) build musi mieć ustawione `VITE_BASE`, np.
  `/garmin-pulpit/`; workflow GitHub Actions robi to automatycznie,
- zobacz konsolę przeglądarki i zakładkę Network.

### `npm run build` — błąd TypeScript

Uruchom `npm run typecheck`, popraw błędy i zbuduj ponownie. Build celowo nie
przechodzi przy błędach typów.

---

## Bezpieczeństwo i prywatność

- Dane zdrowotne i ustawienia są przechowywane **lokalnie** w `localStorage`.
- Klucz Gemini również jest lokalny i wysyłany bezpośrednio do Google.
- Klucz API (`X-API-Key`) jest lokalny i wysyłany wyłącznie do skonfigurowanego
  backendu. Na publicznym hostingu (GitHub Pages) nie trafia do bundla JS.
- Aplikacja nie wysyła danych do żadnego własnego serwera poza skonfigurowanym API.
- Eksport JSON **nie zawiera** klucza Gemini ani klucza API.
- Aplikacja nie diagnozuje ani nie leczy — omówienie wyników z lekarzem lub
  trenerem na miejscu jest zawsze wskazane.

---

## Status

- Frontend: gotowy (Część 2).
- Wdrożenie i połączenie: opisane powyżej (Część 3).
- Backend: osobny projekt (Część 1) — nie jest częścią tego repozytorium.

Miłego treningu. 🏃‍♂️💪
