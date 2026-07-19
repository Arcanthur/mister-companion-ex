"""ScreenScraper developer credential helpers.

The upstream/public source does not ship release developer credentials. This
module therefore supports three sources, in priority order:

1. Runtime credentials supplied by the Electron/VaultKit UI.
2. Environment variables for local/dev builds.
3. Build-time constants, used only by private release packaging.
"""

from __future__ import annotations

import os


SS_DEV_ID = ""
SS_DEV_PASSWORD = ""
SS_SOFTNAME = "mister-companion"

_RUNTIME_DEV_ID = ""
_RUNTIME_DEV_PASSWORD = ""
_RUNTIME_SOFTNAME = ""


def _clean(value) -> str:
    return str(value or "").strip()


def set_dev_credentials(devid: str = "", devpassword: str = "", softname: str = "") -> None:
    """Set optional runtime ScreenScraper developer credentials.

    Passing blank values clears the runtime override and lets environment or
    build-time constants take over. This keeps the public source safe while
    allowing users/builds without embedded credentials to still use ZapScraper.
    """
    global _RUNTIME_DEV_ID, _RUNTIME_DEV_PASSWORD, _RUNTIME_SOFTNAME
    _RUNTIME_DEV_ID = _clean(devid)
    _RUNTIME_DEV_PASSWORD = str(devpassword or "")
    _RUNTIME_SOFTNAME = _clean(softname) or "mister-companion"


def _env_credentials() -> dict[str, str] | None:
    devid = _clean(
        os.environ.get("MISTER_COMPANION_SS_DEV_ID")
        or os.environ.get("SCREENSCRAPER_DEV_ID")
        or os.environ.get("SS_DEV_ID")
    )
    devpassword = str(
        os.environ.get("MISTER_COMPANION_SS_DEV_PASSWORD")
        or os.environ.get("SCREENSCRAPER_DEV_PASSWORD")
        or os.environ.get("SS_DEV_PASSWORD")
        or ""
    )
    softname = _clean(
        os.environ.get("MISTER_COMPANION_SS_SOFTNAME")
        or os.environ.get("SCREENSCRAPER_SOFTNAME")
        or os.environ.get("SS_SOFTNAME")
        or SS_SOFTNAME
    ) or "mister-companion"

    if devid and devpassword and softname:
        return {"devid": devid, "devpassword": devpassword, "softname": softname}
    return None


def get_dev_credentials():
    if _RUNTIME_DEV_ID and _RUNTIME_DEV_PASSWORD and (_RUNTIME_SOFTNAME or SS_SOFTNAME):
        return {
            "devid": _RUNTIME_DEV_ID,
            "devpassword": _RUNTIME_DEV_PASSWORD,
            "softname": _RUNTIME_SOFTNAME or SS_SOFTNAME or "mister-companion",
        }

    env = _env_credentials()
    if env:
        return env

    if SS_DEV_ID and SS_DEV_PASSWORD and SS_SOFTNAME:
        return {
            "devid": SS_DEV_ID,
            "devpassword": SS_DEV_PASSWORD,
            "softname": SS_SOFTNAME,
        }

    return None


def has_dev_credentials():
    return bool(get_dev_credentials())
