# TrueNAS 24/7 — frontend + backend na jednym adresie

Ten wariant jest docelowy: TrueNAS serwuje **i frontend, i API** pod jednym
adresem HTTPS z Tailscale. Nie trzeba wtedy trzymać włączonego komputera z
Windows.

Docelowy adres:

```text
https://truenas-scale-1.tail9c1f91.ts.net/
```

- `/` → zbudowana PWA z `frontend/dist`
- `/api/v1/*` → FastAPI (ten sam kontener, port 8000)
- Tailscale Serve na TrueNAS już przekazuje `/` na `localhost:8000`

## Gdzie leżą pliki

Na komputerze z Windows dataset jest pod `U:\` (albo
`\\192.168.50.63\dash`). Na TrueNAS to zwykle:

```text
/mnt/<pool>/dash/garmin-daemon   # backend
/mnt/<pool>/dash/frontend        # frontend (git + dist)
/mnt/<pool>/dash/frontend/dist   # zbudowana PWA
```

Sprawdź nazwę puli:

```bash
zfs list | grep dash
```

## Co już jest przygotowane

- `garmin-daemon/app/main.py` — endpoint `/api/v1/health/body-battery/today`
  i serwowanie `dist/` z `/app/frontend` (jeśli katalog istnieje).
- `garmin-daemon/app/db.py` — tabela `body_battery_samples` + migracja kolumn.
- `garmin-daemon/app/sync.py` — pobiera intraday Body Battery przy synchronizacji.
- `garmin-daemon/docker-compose.yml` — montuje `../frontend/dist:/app/frontend:ro`.
- `frontend/` — repo git i zbudowany `dist/`.

## Aktywacja (jednorazowo, na TrueNAS)

Wymagany dostęp do Shella TrueNAS albo SSH. Bez tego zmiany w backendzie nie
wejdą do działającego kontenera — obraz Dockera zawiera stary kod.

```bash
cd /mnt/<pool>/dash/garmin-daemon

# 1. Przebuduj obraz z nowym kodem
docker build -t garmin-daemon:latest .

# 2. Jeśli używasz docker compose:
docker compose up -d

# 3. Jeśli aplikacja jest zarządzana przez TrueNAS Apps:
#    Apps -> garmin-daemon -> Edit
#    Dodaj mount:
#      Host path:  /mnt/<pool>/dash/frontend/dist
#      Mount path: /app/frontend
#      Read-only:  tak
#    Zapisz / Redeploy.
```

Po restarcie sprawdź:

```bash
curl -s http://localhost:8000/healthz
curl -s -H "X-API-Key: TWOJ_KLUCZ" \
  http://localhost:8000/api/v1/health/body-battery/today
curl -s https://truenas-scale-1.tail9c1f91.ts.net/ | head
```

## Ustawienia w aplikacji

Gdy otwierasz aplikację z adresu TrueNAS:

- **Adres API** — zostaw **puste** (ten sam origin),
- **Klucz API (X-API-Key)** — wpisz klucz backendu.

Gdy otwierasz ją z GitHub Pages:

- **Adres API** — `https://truenas-scale-1.tail9c1f91.ts.net`,
- **Klucz API** — jak wyżej.

## Aktualizacja frontendu

Na komputerze z Node.js:

```powershell
cd C:\Users\Admi\Documents\garmin-pulpit
npm run build
robocopy .\dist U:\frontend\dist /MIR
```

Albo skopiuj nowy `dist` z artefaktu GitHub Actions. Service worker sam wykryje
nowy `BUILD_ID` i przeładuje stronę.

## Aktualizacja backendu

Po zmianie kodu w `garmin-daemon` powtórz `docker build` i restart aplikacji.
Baza `data/garmin.db` i tokeny `tokens/` są poza obrazem, więc nie znikną.
