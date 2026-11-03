# TrueNAS 24/7 — frontend + backend na jednym adresie

Ten wariant jest **wdrożony i działa**: TrueNAS serwuje i frontend, i API pod
jednym adresem HTTPS z Tailscale.

```text
https://truenas-scale-1.tail9c1f91.ts.net/
```

- `/` → zbudowana PWA z `frontend/dist`
- `/api/v1/*` → FastAPI (ten sam kontener, port 8000)
- Tailscale Serve na TrueNAS przekazuje `/` na `localhost:8000`

## Gdzie leżą pliki

Na Windows dataset jest pod `U:\` (albo `\\192.168.50.63\dash`). Na TrueNAS:

```text
/mnt/Pool1/dash/garmin-daemon          # backend
/mnt/Pool1/dash/garmin-daemon/app      # źródła backendu (montowane do kontenera)
/mnt/Pool1/dash/frontend               # frontend (git + dist)
/mnt/Pool1/dash/frontend/dist          # zbudowana PWA
```

## Jak to jest podłączone

Aplikacja `garmin-daemon` jest **Custom App** w TrueNAS. W jej YAML
(Apps → garmin-daemon → Edit → Custom Config) są dopisane dwa montaże:

```yaml
    volumes:
      - /mnt/Pool1/dash/garmin-daemon/data:/app/data
      - /mnt/Pool1/dash/garmin-daemon/tokens:/app/tokens
      - /mnt/Pool1/dash/garmin-daemon/app:/app/app:ro
      - /mnt/Pool1/dash/frontend/dist:/app/frontend:ro
```

Dzięki temu działający kontener korzysta z **aktualnych źródeł** i serwuje
`dist/` bez przebudowywania obrazu. Obraz `garmin-daemon:latest` zawiera
zależności Pythona; montaż podmienia tylko kod aplikacji.

Po zapisaniu YAML TrueNAS sam robi redeploy. Nie trzeba `docker build`.

## Weryfikacja

```bash
curl -s https://truenas-scale-1.tail9c1f91.ts.net/healthz
curl -s -o /dev/null -w '%{http_code}\n' \
  https://truenas-scale-1.tail9c1f91.ts.net/api/v1/health/body-battery/today
```

Bez klucza endpoint Body Battery zwraca `401` (czyli istnieje), a frontend
zwraca `200` i HTML aplikacji.

Baza `data/garmin.db` po restarcie ma nową tabelę `body_battery_samples` oraz
kolumny `body_battery_current` i `body_battery_drained` w `daily_health`.
Synchronizacja dopisuje do niej próbki intraday.

## Klucz API w aplikacji

Otwórz `https://truenas-scale-1.tail9c1f91.ts.net/`:

- **Adres API** — zostaw **puste** (ten sam origin),
- **Klucz API (X-API-Key)** — wpisz klucz z YAML aplikacji (`API_KEY=...`).

Klucz jest przechowywany tylko w `localStorage` przeglądarki — nie jest
wpisywany do JS ani do repo.

Dla wersji na GitHub Pages:

- **Adres API** — `https://truenas-scale-1.tail9c1f91.ts.net`,
- **Klucz API** — ten sam.

`CORS_ORIGINS` w aplikacji zawiera `https://dgziom1-ctrl.github.io`, więc Pages
może wołać API. Wersja z TrueNAS działa same-origin i nie potrzebuje CORS.

## Aktualizacja frontendu

Na komputerze z Node.js:

```powershell
cd C:\Users\Admi\Documents\garmin-pulpit
npm run build
robocopy .\dist U:\frontend\dist /MIR
```

Service worker sam wykryje nowy `BUILD_ID` i przeładuje stronę. Nie trzeba
restartować aplikacji TrueNAS — `dist` jest montowany jako katalog.

## Aktualizacja backendu

Zmień pliki w `/mnt/Pool1/dash/garmin-daemon/app` (albo przez `U:\garmin-daemon\app`).
Kontener ma je zamontowane, więc wystarczy restart aplikacji w TrueNAS
(Apps → garmin-daemon → Restart), żeby uvicorn wczytał nowy kod.

## Git

- Frontend: `/mnt/Pool1/dash/frontend` — klon
  `https://github.com/dgziom1-ctrl/garmin-pulpit.git`, gałąź `main`.
- Backend: `/mnt/Pool1/dash/garmin-daemon` — lokalne repo git z commitem
  zmian Body Battery + static frontend. `data/`, `tokens/`, `.env` są ignorowane.
