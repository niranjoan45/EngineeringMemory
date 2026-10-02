"""
Central runtime configuration for the Engineering Memory platform.

Why this module exists
----------------------
The platform previously read ``os.getenv`` at a dozen call sites and never read
``.env`` at all, so the file an operator edits (``em/.env``) had no effect on the
running server. Host, port, public URL and CORS policy were also hardcoded, which
is exactly what breaks the LAN / Cloudflare-tunnel demo: a QR code has to encode
the URL the phone can actually reach, and the server has to bind ``0.0.0.0``.

Everything deployment-shaped is resolved here, once, and imported where needed.

What is deliberately NOT loaded from ``.env``
--------------------------------------------
``MYSQL_*`` keys are left alone. The platform currently runs against the local
SQLite store (``em/data/engineering_memory.db``); silently adopting a MySQL
configuration from a file would point the running platform at a different, empty
database mid-demo. MySQL remains fully supported — start the server with the
MySQL environment variables exported (see DEPLOYMENT.md) and the existing client
in ``db/mysql_client.py`` picks it up exactly as before.
"""

import os
import socket
from typing import Any, Dict, Optional, Tuple

# --- Paths -------------------------------------------------------------------
# backend/app/core/config.py -> backend/app -> backend -> <project root: em/>
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
_ENV_FILE = os.path.join(PROJECT_ROOT, ".env")

# Keys an operator may set in ``em/.env``. Database credentials are intentionally
# absent: see the module docstring.
_ENV_ALLOWLIST = {
    "HOST",
    "BACKEND_PORT",
    "PORT",
    "FRONTEND_PORT",
    "API_BASE_URL",
    "PUBLIC_URL",
    "EM_PUBLIC_BASE_URL",
    "ALLOWED_ORIGINS",
    "FRONTEND_DIST",
    "OLLAMA_URL",
    "OLLAMA_TAGS_URL",
    "OLLAMA_MODEL",
    "OLLAMA_TIMEOUT",
    "OLLAMA_MAX_TOKENS",
    "OLLAMA_KEEP_ALIVE",
    "EM_FAISS_SEARCH_K",
    "EM_DIAGNOSIS_CACHE_SIZE",
    "EM_DIAGNOSIS_CACHE_TTL",
    "EM_MACHINE_CACHE_TTL",
    "EM_LLM_EXPLANATION_ENABLED",
    "EM_LOG_LEVEL",
}

_dotenv_loaded = False


def load_environment_file() -> Dict[str, Any]:
    """Load the allowlisted keys from ``em/.env`` into ``os.environ`` exactly once.

    Real environment variables always win over the file, so a shell override
    (``set PUBLIC_URL=...``) is never clobbered by a stale .env value.
    """
    global _dotenv_loaded
    if _dotenv_loaded:
        return {"loaded": True, "source": _ENV_FILE}
    _dotenv_loaded = True

    applied = []
    if os.path.exists(_ENV_FILE):
        try:
            with open(_ENV_FILE, "r", encoding="utf-8") as handle:
                for raw in handle:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key not in _ENV_ALLOWLIST:
                        continue
                    if os.environ.get(key):
                        continue
                    os.environ[key] = value
                    applied.append(key)
        except Exception as error:  # pragma: no cover - defensive
            print(f"[Config] .env could not be read ({error}); using process environment only.")
    return {"loaded": True, "source": _ENV_FILE, "applied": applied}


def env_str(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value.strip() if value is not None and value.strip() else default


def env_int(name: str, default: int) -> int:
    try:
        return int(str(os.getenv(name, "")).strip() or default)
    except (TypeError, ValueError):
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(str(os.getenv(name, "")).strip() or default)
    except (TypeError, ValueError):
        return default


def env_bool(name: str, default: bool = False) -> bool:
    value = str(os.getenv(name, "")).strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on", "enabled"}


# --- Endpoints ---------------------------------------------------------------
def backend_host() -> str:
    """Bind address. ``0.0.0.0`` is the default so phones on the LAN can reach it."""
    return env_str("HOST", "0.0.0.0")


def backend_port() -> int:
    return env_int("BACKEND_PORT", env_int("PORT", 8000))


def frontend_port() -> int:
    """Vite development port (the built SPA is served by FastAPI itself)."""
    return env_int("FRONTEND_PORT", 3000)


def configured_public_url() -> str:
    """The operator-configured public origin (Cloudflare tunnel URL), if any."""
    return env_str("PUBLIC_URL", env_str("EM_PUBLIC_BASE_URL", "")).rstrip("/")


def is_loopback_host(host: str) -> bool:
    host = (host or "").split(":")[0].strip().lower()
    return host in ("", "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]")


def local_ipv4() -> str:
    """Best-effort primary LAN IPv4 address of this computer.

    The UDP socket trick never sends a packet; it just asks the routing table
    which local interface would be used to reach the internet, which is the
    address a phone on the same Wi-Fi must dial.
    """
    candidate = ""
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            probe.connect(("8.8.8.8", 80))
            candidate = probe.getsockname()[0]
        finally:
            probe.close()
    except Exception:
        candidate = ""
    if candidate and not candidate.startswith("127."):
        return candidate
    try:
        return socket.gethostbyname(socket.gethostname())
    except Exception:
        return "127.0.0.1"


def request_origin(request: Any) -> str:
    """Origin the client actually used, honouring proxy headers.

    A Cloudflare tunnel terminates TLS and forwards ``x-forwarded-host`` /
    ``x-forwarded-proto``. Reading them means a QR code generated while the
    operator is on the public link encodes the public link — no manual editing of
    the public URL, and never a hardcoded localhost.
    """
    headers = getattr(request, "headers", {}) or {}
    host = headers.get("x-forwarded-host") or headers.get("host") or ""
    proto = headers.get("x-forwarded-proto") or ("https" if headers.get("cf-connecting-ip") else "http")
    host = host.split(",")[0].strip()
    if not host:
        return ""
    return f"{proto.split(',')[0].strip()}://{host}"


def resolve_base_url(request: Optional[Any] = None) -> Tuple[str, str]:
    """Resolve the base URL machines' QR codes should encode.

    Priority: explicit configuration (PUBLIC_URL) > the origin the browser is on
    (works automatically through the tunnel) > this computer's LAN address. The
    second element names which rule fired, and it is surfaced in the API response
    so the operator can see *why* a QR encodes what it does.
    """
    configured = configured_public_url()
    if configured:
        return configured, "PUBLIC_URL (configured)"

    origin = request_origin(request) if request is not None else ""
    if origin and not is_loopback_host(origin.split("//")[-1]):
        return origin.rstrip("/"), "request origin (proxy-aware)"

    lan = f"http://{local_ipv4()}:{backend_port()}"
    if origin:
        return lan, "LAN address (no public URL configured)"
    return lan, "LAN address (no request context)"


def machine_access_url(machine_id: str, request: Optional[Any] = None) -> Dict[str, str]:
    """The single URL a machine QR code may contain. Never includes secrets."""
    base, source = resolve_base_url(request)
    return {
        "base_url": base,
        "source": source,
        "url": f"{base}/mobile/machine/{machine_id}",
    }


# --- CORS --------------------------------------------------------------------
# Kept explicit rather than "*": the platform is reachable from the public
# internet through a tunnel, and an unrestricted policy would let any web page
# call the API on a judge's phone. These defaults cover every real access path
# (localhost, the LAN, the Cloudflare tunnel) and can be extended with
# ALLOWED_ORIGINS in .env. Credentials are disabled because the UI authenticates
# with a bearer token, not cookies — that also removes the wildcard+credentials
# hazard entirely.
_DEFAULT_ORIGIN_REGEX = (
    r"https?://("
    r"localhost|127\.0\.0\.1|\[::1\]|"
    r"10\.\d+\.\d+\.\d+|"
    r"192\.168\.\d+\.\d+|"
    r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|"
    r"[A-Za-z0-9.-]+\.trycloudflare\.com|"
    r"[A-Za-z0-9.-]+\.cfargotunnel\.com"
    r")(:\d+)?$"
)


def allowed_origins() -> list:
    """Extra explicit origins from ALLOWED_ORIGINS (comma separated)."""
    raw = env_str("ALLOWED_ORIGINS", "")
    if not raw or raw.strip() == "*":
        return []
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


def allowed_origin_regex() -> str:
    return _DEFAULT_ORIGIN_REGEX


# --- Feature switches --------------------------------------------------------
def llm_explanation_enabled() -> bool:
    """Whether the optional local-LLM explanation path may be offered in the UI."""
    return env_bool("EM_LLM_EXPLANATION_ENABLED", True)


def faiss_search_k() -> int:
    """Candidates pulled from FAISS before type-aware Top-K selection (Part 4).

    A bounded over-fetch (not the whole index) keeps the *returned* evidence at
    Top-5 cases while still giving both surface types a chance to appear.
    """
    return max(8, env_int("EM_FAISS_SEARCH_K", 64))


def network_summary(request: Optional[Any] = None) -> Dict[str, Any]:
    """Everything the System Status panel and the startup banner need."""
    public, source = resolve_base_url(request)
    lan_ip = local_ipv4()
    host = backend_host()
    port = backend_port()
    return {
        "bind_host": host,
        "bind_is_lan_visible": host in ("0.0.0.0", "::"),
        "backend_port": port,
        "frontend_port": frontend_port(),
        "local_ip": lan_ip,
        "local_url": f"http://localhost:{port}",
        "lan_url": f"http://{lan_ip}:{port}",
        "frontend_dev_url": f"http://{lan_ip}:{frontend_port()}",
        "public_url": configured_public_url() or None,
        "resolved_base_url": public,
        "resolved_base_url_source": source,
        "api_base_url": env_str("API_BASE_URL", "") or None,
        "allowed_origins": allowed_origins(),
        "qr_base_url": f"{public}/mobile/machine/EX-204",
    }
