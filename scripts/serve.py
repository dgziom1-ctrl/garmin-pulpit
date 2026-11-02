#!/usr/bin/env python3
"""
Serwer produkcyjny Garmin Pulpit: statyczne dist/ + proxy /api/ do backendu.

Dzięki temu frontend i API są na tym samym origin (jeden adres HTTPS z Tailscale):
- brak CORS,
- brak mixed content (HTTPS -> HTTP),
- service worker i PWA działają normalnie.

Użycie (Windows / Linux, tylko biblioteka standardowa):

    python scripts/serve.py
    BACKEND_URL=http://truenas-scale-1.tail9c1f91.ts.net:8000 python scripts/serve.py

Zmienne środowiskowe:
    BACKEND_URL  domyślnie http://127.0.0.1:8000
    HOST         domyślnie 127.0.0.1 (Tailscale Serve łączy się lokalnie)
    PORT         domyślnie 8080

Wystawienie do tailnetu (na tym samym komputerze):

    tailscale serve --bg 8080
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "dist"
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8080"))

# Pliki, których przeglądarka nie może cache'ować — inaczej zostaje stara wersja.
NO_CACHE = {"service-worker.js", "manifest.json", "index.html"}

MIME_OVERRIDES = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def log(message: str) -> None:
    print(message, flush=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "GarminPulpit"
    protocol_version = "HTTP/1.1"

    # --- logowanie ---------------------------------------------------------
    def log_message(self, fmt: str, *args) -> None:
        log(f"{self.address_string()} {fmt % args}")

    # --- pomocnicze --------------------------------------------------------
    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _resolve_static(self) -> Path | None:
        parsed = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path.startswith("/api/") or path == "/api":
            return None

        relative = path.lstrip("/") or "index.html"
        candidate = (ROOT / relative).resolve()

        # Ochrona przed wyjściem poza katalog dist/.
        if not candidate.is_relative_to(ROOT):
            return None

        if candidate.is_dir():
            candidate = candidate / "index.html"

        if not candidate.is_file():
            # Routing oparty o hash, ale fallback SPA jest bezpieczny.
            candidate = ROOT / "index.html"

        return candidate if candidate.is_file() else None

    # --- proxy /api/ -------------------------------------------------------
    def _proxy(self) -> None:
        target = BACKEND_URL + self.path
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        headers = {}
        for key, value in self.headers.items():
            if key.lower() in {"host", "connection", "accept-encoding"}:
                continue
            headers[key] = value

        request = urllib.request.Request(
            target,
            data=body,
            headers=headers,
            method=self.command,
        )

        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() in {
                        "transfer-encoding",
                        "connection",
                        "content-encoding",
                        "content-length",
                    }:
                        continue
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(payload)

        except urllib.error.HTTPError as error:
            # Błędy 4xx/5xx backendu przekazujemy bez zmian (np. 401 z kluczem).
            payload = error.read()
            self.send_response(error.code)
            for key, value in error.headers.items():
                if key.lower() in {
                    "transfer-encoding",
                    "connection",
                    "content-encoding",
                    "content-length",
                }:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)

        except Exception as error:  # noqa: BLE001 — komunikat trafia do UI
            log(f"Błąd proxy {target}: {error}")
            self._send_json(
                502,
                {"detail": f"Brak połączenia z backendem ({BACKEND_URL}): {error}"},
            )

    # --- pliki statyczne ---------------------------------------------------
    def _serve_static(self, file: Path) -> None:
        try:
            data = file.read_bytes()
        except OSError as error:
            self._send_json(500, {"detail": f"Nie można odczytać pliku: {error}"})
            return

        name = file.name
        suffix = file.suffix.lower()
        content_type = MIME_OVERRIDES.get(
            suffix, "application/octet-stream"
        )

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")

        relative = file.relative_to(ROOT).as_posix()
        if name in NO_CACHE or relative in NO_CACHE:
            self.send_header("Cache-Control", "no-cache")
        elif relative.startswith("assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")

        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    # --- routing -----------------------------------------------------------
    def do_GET(self) -> None:  # noqa: N802 — API http.server
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == "/api" or parsed.path.startswith("/api/"):
            self._proxy()
            return

        file = self._resolve_static()
        if file is None:
            self._send_json(400, {"detail": "Nieprawidłowa ścieżka."})
            return
        self._serve_static(file)

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api" or self.path.startswith("/api/"):
            self._proxy()
            return
        self._send_json(405, {"detail": "Metoda niedozwolona."})

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self.path == "/api" or self.path.startswith("/api/"):
            self._proxy()
            return
        self.send_response(204)
        self.send_header("Allow", "GET, HEAD, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address) -> None:
        # Klient może zamknąć połączenie (np. odświeżenie strony) — to nie błąd.
        error = sys.exc_info()[1]
        if isinstance(error, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:  # noqa: BLE001
        pass

    if not (ROOT / "index.html").is_file():
        log(f"Brak buildu w {ROOT}.")
        log("Uruchom najpierw: npm run build (albo pobierz artefakt z GitHub Actions).")
        return 1

    server = Server((HOST, PORT), Handler)
    log("")
    log(f"Garmin Pulpit działa: http://{HOST}:{PORT}")
    log(f"Proxy API:            {BACKEND_URL}")
    log("")
    log("Udostępnij w tailnecie (w drugim terminalu):")
    log(f"    tailscale serve --bg {PORT}")
    log("")
    log("Zatrzymanie: Ctrl+C")
    log("")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("\nZatrzymano serwer.")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
