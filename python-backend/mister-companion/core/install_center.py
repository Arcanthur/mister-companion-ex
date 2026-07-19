import json
import time
import urllib.request
import urllib.parse
import re
import io
import ssl
import tempfile
import zipfile
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from core.app_paths import generated_path
from core.file_browser import join_remote_path, normalize_remote_path, ensure_remote_dir
from core.scripts_actions import (
    get_scripts_status,
    get_scripts_status_local,
    get_syncthing_status,
    get_syncthing_status_local,
    get_ra_viewer_status,
    get_ra_viewer_status_local,
    install_update_all,
    install_update_all_local,
    uninstall_update_all,
    uninstall_update_all_local,
    get_zaparoo_update_status,
    get_zaparoo_update_status_local,
    install_zaparoo,
    install_zaparoo_local,
    uninstall_zaparoo,
    uninstall_zaparoo_local,
    install_migrate_sd,
    install_migrate_sd_local,
    uninstall_migrate_sd,
    uninstall_migrate_sd_local,
    install_cifs_mount,
    install_cifs_mount_local,
    uninstall_cifs_mount,
    uninstall_cifs_mount_local,
    install_auto_time,
    install_auto_time_local,
    uninstall_auto_time,
    uninstall_auto_time_local,
    install_cd_game_organizer,
    install_cd_game_organizer_local,
    uninstall_cd_game_organizer,
    uninstall_cd_game_organizer_local,
    install_dav_browser,
    install_dav_browser_local,
    uninstall_dav_browser,
    uninstall_dav_browser_local,
    install_ftp_save_sync,
    install_ftp_save_sync_local,
    uninstall_ftp_save_sync,
    uninstall_ftp_save_sync_local,
    install_static_wallpaper,
    install_static_wallpaper_local,
    uninstall_static_wallpaper,
    uninstall_static_wallpaper_local,
    install_syncthing,
    install_syncthing_local,
    uninstall_syncthing,
    uninstall_syncthing_local,
    install_ra_viewer,
    install_ra_viewer_local,
    uninstall_ra_viewer,
    uninstall_ra_viewer_local,
)
from core.extras_3s_arm import (
    get_3sx_status,
    get_3sx_status_local,
    install_or_update_3sx,
    install_or_update_3sx_local,
    uninstall_3sx,
    uninstall_3sx_local,
)
from core.extras_sonic_mania import (
    get_sonic_mania_status,
    get_sonic_mania_status_local,
    install_or_update_sonic_mania,
    install_or_update_sonic_mania_local,
    uninstall_sonic_mania,
    uninstall_sonic_mania_local,
)
from core.extras_mister_quake import (
    get_mister_quake_status,
    get_mister_quake_status_local,
    install_or_update_mister_quake,
    install_or_update_mister_quake_local,
    uninstall_mister_quake,
    uninstall_mister_quake_local,
)
from core.extras_zaparoo_launcher import (
    get_zaparoo_launcher_status,
    get_zaparoo_launcher_status_local,
    install_or_update_zaparoo_launcher,
    install_or_update_zaparoo_launcher_local,
    uninstall_zaparoo_launcher,
    uninstall_zaparoo_launcher_local,
)
from core.extras_mms2_gb_core import (
    get_mms2_gb_core_status,
    get_mms2_gb_core_status_local,
    install_or_update_mms2_gb_core,
    install_or_update_mms2_gb_core_local,
    uninstall_mms2_gb_core,
    uninstall_mms2_gb_core_local,
)
from core.extras_paprium_megadrive import (
    get_paprium_megadrive_status,
    get_paprium_megadrive_status_local,
    install_or_update_paprium_megadrive,
    install_or_update_paprium_megadrive_local,
    uninstall_paprium_megadrive,
    uninstall_paprium_megadrive_local,
)
from core.extras_megavgmdrive import (
    get_megavgmdrive_status,
    get_megavgmdrive_status_local,
    install_or_update_megavgmdrive,
    install_or_update_megavgmdrive_local,
    uninstall_megavgmdrive,
    uninstall_megavgmdrive_local,
)
from core.extras_dreamster import (
    get_dreamster_status,
    get_dreamster_status_local,
    install_or_update_dreamster,
    install_or_update_dreamster_local,
    uninstall_dreamster,
    uninstall_dreamster_local,
)
from core.extras_ra_cores import (
    get_ra_cores_status,
    get_ra_cores_status_local,
    install_or_update_ra_cores,
    install_or_update_ra_cores_local,
    uninstall_ra_cores,
    uninstall_ra_cores_local,
)

from core.scripts_version_check import apply_script_update_status, supports_script_update_check

from core.wallpapers import (
    build_install_state,
    fetch_ot4ku_wallpapers,
    fetch_pcn_premium_wallpapers,
    fetch_pcn_wallpapers,
    fetch_ranny_wallpapers,
    get_installed_wallpapers,
    get_installed_wallpapers_local,
    install_wallpaper_items,
    install_wallpaper_items_local,
    open_wallpaper_folder_local,
    open_wallpaper_folder_on_host,
    remove_installed_wallpapers,
    remove_installed_wallpapers_local,
    wallpaper_folder_exists,
)

HUB_RAW_BASE_URL = "https://raw.githubusercontent.com/Arcanthur/mister-companion-EX-hub/main/"
HUB_ROOT_CATALOG_URL = HUB_RAW_BASE_URL + "catalog.json"
HUB_CATALOG_URL = HUB_RAW_BASE_URL + "generated/catalog_full.json"
HUB_CATALOG_MIN_URL = HUB_RAW_BASE_URL + "generated/catalog_min.json"
ROM_MANIFEST_REMOTE_PATH = "/media/fat/Scripts/.config/mister_companion/install_center/installed_roms.json"

CATEGORY_FALLBACK = [
    {"id": "scripts", "name": "Scripts", "description": "Add extra functionality to your standard MiSTer FPGA setup through useful scripts and utilities.", "sort_order": 10},
    {"id": "cores", "name": "Cores", "description": "Custom and alternative cores that add features, improve compatibility, or offer different behavior from the standard MiSTer cores.", "sort_order": 20},
    {"id": "extras", "name": "Extras", "description": "MiSTer ARM ports, frontends, and additional tools that expand what your MiSTer setup can do.", "sort_order": 30},
    {"id": "roms", "name": "ROMs", "description": "Free homebrew games and demos for retro systems supported by MiSTer.", "sort_order": 40, "hide_when_empty": True},
    {"id": "wallpaper_packs", "name": "Wallpaper Packs", "description": "MiSTer wallpaper packs for customizing the look of your MiSTer menu.", "sort_order": 50},
]

GITHUB_PACKAGE_CATEGORY = {
    "id": "github",
    "name": "GitHub",
    "description": "User-added packages imported from GitHub repository links.",
    "sort_order": 900,
    "hide_when_empty": True,
}

GITHUB_PACKAGE_REMOTE_MANIFEST_PATH = "/media/fat/Scripts/.config/mister_companion/install_center/installed_github_packages.json"

FALLBACK_ITEMS = [
    ("update_all", "scripts", "script", "update_all", "update_all", "theypsilon", "update_all keeps your MiSTer FPGA setup up to date by downloading cores, scripts, databases, tools, and optional community content from configured update sources."),
    ("zaparoo", "scripts", "script", "zaparoo", "Zaparoo", "Zaparoo Project", "Zaparoo lets you launch games, media, scripts, and other MiSTer content by scanning NFC cards, tags, barcodes, or other supported readers. It also allows MiSTer Companion to launch games remotely from the ZapScripts tab."),
    ("migrate_sd", "scripts", "script", "migrate_sd", "migrate_sd", "theypsilon", "migrate_sd helps migrate an existing MiSTer SD card setup to another SD card, such as when moving to a larger card."),
    ("cifs_mount", "scripts", "script", "cifs_mount", "cifs_mount", "MiSTer community", "cifs_mount connects your MiSTer to a shared network folder, such as a NAS or PC share, so games and files can be accessed over your local network."),
    ("auto_time", "scripts", "script", "auto_time", "auto_time", "MiSTer community", "auto_time automatically detects your timezone and applies the correct date and time to your MiSTer."),
    ("cd_game_organizer", "scripts", "script", "cd_game_organizer", "CD Game Organizer", "MiSTer community", "cd_game_organizer organizes CD-based games into their own folders, helping keep virtual memory cards separated per game."),
    ("dav_browser", "scripts", "script", "dav_browser", "DAV Browser", "MiSTer community", "DAV Browser lets your MiSTer browse a WebDAV server, such as a NAS or remote file server, download ROMs or files, and optionally launch them after downloading."),
    ("ftp_save_sync", "scripts", "script", "ftp_save_sync", "FTP Save Sync", "Anime0t4ku", "ftp_save_sync automatically syncs your MiSTer saves to a remote FTP or SFTP server. It can also sync savestates and keep saves shared between multiple MiSTers."),
    ("static_wallpaper", "scripts", "script", "static_wallpaper", "Static Wallpaper", "Anime0t4ku", "static_wallpaper lets your MiSTer use a fixed menu wallpaper instead of the default changing wallpaper behavior."),
    ("syncthing", "scripts", "script", "syncthing", "Syncthing", "Syncthing", "Syncthing is a peer-to-peer file synchronization tool. On MiSTer, it can be used to sync folders such as saves or other files with your PC, NAS, or other devices."),
    ("ra_viewer", "scripts", "script", "ra_viewer", "RA Viewer", "MiSTer community", "RA Viewer shows your RetroAchievements progress directly on the MiSTer, including achievement information for your configured RetroAchievements account."),
    ("mms2_gb_core", "cores", "core", "mms2_gb_core", "MMS2 GB Core", "Heber", "Installs Heber’s custom GB core for MMS2 with physical cartridge support. The core is installed in a separate custom location and adds a MiSTer home screen shortcut for directly loading cartridges."),
    ("paprium_megadrive", "cores", "core", "paprium_megadrive", "Paprium MegaDrive", "Pezz82", "Installs Pezz82’s customized MegaDrive core for running Paprium. This only installs the core and launcher. Provide your own ROM and make sure you use the correct ROM version with WAV files."),
    ("megavgmdrive", "cores", "core", "megavgmdrive", "MegaVGMDrive", "dai-VGM", "Installs MegaVGMDrive, a MegaDrive/Genesis VGM playback core for MiSTer. This only installs the core, launcher, and game folder structure."),
    ("retroachievement_cores", "cores", "core", "retroachievement_cores", "RetroAchievement Cores", "MiSTer community", "RetroAchievement Cores adds RetroAchievements-enabled MiSTer cores and the required MiSTer_RA support files. It uses MGL launchers so your normal cores remain untouched."),
    ("3s_arm", "extras", "extra", "3s_arm", "3S-ARM", "MiSTer community", "3S-ARM is a MiSTer port/support package for Street Fighter III: Third Strike based on the PS2 version. It installs binaries/support files only, not game files."),
    ("sonic_mania_mister", "extras", "extra", "sonic_mania_mister", "Sonic Mania MiSTer", "MiSTer community", "Sonic Mania MiSTer lets your MiSTer run Sonic Mania using the MiSTer port, with support for the required Data.rsdk game file."),
    ("mister_quake", "extras", "extra", "mister_quake", "MiSTer Quake", "neofreno", "MiSTer Quake installs the Quake port for MiSTer. Provide your own PAK0.PAK and optional PAK1.PAK game data files."),
    ("dreamster", "extras", "extra", "dreamster", "DreamSTer", "skmp", "DreamSTer is an emulation core that uses partial FPGA output to run Dreamcast software on MiSTer. It is currently in pre-release."),
    ("zaparoo_frontend", "extras", "extra", "zaparoo_frontend", "Zaparoo Frontend", "Zaparoo Project", "Zaparoo Frontend is a MiSTer frontend that provides a controller-friendly interface for browsing and launching your games, media, and other MiSTer content, with artwork support."),
    ("ranny_snice_wallpapers", "wallpaper_packs", "wallpaper_pack", "ranny_snice_wallpapers", "Ranny Snice Wallpapers", "Ranny Snice", "A collection of MiSTer menu wallpapers by Ranny Snice, available in both 16:9 and 4:3 versions."),
    ("pcn_challenge_wallpapers", "wallpaper_packs", "wallpaper_pack", "pcn_challenge_wallpapers", "PCN Challenge Wallpapers", "Pixel Cherry Ninja", "Wallpapers created during PCN livestreams based on audience requests."),
    ("pcn_premium_wallpapers", "wallpaper_packs", "wallpaper_pack", "pcn_premium_wallpapers", "PCN Premium Member Wallpapers", "Pixel Cherry Ninja", "A wallpaper pack created for PCN Premium members on YouTube and Patreon."),
    ("anime0t4ku_wallpapers", "wallpaper_packs", "wallpaper_pack", "anime0t4ku_wallpapers", "Anime0t4ku Wallpapers", "Anime0t4ku", "A personal wallpaper pack by Anime0t4ku, made without fixed constraints."),
 ]

FALLBACK_ITEM_THUMBNAILS = {
    "update_all": "assets/thumbnails/scripts/update_all.png",
    "zaparoo": "assets/thumbnails/scripts/zaparoo.png",
    "migrate_sd": "assets/thumbnails/scripts/migrate_sd.png",
    "cifs_mount": "assets/thumbnails/scripts/cifs_mount.png",
    "auto_time": "assets/thumbnails/scripts/auto_time.png",
    "cd_game_organizer": "assets/thumbnails/scripts/cd_game_organizer.png",
    "dav_browser": "assets/thumbnails/scripts/dav_browser.png",
    "ftp_save_sync": "assets/thumbnails/scripts/ftp_save_sync.png",
    "static_wallpaper": "assets/thumbnails/scripts/static_wallpaper.png",
    "syncthing": "assets/thumbnails/scripts/syncthing.png",
    "ra_viewer": "assets/thumbnails/scripts/ra_viewer.png",
    "mms2_gb_core": "assets/thumbnails/cores/mms2_gb_core.png",
    "paprium_megadrive": "assets/thumbnails/cores/paprium_megadrive.png",
    "megavgmdrive": "assets/thumbnails/cores/megavgmdrive.png",
    "retroachievement_cores": "assets/thumbnails/cores/retroachievement_cores.png",
    "3s_arm": "assets/thumbnails/extras/3s_arm.png",
    "sonic_mania_mister": "assets/thumbnails/extras/sonic_mania_mister.png",
    "mister_quake": "assets/thumbnails/extras/mister_quake.png",
    "zaparoo_frontend": "assets/thumbnails/extras/zaparoo_frontend.png",
    "ranny_snice_wallpapers": "assets/thumbnails/wallpaper_packs/ranny_snice_wallpapers.png",
    "pcn_challenge_wallpapers": "assets/thumbnails/wallpaper_packs/pcn_challenge_wallpapers.png",
    "pcn_premium_wallpapers": "assets/thumbnails/wallpaper_packs/pcn_premium_wallpapers.png",
    "anime0t4ku_wallpapers": "assets/thumbnails/wallpaper_packs/anime0t4ku_wallpapers.png",
}

SCRIPT_STATUS_ATTRS = {
    "update_all": "update_all_installed",
    "zaparoo": "zaparoo_installed",
    "migrate_sd": "migrate_sd_installed",
    "cifs_mount": "cifs_installed",
    "auto_time": "auto_time_installed",
    "cd_game_organizer": "cd_game_organizer_installed",
    "dav_browser": "dav_browser_installed",
    "ftp_save_sync": "ftp_save_sync_installed",
    "static_wallpaper": "static_wallpaper_installed",
}

SCRIPT_INSTALLERS = {
    "update_all": (install_update_all, install_update_all_local, uninstall_update_all, uninstall_update_all_local),
    "zaparoo": (install_zaparoo, install_zaparoo_local, uninstall_zaparoo, uninstall_zaparoo_local),
    "migrate_sd": (install_migrate_sd, install_migrate_sd_local, uninstall_migrate_sd, uninstall_migrate_sd_local),
    "cifs_mount": (install_cifs_mount, install_cifs_mount_local, uninstall_cifs_mount, uninstall_cifs_mount_local),
    "auto_time": (install_auto_time, install_auto_time_local, uninstall_auto_time, uninstall_auto_time_local),
    "cd_game_organizer": (install_cd_game_organizer, install_cd_game_organizer_local, uninstall_cd_game_organizer, uninstall_cd_game_organizer_local),
    "dav_browser": (install_dav_browser, install_dav_browser_local, uninstall_dav_browser, uninstall_dav_browser_local),
    "ftp_save_sync": (install_ftp_save_sync, install_ftp_save_sync_local, uninstall_ftp_save_sync, uninstall_ftp_save_sync_local),
    "static_wallpaper": (install_static_wallpaper, install_static_wallpaper_local, uninstall_static_wallpaper, uninstall_static_wallpaper_local),
    "syncthing": (install_syncthing, install_syncthing_local, uninstall_syncthing, uninstall_syncthing_local),
    "ra_viewer": (install_ra_viewer, install_ra_viewer_local, uninstall_ra_viewer, uninstall_ra_viewer_local),
}

EXTRA_HANDLERS = {
    "3s_arm": (get_3sx_status, get_3sx_status_local, install_or_update_3sx, install_or_update_3sx_local, uninstall_3sx, uninstall_3sx_local),
    "3sx_mister": (get_3sx_status, get_3sx_status_local, install_or_update_3sx, install_or_update_3sx_local, uninstall_3sx, uninstall_3sx_local),
    "sonic_mania_mister": (get_sonic_mania_status, get_sonic_mania_status_local, install_or_update_sonic_mania, install_or_update_sonic_mania_local, uninstall_sonic_mania, uninstall_sonic_mania_local),
    "mister_quake": (get_mister_quake_status, get_mister_quake_status_local, install_or_update_mister_quake, install_or_update_mister_quake_local, uninstall_mister_quake, uninstall_mister_quake_local),
    "dreamster": (get_dreamster_status, get_dreamster_status_local, install_or_update_dreamster, install_or_update_dreamster_local, uninstall_dreamster, uninstall_dreamster_local),
    "zaparoo_frontend": (get_zaparoo_launcher_status, get_zaparoo_launcher_status_local, install_or_update_zaparoo_launcher, install_or_update_zaparoo_launcher_local, uninstall_zaparoo_launcher, uninstall_zaparoo_launcher_local),
    "mms2_gb_core": (get_mms2_gb_core_status, get_mms2_gb_core_status_local, install_or_update_mms2_gb_core, install_or_update_mms2_gb_core_local, uninstall_mms2_gb_core, uninstall_mms2_gb_core_local),
    "paprium_megadrive": (get_paprium_megadrive_status, get_paprium_megadrive_status_local, install_or_update_paprium_megadrive, install_or_update_paprium_megadrive_local, uninstall_paprium_megadrive, uninstall_paprium_megadrive_local),
    "megavgmdrive": (get_megavgmdrive_status, get_megavgmdrive_status_local, install_or_update_megavgmdrive, install_or_update_megavgmdrive_local, uninstall_megavgmdrive, uninstall_megavgmdrive_local),
    "retroachievement_cores": (get_ra_cores_status, get_ra_cores_status_local, install_or_update_ra_cores, install_or_update_ra_cores_local, uninstall_ra_cores, uninstall_ra_cores_local),
}

@dataclass
class InstallCenterContext:
    mode: str
    connection: object = None
    sd_root: str = ""

    @property
    def offline(self) -> bool:
        return self.mode == "offline"

    @property
    def online(self) -> bool:
        return not self.offline


def fallback_catalog() -> dict:
    return {
        "schema_version": 1,
        "catalog_version": "bundled",
        "name": "MiSTer Companion Hub",
        "updated": "bundled",
        "minimum_app_version": "6.0.0",
        "categories": CATEGORY_FALLBACK,
        "items": [
            {
                "schema_version": 1,
                "id": item_id,
                "category": category,
                "type": item_type,
                "handler": handler,
                "name": name,
                "author": author,
                "date_added": "2026-06-23T00:00:00Z",
                "description": description,
                "visibility": "public",
                "sort_order": index * 10,
                **({
                    "thumbnail": FALLBACK_ITEM_THUMBNAILS[item_id],
                    "resolved_thumbnail": FALLBACK_ITEM_THUMBNAILS[item_id],
                } if item_id in FALLBACK_ITEM_THUMBNAILS else {}),
            }
            for index, (item_id, category, item_type, handler, name, author, description) in enumerate(FALLBACK_ITEMS, start=1)
        ],
    }


def _cache_busted_url(url: str, token: str | None = None) -> str:
    value = str(url or "").strip()
    if not value:
        return value
    marker = urllib.parse.quote(str(token or time.time_ns()), safe="")
    separator = "&" if "?" in value else "?"
    return f"{value}{separator}mc_ex_refresh={marker}"


def _read_url_json(url: str, timeout: int = 12, cache_bust: bool = False, cache_token: str | None = None) -> dict:
    headers = {
        "User-Agent": "MiSTer-Companion-EX/Install-Center",
        "Accept": "application/json,text/plain,*/*",
        "Cache-Control": "no-cache",
    }
    request_url = _cache_busted_url(url, cache_token) if cache_bust else url
    request = urllib.request.Request(request_url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = response.read().decode("utf-8")
    except Exception:
        # Some Python.org macOS installs can fail GitHub HTTPS requests when
        # the local certificate bundle has not been installed. Retrying with an
        # unverified context keeps the public Hub catalog reachable without
        # requiring users to run an extra certificate installer first.
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            data = response.read().decode("utf-8")
    return json.loads(data)


def _cache_path() -> Path:
    return generated_path("install_center", "catalog_cache.json")


def load_cached_catalog() -> dict | None:
    try:
        path = _cache_path()
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as handle:
            return normalize_catalog(json.load(handle), resolve_remote_assets=True)
    except Exception:
        return None


def save_catalog_cache(catalog: dict) -> None:
    try:
        path = _cache_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(catalog, handle, ensure_ascii=False, indent=2)
    except Exception:
        pass


def custom_github_packages_path() -> Path:
    return generated_path("install_center", "custom_github_packages.json")


def load_custom_github_packages() -> list[dict]:
    try:
        path = custom_github_packages_path()
        if not path.exists():
            return []
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            items = data.get("items") or data.get("packages") or []
        else:
            items = data
        if not isinstance(items, list):
            return []
        return [item for item in items if isinstance(item, dict)]
    except Exception:
        return []


def save_custom_github_packages(items: list[dict]) -> None:
    path = custom_github_packages_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": list(items or []),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _slugify(value: str, fallback: str = "package") -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", str(value or "").strip().lower()).strip("_")
    return slug or fallback


def _github_request_json(url: str, timeout: int = 14) -> dict:
    headers = {
        "User-Agent": "MiSTer-Companion-EX/Install-Center",
        "Accept": "application/vnd.github+json,application/json,text/plain,*/*",
        "Cache-Control": "no-cache",
    }
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return json.loads(response.read().decode("utf-8"))


PACKAGE_MANIFEST_CANDIDATES = [
    "mister-companion-package.json",
    "mister-companion-package.json.zip",
    ".mister-companion/package.json",
    ".mister-companion/package.json.zip",
    ".mister/package.json",
    ".mister/package.json.zip",
    "mister-package.json",
    "mister-package.json.zip",
    "package.mister.json",
    "package.mister.json.zip",
    "install_center.json",
    "install_center.json.zip",
    "install.json",
    "install.json.zip",
]


def _github_request_bytes(url: str, timeout: int = 28) -> bytes:
    headers = {
        "User-Agent": "MiSTer-Companion-EX/Install-Center",
        "Accept": "application/vnd.github.raw,application/octet-stream,application/json,text/plain,*/*",
        "Cache-Control": "no-cache",
    }
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except Exception:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return response.read()


def _parse_json_or_json_zip(data: bytes, source_label: str = ""):
    if not data:
        raise ValueError("Manifest payload was empty.")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            names = [name for name in archive.namelist() if not name.endswith("/")]
            if not names:
                raise ValueError("Manifest ZIP did not contain files.")
            priority = []
            for candidate in PACKAGE_MANIFEST_CANDIDATES:
                priority.extend([name for name in names if name.replace("\\", "/").lower().endswith(candidate.lower())])
            priority.extend([name for name in names if name.lower().endswith(".json") and name not in priority])
            if not priority:
                raise ValueError("Manifest ZIP did not contain a JSON file.")
            raw = archive.read(priority[0]).decode("utf-8-sig")
            payload = json.loads(raw)
            return payload, priority[0]
    except zipfile.BadZipFile:
        pass
    raw = data.decode("utf-8-sig")
    return json.loads(raw), source_label or "json"


def _looks_like_package_manifest(payload) -> bool:
    if isinstance(payload, list):
        return any(_looks_like_package_manifest(item) for item in payload if isinstance(item, dict))
    if not isinstance(payload, dict):
        return False
    if payload.get("schemaVersion") or payload.get("schema_version"):
        if payload.get("files") or payload.get("install") or payload.get("package") or payload.get("packages") or payload.get("items"):
            return True
    if payload.get("files") or (isinstance(payload.get("install"), dict) and payload.get("install", {}).get("files")):
        return True
    if isinstance(payload.get("packages"), list) or isinstance(payload.get("items"), list):
        return True
    return False


def _expand_package_manifest_payload(payload) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    if isinstance(payload.get("package"), dict):
        return [payload["package"]]
    for collection_key in ("packages", "items"):
        collection = payload.get(collection_key)
        if isinstance(collection, list):
            return [item for item in collection if isinstance(item, dict)]
    return [payload]


def _raw_github_url(owner: str, repo: str, ref: str, rel_path: str) -> str:
    clean = _safe_archive_relative_path(rel_path)
    return "https://raw.githubusercontent.com/{}/{}/{}/{}".format(
        urllib.parse.quote(str(owner), safe=""),
        urllib.parse.quote(str(repo), safe=""),
        urllib.parse.quote(str(ref or "main"), safe=""),
        "/".join(urllib.parse.quote(part, safe="") for part in clean.split("/")),
    )


def _repo_manifest_candidate_urls(owner: str, repo: str, ref: str, subdir: str = "") -> list[tuple[str, str]]:
    candidates = []
    prefixes = []
    subdir = _safe_archive_relative_path(subdir)
    if subdir:
        prefixes.append(subdir)
    prefixes.append("")
    seen = set()
    for prefix in prefixes:
        for rel in PACKAGE_MANIFEST_CANDIDATES:
            path = _safe_archive_relative_path((prefix + "/" if prefix else "") + rel)
            if not path or path in seen:
                continue
            seen.add(path)
            candidates.append((path, _raw_github_url(owner, repo, ref, path)))
    return candidates


def _try_load_manifest_from_github_url(info: dict, repo_meta: dict, source_url: str = "") -> tuple[list[dict], dict | None]:
    owner = info.get("owner") or ""
    repo = info.get("repo") or ""
    ref = str(info.get("ref") or repo_meta.get("default_branch") or "main")
    source_url = source_url or str(info.get("download_url") or "")
    path_hint = str(info.get("path") or "")
    manifest_meta = None

    # Direct raw/release asset JSON and JSON ZIP links are treated as manifests first.
    if source_url and re.search(r"\.(json|json\.zip|zip)(?:$|[?#])", source_url, re.I):
        try:
            payload, manifest_path = _parse_json_or_json_zip(_github_request_bytes(source_url), source_url)
            if _looks_like_package_manifest(payload):
                manifest_meta = {"source_url": source_url, "path": manifest_path, "ref": ref, "kind": "direct"}
                return _expand_package_manifest_payload(payload), manifest_meta
        except Exception:
            pass

    # If the user pasted a repo/tree URL, probe common manifest file names.
    if owner and repo:
        for rel_path, candidate_url in _repo_manifest_candidate_urls(owner, repo, ref, info.get("subdir") or ""):
            try:
                payload, manifest_path = _parse_json_or_json_zip(_github_request_bytes(candidate_url), rel_path)
                if _looks_like_package_manifest(payload):
                    manifest_meta = {"source_url": candidate_url, "path": rel_path, "inside_zip": manifest_path if manifest_path != rel_path else "", "ref": ref, "kind": "repo_manifest"}
                    return _expand_package_manifest_payload(payload), manifest_meta
            except Exception:
                continue

    return [], None


def _manifest_field(manifest: dict, *names, default=""):
    for name in names:
        if name in manifest and manifest.get(name) not in (None, ""):
            return manifest.get(name)
    return default


def _manifest_file_entries(manifest: dict) -> list[dict]:
    files = manifest.get("files")
    install = manifest.get("install") if isinstance(manifest.get("install"), dict) else {}
    if files is None:
        files = install.get("files") or install.get("copy") or install.get("assets")
    if isinstance(files, dict):
        files = [files]
    if not isinstance(files, list):
        return []
    result = []
    for entry in files:
        if isinstance(entry, str):
            result.append({"source": entry})
        elif isinstance(entry, dict):
            result.append(dict(entry))
    return result


def _normalize_manifest_file_entry(entry: dict) -> dict:
    source = str(entry.get("source") or entry.get("src") or entry.get("path") or entry.get("url") or "").replace("\\", "/").strip()
    target = str(entry.get("target") or entry.get("destination") or entry.get("dest") or entry.get("to") or "").replace("\\", "/").strip()
    chmod = str(entry.get("chmod") or "").strip().lower()
    executable = bool(entry.get("executable") or entry.get("makeExecutable") or chmod in {"+x", "x", "755", "0755"})
    recursive = bool(entry.get("recursive") or entry.get("directory") or entry.get("type") in {"directory", "folder"})
    extract = bool(entry.get("extract") or entry.get("unzip") or entry.get("expand") or entry.get("type") in {"zip", "archive"})
    optional = bool(entry.get("optional"))
    rename = str(entry.get("rename") or "").strip()
    return {
        "source": source,
        "target": target,
        "recursive": recursive,
        "extract": extract,
        "executable": executable,
        "optional": optional,
        "rename": rename,
    }


def _normalize_package_manifest(manifest: dict, owner: str, repo: str, ref: str, options: dict | None = None) -> dict:
    options = options or {}
    install = manifest.get("install") if isinstance(manifest.get("install"), dict) else {}
    uninstall = manifest.get("uninstall") if isinstance(manifest.get("uninstall"), dict) else {}
    files = [_normalize_manifest_file_entry(entry) for entry in _manifest_file_entries(manifest)]
    files = [entry for entry in files if entry.get("source") or entry.get("target")]
    remove = uninstall.get("remove") or uninstall.get("files") or manifest.get("remove") or []
    if isinstance(remove, str):
        remove = [remove]
    remove = [normalize_mister_relative_path(path) for path in remove if str(path or "").strip()]
    default_install_path = normalize_mister_relative_path(
        options.get("installPath")
        or _manifest_field(manifest, "installPath", "defaultInstallPath", "default_install_path")
        or install.get("path")
        or install.get("target")
        or f"/Scripts/{repo}"
    )
    return {
        "schema_version": manifest.get("schemaVersion") or manifest.get("schema_version") or 1,
        "id": _slugify(_manifest_field(manifest, "id", "packageId", "slug", default=f"github_{owner}_{repo}"), fallback=f"github_{_slugify(repo)}"),
        "name": str(_manifest_field(manifest, "name", "title", default=repo)).strip() or repo,
        "author": str(_manifest_field(manifest, "author", "maintainer", "publisher", default=owner)).strip() or owner,
        "description": str(_manifest_field(manifest, "description", "summary", default=f"GitHub package from {owner}/{repo}.")),
        "version": str(_manifest_field(manifest, "version", "tag", default="")),
        "category": str(_manifest_field(manifest, "category", "section", default="github")).strip() or "github",
        "homepage": str(_manifest_field(manifest, "homepage", "url", "website", default="")),
        "default_install_path": default_install_path,
        "files": files,
        "uninstall_remove": remove,
        "post_install_message": str((manifest.get("postInstall") or manifest.get("post_install") or {}).get("message") if isinstance(manifest.get("postInstall") or manifest.get("post_install"), dict) else ""),
        "requires_reboot": bool(manifest.get("requiresReboot") or manifest.get("requires_reboot")),
        "raw": manifest,
        "repo": {"owner": owner, "repo": repo, "ref": ref},
    }


def _create_github_package_item_from_manifest(url: str, info: dict, repo_meta: dict, release_meta: dict, manifest: dict, manifest_meta: dict | None, options: dict | None = None) -> dict:
    options = options or {}
    owner = info.get("owner") or ""
    repo = info.get("repo") or ""
    ref = str(info.get("ref") or repo_meta.get("default_branch") or "main")
    normalized = _normalize_package_manifest(manifest, owner, repo, ref, options)
    name = str(options.get("name") or normalized.get("name") or repo).replace("_", " ").strip()
    description = str(options.get("description") or normalized.get("description") or repo_meta.get("description") or f"GitHub package from {owner}/{repo}.").strip()
    item_id = _slugify(options.get("id") or normalized.get("id") or f"github_{owner}_{repo}", fallback=f"github_{_slugify(repo)}")
    version = str(options.get("version") or normalized.get("version") or release_meta.get("tag_name") or repo_meta.get("pushed_at") or repo_meta.get("updated_at") or ref or "GitHub").strip()
    item = {
        "schema_version": 1,
        "id": item_id,
        "category": normalized.get("category") or "github",
        "type": "github_package",
        "handler": "github_package",
        "name": name,
        "author": str(options.get("author") or normalized.get("author") or repo_meta.get("owner", {}).get("login") or owner),
        "description": description,
        "visibility": "public",
        "sort_order": int(options.get("sortOrder") or 9000),
        "version": version,
        "release_date": str(release_meta.get("published_at") or repo_meta.get("pushed_at") or repo_meta.get("updated_at") or ""),
        "source_url": str(info.get("download_url") or f"https://api.github.com/repos/{owner}/{repo}/zipball/{urllib.parse.quote(ref)}"),
        "source_page": str(repo_meta.get("html_url") or info.get("html_url") or url),
        "default_install_path": normalize_mister_relative_path(normalized.get("default_install_path") or options.get("installPath") or f"/Scripts/{repo}"),
        "allow_custom_install_path": True,
        "github": {
            "owner": owner,
            "repo": repo,
            "ref": ref,
            "subdir": info.get("subdir") or "",
            "path": info.get("path") or "",
            "kind": info.get("kind") or "repo",
        },
        "package_manifest": normalized,
        "manifest_source": manifest_meta or {},
    }
    if normalized.get("homepage") or repo_meta.get("homepage"):
        item["homepage"] = normalized.get("homepage") or repo_meta.get("homepage")
    if repo_meta.get("stargazers_count") is not None:
        item["stars"] = repo_meta.get("stargazers_count")
    return item


def _parse_github_link(url: str) -> dict:
    raw = str(url or "").strip()
    if not raw:
        raise ValueError("GitHub URL is required.")
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw.lstrip("/")
    parsed = urllib.parse.urlparse(raw)
    host = parsed.netloc.lower()
    parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]

    if host == "raw.githubusercontent.com":
        if len(parts) < 4:
            raise ValueError("Raw GitHub URLs must include owner, repo, ref, and path.")
        owner, repo, ref = parts[0], parts[1].removesuffix(".git"), parts[2]
        raw_path = "/".join(parts[3:])
        return {
            "kind": "raw_file",
            "owner": owner,
            "repo": repo,
            "ref": ref,
            "path": raw_path,
            "html_url": f"https://github.com/{owner}/{repo}/blob/{ref}/{raw_path}",
            "download_url": raw,
        }

    if host not in {"github.com", "www.github.com"}:
        raise ValueError("Only github.com and raw.githubusercontent.com links are supported.")

    if len(parts) < 2:
        raise ValueError("GitHub URL must include an owner and repository.")
    owner, repo = parts[0], parts[1].removesuffix(".git")

    if len(parts) >= 5 and parts[2] == "releases" and parts[3] == "download":
        tag = parts[4]
        filename = parts[-1]
        return {
            "kind": "release_asset",
            "owner": owner,
            "repo": repo,
            "ref": tag,
            "path": "/".join(parts[5:]),
            "html_url": f"https://github.com/{owner}/{repo}",
            "download_url": raw,
            "asset_name": filename,
        }

    if len(parts) >= 5 and parts[2] in {"raw", "blob"}:
        ref = parts[3]
        raw_path = "/".join(parts[4:])
        return {
            "kind": "raw_file",
            "owner": owner,
            "repo": repo,
            "ref": ref,
            "path": raw_path,
            "html_url": raw if parts[2] == "blob" else f"https://github.com/{owner}/{repo}/blob/{ref}/{raw_path}",
            "download_url": f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{raw_path}",
        }

    ref = ""
    subdir = ""
    if len(parts) >= 4 and parts[2] in {"tree", "blob"}:
        ref = parts[3]
        subdir = "/".join(parts[4:])

    return {
        "kind": "repo",
        "owner": owner,
        "repo": repo,
        "ref": ref,
        "subdir": subdir,
        "html_url": f"https://github.com/{owner}/{repo}",
        "download_url": "",
    }


def create_custom_github_package(url: str, options: dict | None = None):
    options = options or {}
    info = _parse_github_link(url)
    owner = info["owner"]
    repo = info["repo"]
    repo_api = f"https://api.github.com/repos/{owner}/{repo}"
    repo_meta = {}
    release_meta = {}
    try:
        repo_meta = _github_request_json(repo_api)
    except Exception:
        repo_meta = {}
    try:
        release_meta = _github_request_json(repo_api + "/releases/latest")
    except Exception:
        release_meta = {}

    ref = str(info.get("ref") or repo_meta.get("default_branch") or "main")
    source_url = str(info.get("download_url") or "")
    if not source_url:
        source_url = f"https://api.github.com/repos/{owner}/{repo}/zipball/{urllib.parse.quote(ref)}"

    manifest_payloads, manifest_meta = _try_load_manifest_from_github_url(info, repo_meta, source_url=source_url)
    created_items = []
    if manifest_payloads:
        for manifest in manifest_payloads:
            if not isinstance(manifest, dict):
                continue
            item = _create_github_package_item_from_manifest(url, info, repo_meta, release_meta, manifest, manifest_meta, options)
            created_items.append(item)
    else:
        name = str(options.get("name") or repo_meta.get("name") or repo).replace("_", " ").strip()
        description = str(options.get("description") or repo_meta.get("description") or f"GitHub package from {owner}/{repo}.").strip()
        install_path = normalize_mister_relative_path(options.get("installPath") or options.get("defaultInstallPath") or f"/Scripts/{repo}")
        item_id_base = f"github_{owner}_{repo}"
        if info.get("subdir"):
            item_id_base += "_" + info.get("subdir", "").replace("/", "_")
        if info.get("kind") in {"raw_file", "release_asset"} and info.get("path"):
            item_id_base += "_" + Path(str(info.get("path"))).stem
        item_id = _slugify(options.get("id") or item_id_base, fallback=f"github_{_slugify(repo)}")
        version = str(options.get("version") or release_meta.get("tag_name") or repo_meta.get("pushed_at") or repo_meta.get("updated_at") or ref or "GitHub").strip()

        item = {
            "schema_version": 1,
            "id": item_id,
            "category": "github",
            "type": "github_package",
            "handler": "github_package",
            "name": name,
            "author": str(options.get("author") or repo_meta.get("owner", {}).get("login") or owner),
            "description": description,
            "visibility": "public",
            "sort_order": int(options.get("sortOrder") or 9000),
            "version": version,
            "release_date": str(release_meta.get("published_at") or repo_meta.get("pushed_at") or repo_meta.get("updated_at") or ""),
            "source_url": source_url,
            "source_page": str(repo_meta.get("html_url") or info.get("html_url") or url),
            "default_install_path": install_path,
            "allow_custom_install_path": True,
            "github": {
                "owner": owner,
                "repo": repo,
                "ref": ref,
                "subdir": info.get("subdir") or "",
                "path": info.get("path") or "",
                "kind": info.get("kind") or "repo",
            },
        }
        if repo_meta.get("homepage"):
            item["homepage"] = repo_meta.get("homepage")
        if repo_meta.get("stargazers_count") is not None:
            item["stars"] = repo_meta.get("stargazers_count")
        created_items.append(item)

    if not created_items:
        raise RuntimeError("No installable package entry could be created from that GitHub link.")

    items = load_custom_github_packages()
    new_ids = {str(entry.get("id") or "") for entry in created_items}
    items = [entry for entry in items if str(entry.get("id") or "") not in new_ids]
    items.extend(created_items)
    save_custom_github_packages(items)
    return created_items[0] if len(created_items) == 1 else created_items


def merge_custom_github_packages(catalog: dict) -> dict:
    catalog = dict(catalog or {})
    categories = [dict(cat) for cat in (catalog.get("categories") or []) if isinstance(cat, dict)]
    items = [dict(item) for item in (catalog.get("items") or []) if isinstance(item, dict)]
    packages = load_custom_github_packages()

    if packages and not any(cat.get("id") == "github" for cat in categories):
        categories.append(dict(GITHUB_PACKAGE_CATEGORY))

    seen = {str(item.get("id") or "") for item in items}
    for index, package in enumerate(packages, start=1):
        if not package.get("id") or not package.get("name"):
            continue
        item = dict(package)
        item.setdefault("category", "github")
        item.setdefault("type", "github_package")
        item.setdefault("handler", "github_package")
        item.setdefault("sort_order", 9000 + index)
        item.setdefault("description", "User-added GitHub package.")
        item.setdefault("visibility", "public")
        item.setdefault("allow_custom_install_path", True)
        if str(item.get("id")) in seen:
            items = [existing for existing in items if str(existing.get("id") or "") != str(item.get("id"))]
        items.append(item)
        seen.add(str(item.get("id")))

    catalog["categories"] = categories
    catalog["items"] = items
    return normalize_catalog(catalog)


def _hub_url(path: str) -> str:
    path = str(path or "").strip()
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return HUB_RAW_BASE_URL + path.lstrip("/")


def _read_index_catalog(url: str, cache_bust: bool = False, cache_token: str | None = None) -> dict:
    catalog = _read_url_json(url, cache_bust=cache_bust, cache_token=cache_token)
    item_refs = catalog.get("items") or []
    if not item_refs or not all(isinstance(item, str) for item in item_refs):
        return catalog

    categories_file = catalog.get("categories_file") or "categories.json"
    categories_payload = _read_url_json(
        _hub_url(categories_file),
        cache_bust=cache_bust,
        cache_token=cache_token,
    )
    if isinstance(categories_payload, dict):
        categories = categories_payload.get("categories") or []
    else:
        categories = categories_payload or []

    # Source item files are authoritative for editable metadata. Generated files
    # are used only to enrich media fields, so a manual refresh can see an item
    # edit immediately even while the Hub generation workflow is still running.
    generated_catalog = {}
    try:
        generated_catalog = _read_url_json(
            HUB_CATALOG_URL,
            cache_bust=cache_bust,
            cache_token=cache_token,
        )
    except Exception:
        generated_catalog = {}
    generated_by_id = {
        str(entry.get("id") or ""): entry
        for entry in (generated_catalog.get("items") or [])
        if isinstance(entry, dict) and entry.get("id")
    }

    items = []
    for item_ref in item_refs:
        item = _read_url_json(
            _hub_url(item_ref),
            cache_bust=cache_bust,
            cache_token=cache_token,
        )
        if isinstance(item, dict):
            media = generated_by_id.get(str(item.get("id") or ""), {})
            for key in ("thumbnail", "resolved_thumbnail", "gallery"):
                if not item.get(key) and media.get(key):
                    item[key] = media.get(key)
        items.append(item)

    full_catalog = dict(catalog)
    full_catalog["categories"] = categories
    full_catalog["items"] = items
    if generated_catalog.get("generated_at"):
        full_catalog["generated_at"] = generated_catalog.get("generated_at")
    return full_catalog


def load_catalog(prefer_cache: bool = False, fresh: bool = False) -> dict:
    if prefer_cache:
        cached = load_cached_catalog()
        if cached:
            cached["source"] = cached.get("source") or "disk cache"
            return cached

    errors = []
    cache_token = str(time.time_ns()) if fresh else None
    sources = (
        (HUB_ROOT_CATALOG_URL, "index"),
        (HUB_CATALOG_URL, "json"),
        (HUB_CATALOG_MIN_URL, "json"),
    ) if fresh else (
        (HUB_CATALOG_URL, "json"),
        (HUB_ROOT_CATALOG_URL, "index"),
        (HUB_CATALOG_MIN_URL, "json"),
    )

    for url, reader_kind in sources:
        try:
            if reader_kind == "index":
                raw_catalog = _read_index_catalog(
                    url,
                    cache_bust=fresh,
                    cache_token=cache_token,
                )
            else:
                raw_catalog = _read_url_json(
                    url,
                    cache_bust=fresh,
                    cache_token=cache_token,
                )
            asset_token = cache_token or str(raw_catalog.get("generated_at") or raw_catalog.get("catalog_version") or "")
            catalog = normalize_catalog(
                raw_catalog,
                resolve_remote_assets=True,
                asset_cache_token=asset_token,
            )
            catalog["source"] = url
            save_catalog_cache(catalog)
            return catalog
        except Exception as e:
            errors.append(f"{url}: {e}")

    cached = load_cached_catalog()
    if cached:
        cached["source"] = cached.get("source") or "disk cache"
        return cached

    raise RuntimeError("Install Center catalog could not be loaded from GitHub.\n" + "\n".join(errors))


def _resolve_hub_asset(value, cache_token: str = ""):
    if isinstance(value, list):
        return [_resolve_hub_asset(entry, cache_token) for entry in value if entry]
    text = str(value or "").strip()
    if not text:
        return value
    if text.startswith("data:") or text.startswith("blob:"):
        return text
    if not (text.startswith("http://") or text.startswith("https://")):
        text = _hub_url(text)
    if cache_token and text.startswith(HUB_RAW_BASE_URL) and "mc_ex_asset=" not in text:
        separator = "&" if "?" in text else "?"
        text = f"{text}{separator}mc_ex_asset={urllib.parse.quote(str(cache_token), safe='')}"
    return text


def normalize_catalog(catalog: dict, resolve_remote_assets: bool = False, asset_cache_token: str = "") -> dict:
    if not isinstance(catalog, dict):
        raise ValueError("Catalog is not a JSON object.")

    categories = catalog.get("categories") or CATEGORY_FALLBACK
    items = catalog.get("items") or []
    category_default_thumbnails = {
        cat.get("id"): (
            _resolve_hub_asset(cat.get("default_thumbnail"), asset_cache_token)
            if resolve_remote_assets and cat.get("default_thumbnail")
            else cat.get("default_thumbnail")
        )
        for cat in categories
        if isinstance(cat, dict)
    }

    normalized_items = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        if item.get("visibility") == "template":
            continue
        if not item.get("id") or not item.get("name"):
            continue
        normalized = dict(item)
        normalized.setdefault("sort_order", index * 10)
        normalized.setdefault("version", None)
        normalized.setdefault("release_date", None)
        normalized.setdefault("description", "")
        normalized.setdefault("category", "extras")
        normalized.setdefault("type", normalized.get("category", "extra"))
        normalized.setdefault("handler", normalized.get("id"))
        if not normalized.get("resolved_thumbnail"):
            normalized["resolved_thumbnail"] = normalized.get("thumbnail") or category_default_thumbnails.get(normalized.get("category"))
        if resolve_remote_assets:
            for asset_key in ("thumbnail", "resolved_thumbnail", "artwork", "image", "icon"):
                if normalized.get(asset_key):
                    normalized[asset_key] = _resolve_hub_asset(normalized.get(asset_key), asset_cache_token)
            if isinstance(normalized.get("gallery"), list):
                normalized["gallery"] = _resolve_hub_asset(normalized.get("gallery"), asset_cache_token)
        normalized_items.append(normalized)

    category_ids_with_items = {item.get("category") for item in normalized_items}
    normalized_categories = []
    for cat in categories:
        if not isinstance(cat, dict):
            continue
        if cat.get("hide_when_empty") and cat.get("id") not in category_ids_with_items:
            continue
        normalized_categories.append(dict(cat))

    catalog = dict(catalog)
    catalog["categories"] = sorted(normalized_categories, key=lambda c: c.get("sort_order", 999))
    catalog["items"] = sorted(normalized_items, key=lambda i: (i.get("category", ""), i.get("sort_order", 999), i.get("name", "")))
    return catalog


def build_context(main_window) -> InstallCenterContext:
    offline = hasattr(main_window, "is_offline_mode") and main_window.is_offline_mode()
    if offline:
        sd_root = main_window.get_offline_sd_root() if hasattr(main_window, "get_offline_sd_root") else ""
        return InstallCenterContext(mode="offline", connection=main_window.connection, sd_root=sd_root)
    return InstallCenterContext(mode="online", connection=main_window.connection, sd_root="")


def context_ready(context: InstallCenterContext) -> tuple[bool, str]:
    if context.offline:
        if not context.sd_root:
            return False, "Needs SD card"
        return True, "Ready"
    if not context.connection or not context.connection.is_connected():
        return False, "Needs connection"
    return True, "Ready"


def _script_status_text(handler: str, scripts_status, syncthing_status=None, ra_viewer_status=None) -> dict:
    if handler == "syncthing":
        if isinstance(syncthing_status, dict):
            result = _status_from_text(syncthing_status.get("status_text", "Status unknown"), bool(syncthing_status.get("installed", False)), False)
            result.update({k: syncthing_status.get(k) for k in (
                "install_enabled", "boot_label", "boot_enabled", "uninstall_enabled",
                "running", "start_on_boot_enabled"
            )})
            return result
        return {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}

    if handler == "ra_viewer":
        if isinstance(ra_viewer_status, dict):
            result = _status_from_text(ra_viewer_status.get("status_text", "Status unknown"), bool(ra_viewer_status.get("installed", False)), False)
            result.update({k: ra_viewer_status.get(k) for k in (
                "install_enabled", "edit_config_enabled", "uninstall_enabled"
            )})
            return result
        return {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}

    attr = SCRIPT_STATUS_ATTRS.get(handler)
    installed = bool(getattr(scripts_status, attr, False)) if attr else False

    if not installed:
        return {"state": "not_installed", "status_text": "Not installed", "installed": False, "update_available": False}

    if handler == "zaparoo":
        # Zaparoo has a real version command, so it is handled separately in
        # check_item_status/check_all_status where the online/offline context is available.
        if not getattr(scripts_status, "zaparoo_installed", False):
            return {"state": "not_installed", "status_text": "Not installed", "installed": False, "update_available": False}
        if not getattr(scripts_status, "zaparoo_service_enabled", False):
            return {"state": "installed", "status_text": "Installed, service disabled", "installed": True, "update_available": False}
        return {"state": "installed", "status_text": "Installed", "installed": True, "update_available": False}

    if handler == "cifs_mount":
        missing_required_files = []
        if not getattr(scripts_status, "cifs_umount_installed", False):
            missing_required_files.append("cifs_umount.sh")
        if (
            getattr(scripts_status, "cifs_common_required", False)
            and not getattr(scripts_status, "cifs_common_installed", False)
        ):
            missing_required_files.append("cifs_common.sh")

        if missing_required_files:
            return {
                "state": "update_available",
                "status_text": f"Update available, missing {', '.join(missing_required_files)}",
                "installed": True,
                "update_available": True,
                "install_label": "Update",
                "install_enabled": True,
            }
        if not getattr(scripts_status, "cifs_configured", False):
            return {"state": "installed", "status_text": "Installed, not configured", "installed": True, "update_available": False}
        return {"state": "installed", "status_text": "Configured", "installed": True, "update_available": False}

    if handler == "dav_browser":
        if not getattr(scripts_status, "dav_browser_configured", False):
            return {"state": "installed", "status_text": "Installed, not configured", "installed": True, "update_available": False}
        return {"state": "installed", "status_text": "Configured", "installed": True, "update_available": False}

    if handler == "ftp_save_sync":
        if not getattr(scripts_status, "ftp_save_sync_configured", False):
            return {"state": "installed", "status_text": "Installed, not configured", "installed": True, "update_available": False}
        if getattr(scripts_status, "ftp_save_sync_service_enabled", False):
            return {"state": "installed", "status_text": "Configured, service enabled", "installed": True, "update_available": False}
        return {"state": "installed", "status_text": "Configured, service disabled", "installed": True, "update_available": False}

    if handler == "static_wallpaper":
        if getattr(scripts_status, "static_wallpaper_active", False):
            return {"state": "installed", "status_text": "Installed, wallpaper active", "installed": True, "update_available": False}
        if getattr(scripts_status, "static_wallpaper_saved", False):
            return {"state": "installed", "status_text": "Installed, selection saved", "installed": True, "update_available": False}

    return {"state": "installed", "status_text": "Installed", "installed": True, "update_available": False}


def _status_from_text(text: str, installed=False, update_available=False) -> dict:
    lowered = str(text or "").lower()
    state = "unknown"
    if update_available or "update" in lowered:
        state = "update_available"
    elif "not installed" in lowered:
        state = "not_installed"
    elif installed or "installed" in lowered or "configured" in lowered:
        state = "installed"
    return {"state": state, "status_text": text or "Status unknown", "installed": state in {"installed", "update_available"}, "update_available": update_available or state == "update_available"}


def _extra_status(handler: str, context: InstallCenterContext, check_latest: bool, log=None) -> dict:
    functions = EXTRA_HANDLERS.get(handler)
    if not functions:
        return {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}

    get_online, get_local = functions[0], functions[1]
    if log:
        log(f"Checking {handler.replace('_', ' ')}...\n")
    if context.offline:
        if handler == "retroachievement_cores":
            status = get_local(context.sd_root, check_latest=check_latest, log=log)
        else:
            status = get_local(context.sd_root, check_latest=check_latest)
    else:
        if handler == "retroachievement_cores":
            status = get_online(context.connection, check_latest=check_latest, log=log)
        else:
            status = get_online(context.connection, check_latest=check_latest)

    if not isinstance(status, dict):
        return {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}

    installed = bool(status.get("installed"))
    update_available = bool(status.get("update_available"))
    text = status.get("status_text") or ("Update available" if update_available else "Installed" if installed else "Not installed")
    result = _status_from_text(text, installed=installed, update_available=update_available)
    result["installed_version"] = status.get("installed_version")
    result["latest_version"] = status.get("latest_version")
    for key in (
        "install_label", "install_enabled", "uninstall_enabled", "upload_enabled",
        "folder_open_enabled", "edit_config_enabled", "disable_enabled", "installed", "update_available",
        "components", "installed_component_keys", "incomplete_component_keys",
        "missing_component_keys", "all_components_installed", "outdated_sources"
    ):
        if key in status:
            result[key] = status.get(key)
    return result


def check_item_status(item: dict, context: InstallCenterContext, check_latest: bool = False, log=None) -> dict:
    ready, reason = context_ready(context)
    if not ready:
        return {"state": reason.lower().replace(" ", "_"), "status_text": reason, "installed": False, "update_available": False}

    item_id = item.get("id")
    handler = item.get("handler") or item_id
    item_type = item.get("type") or item.get("category")
    category = item.get("category")

    if item_type == "script" or category == "scripts":
        if log:
            log(f"Scanning {item.get('name') or handler} script status...\n")
        scripts_status = get_scripts_status_local(context.sd_root) if context.offline else get_scripts_status(context.connection)
        if handler == "zaparoo":
            try:
                return get_zaparoo_update_status_local(context.sd_root, check_latest=check_latest, log=log) if context.offline else get_zaparoo_update_status(context.connection, check_latest=check_latest, log=log)
            except Exception as e:
                return {"state": "unknown", "status_text": f"Status unknown ({e})", "installed": False, "update_available": False}
        syncthing_status = None
        ra_viewer_status = None
        if handler == "syncthing":
            try:
                syncthing_status = get_syncthing_status_local(context.sd_root) if context.offline else get_syncthing_status(context.connection)
            except Exception as e:
                syncthing_status = {"status_text": f"Status unknown ({e})"}
        if handler == "ra_viewer":
            try:
                ra_viewer_status = get_ra_viewer_status_local(context.sd_root) if context.offline else get_ra_viewer_status(context.connection)
            except Exception as e:
                ra_viewer_status = {"status_text": f"Status unknown ({e})"}
        base_status = _script_status_text(handler, scripts_status, syncthing_status, ra_viewer_status)
        return apply_script_update_status(
            handler,
            base_status,
            check_latest=check_latest,
            connection=context.connection,
            sd_root=context.sd_root,
            offline=context.offline,
            log=log,
        )
    if item_type in {"extra", "core"} or category in {"extras", "cores"}:
        return _extra_status(handler, context, check_latest, log=log)
    if item_type == "rom" or category == "roms":
        if log:
            log(f"Scanning ROM install manifest for {item.get('name') or item_id}...\n")
        return check_rom_status(item, context)
    if item_type == "github_package" or category == "github" or handler == "github_package":
        if log:
            log(f"Scanning GitHub package status for {item.get('name') or item_id}...\n")
        return check_github_package_status(item, context, check_latest=check_latest, log=log)
    if item_type == "wallpaper_pack" or category == "wallpaper_packs":
        if log:
            log(f"Scanning wallpaper pack status for {item.get('name') or item_id}...\n")
        return check_wallpaper_status(item, context)
    return {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}

def check_all_status(catalog: dict, context: InstallCenterContext, check_latest: bool = False, log=None) -> dict:
    ready, reason = context_ready(context)
    results = {}

    if not ready:
        for item in catalog.get("items", []):
            results[item.get("id")] = {"state": reason.lower().replace(" ", "_"), "status_text": reason, "installed": False, "update_available": False}
        return results

    scripts_status = None
    syncthing_status = None
    ra_viewer_status = None

    if any((item.get("type") == "script" or item.get("category") == "scripts") for item in catalog.get("items", [])):
        if log:
            log("Scanning installed scripts once for all script entries...\n")
        scripts_status = get_scripts_status_local(context.sd_root) if context.offline else get_scripts_status(context.connection)
        try:
            syncthing_status = get_syncthing_status_local(context.sd_root) if context.offline else get_syncthing_status(context.connection)
        except Exception as e:
            syncthing_status = {"status_text": f"Status unknown ({e})"}
        try:
            ra_viewer_status = get_ra_viewer_status_local(context.sd_root) if context.offline else get_ra_viewer_status(context.connection)
        except Exception as e:
            ra_viewer_status = {"status_text": f"Status unknown ({e})"}

    for item in catalog.get("items", []):
        item_id = item.get("id")
        handler = item.get("handler") or item_id
        item_type = item.get("type") or item.get("category")
        category = item.get("category")

        try:
            item_name = item.get("name") or item_id or "item"
            if log:
                log(f"Checking {item_name}...\n")
            if item_type == "script" or category == "scripts":
                if handler == "zaparoo":
                    results[item_id] = get_zaparoo_update_status_local(context.sd_root, check_latest=check_latest, log=log) if context.offline else get_zaparoo_update_status(context.connection, check_latest=check_latest, log=log)
                else:
                    base_status = _script_status_text(handler, scripts_status, syncthing_status, ra_viewer_status)
                    results[item_id] = apply_script_update_status(
                        handler,
                        base_status,
                        check_latest=check_latest,
                        connection=context.connection,
                        sd_root=context.sd_root,
                        offline=context.offline,
                        log=log,
                    )
            elif item_type in {"extra", "core"} or category in {"extras", "cores"}:
                results[item_id] = _extra_status(handler, context, check_latest, log=log)
            elif item_type == "rom" or category == "roms":
                results[item_id] = check_rom_status(item, context)
            elif item_type == "github_package" or category == "github" or handler == "github_package":
                results[item_id] = check_github_package_status(item, context, check_latest=check_latest, log=log)
            elif item_type == "wallpaper_pack" or category == "wallpaper_packs":
                results[item_id] = check_wallpaper_status(item, context)
            else:
                results[item_id] = {"state": "unknown", "status_text": "Status unknown", "installed": False, "update_available": False}
        except Exception as e:
            results[item_id] = {"state": "unknown", "status_text": f"Status unknown ({e})", "installed": False, "update_available": False}

    return results


def _local_manifest_path(sd_root: str) -> Path:
    root = Path(sd_root).expanduser().resolve()
    return root / "Scripts" / ".config" / "mister_companion" / "install_center" / "installed_roms.json"




def _wallpaper_handler_id(item_or_handler) -> str:
    if isinstance(item_or_handler, dict):
        handler = item_or_handler.get("handler") or item_or_handler.get("id")
        item_id = item_or_handler.get("id") or handler
    else:
        handler = item_or_handler
        item_id = handler
    if handler == "wallpaper_pack":
        return item_id
    return handler


def _wallpaper_fetch_items(handler: str, variant: str | None = None):
    handler = _wallpaper_handler_id(handler)
    if handler == "ranny_snice_wallpapers":
        wallpapers_169, wallpapers_43 = fetch_ranny_wallpapers()
        if variant == "169":
            return wallpapers_169
        if variant == "43":
            return wallpapers_43
        return wallpapers_169 + wallpapers_43
    if handler == "pcn_challenge_wallpapers":
        return fetch_pcn_wallpapers()
    if handler == "pcn_premium_wallpapers":
        return fetch_pcn_premium_wallpapers()
    if handler == "anime0t4ku_wallpapers":
        return fetch_ot4ku_wallpapers()
    return []


def check_wallpaper_status(item: dict, context: InstallCenterContext) -> dict:
    handler = _wallpaper_handler_id(item)
    installed_files = get_installed_wallpapers_local(context.sd_root) if context.offline else get_installed_wallpapers(context.connection)

    if handler == "ranny_snice_wallpapers":
        wallpapers_169, wallpapers_43 = fetch_ranny_wallpapers()
        installed_169, missing_169 = build_install_state(wallpapers_169, installed_files)
        installed_43, missing_43 = build_install_state(wallpapers_43, installed_files)
        installed = bool(installed_169 or installed_43)
        update_available = bool((installed_169 and missing_169) or (installed_43 and missing_43))
        result = {
            "ranny_169_installed": bool(installed_169),
            "ranny_169_missing": bool(missing_169),
            "ranny_43_installed": bool(installed_43),
            "ranny_43_missing": bool(missing_43),
        }
    else:
        wallpapers = _wallpaper_fetch_items(handler)
        installed, missing = build_install_state(wallpapers, installed_files)
        installed = bool(installed)
        update_available = bool(installed and missing)
        result = {
            "wallpaper_installed": bool(installed),
            "wallpaper_missing": bool(missing),
        }

    result.update({
        "state": "update_available" if update_available else "installed" if installed else "not_installed",
        "status_text": "Update available" if update_available else "Installed" if installed else "Not installed",
        "installed": installed,
        "update_available": update_available,
    })
    try:
        result["folder_available"] = True if context.offline else wallpaper_folder_exists(context.connection)
    except Exception:
        result["folder_available"] = False
    return result


def install_wallpaper_pack(item: dict, context: InstallCenterContext, log: Callable[[str], None], variant: str | None = None):
    handler = _wallpaper_handler_id(item)
    wallpapers = _wallpaper_fetch_items(handler, variant=variant)
    if not wallpapers:
        log("No wallpapers found.\n")
        return
    if context.offline:
        count = install_wallpaper_items_local(context.sd_root, wallpapers, log)
    else:
        count = install_wallpaper_items(context.connection, wallpapers, log)
    log(f"\nFinished. {count} wallpapers installed.\n")


def uninstall_wallpaper_pack(item: dict, context: InstallCenterContext, log: Callable[[str], None]):
    wallpapers = _wallpaper_fetch_items(_wallpaper_handler_id(item))
    if context.offline:
        removed = remove_installed_wallpapers_local(context.sd_root, wallpapers, log)
    else:
        removed = remove_installed_wallpapers(context.connection, wallpapers, log)
    log(f"\nFinished. {removed} wallpapers removed.\n")


def open_wallpaper_folder(context: InstallCenterContext):
    if context.offline:
        open_wallpaper_folder_local(context.sd_root)
    else:
        open_wallpaper_folder_on_host(
            context.connection.host,
            context.connection.username or "root",
            context.connection.password or "1",
        )


def _rom_manifest_path_for_context(context: InstallCenterContext):
    if context.offline:
        return _local_manifest_path(context.sd_root)
    return ROM_MANIFEST_REMOTE_PATH


def _empty_rom_manifest():
    return {"schema_version": 1, "installed_roms": {}}


def _read_rom_manifest(context: InstallCenterContext) -> dict:
    try:
        if context.offline:
            path = _local_manifest_path(context.sd_root)
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data.setdefault("installed_roms", {})
                    return data
        else:
            raw = context.connection.run_command(f"cat {ROM_MANIFEST_REMOTE_PATH} 2>/dev/null")
            if raw:
                data = json.loads(raw)
                if isinstance(data, dict):
                    data.setdefault("installed_roms", {})
                    return data
    except Exception:
        pass
    return _empty_rom_manifest()


def _write_rom_manifest(context: InstallCenterContext, manifest: dict):
    manifest.setdefault("schema_version", 1)
    manifest.setdefault("installed_roms", {})
    text = json.dumps(manifest, indent=2, ensure_ascii=False)
    if context.offline:
        path = _local_manifest_path(context.sd_root)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return

    sftp = context.connection.client.open_sftp()
    try:
        ensure_remote_dir(sftp, "/media/fat/Scripts/.config/mister_companion/install_center")
        with sftp.open(ROM_MANIFEST_REMOTE_PATH, "w") as handle:
            handle.write(text)
    finally:
        sftp.close()


def _github_manifest_local_path(sd_root: str) -> Path:
    root = Path(sd_root).expanduser().resolve()
    return root / "Scripts" / ".config" / "mister_companion" / "install_center" / "installed_github_packages.json"


def _empty_github_manifest() -> dict:
    return {"schema_version": 1, "packages": {}}


def _read_github_manifest(context: InstallCenterContext) -> dict:
    try:
        if context.offline:
            path = _github_manifest_local_path(context.sd_root)
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data.setdefault("packages", {})
                    return data
        else:
            raw = context.connection.run_command(f"cat {GITHUB_PACKAGE_REMOTE_MANIFEST_PATH} 2>/dev/null")
            if raw:
                data = json.loads(raw)
                if isinstance(data, dict):
                    data.setdefault("packages", {})
                    return data
    except Exception:
        pass
    return _empty_github_manifest()


def _write_github_manifest(context: InstallCenterContext, manifest: dict):
    manifest.setdefault("schema_version", 1)
    manifest.setdefault("packages", {})
    payload = json.dumps(manifest, indent=2, ensure_ascii=False)
    if context.offline:
        path = _github_manifest_local_path(context.sd_root)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload, encoding="utf-8")
        return
    sftp = context.connection.client.open_sftp()
    try:
        ensure_remote_dir(sftp, "/media/fat/Scripts/.config/mister_companion/install_center")
        with sftp.open(GITHUB_PACKAGE_REMOTE_MANIFEST_PATH, "w") as handle:
            handle.write(payload)
    finally:
        sftp.close()


def _download_bytes(url: str, log: Callable[[str], None], timeout: int = 90) -> bytes:
    if not url:
        raise RuntimeError("This GitHub package does not have a download URL.")
    log(f"Downloading {url}...\n")
    request = urllib.request.Request(url, headers={"User-Agent": "MiSTer-Companion-EX/Install-Center"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except Exception:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return response.read()


def _safe_archive_relative_path(name: str) -> str:
    rel = str(name or "").replace("\\", "/").lstrip("/")
    parts = [part for part in rel.split("/") if part not in {"", "."}]
    if not parts or any(part == ".." for part in parts):
        return ""
    return "/".join(parts)


def _join_mister_relative_path(base: str, child: str = "") -> str:
    base = normalize_mister_relative_path(base).rstrip("/")
    child = _safe_archive_relative_path(child)
    if not child:
        return base or "/"
    return normalize_mister_relative_path((base or "/") + "/" + child)


def _write_package_file(context: InstallCenterContext, target_relative: str, data: bytes):
    target_relative = normalize_mister_relative_path(target_relative)
    if context.offline:
        target = Path(resolve_mister_relative_path(context, target_relative))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return
    target = resolve_mister_relative_path(context, target_relative)
    sftp = context.connection.client.open_sftp()
    try:
        ensure_remote_dir(sftp, str(Path(target).parent).replace("\\", "/"))
        with sftp.open(target, "wb") as handle:
            handle.write(data)
    finally:
        sftp.close()


def _chmod_package_file(context: InstallCenterContext, target_relative: str, log: Callable[[str], None] | None = None):
    target_relative = normalize_mister_relative_path(target_relative)
    try:
        if context.offline:
            target = Path(resolve_mister_relative_path(context, target_relative))
            if target.exists():
                target.chmod(target.stat().st_mode | 0o111)
        else:
            target = resolve_mister_relative_path(context, target_relative)
            context.connection.run_command(f"chmod +x {json.dumps(target)}")
        if log:
            log(f"Made executable: {target_relative}\n")
    except Exception as exc:
        if log:
            log(f"Could not chmod {target_relative}: {exc}\n")


def _is_url(value: str) -> bool:
    return bool(re.match(r"^https?://", str(value or ""), re.I))


def _entry_source_url(item: dict, source: str) -> str:
    source = str(source or "").replace("\\", "/").strip()
    if _is_url(source):
        return source
    github = item.get("github") or {}
    owner = github.get("owner") or ""
    repo = github.get("repo") or ""
    ref = github.get("ref") or "main"
    if not source and github.get("kind") == "raw_file" and github.get("path"):
        source = github.get("path")
    source = _safe_archive_relative_path(source)
    if not owner or not repo or not source:
        return ""
    return _raw_github_url(owner, repo, ref, source)


def _target_for_manifest_file(target_base: str, entry: dict, source: str) -> str:
    target = str(entry.get("target") or "").replace("\\", "/").strip()
    rename = str(entry.get("rename") or "").strip()
    source_name = Path(str(urllib.parse.urlparse(source).path if _is_url(source) else source).rstrip("/")).name or "package-file"
    filename = rename or source_name
    if target:
        if target.endswith("/"):
            return _join_mister_relative_path(target, filename)
        return normalize_mister_relative_path(target)
    return _join_mister_relative_path(target_base, filename)


def _archive_members_for_manifest_source(zip_obj: zipfile.ZipFile, source_prefix: str = ""):
    members = [entry for entry in zip_obj.infolist() if not entry.is_dir()]
    names = [_safe_archive_relative_path(entry.filename) for entry in members]
    names = [name for name in names if name]
    if not names:
        return []
    top = ""
    top_parts = {name.split("/", 1)[0] for name in names if "/" in name}
    if len(top_parts) == 1:
        top = next(iter(top_parts))
    source_prefix = _safe_archive_relative_path(source_prefix)
    result = []
    for entry in members:
        rel = _safe_archive_relative_path(entry.filename)
        if not rel:
            continue
        if top and rel.startswith(top + "/"):
            rel = rel[len(top) + 1:]
        if source_prefix:
            if rel == source_prefix:
                continue
            if not rel.startswith(source_prefix.rstrip("/") + "/"):
                continue
            rel = rel[len(source_prefix.rstrip("/")) + 1:]
        rel = _safe_archive_relative_path(rel)
        if rel:
            result.append((entry, rel))
    return result


def _install_manifest_package(item: dict, context: InstallCenterContext, log: Callable[[str], None], install_path: str | None = None) -> list[str]:
    package_manifest = item.get("package_manifest") or {}
    target_base = normalize_mister_relative_path(install_path or item.get("_selected_install_path") or item.get("default_install_path") or package_manifest.get("default_install_path") or f"/Scripts/{item.get('id', 'github_package')}")
    files = package_manifest.get("files") or []
    if not files:
        raise RuntimeError("This package manifest does not define any files to install.")

    installed_files = []
    repo_archive_data = None
    source_archive_url = item.get("source_url") or ""
    for index, entry in enumerate(files, start=1):
        source = str(entry.get("source") or "").replace("\\", "/").strip()
        recursive = bool(entry.get("recursive"))
        extract = bool(entry.get("extract"))
        executable = bool(entry.get("executable"))
        optional = bool(entry.get("optional"))
        target = str(entry.get("target") or "").replace("\\", "/").strip()

        try:
            if recursive:
                if repo_archive_data is None:
                    repo_archive_data = _download_bytes(source_archive_url, log)
                with zipfile.ZipFile(io.BytesIO(repo_archive_data)) as archive:
                    members = _archive_members_for_manifest_source(archive, source)
                    if not members:
                        raise RuntimeError(f"No files matched manifest folder: {source}")
                    target_dir = normalize_mister_relative_path(target or target_base)
                    log(f"Installing folder {source or '/'} to {target_dir} ({len(members)} files)...\n")
                    for member, rel in members:
                        target_relative = _join_mister_relative_path(target_dir, rel)
                        _write_package_file(context, target_relative, archive.read(member))
                        installed_files.append(target_relative)
                continue

            source_url = _entry_source_url(item, source)
            if not source_url:
                raise RuntimeError(f"Manifest file entry #{index} does not have a source URL or repo path.")
            data = _download_bytes(source_url, log)
            if extract:
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as archive:
                        members = _archive_members_for_manifest_source(archive, "")
                        if not members:
                            raise RuntimeError("Archive did not contain installable files.")
                        target_dir = normalize_mister_relative_path(target or target_base)
                        log(f"Extracting {source} to {target_dir} ({len(members)} files)...\n")
                        for member, rel in members:
                            target_relative = _join_mister_relative_path(target_dir, rel)
                            _write_package_file(context, target_relative, archive.read(member))
                            installed_files.append(target_relative)
                    continue
                except zipfile.BadZipFile:
                    if not optional:
                        raise
            target_relative = _target_for_manifest_file(target_base, entry, source)
            _write_package_file(context, target_relative, data)
            installed_files.append(target_relative)
            if executable:
                _chmod_package_file(context, target_relative, log=log)
        except Exception as exc:
            if optional:
                log(f"Optional manifest entry skipped: {source or target} ({exc})\n")
                continue
            raise

    post_message = package_manifest.get("post_install_message")
    if post_message:
        log("\n" + str(post_message).strip() + "\n")
    if package_manifest.get("requires_reboot"):
        log("\nThis package manifest says a MiSTer reboot may be required.\n")
    return installed_files


def _archive_members_for_package(zip_obj: zipfile.ZipFile, item: dict):
    members = [entry for entry in zip_obj.infolist() if not entry.is_dir()]
    names = [_safe_archive_relative_path(entry.filename) for entry in members]
    names = [name for name in names if name]
    if not names:
        return []
    top = ""
    top_parts = {name.split("/", 1)[0] for name in names if "/" in name}
    if len(top_parts) == 1:
        top = next(iter(top_parts))
    selected_subdir = _safe_archive_relative_path((item.get("github") or {}).get("subdir") or "")
    result = []
    for entry in members:
        rel = _safe_archive_relative_path(entry.filename)
        if not rel:
            continue
        if top and rel.startswith(top + "/"):
            rel = rel[len(top) + 1:]
        if selected_subdir:
            if rel == selected_subdir:
                continue
            if not rel.startswith(selected_subdir.rstrip("/") + "/"):
                continue
            rel = rel[len(selected_subdir.rstrip("/")) + 1:]
        rel = _safe_archive_relative_path(rel)
        if rel:
            result.append((entry, rel))
    return result


def check_github_package_status(item: dict, context: InstallCenterContext, check_latest: bool = False, log=None) -> dict:
    manifest = _read_github_manifest(context)
    packages = manifest.get("packages") or {}
    installed_entry = packages.get(str(item.get("id") or ""))
    installed = bool(installed_entry)
    current_version = str(item.get("version") or "")
    installed_version = str((installed_entry or {}).get("version") or "")
    update_available = bool(installed and current_version and installed_version and current_version != installed_version)
    if installed:
        status_text = "Update available" if update_available else "Installed"
        state = "update_available" if update_available else "installed"
    else:
        status_text = "Not installed"
        state = "not_installed"
    return {
        "state": state,
        "status_text": status_text,
        "installed": installed,
        "update_available": update_available,
        "installed_version": installed_version or None,
        "latest_version": current_version or None,
        "install_path": (installed_entry or {}).get("install_path") or item.get("default_install_path"),
        "installed_files": len((installed_entry or {}).get("files") or []),
        "can_install_update": True,
        "can_uninstall": installed,
    }


def install_github_package(item: dict, context: InstallCenterContext, log: Callable[[str], None], install_path: str | None = None):
    target_base = normalize_mister_relative_path(install_path or item.get("_selected_install_path") or item.get("default_install_path") or f"/Scripts/{item.get('id', 'github_package')}")
    source_url = item.get("source_url") or item.get("download_url") or ""
    archive_mode = False

    if item.get("package_manifest"):
        log(f"Using package manifest for {item.get('name') or item.get('id')}...\n")
        installed_files = _install_manifest_package(item, context, log, install_path=target_base)
        archive_mode = bool(any((entry.get("recursive") or entry.get("extract")) for entry in ((item.get("package_manifest") or {}).get("files") or [])))
    else:
        data = _download_bytes(source_url, log)
        installed_files = []
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                members = _archive_members_for_package(archive, item)
                if not members:
                    raise RuntimeError("The GitHub archive did not contain installable files.")
                archive_mode = True
                log(f"Installing {len(members)} file(s) to {target_base}...\n")
                for index, (member, rel) in enumerate(members, start=1):
                    target_relative = _join_mister_relative_path(target_base, rel)
                    _write_package_file(context, target_relative, archive.read(member))
                    installed_files.append(target_relative)
                    if index % 25 == 0:
                        log(f"{index}/{len(members)} files copied...\n")
        except zipfile.BadZipFile:
            filename = Path(urllib.parse.urlparse(source_url).path).name or Path(str((item.get("github") or {}).get("path") or "package.bin")).name
            target_relative = _join_mister_relative_path(target_base, filename)
            _write_package_file(context, target_relative, data)
            installed_files.append(target_relative)

    package_manifest = item.get("package_manifest") or {}
    manifest = _read_github_manifest(context)
    manifest.setdefault("packages", {})
    manifest["packages"][str(item.get("id"))] = {
        "id": item.get("id"),
        "name": item.get("name"),
        "source_url": source_url,
        "source_page": item.get("source_page"),
        "version": item.get("version"),
        "install_path": target_base,
        "files": installed_files,
        "uninstall_remove": package_manifest.get("uninstall_remove") or [],
        "archive": archive_mode,
        "manifest_driven": bool(package_manifest),
        "manifest_source": item.get("manifest_source") or {},
        "installed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _write_github_manifest(context, manifest)
    log(f"\nFinished. {len(installed_files)} file(s) installed to {target_base}.\n")


def _delete_package_target(context: InstallCenterContext, target_relative: str, log: Callable[[str], None]):
    target_relative = normalize_mister_relative_path(target_relative)
    if target_relative in {"", "/"}:
        log("Skipped unsafe package removal target.\n")
        return
    if context.offline:
        target = Path(resolve_mister_relative_path(context, target_relative))
        if target.exists() and target.is_dir():
            shutil.rmtree(target)
            log(f"Removed folder {target_relative}\n")
        elif target.exists() and target.is_file():
            target.unlink()
            log(f"Removed {target_relative}\n")
        return
    target = resolve_mister_relative_path(context, target_relative)
    if target.rstrip("/") in {"/media/fat", "/media/usb0", ""}:
        log("Skipped unsafe package removal target.\n")
        return
    context.connection.run_command(f"rm -rf {json.dumps(target)}")
    log(f"Removed {target_relative}\n")


def uninstall_github_package(item: dict, context: InstallCenterContext, log: Callable[[str], None]):
    manifest = _read_github_manifest(context)
    packages = manifest.get("packages") or {}
    entry = packages.get(str(item.get("id") or ""))
    if not entry:
        log("Package was not marked as installed. Nothing to remove.\n")
        return
    removed = 0
    removal_targets = []
    for target_relative in list(entry.get("files") or []):
        if target_relative not in removal_targets:
            removal_targets.append(target_relative)
    for target_relative in list(entry.get("uninstall_remove") or []):
        if target_relative not in removal_targets:
            removal_targets.append(target_relative)
    for target_relative in removal_targets:
        try:
            _delete_package_target(context, target_relative, log)
            removed += 1
        except Exception as exc:
            log(f"Could not remove {target_relative}: {exc}\n")
    packages.pop(str(item.get("id") or ""), None)
    manifest["packages"] = packages
    _write_github_manifest(context, manifest)
    log(f"\nFinished. {removed} file(s) removed.\n")


def normalize_mister_relative_path(path: str, default="/games") -> str:
    text = str(path or default).replace("\\", "/").strip()
    if not text:
        text = default
    if text.startswith("/media/fat"):
        text = text[len("/media/fat"):]
    if text.startswith("/media/usb0"):
        text = text[len("/media/usb0"):]
    if not text.startswith("/"):
        text = "/" + text
    text = normalize_remote_path(text)
    if text == "/":
        text = default
    return text


def resolve_mister_relative_path(context: InstallCenterContext, relative_path: str) -> str:
    relative_path = normalize_mister_relative_path(relative_path)
    if context.offline:
        return str(Path(context.sd_root).expanduser().resolve() / relative_path.strip("/"))
    return "/media/fat" + relative_path


def _download_rom_file(url: str, log: Callable[[str], None]) -> bytes:
    if not url:
        raise RuntimeError("This ROM entry does not have a download URL.")
    log(f"Downloading {url}...\n")
    request = urllib.request.Request(url, headers={"User-Agent": "MiSTer-Companion-EX/Install-Center"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()
    except Exception:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=60, context=context) as response:
            return response.read()


def _rom_install_extensions(item: dict):
    download = item.get("download") or {}
    extensions = download.get("install_extensions") or []
    if isinstance(extensions, str):
        extensions = [extensions]
    return {str(ext).lower() for ext in extensions if str(ext).startswith(".")}


def _rom_download_filename(item: dict, url: str) -> str:
    name = str((item.get("download") or {}).get("filename") or "").strip()
    if not name:
        name = Path(str(url).split("?", 1)[0]).name
    if not name:
        name = f"{item.get('id', 'rom')}.rom"
    return name


def _write_rom_file(context: InstallCenterContext, target_relative: str, data: bytes, log: Callable[[str], None]):
    target_relative = normalize_mister_relative_path(target_relative)
    if context.offline:
        target = Path(resolve_mister_relative_path(context, target_relative))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    else:
        target = resolve_mister_relative_path(context, target_relative)
        sftp = context.connection.client.open_sftp()
        try:
            ensure_remote_dir(sftp, str(Path(target).parent).replace("\\", "/"))
            with sftp.open(target, "wb") as handle:
                handle.write(data)
        finally:
            sftp.close()
    log(f"Installed {target_relative}\n")


def _delete_rom_file(context: InstallCenterContext, target_relative: str, log: Callable[[str], None]):
    target_relative = normalize_mister_relative_path(target_relative)
    if context.offline:
        target = Path(resolve_mister_relative_path(context, target_relative))
        if target.exists() and target.is_file():
            target.unlink()
            log(f"Removed {target_relative}\n")
    else:
        target = resolve_mister_relative_path(context, target_relative)
        try:
            context.connection.run_command(f"rm -f {json.dumps(target)}")
            log(f"Removed {target_relative}\n")
        except Exception as e:
            log(f"Could not remove {target_relative}: {e}\n")


def install_rom_item(item: dict, context: InstallCenterContext, log: Callable[[str], None], install_path: str | None = None):
    item_id = item.get("id")
    if not item_id:
        raise RuntimeError("ROM entry is missing an id.")
    download = item.get("download") or {}
    url = download.get("url")
    download_type = str(download.get("type") or "file").lower()
    install_path = normalize_mister_relative_path(install_path or item.get("default_install_path") or "/games")
    data = _download_rom_file(url, log)
    installed_files = []

    if download_type == "archive":
        allowed_exts = _rom_install_extensions(item)
        with tempfile.TemporaryDirectory() as tmp:
            archive_path = Path(tmp) / "download.zip"
            archive_path.write_bytes(data)
            try:
                with zipfile.ZipFile(archive_path, "r") as archive:
                    for info in archive.infolist():
                        if info.is_dir():
                            continue
                        name = Path(info.filename).name
                        if not name:
                            continue
                        ext = Path(name).suffix.lower()
                        if allowed_exts and ext not in allowed_exts:
                            continue
                        file_data = archive.read(info.filename)
                        target_relative = normalize_mister_relative_path(join_remote_path(install_path, name))
                        _write_rom_file(context, target_relative, file_data, log)
                        installed_files.append(target_relative)
            except zipfile.BadZipFile:
                raise RuntimeError("The downloaded archive could not be opened.")
    else:
        filename = _rom_download_filename(item, url)
        target_relative = normalize_mister_relative_path(join_remote_path(install_path, filename))
        _write_rom_file(context, target_relative, data, log)
        installed_files.append(target_relative)

    if not installed_files:
        raise RuntimeError("No installable ROM files were found in the download.")

    manifest = _read_rom_manifest(context)
    manifest.setdefault("installed_roms", {})[item_id] = {
        "id": item_id,
        "name": item.get("name") or item_id,
        "system": item.get("system"),
        "installed_version": item.get("version"),
        "installed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "install_path": install_path,
        "installed_files": installed_files,
        "source_catalog_version": item.get("version"),
    }
    _write_rom_manifest(context, manifest)
    log("ROM install manifest updated.\n")


def uninstall_rom_item(item: dict, context: InstallCenterContext, log: Callable[[str], None]):
    item_id = item.get("id")
    manifest = _read_rom_manifest(context)
    installed_roms = manifest.setdefault("installed_roms", {})
    entry = installed_roms.get(item_id)
    if not entry:
        log("This ROM is not tracked as installed.\n")
        return
    for target_relative in entry.get("installed_files") or []:
        _delete_rom_file(context, target_relative, log)
    installed_roms.pop(item_id, None)
    _write_rom_manifest(context, manifest)
    log("ROM install manifest updated.\n")


def check_rom_status(item: dict, context: InstallCenterContext) -> dict:
    item_id = item.get("id")
    catalog_version = item.get("version")
    manifest = _read_rom_manifest(context)
    entry = (manifest.get("installed_roms") or {}).get(item_id)
    if not entry:
        return {"state": "not_installed", "status_text": "Not installed", "installed": False, "update_available": False}

    installed_version = entry.get("installed_version")
    update_available = bool(catalog_version and installed_version and str(catalog_version) != str(installed_version))
    return {
        "state": "update_available" if update_available else "installed",
        "status_text": "Update available" if update_available else "Installed",
        "installed": True,
        "update_available": update_available,
        "installed_version": installed_version,
        "latest_version": catalog_version,
        "install_path": entry.get("install_path"),
    }

def action_supported(item: dict, status: dict, action: str) -> bool:
    category = item.get("category")
    item_type = item.get("type")
    state = (status or {}).get("state")
    installed = bool((status or {}).get("installed"))

    if category == "wallpaper_packs" or item_type == "wallpaper_pack":
        if action == "install_update":
            return True
        if action == "uninstall":
            return installed
        if action == "open_folder":
            return True
        return False

    if item_type == "rom" or category == "roms":
        if action == "install_update":
            return state in {"not_installed", "update_available"}
        if action == "uninstall":
            return installed
        if action == "choose_install_folder":
            return bool(item.get("allow_custom_install_path", False)) and not installed
        return False

    if item_type == "github_package" or category == "github" or item.get("handler") == "github_package":
        if action == "install_update":
            return True
        if action == "uninstall":
            return installed
        if action == "choose_install_folder":
            return True
        return False

    if action == "install_update":
        return state in {"not_installed", "update_available"}
    if action == "uninstall":
        return installed
    if action == "configure":
        return installed and (item.get("handler") in {"update_all", "cifs_mount", "dav_browser", "ftp_save_sync", "ra_viewer", "retroachievement_cores"})
    if action == "run":
        return installed and item.get("handler") == "update_all"
    return False


def run_install_or_update(item: dict, context: InstallCenterContext, log: Callable[[str], None]):
    handler = item.get("handler") or item.get("id")
    category = item.get("category")
    item_type = item.get("type")

    if item_type == "script" or category == "scripts":
        functions = SCRIPT_INSTALLERS.get(handler)
        if not functions:
            raise RuntimeError("This script does not have an Install Center installer yet.")
        install_online, install_local = functions[0], functions[1]
        if context.offline:
            install_local(context.sd_root, log)
        else:
            install_online(context.connection, log)
        return

    if item_type in {"extra", "core"} or category in {"extras", "cores"}:
        functions = EXTRA_HANDLERS.get(handler)
        if not functions:
            raise RuntimeError("This entry does not have an Install Center installer yet.")
        install_online, install_local = functions[2], functions[3]
        if handler == "retroachievement_cores":
            source_keys = item.get("_selected_ra_core_keys")
            if context.offline:
                install_local(context.sd_root, log, source_keys=source_keys)
            else:
                install_online(context.connection, log, source_keys=source_keys)
        else:
            if context.offline:
                install_local(context.sd_root, log)
            else:
                install_online(context.connection, log)
        return

    if item_type == "rom" or category == "roms":
        install_rom_item(item, context, log, install_path=item.get("_selected_install_path"))
        return

    if item_type == "github_package" or category == "github" or handler == "github_package":
        install_github_package(item, context, log, install_path=item.get("_selected_install_path"))
        return

    if item_type == "wallpaper_pack" or category == "wallpaper_packs":
        install_wallpaper_pack(item, context, log)
        return

    raise RuntimeError("Install is not available for this entry yet.")


def run_uninstall(item: dict, context: InstallCenterContext, log: Callable[[str], None]):
    handler = item.get("handler") or item.get("id")
    category = item.get("category")
    item_type = item.get("type")

    if item_type == "script" or category == "scripts":
        functions = SCRIPT_INSTALLERS.get(handler)
        if not functions:
            raise RuntimeError("This script does not have an Install Center uninstaller yet.")
        uninstall_online, uninstall_local = functions[2], functions[3]
        if handler in {"syncthing", "ra_viewer"}:
            if context.offline:
                uninstall_local(context.sd_root, log)
            else:
                uninstall_online(context.connection, log)
        else:
            if context.offline:
                uninstall_local(context.sd_root)
            else:
                uninstall_online(context.connection)
        log("Uninstall finished.\n")
        return

    if item_type in {"extra", "core"} or category in {"extras", "cores"}:
        functions = EXTRA_HANDLERS.get(handler)
        if not functions:
            raise RuntimeError("This entry does not have an Install Center uninstaller yet.")
        uninstall_online, uninstall_local = functions[4], functions[5]
        if handler == "retroachievement_cores":
            source_keys = item.get("_selected_ra_core_keys")
            if context.offline:
                uninstall_local(context.sd_root, log, source_keys=source_keys)
            else:
                uninstall_online(context.connection, log, source_keys=source_keys)
        else:
            if context.offline:
                uninstall_local(context.sd_root, log)
            else:
                uninstall_online(context.connection, log)
        return

    if item_type == "rom" or category == "roms":
        uninstall_rom_item(item, context, log)
        return

    if item_type == "github_package" or category == "github" or handler == "github_package":
        uninstall_github_package(item, context, log)
        return

    if item_type == "wallpaper_pack" or category == "wallpaper_packs":
        uninstall_wallpaper_pack(item, context, log)
        return

    raise RuntimeError("Uninstall is not available for this entry yet.")
