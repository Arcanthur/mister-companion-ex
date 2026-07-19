#!/usr/bin/env python3
"""MiSTer Companion EX JSON-RPC backend for the VaultKit Electron port.

The original MiSTer Companion EX PyQt UI is intentionally not imported here. This
process exposes plain JSON methods over stdio so the Electron/VaultKit renderer
can use the Python core as an engine room.
"""

from __future__ import annotations

import json
import os
import sys
import traceback
import threading
import time
import uuid
import importlib.util
import platform
import re
import shlex
import shutil
import sqlite3
import urllib.request
import webbrowser
import socket
import ipaddress
import concurrent.futures
import requests
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

BACKEND_ROOT = Path(__file__).resolve().parent
DATA_ROOT = Path(os.environ.get("MISTER_COMPANION_DATA_DIR") or BACKEND_ROOT).resolve()
DATA_ROOT.mkdir(parents=True, exist_ok=True)
os.chdir(DATA_ROOT)
MISTER_APP_ROOT = BACKEND_ROOT / "mister-companion"
if str(MISTER_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(MISTER_APP_ROOT))

try:
    from core.app_info import APP_NAME, APP_VERSION, APP_AUTHOR
except Exception:  # pragma: no cover
    APP_NAME, APP_VERSION, APP_AUTHOR = "MiSTer Companion EX", "unknown", "unknown"

try:
    from core.config import load_config, save_config
    from core.device_profiles import add_device, delete_device, get_devices, update_device
except Exception:
    load_config = save_config = None
    add_device = delete_device = get_devices = update_device = None

try:
    from core.connection import MiSTerConnection
except Exception:
    MiSTerConnection = None

try:
    from core.device_actions import (
        get_sd_storage_info,
        get_usb_storage_info,
        is_smb_enabled,
        enable_smb_remote,
        disable_smb_remote,
        return_to_menu_remote,
        get_now_playing,
    )
except Exception:
    get_sd_storage_info = get_usb_storage_info = is_smb_enabled = enable_smb_remote = disable_smb_remote = return_to_menu_remote = get_now_playing = None

try:
    from core.install_center import (
        fallback_catalog, load_catalog, load_cached_catalog, normalize_catalog, check_item_status, check_all_status,
        action_supported, run_install_or_update, run_uninstall, InstallCenterContext,
        install_wallpaper_pack, uninstall_wallpaper_pack, open_wallpaper_folder,
        create_custom_github_package, merge_custom_github_packages,
    )
except Exception:
    fallback_catalog = load_catalog = load_cached_catalog = normalize_catalog = check_item_status = check_all_status = action_supported = run_install_or_update = run_uninstall = InstallCenterContext = None
    install_wallpaper_pack = uninstall_wallpaper_pack = open_wallpaper_folder = None
    create_custom_github_package = merge_custom_github_packages = None

try:
    from core import scripts_actions as scripts_actions
except Exception:
    scripts_actions = None

try:
    from core.update_all_offline import run_update_all_offline
except Exception:
    run_update_all_offline = None

try:
    from core import file_browser as file_browser_core
except Exception:
    file_browser_core = None

try:
    from core.savemanager import (
        BACKUP_ROOT,
        SYNC_ROOT,
        list_backup_devices,
        list_backups_for_device,
        get_backup_count,
        get_device_backup_root,
        ensure_savemanager_dirs,
        create_backup,
        create_backup_local,
        restore_backup,
        restore_backup_local,
        sync_saves,
        sync_saves_local,
        save_retention_setting,
        rebuild_sync_folder_from_latest_backups,
    )
except Exception:
    BACKUP_ROOT = SYNC_ROOT = None
    list_backup_devices = list_backups_for_device = get_backup_count = get_device_backup_root = None
    ensure_savemanager_dirs = create_backup = create_backup_local = restore_backup = restore_backup_local = sync_saves = sync_saves_local = save_retention_setting = rebuild_sync_folder_from_latest_backups = None

try:
    from core.manuals import (
        scan_cached_systems,
        scan_cached_pdfs,
        scan_remote_systems,
        scan_remote_pdfs,
        merge_systems,
        merge_pdfs,
        cache_remote_pdf,
        clear_manuals_cache,
        remove_cached_pdf,
        get_manuals_cache_root,
        has_cached_manuals,
    )
except Exception:
    scan_cached_systems = scan_cached_pdfs = scan_remote_systems = scan_remote_pdfs = None
    merge_systems = merge_pdfs = cache_remote_pdf = clear_manuals_cache = remove_cached_pdf = None
    get_manuals_cache_root = has_cached_manuals = None

try:
    from core.zaplauncher_db import get_media_db_path, get_last_scan_time
except Exception:
    get_media_db_path = get_last_scan_time = None

try:
    from core.zapscripts import (
        get_zapscripts_state,
        get_media_database_status,
        list_scripts as zapscripts_list_scripts,
        read_media_db_entries,
        fetch_media_from_db_cache,
        launch_media as zapscripts_launch_media,
        send_input_command as zapscripts_send_input_command,
        ZaparooApiError,
    )
except Exception:
    get_zapscripts_state = get_media_database_status = zapscripts_list_scripts = None
    read_media_db_entries = fetch_media_from_db_cache = zapscripts_launch_media = zapscripts_send_input_command = None
    ZaparooApiError = RuntimeError

try:
    from core.screenscraper_private import has_dev_credentials, set_dev_credentials
except Exception:
    has_dev_credentials = set_dev_credentials = None


try:
    from core.flasher import (
        is_flash_supported,
        has_balena_cli,
        has_mc_fusion_image,
        has_mr_fusion_image,
        has_superstation_image,
        get_balena_executable,
        get_mc_fusion_image,
        get_mr_fusion_image,
        get_superstation_image,
        get_mc_fusion_image_status,
        get_superstation_image_status,
        ensure_balena_cli,
        ensure_mc_fusion_image,
        ensure_mr_fusion_image,
        ensure_superstation_image,
        remove_balena_cli,
        remove_mc_fusion_image,
        remove_mr_fusion_image,
        remove_superstation_image,
        list_available_drives,
        flash_image,
        backup_drive_to_image,
        is_admin_windows,
        is_root_linux,
        get_platform_key,
        get_arch_key,
        TOOLS_DIR as FLASH_TOOLS_DIR,
        BALENA_DIR as FLASH_BALENA_DIR,
        MC_FUSION_DIR as FLASH_MC_FUSION_DIR,
        MR_FUSION_DIR as FLASH_MR_FUSION_DIR,
        SUPERSTATION_DIR as FLASH_SUPERSTATION_DIR,
    )
except Exception:
    is_flash_supported = has_balena_cli = has_mc_fusion_image = has_mr_fusion_image = has_superstation_image = None
    get_balena_executable = get_mc_fusion_image = get_mr_fusion_image = get_superstation_image = None
    get_mc_fusion_image_status = get_superstation_image_status = None
    ensure_balena_cli = ensure_mc_fusion_image = ensure_mr_fusion_image = ensure_superstation_image = None
    remove_balena_cli = remove_mc_fusion_image = remove_mr_fusion_image = remove_superstation_image = None
    list_available_drives = flash_image = backup_drive_to_image = None
    is_admin_windows = is_root_linux = get_platform_key = get_arch_key = None
    FLASH_TOOLS_DIR = FLASH_BALENA_DIR = FLASH_MC_FUSION_DIR = FLASH_MR_FUSION_DIR = FLASH_SUPERSTATION_DIR = None

try:
    from core.remote_daemon import (
        RemoteWebSocketClient,
        get_remote_daemon_status,
        install_remote_daemon,
        start_stop_remote_daemon,
        toggle_remote_daemon_boot,
        uninstall_remote_daemon,
        remote_websocket_url,
    )
except Exception:
    RemoteWebSocketClient = None
    get_remote_daemon_status = install_remote_daemon = start_stop_remote_daemon = None
    toggle_remote_daemon_boot = uninstall_remote_daemon = remote_websocket_url = None

try:
    from core.retroachievements_api import get_user_summary as ra_get_user_summary, get_game_set_options as ra_get_game_set_options
except Exception:
    ra_get_user_summary = ra_get_game_set_options = None

try:
    from core.zapscraper import (
        scan_sd_card as zapscraper_scan_sd_card,
        scan_games_folder as zapscraper_scan_games_folder,
        save_scan_cache as zapscraper_save_scan_cache,
        load_scan_cache_systems as zapscraper_load_scan_cache_systems,
        load_pending_scan_cache_systems as zapscraper_load_pending_systems,
        scan_cache_exists as zapscraper_scan_cache_exists,
        clear_scan_cache as zapscraper_clear_scan_cache,
        clear_scrape_output_for_system as zapscraper_clear_output_for_system,
        plan_scrape_actions as zapscraper_plan_scrape_actions,
        run_scrape_actions as zapscraper_run_scrape_actions,
        test_screenscraper_login as zapscraper_test_login,
        format_screenscraper_quota_info as zapscraper_format_quota_info,
        build_gamelist_review_items as zapscraper_build_gamelist_review_items,
        build_zaparoo_companion_review_items as zapscraper_build_zaparoo_review_items,
        default_manual_search_text as zapscraper_default_manual_search_text,
        default_zaparoo_manual_search_text as zapscraper_default_zaparoo_search_text,
        search_screenscraper_games as zapscraper_search_games,
        apply_manual_scrape_result as zapscraper_apply_manual_result,
        apply_zaparoo_manual_match_result as zapscraper_apply_zaparoo_match,
    )
except Exception:
    zapscraper_scan_sd_card = zapscraper_scan_games_folder = zapscraper_save_scan_cache = None
    zapscraper_load_scan_cache_systems = zapscraper_load_pending_systems = None
    zapscraper_scan_cache_exists = zapscraper_clear_scan_cache = zapscraper_clear_output_for_system = None
    zapscraper_plan_scrape_actions = zapscraper_run_scrape_actions = zapscraper_test_login = None
    zapscraper_format_quota_info = None
    zapscraper_build_gamelist_review_items = zapscraper_build_zaparoo_review_items = None
    zapscraper_default_manual_search_text = zapscraper_default_zaparoo_search_text = None
    zapscraper_search_games = zapscraper_apply_manual_result = zapscraper_apply_zaparoo_match = None

try:
    from core.zapscraper_systems import (
        OUTPUT_FORMAT_ZAPAROO_COMPANION,
        get_image_source_names,
        get_output_format_names,
        get_region_names,
        get_zaparoo_companion_media_names,
        get_default_zaparoo_companion_media_names,
        get_output_format_id,
    )
except Exception:
    OUTPUT_FORMAT_ZAPAROO_COMPANION = "zaparoo_companion"
    get_image_source_names = get_output_format_names = get_region_names = None
    get_zaparoo_companion_media_names = get_default_zaparoo_companion_media_names = None
    get_output_format_id = None

connection = MiSTerConnection() if MiSTerConnection else None
active_profile_name = ""
jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()
install_catalog_cache: dict[str, Any] | None = None
install_catalog_error = ""
install_catalog_loaded_at = 0.0
zapscraper_plans: dict[str, dict[str, Any]] = {}
zapscraper_plans_lock = threading.Lock()
remote_client = None
remote_client_host = ""
remote_client_lock = threading.RLock()



def _ok(result: Any = None) -> dict[str, Any]:
    return {"ok": True, "result": result}


def _err(message: str, details: str | None = None) -> dict[str, Any]:
    payload = {"ok": False, "error": message or "Unknown error"}
    if details:
        payload["details"] = details
    return payload


def _config() -> dict[str, Any]:
    if not load_config:
        return {"devices": [], "last_connected": None}
    return load_config()


def _save_config(data: dict[str, Any]) -> None:
    if save_config:
        save_config(data)



def _redact_device(device: dict[str, Any]) -> dict[str, Any]:
    redacted = dict(device or {})
    if redacted.get("password"):
        redacted["password"] = "********"
    return redacted


def _new_job(kind: str, label: str, target: Callable[[Callable[[str], None], dict[str, Any]], Any]) -> dict[str, Any]:
    job_id = uuid.uuid4().hex[:12]
    job = {
        "id": job_id,
        "kind": kind,
        "label": label,
        "status": "queued",
        "startedAt": time.time(),
        "finishedAt": None,
        "logs": [],
        "result": None,
        "error": "",
        "cancelRequested": False,
    }

    def log(message: str):
        with jobs_lock:
            job["logs"].append(str(message).rstrip("\n"))
            if len(job["logs"]) > 900:
                job["logs"] = job["logs"][-900:]

    def runner():
        with jobs_lock:
            job["status"] = "running"
        try:
            result = target(log, job)
            with jobs_lock:
                job["status"] = "completed"
                job["result"] = result
                job["finishedAt"] = time.time()
        except Exception as exc:
            with jobs_lock:
                job["status"] = "failed"
                job["error"] = str(exc)
                job["details"] = traceback.format_exc()
                job["finishedAt"] = time.time()

    with jobs_lock:
        jobs[job_id] = job
    thread = threading.Thread(target=runner, name=f"VaultKitJob-{job_id}", daemon=True)
    job["thread"] = thread
    thread.start()
    return _public_job(job)


def _public_job(job: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in job.items() if k != "thread"}


def _require_connected():
    if not connection or not connection.is_connected():
        raise RuntimeError("Not connected to a MiSTer.")
    return connection


def _remote_read_text(remote_path: str) -> str:
    conn = _require_connected()
    sftp = conn.client.open_sftp()
    try:
        with sftp.open(remote_path, "rb") as fh:
            data = fh.read()
    finally:
        sftp.close()
    if isinstance(data, str):
        return data
    return bytes(data).decode("utf-8", errors="replace")


def _remote_write_text(remote_path: str, text: str, backup: bool = True) -> str:
    conn = _require_connected()
    if backup:
        stamp = time.strftime("%Y%m%d-%H%M%S")
        conn.run_command(f'cp "{remote_path}" "{remote_path}.vaultkit-{stamp}.bak" 2>/dev/null || true')
    payload = str(text or "").encode("utf-8")
    sftp = conn.client.open_sftp()
    try:
        with sftp.open(remote_path, "wb") as fh:
            fh.write(payload)
    finally:
        sftp.close()
    return remote_path

def _normalize_device(device: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(device.get("name") or "").strip(),
        "ip": str(device.get("ip") or device.get("host") or "").strip(),
        "username": str(device.get("username") or "root").strip() or "root",
        "password": str(device.get("password") or ""),
        "use_ssh_agent": bool(device.get("use_ssh_agent", False)),
        "look_for_ssh_keys": bool(device.get("look_for_ssh_keys", False)),
    }


def method_ping(params: dict[str, Any]) -> dict[str, Any]:
    return _ok({
        "name": APP_NAME,
        "version": APP_VERSION,
        "author": APP_AUTHOR,
        "backendRoot": str(BACKEND_ROOT),
        "dataRoot": str(DATA_ROOT),
        "python": sys.version.split()[0],
        "platform": sys.platform,
    })


def method_config_get(params: dict[str, Any]) -> dict[str, Any]:
    return _ok(_config())


def method_profiles_list(params: dict[str, Any]) -> dict[str, Any]:
    config = _config()
    devices = get_devices(config) if get_devices else config.get("devices", [])
    return _ok({
        "devices": devices,
        "lastConnected": config.get("last_connected"),
    })


def method_profiles_save(params: dict[str, Any]) -> dict[str, Any]:
    config = _config()
    device = _normalize_device(params.get("device") or params)
    if not device["name"]:
        return _err("Profile name is required.")
    if not device["ip"]:
        return _err("IP address is required.")

    index = params.get("index")
    devices = list(config.get("devices", []))
    if isinstance(index, int) and 0 <= index < len(devices) and update_device:
        ok, result, _ = update_device(config, index, device)
        return _ok(result) if ok else _err(str(result))

    existing_index = next((i for i, item in enumerate(devices) if str(item.get("name", "")).lower() == device["name"].lower()), -1)
    if existing_index >= 0 and update_device:
        ok, result, _ = update_device(config, existing_index, device)
        return _ok(result) if ok else _err(str(result))

    if add_device:
        ok, result = add_device(config, device)
        return _ok(result) if ok else _err(str(result))

    devices.append(device)
    config["devices"] = devices
    config["last_connected"] = device["name"]
    _save_config(config)
    return _ok(device)


def method_profiles_delete(params: dict[str, Any]) -> dict[str, Any]:
    config = _config()
    index = params.get("index")
    if not isinstance(index, int):
        name = str(params.get("name") or "").strip()
        devices = list(config.get("devices", []))
        index = next((i for i, item in enumerate(devices) if item.get("name") == name), -1)
    if delete_device:
        ok, result, _ = delete_device(config, index)
        return _ok(result) if ok else _err(str(result))
    devices = list(config.get("devices", []))
    if index < 0 or index >= len(devices):
        return _err("Select a profile first.")
    removed = devices.pop(index)
    config["devices"] = devices
    if config.get("last_connected") == removed.get("name"):
        config["last_connected"] = None
    _save_config(config)
    return _ok(removed)


def _profile_from_params(params: dict[str, Any]) -> dict[str, Any] | None:
    if "profile" in params and isinstance(params["profile"], dict):
        return _normalize_device(params["profile"])
    name = str(params.get("name") or "").strip()
    if name:
        for device in _config().get("devices", []):
            if device.get("name") == name:
                return _normalize_device(device)
    if params.get("ip") or params.get("host"):
        return _normalize_device(params)
    return None


def _sd_mode_config() -> dict[str, Any]:
    config = _config()
    raw = config.get("sd_card_mode") or {}
    if not isinstance(raw, dict):
        raw = {}
    root = str(raw.get("root") or raw.get("path") or "").strip()
    enabled = bool(raw.get("enabled", False)) and bool(root)
    return {"enabled": enabled, "root": root, "label": str(raw.get("label") or "SD Card").strip() or "SD Card"}


def _sd_root_path(required: bool = True) -> Path | None:
    state = _sd_mode_config()
    root = state.get("root") or ""
    if not root:
        if required:
            raise RuntimeError("Choose an SD Card folder before using SD Card Mode.")
        return None
    path = Path(root).expanduser().resolve()
    if required and (not path.exists() or not path.is_dir()):
        raise RuntimeError(f"SD Card folder was not found: {path}")
    return path


def _sd_mode_enabled() -> bool:
    try:
        state = _sd_mode_config()
        return bool(state.get("enabled") and _sd_root_path(required=True))
    except Exception:
        return False


def _sd_mode_payload() -> dict[str, Any]:
    state = _sd_mode_config()
    root = state.get("root") or ""
    ready = False
    reason = "Choose an SD Card folder." if not root else "Ready"
    stats: dict[str, Any] = {}
    if root:
        try:
            root_path = Path(root).expanduser().resolve()
            ready = root_path.exists() and root_path.is_dir()
            reason = "Ready" if ready else "Folder not found"
            if ready:
                def exists(rel: str) -> bool:
                    return (root_path / rel).exists()
                stats = {
                    "hasMisterIni": exists("MiSTer.ini"),
                    "hasScripts": exists("Scripts"),
                    "hasSaves": exists("saves"),
                    "hasSavestates": exists("savestates"),
                    "hasGames": exists("games") or exists("Games"),
                }
        except Exception as exc:
            reason = str(exc)
    return {
        "enabled": bool(state.get("enabled") and root),
        "active": bool(state.get("enabled") and ready),
        "ready": bool(ready),
        "root": root,
        "label": state.get("label") or "SD Card",
        "reason": reason,
        "stats": stats,
    }


def _sd_identity() -> tuple[str, str]:
    state = _sd_mode_config()
    root = state.get("root") or ""
    label = state.get("label") or "SD Card"
    suffix = Path(root).name if root else "Offline"
    return (f"{label} ({suffix})", root)


def method_sd_mode_status(params: dict[str, Any]) -> dict[str, Any]:
    return _ok(_sd_mode_payload())


def method_sd_mode_set(params: dict[str, Any]) -> dict[str, Any]:
    root = str(params.get("root") or params.get("path") or "").strip()
    enabled = bool(params.get("enabled", True))
    label = str(params.get("label") or "SD Card").strip() or "SD Card"
    if enabled and not root:
        return _err("Choose an SD Card folder first.")
    if root:
        path = Path(root).expanduser().resolve()
        if not path.exists() or not path.is_dir():
            return _err(f"SD Card folder was not found: {path}")
        root = str(path)
    config = _config()
    config["sd_card_mode"] = {"enabled": enabled, "root": root, "label": label}
    _save_config(config)
    return _ok(_sd_mode_payload())


def method_sd_mode_clear(params: dict[str, Any]) -> dict[str, Any]:
    config = _config()
    current = config.get("sd_card_mode") or {}
    root = str(current.get("root") or "") if isinstance(current, dict) else ""
    config["sd_card_mode"] = {"enabled": False, "root": root, "label": str(current.get("label") or "SD Card") if isinstance(current, dict) else "SD Card"}
    _save_config(config)
    return _ok(_sd_mode_payload())


def method_connection_status(params: dict[str, Any]) -> dict[str, Any]:
    connected = bool(connection and connection.is_connected())
    sd_mode = _sd_mode_payload()
    return _ok({
        "connected": connected,
        "host": getattr(connection, "host", "") if connection else "",
        "username": getattr(connection, "username", "") if connection else "",
        "profileName": active_profile_name,
        "sdMode": sd_mode,
        "storageMode": "online" if connected else "sd" if sd_mode.get("active") else "offline",
    })


def method_connection_connect(params: dict[str, Any]) -> dict[str, Any]:
    global active_profile_name
    if not connection:
        return _err("Paramiko connection backend is not available. Install backend requirements.")
    profile = _profile_from_params(params)
    if not profile:
        return _err("No connection profile was provided.")

    connected = connection.connect(
        profile["ip"],
        profile["username"],
        profile["password"],
        profile.get("use_ssh_agent", False),
        profile.get("look_for_ssh_keys", False),
    )
    if not connected:
        return _err("Could not connect to MiSTer over SSH.")
    active_profile_name = profile.get("name", "")
    config = _config()
    if active_profile_name:
        config["last_connected"] = active_profile_name
        _save_config(config)
    return method_connection_status({})


def method_connection_disconnect(params: dict[str, Any]) -> dict[str, Any]:
    global active_profile_name
    _remote_disconnect_client()
    if connection:
        connection.disconnect()
    active_profile_name = ""
    return method_connection_status({})


def _run(command: str) -> str:
    if not connection or not connection.is_connected():
        raise RuntimeError("Not connected")
    return connection.run_command(command)


def method_command_run(params: dict[str, Any]) -> dict[str, Any]:
    command = str(params.get("command") or "").strip()
    if not command:
        return _err("Command is required.")
    return _ok({"command": command, "output": _run(command)})


def _safe_device_action(label: str, fn: Callable[[], Any]) -> Any:
    try:
        return fn()
    except Exception as exc:
        return {"error": f"{label}: {exc}"}


def _clean_line(value: str, fallback: str = "Unknown") -> str:
    text = str(value or "").strip()
    if not text:
        return fallback
    return text.splitlines()[0].strip() or fallback




def _format_uptime_seconds(value: str, fallback: str = "Unknown") -> str:
    text = str(value or "").strip()
    if not text:
        return fallback

    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return _clean_line(text, fallback)

    try:
        total_seconds = int(float(match.group(0)))
    except Exception:
        return _clean_line(text, fallback)

    if total_seconds < 0:
        return fallback

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours}hr {minutes}min {seconds}sec"

def _is_unknownish(value: str) -> bool:
    text = str(value or "").strip()
    if not text:
        return True
    lowered = text.lower()
    return lowered in {"unknown", "n/a", "none", "not found"} or lowered.startswith("error:")


def _is_plausible_mister_release_date(token: str) -> bool:
    try:
        parsed = datetime.strptime(token, "%Y%m%d")
    except Exception:
        return False
    current_year = datetime.utcnow().year
    # MiSTer public releases are modern; allow one future year for clocks and
    # staged release files, but reject random numeric/XML metadata matches.
    return 2015 <= parsed.year <= current_year + 1


def _format_mister_version_date(token: str) -> str:
    """Format a YYYYMMDD MiSTer release date as the app's compact vYYMMDD."""
    return f"v{token[2:]}"


def _normalize_mister_version(value: str, fallback: str = "Unknown") -> str:
    text = _clean_line(value, "")
    if _is_unknownish(text):
        return fallback

    basename = text.rsplit("/", 1)[-1].strip()

    # Never treat MiSTer_*.ini or other MiSTer_* helper/config files as a main
    # binary version. The root of /media/fat often contains files such as
    # MiSTer_240p.ini, and a loose glob can otherwise mistake them for releases.
    if re.match(r"^MiSTer_.+\.(?:ini|cfg|txt|mgl|rbf|sh|json|xml|pdf)$", basename, re.IGNORECASE):
        return fallback

    # Long strings from `strings` can include embedded Adobe/XMP/XML/PDF metadata.
    # They are not version strings, even if they contain an eight-digit date
    # somewhere inside the haystack. Keep the Device card from becoming a novella.
    lowered = text.lower()
    if len(text) > 160 or any(marker in lowered for marker in ("<?xpacket", "xmlns:", "xmpmeta", "adobe:", "rdf:")):
        return fallback

    # Official/mainline release tokens look like MiSTer_20260603 or
    # MiSTer-20260603. Accept those anywhere in a short line, but display them
    # in the compact app-facing format: vYYMMDD.
    match = re.search(r"\bMiSTer[_ -]?(20\d{6})\b", text, re.IGNORECASE)
    if match and _is_plausible_mister_release_date(match.group(1)):
        return _format_mister_version_date(match.group(1))

    # Already-normalized app-facing formats. Accept the previous full-year
    # internal format too, but re-display it as vYYMMDD.
    match = re.fullmatch(r"v(20\d{6})", text, re.IGNORECASE)
    if match and _is_plausible_mister_release_date(match.group(1)):
        return _format_mister_version_date(match.group(1))

    match = re.fullmatch(r"v(\d{6})", text, re.IGNORECASE)
    if match:
        candidate = f"20{match.group(1)}"
        if _is_plausible_mister_release_date(candidate):
            return f"v{match.group(1)}"

    # Only accept a bare date when the entire probe result is the date. Do not
    # pluck random dates out of binary/PDF metadata.
    match = re.fullmatch(r"20\d{6}", text)
    if match and _is_plausible_mister_release_date(match.group(0)):
        return _format_mister_version_date(match.group(0))

    # Last-resort fallback generated by our own probe. This is not a release
    # version marker, but when no marker exists the MiSTer binary mtime is the
    # closest useful date. Display it in the same compact vYYMMDD format.
    match = re.fullmatch(r"MiSTer binary modified (\d{4})-(\d{2})-(\d{2})", text)
    if match:
        token = "".join(match.groups())
        if _is_plausible_mister_release_date(token):
            return _format_mister_version_date(token)

    return fallback


def _probe_mister_version() -> dict[str, str]:
    """Return the MiSTer main binary version using multiple remote fallbacks.

    Many MiSTer installs do not have /media/fat/MiSTer.version, so relying on
    that single file leaves the Device page stuck on Unknown. Probe in order of
    specificity, then fall back to the main binary timestamp as a last useful
    breadcrumb.
    """
    probes = [
        (
            "version-file",
            "for f in /media/fat/MiSTer.version /media/fat/.MiSTer.version /tmp/MiSTer.version /tmp/version; do "
            "[ -s \"$f\" ] && { head -n 1 \"$f\" | tr -d '\\r'; exit 0; }; "
            "done",
        ),
        (
            "release-named-binary",
            # Match only real release-named binaries such as MiSTer_20260603. Do
            # not use MiSTer_[0-9]* here because that also catches config files
            # like MiSTer_240p.ini. The exact glob also avoids depending on GNU
            # find features that may not exist on MiSTer's BusyBox userland.
            "for f in /media/fat/MiSTer_20[0-9][0-9][0-9][0-9][0-9][0-9]; do "
            "[ -f \"$f\" ] || continue; basename \"$f\"; "
            "done | sort | tail -n 1",
        ),
        (
            "binary-strings",
            "if command -v strings >/dev/null 2>&1 && [ -r /media/fat/MiSTer ]; then "
            "strings /media/fat/MiSTer 2>/dev/null | grep -Eao 'MiSTer[_ -]?20[0-9]{6}' | head -n 1; "
            "fi",
        ),
        (
            "binary-mtime",
            "if [ -e /media/fat/MiSTer ]; then "
            "d=$(stat -c '%y' /media/fat/MiSTer 2>/dev/null | cut -d'.' -f1 | cut -d' ' -f1); "
            "[ -n \"$d\" ] && echo \"MiSTer binary modified $d\"; "
            "fi",
        ),
    ]

    last_error = ""
    for source, command in probes:
        try:
            value = _run(command)
        except Exception as exc:
            last_error = str(exc)
            continue
        normalized = _normalize_mister_version(value, "")
        if not _is_unknownish(normalized):
            return {"value": normalized, "source": source, "raw": _clean_line(value, "")}

    return {"value": "Unknown", "source": "unavailable", "raw": last_error}


def method_device_summary(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return _ok({"connected": False, "cards": [], "raw": {}, "storage": {}, "nowPlaying": {}, "actions": {}})

    commands = {
        "hostname": "hostname 2>/dev/null || cat /etc/hostname 2>/dev/null",
        "uptime": "awk '{print int($1)}' /proc/uptime 2>/dev/null || cut -d' ' -f1 /proc/uptime 2>/dev/null || uptime -p 2>/dev/null || uptime 2>/dev/null",
        "kernel": "uname -a 2>/dev/null",
        "storage": "df -h /media/fat /media/usb0 2>/dev/null",
        "ip": "ip -4 addr show 2>/dev/null | grep -oE 'inet [0-9.]+' | awk '{print $2}' | head -n 8",
        "coreRaw": "cat /tmp/CORENAME 2>/dev/null",
        "gameRaw": "cat /tmp/ACTIVEGAME 2>/dev/null || cat /tmp/FULLPATH 2>/dev/null",
    }
    raw: dict[str, str] = {}
    for key, command in commands.items():
        try:
            raw[key] = _run(command)
        except Exception as exc:
            raw[key] = f"Error: {exc}"

    mister_version = _safe_device_action("MiSTer version", _probe_mister_version)
    if isinstance(mister_version, dict):
        raw["misterVersion"] = mister_version.get("value", "Unknown")
        raw["misterVersionSource"] = mister_version.get("source", "")
        raw["misterVersionRaw"] = mister_version.get("raw", "")
    else:
        raw["misterVersion"] = "Unknown"
        raw["misterVersionSource"] = "error"
        raw["misterVersionRaw"] = str(mister_version)

    sd_storage = _safe_device_action("SD storage", lambda: get_sd_storage_info(connection)) if get_sd_storage_info else None
    usb_storage = _safe_device_action("USB storage", lambda: get_usb_storage_info(connection)) if get_usb_storage_info else None
    now_playing = _safe_device_action("Now playing", lambda: get_now_playing(connection)) if get_now_playing else {}
    smb_enabled = _safe_device_action("SMB status", lambda: is_smb_enabled(connection)) if is_smb_enabled else None

    cards = [
        {"label": "Hostname", "value": _clean_line(raw.get("hostname"))},
        {"label": "Uptime", "value": _format_uptime_seconds(raw.get("uptime"))},
        {"label": "Core", "value": (now_playing or {}).get("core_display") or _clean_line(raw.get("coreRaw"))},
        {"label": "Game", "value": (now_playing or {}).get("game_display") or "None"},
        {"label": "MiSTer Version", "value": _normalize_mister_version(raw.get("misterVersion"))},
        {"label": "SMB", "value": "Enabled" if smb_enabled is True else "Disabled" if smb_enabled is False else "Unknown"},
    ]
    return _ok({
        "connected": True,
        "host": getattr(connection, "host", ""),
        "profileName": active_profile_name,
        "cards": cards,
        "raw": raw,
        "storage": {"sd": sd_storage or {}, "usb": usb_storage or {}},
        "nowPlaying": now_playing or {},
        "smbEnabled": smb_enabled if isinstance(smb_enabled, bool) else None,
        "actions": {
            "canReturnToMenu": bool(return_to_menu_remote),
            "canToggleSmb": bool(enable_smb_remote and disable_smb_remote),
        },
    })


def method_device_smb_set(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before changing SMB startup.")
    enabled = bool(params.get("enabled"))
    if enabled and not enable_smb_remote:
        return _err("SMB enable bridge is unavailable.")
    if not enabled and not disable_smb_remote:
        return _err("SMB disable bridge is unavailable.")
    try:
        if enabled:
            enable_smb_remote(connection)
        else:
            disable_smb_remote(connection)
        summary = method_device_summary({}).get("result") or {}
        return _ok({"enabled": enabled, "summary": summary})
    except Exception as exc:
        return _err(f"SMB update failed: {exc}", traceback.format_exc())


def method_device_return_to_menu(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before returning to menu.")
    if not return_to_menu_remote:
        return _err("Return-to-menu bridge is unavailable.")
    try:
        return_to_menu_remote(connection)
        return _ok({"sent": True})
    except Exception as exc:
        return _err(f"Return to menu failed: {exc}", traceback.format_exc())



def _remote_status_payload(status: Any | None = None) -> dict[str, Any]:
    host = getattr(connection, "host", "") if connection else ""
    connected = bool(connection and connection.is_connected())
    if status is None and connected and get_remote_daemon_status:
        status = get_remote_daemon_status(connection)
    if status is None:
        status = object()
    installed = bool(getattr(status, "installed", False))
    running = bool(getattr(status, "running", False))
    ready = bool(getattr(status, "ready", False))
    update_available = bool(getattr(status, "update_available", False))
    return {
        "connected": connected,
        "host": host,
        "url": remote_websocket_url(host) if remote_websocket_url and host else "",
        "scriptExists": bool(getattr(status, "script_exists", False)),
        "configDirExists": bool(getattr(status, "config_dir_exists", False)),
        "daemonExists": bool(getattr(status, "daemon_exists", False)),
        "processRunning": bool(getattr(status, "process_running", False)),
        "portListening": bool(getattr(status, "port_listening", False)),
        "startupEnabled": bool(getattr(status, "startup_enabled", False)),
        "installed": installed,
        "running": running,
        "ready": ready,
        "updateAvailable": update_available,
        "version": str(getattr(status, "version", "") or ""),
        "versionLabel": str(getattr(status, "version_label", "Unknown") or "Unknown"),
        "latestVersion": str(getattr(status, "latest_version", "") or ""),
        "latestSource": str(getattr(status, "latest_source", "") or ""),
        "error": str(getattr(status, "error", "") or ""),
        "rawOutput": str(getattr(status, "raw_output", "") or ""),
    }


def _remote_disconnect_client() -> None:
    global remote_client, remote_client_host
    with remote_client_lock:
        if remote_client is not None:
            try:
                remote_client.close()
            except Exception:
                pass
        remote_client = None
        remote_client_host = ""


def _remote_get_client():
    global remote_client, remote_client_host
    if RemoteWebSocketClient is None:
        raise RuntimeError("Remote WebSocket bridge is unavailable.")
    if not connection or not connection.is_connected():
        raise RuntimeError("Connect to a MiSTer before using Remote.")
    host = str(getattr(connection, "host", "") or "").strip()
    if not host:
        raise RuntimeError("Connected MiSTer host is unknown.")
    with remote_client_lock:
        if remote_client is None or remote_client_host != host:
            _remote_disconnect_client()
            remote_client = RemoteWebSocketClient(host)
            remote_client.connect()
            remote_client_host = host
        return remote_client



RA_API_BASE = "https://retroachievements.org/API"
RA_SITE_BASE = "https://retroachievements.org"
RA_SETTINGS_URL = "https://retroachievements.org/settings"


def _ra_setting_value(raw: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = raw.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def _ra_config() -> dict[str, Any]:
    cfg = _config()
    nested = cfg.get("retroachievements") if isinstance(cfg.get("retroachievements"), dict) else {}
    username = _ra_setting_value(nested, "username", "user", "raUsername") or _ra_setting_value(cfg, "retroachievements_username", "ra_username")
    api_key = _ra_setting_value(nested, "apiKey", "api_key", "webApiKey", "token") or _ra_setting_value(cfg, "retroachievements_api_key", "ra_api_key")
    return {
        "username": username.strip(),
        "apiKey": api_key.strip(),
        "settingsUrl": RA_SETTINGS_URL,
        "configured": bool(username.strip() and api_key.strip()),
    }


def _ra_save_config(settings: dict[str, Any]) -> dict[str, Any]:
    current = _ra_config()
    username = str(settings.get("username", current.get("username", "")) or "").strip()
    api_key = str(settings.get("apiKey", settings.get("api_key", current.get("apiKey", ""))) or "").strip()
    cfg = _config()
    cfg["retroachievements"] = {"username": username, "apiKey": api_key}
    # Keep legacy keys for the original PyQt dialog/core config readers.
    cfg["retroachievements_username"] = username
    cfg["retroachievements_api_key"] = api_key
    _save_config(cfg)
    return _ra_config()


def _ra_fetch_json(path: str, params: dict[str, Any], timeout: int = 25) -> Any:
    try:
        response = requests.get(f"{RA_API_BASE}/{path}", params=params, timeout=timeout)
        response.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"RetroAchievements request failed: {exc}") from exc
    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError("RetroAchievements returned an invalid JSON response.") from exc
    if isinstance(data, dict):
        error = data.get("Error") or data.get("error")
        if error:
            raise RuntimeError(str(error))
    return data


def _ra_image_url(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("http://") or text.startswith("https://"):
        return text
    if text.startswith("/"):
        return f"{RA_SITE_BASE}{text}"
    return f"{RA_SITE_BASE}/{text}"


def _ra_badge_url(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("http://") or text.startswith("https://"):
        return text
    if text.endswith(".png"):
        return _ra_image_url(text)
    return f"{RA_SITE_BASE}/Badge/{text}.png"


def _ra_safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _ra_user_picture(summary: dict[str, Any]) -> str:
    for key in ["UserPic", "userPic", "UserPicUrl", "userPicUrl", "Avatar", "avatar", "AvatarUrl", "avatarUrl", "Image", "image"]:
        if summary.get(key):
            return _ra_image_url(summary.get(key))
    username = str(summary.get("User") or summary.get("Username") or summary.get("user") or summary.get("username") or "").strip()
    return f"{RA_SITE_BASE}/UserPic/{username}.png" if username else ""


def _ra_game_icon(data: dict[str, Any], allow_boxart: bool = False) -> str:
    keys = ["ImageIcon", "imageIcon", "GameIcon", "gameIcon", "ImageTitle", "imageTitle"]
    if allow_boxart:
        keys += ["ImageBoxArt", "imageBoxArt"]
    for key in keys:
        if data.get(key):
            return _ra_image_url(data.get(key))
    return ""


def _ra_completion_progress(username: str, api_key: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    offset = 0
    count = 500
    while True:
        data = _ra_fetch_json("API_GetUserCompletionProgress.php", {"u": username, "y": api_key, "c": count, "o": offset}, timeout=30)
        page_results = []
        total = 0
        if isinstance(data, dict):
            total = _ra_safe_int(data.get("Total") or data.get("total"), 0)
            raw = data.get("Results") or data.get("results") or data.get("UserCompletionProgress") or data.get("userCompletionProgress") or []
            if isinstance(raw, list):
                page_results = raw
            elif isinstance(raw, dict):
                page_results = list(raw.values())
        elif isinstance(data, list):
            page_results = data
        results.extend(item for item in page_results if isinstance(item, dict))
        if len(page_results) < count:
            break
        if total and len(results) >= total:
            break
        offset += count
    return results


def _ra_normalize_recent_game(game: dict[str, Any], awarded: dict[str, Any] | None = None) -> dict[str, Any]:
    awarded = awarded if isinstance(awarded, dict) else {}
    game_id = str(game.get("GameID") or game.get("gameId") or game.get("ID") or game.get("id") or "")
    award_info = awarded.get(game_id) or (awarded.get(_ra_safe_int(game_id)) if game_id.isdigit() else {}) or {}
    if not isinstance(award_info, dict):
        award_info = {}
    achieved = _ra_safe_int(game.get("NumAwarded") or game.get("NumAchieved") or game.get("NumAwardedToUser") or award_info.get("NumAchieved") or award_info.get("NumAwarded") or 0)
    hardcore = _ra_safe_int(game.get("NumAwardedHardcore") or game.get("NumAchievedHardcore") or game.get("NumAwardedToUserHardcore") or award_info.get("NumAchievedHardcore") or award_info.get("NumAwardedHardcore") or 0)
    total = _ra_safe_int(game.get("MaxPossible") or game.get("NumPossibleAchievements") or game.get("NumAchievements") or game.get("AchievementsTotal") or award_info.get("NumPossibleAchievements") or award_info.get("NumAchievements") or 0)
    return {
        "id": game_id,
        "title": str(game.get("Title") or game.get("title") or "Unknown Game"),
        "console": str(game.get("ConsoleName") or game.get("consoleName") or ""),
        "image": _ra_game_icon(game, allow_boxart=False),
        "achieved": max(achieved, hardcore),
        "softcoreAchieved": max(achieved, hardcore),
        "hardcoreAchieved": hardcore,
        "total": total,
        "lastPlayed": str(game.get("LastPlayed") or game.get("lastPlayed") or ""),
        "source": "recent",
    }


def _ra_normalize_completion_game(game: dict[str, Any]) -> dict[str, Any]:
    game_id = str(game.get("GameID") or game.get("gameId") or game.get("ID") or game.get("id") or "")
    achieved = _ra_safe_int(game.get("NumAwarded") or game.get("NumAwardedToUser") or game.get("NumAchieved") or 0)
    hardcore = _ra_safe_int(game.get("NumAwardedHardcore") or game.get("NumAwardedToUserHardcore") or game.get("NumAchievedHardcore") or 0)
    total = _ra_safe_int(game.get("MaxPossible") or game.get("NumPossibleAchievements") or game.get("NumAchievements") or 0)
    return {
        "id": game_id,
        "title": str(game.get("Title") or game.get("GameTitle") or game.get("title") or "Unknown Game"),
        "console": str(game.get("ConsoleName") or game.get("Console") or game.get("consoleName") or ""),
        "image": _ra_game_icon(game, allow_boxart=True),
        "achieved": max(achieved, hardcore),
        "softcoreAchieved": max(achieved, hardcore),
        "hardcoreAchieved": hardcore,
        "total": total,
        "source": "all",
    }


def _ra_normalize_achievement(game_id: str, game_title: str, console: str, achievement_id: Any, achievement: dict[str, Any]) -> dict[str, Any]:
    badge = achievement.get("BadgeName") or achievement.get("badgeName") or achievement.get("Badge") or achievement.get("badge") or ""
    hardcore_date = achievement.get("DateEarnedHardcore") or achievement.get("dateEarnedHardcore") or ""
    softcore_date = achievement.get("DateEarned") or achievement.get("dateEarned") or achievement.get("DateAwarded") or achievement.get("dateAwarded") or ""
    date_awarded = hardcore_date or softcore_date
    hardcore_unlocked = bool(hardcore_date)
    softcore_unlocked = bool(softcore_date) or hardcore_unlocked
    return {
        "id": str(achievement.get("ID") or achievement.get("id") or achievement_id or ""),
        "gameId": str(game_id or ""),
        "gameTitle": game_title or "Unknown Game",
        "console": console or "",
        "title": str(achievement.get("Title") or achievement.get("title") or "Unknown Achievement"),
        "description": str(achievement.get("Description") or achievement.get("description") or ""),
        "points": _ra_safe_int(achievement.get("Points") or achievement.get("points") or 0),
        "trueRatio": achievement.get("TrueRatio") or achievement.get("trueRatio") or "",
        "dateAwarded": str(date_awarded or ""),
        "dateAwardedHardcore": str(hardcore_date or ""),
        "dateAwardedSoftcore": str(softcore_date or ""),
        "unlocked": bool(softcore_unlocked or hardcore_unlocked),
        "softcoreUnlocked": bool(softcore_unlocked),
        "hardcoreUnlocked": bool(hardcore_unlocked),
        "badgeName": str(badge or ""),
        "badgeUrl": _ra_badge_url(badge),
    }


def _ra_profile_payload(summary: dict[str, Any], username: str) -> dict[str, Any]:
    return {
        "user": str(summary.get("User") or summary.get("Username") or username or ""),
        "motto": str(summary.get("Motto") or summary.get("motto") or ""),
        "points": _ra_safe_int(summary.get("TotalPoints") or summary.get("totalPoints") or summary.get("Points") or 0),
        "truePoints": _ra_safe_int(summary.get("TotalTruePoints") or summary.get("totalTruePoints") or summary.get("TruePoints") or 0),
        "rank": str(summary.get("Rank") or summary.get("rank") or "—"),
        "status": str(summary.get("Status") or summary.get("status") or "—"),
        "lastGame": str(summary.get("LastGame") or summary.get("LastGameTitle") or summary.get("lastGame") or "—"),
        "memberSince": str(summary.get("MemberSince") or summary.get("memberSince") or ""),
        "avatarUrl": _ra_user_picture(summary),
    }


def method_retroachievements_settings(params: dict[str, Any]) -> dict[str, Any]:
    return _ok(_ra_config())


def method_retroachievements_settings_save(params: dict[str, Any]) -> dict[str, Any]:
    settings = params.get("settings") if isinstance(params.get("settings"), dict) else params
    return _ok(_ra_save_config(settings or {}))


def method_retroachievements_dashboard(params: dict[str, Any]) -> dict[str, Any]:
    settings = _ra_config()
    username = str(params.get("username") or settings.get("username") or "").strip()
    api_key = str(params.get("apiKey") or settings.get("apiKey") or "").strip()
    if not username or not api_key:
        return _err("RetroAchievements username and Web API key are required. Add them in Settings > API.")
    if not ra_get_user_summary:
        return _err("RetroAchievements API bridge is unavailable.")
    summary = ra_get_user_summary(username, api_key, recent_games=10, recent_achievements=10)
    completion = _ra_completion_progress(username, api_key)
    awarded = summary.get("Awarded") or summary.get("awarded") or {}
    recent_raw = summary.get("RecentlyPlayed") or summary.get("recentlyPlayed") or []
    recent_games = [_ra_normalize_recent_game(game, awarded) for game in recent_raw if isinstance(game, dict)] if isinstance(recent_raw, list) else []
    all_games = [_ra_normalize_completion_game(game) for game in completion if isinstance(game, dict)]
    recent_achievements_raw = summary.get("RecentAchievements") or summary.get("recentAchievements") or {}
    recent_achievements = []
    if isinstance(recent_achievements_raw, dict):
        for _gid, achievements in recent_achievements_raw.items():
            if not isinstance(achievements, dict):
                continue
            for aid, achievement in achievements.items():
                if isinstance(achievement, dict):
                    recent_achievements.append(_ra_normalize_achievement(achievement.get("GameID") or _gid, achievement.get("GameTitle") or "", achievement.get("ConsoleName") or "", aid, achievement))
    recent_achievements.sort(key=lambda item: item.get("dateAwarded") or "", reverse=True)
    return _ok({
        "settings": {"username": username, "configured": True, "settingsUrl": RA_SETTINGS_URL},
        "profile": _ra_profile_payload(summary, username),
        "recentGames": recent_games,
        "allGames": all_games,
        "recentAchievements": recent_achievements[:20],
        "counts": {"recentGames": len(recent_games), "allGames": len(all_games), "recentAchievements": len(recent_achievements)},
        "loadedAt": time.time(),
    })


def method_retroachievements_game(params: dict[str, Any]) -> dict[str, Any]:
    settings = _ra_config()
    username = str(params.get("username") or settings.get("username") or "").strip()
    api_key = str(params.get("apiKey") or settings.get("apiKey") or "").strip()
    game_id = str(params.get("gameId") or params.get("id") or "").strip()
    if not username or not api_key:
        return _err("RetroAchievements username and Web API key are required. Add them in Settings > API.")
    if not game_id:
        return _err("Choose a RetroAchievements game first.")
    game = _ra_fetch_json("API_GetGameInfoAndUserProgress.php", {"u": username, "y": api_key, "g": game_id}, timeout=30)
    if not isinstance(game, dict):
        game = {}
    selected_id = str(game.get("ID") or game.get("GameID") or game_id)
    title = str(game.get("Title") or game.get("GameTitle") or "Unknown Game")
    console = str(game.get("ConsoleName") or game.get("Console") or "")
    achievements_raw = game.get("Achievements") or game.get("achievements") or {}
    achievements = []
    if isinstance(achievements_raw, dict):
        iterable = achievements_raw.items()
    elif isinstance(achievements_raw, list):
        iterable = enumerate(achievements_raw)
    else:
        iterable = []
    for aid, achievement in iterable:
        if isinstance(achievement, dict):
            achievements.append(_ra_normalize_achievement(selected_id, title, console, aid, achievement))
    achievements.sort(key=lambda item: (not item.get("unlocked"), str(item.get("title") or "").lower()))
    sets = []
    if ra_get_game_set_options:
        try:
            sets = ra_get_game_set_options(api_key, game)
        except Exception:
            sets = []
    total = len(achievements)
    soft = sum(1 for item in achievements if item.get("softcoreUnlocked"))
    hard = sum(1 for item in achievements if item.get("hardcoreUnlocked"))
    points = sum(_ra_safe_int(item.get("points")) for item in achievements if item.get("softcoreUnlocked"))
    hardcore_points = sum(_ra_safe_int(item.get("points")) for item in achievements if item.get("hardcoreUnlocked"))
    return _ok({
        "game": {
            "id": selected_id,
            "title": title,
            "console": console,
            "image": _ra_game_icon(game, allow_boxart=True),
            "achieved": max(soft, hard),
            "softcoreAchieved": soft,
            "hardcoreAchieved": hard,
            "total": total,
            "points": points,
            "hardcorePoints": hardcore_points,
        },
        "sets": sets,
        "achievements": achievements,
        "stats": {"total": total, "unlocked": soft, "softcore": soft, "hardcore": hard, "locked": max(total - soft, 0), "points": points, "hardcorePoints": hardcore_points},
    })

def method_remote_status(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        _remote_disconnect_client()
        return _ok(_remote_status_payload())
    if not get_remote_daemon_status:
        return _err("Remote daemon bridge is unavailable.")
    status = get_remote_daemon_status(connection)
    payload = _remote_status_payload(status)
    ping = bool(params.get("ping", True))
    if ping and payload.get("ready") and not payload.get("updateAvailable"):
        try:
            client = _remote_get_client()
            client.ping()
            payload["websocketConnected"] = True
        except Exception as exc:
            payload["websocketConnected"] = False
            payload["websocketError"] = str(exc)
    else:
        payload["websocketConnected"] = bool(remote_client is not None)
    return _ok(payload)


def method_remote_disconnect(params: dict[str, Any]) -> dict[str, Any]:
    _remote_disconnect_client()
    return _ok({"disconnected": True})


def method_remote_command_start(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before managing Companion Remote.")
    command_name = str(params.get("command") or params.get("commandName") or "").strip()
    labels = {
        "install": "Install or update Remote",
        "uninstall": "Uninstall Remote",
        "start-stop": "Start/stop Remote daemon",
        "toggle-boot": "Toggle Remote start on boot",
    }
    if command_name not in labels:
        return _err("Unsupported Remote daemon command.")
    if command_name == "install" and not install_remote_daemon:
        return _err("Remote installer bridge is unavailable.")
    if command_name == "uninstall" and not uninstall_remote_daemon:
        return _err("Remote uninstaller bridge is unavailable.")
    if command_name == "start-stop" and not start_stop_remote_daemon:
        return _err("Remote start/stop bridge is unavailable.")
    if command_name == "toggle-boot" and not toggle_remote_daemon_boot:
        return _err("Remote boot-toggle bridge is unavailable.")

    def run_job(log, job):
        _remote_disconnect_client()
        log(f"Running {labels[command_name]}...")
        if command_name == "install":
            output = install_remote_daemon(connection)
        elif command_name == "uninstall":
            output = uninstall_remote_daemon(connection)
        elif command_name == "start-stop":
            output = start_stop_remote_daemon(connection)
        else:
            output = toggle_remote_daemon_boot(connection)
        if output:
            for line in str(output).splitlines():
                if line.strip():
                    log(line)
        status = get_remote_daemon_status(connection) if get_remote_daemon_status else None
        payload = _remote_status_payload(status)
        log("Remote daemon command complete.")
        return {"remoteStatus": payload, "output": str(output or "")}

    return _ok(_new_job("remote.command", labels[command_name], run_job))


def method_remote_input(params: dict[str, Any]) -> dict[str, Any]:
    kind = str(params.get("kind") or params.get("type") or "").strip().lower()
    name = str(params.get("name") or params.get("key") or params.get("command") or "").strip()
    action = str(params.get("action") or "tap").strip().lower()
    if action not in {"tap", "down", "up"}:
        action = "tap"
    try:
        client = _remote_get_client()
        if kind == "dpad":
            result = client.send_dpad(name, action)
        elif kind == "button":
            result = client.send_controller_button(name, action)
        elif kind == "keyboard":
            result = client.send_keyboard_key(name, action)
        elif kind == "system" and name.lower() == "release_all":
            result = client.release_all()
        elif kind == "ping":
            result = client.ping()
        else:
            return _err("Unsupported Remote input command.")
        return _ok({"sent": True, "kind": kind, "name": name, "action": action, "response": result})
    except Exception as exc:
        _remote_disconnect_client()
        return _err(f"Remote input failed: {exc}", traceback.format_exc())


def method_install_center_catalog(params: dict[str, Any]) -> dict[str, Any]:
    """Return the live Hub catalog when possible, with a bundled fallback.

    v0.2.2 only loaded the fallback catalog for normal renderer calls, which
    meant many entries had no catalog version, thumbnail, release metadata, or
    item-specific action data. That made version checks and update buttons look
    inert. This keeps a small in-process cache, but refreshes from the Hub on
    first load or whenever fresh=True.
    """
    global install_catalog_cache, install_catalog_error, install_catalog_loaded_at

    fresh = bool(params.get("fresh", False))
    allow_network = bool(params.get("allowNetwork", True))
    catalog = None
    source = ""

    if install_catalog_cache is not None and not fresh:
        catalog = install_catalog_cache
        source = str(catalog.get("source") or catalog.get("catalog_version") or "cache")

    if catalog is None and not fresh and load_cached_catalog:
        try:
            catalog = load_cached_catalog()
            if catalog is not None:
                install_catalog_cache = catalog
                source = str(catalog.get("source") or "disk cache")
        except Exception:
            catalog = None

    if catalog is None and load_catalog and allow_network:
        try:
            catalog = load_catalog(prefer_cache=not fresh, fresh=fresh)
            install_catalog_cache = catalog
            install_catalog_error = ""
            install_catalog_loaded_at = time.time()
            source = str(catalog.get("source") or "hub")
        except Exception as exc:
            install_catalog_error = str(exc)

    if catalog is None and install_catalog_cache is not None:
        catalog = install_catalog_cache
        source = str(catalog.get("source") or "cache")

    if catalog is None and fallback_catalog:
        catalog = fallback_catalog()
        source = "bundled fallback"

    catalog = catalog or {"categories": [], "items": []}
    if merge_custom_github_packages:
        try:
            catalog = merge_custom_github_packages(catalog)
        except Exception as exc:
            install_catalog_error = (install_catalog_error + "\n" if install_catalog_error else "") + f"Custom GitHub packages could not be loaded: {exc}"
    payload = dict(catalog)
    payload["meta"] = {
        "source": source or payload.get("source") or "unknown",
        "loadedAt": install_catalog_loaded_at,
        "error": install_catalog_error,
        "live": bool(source and source not in {"bundled fallback", "bundled"}),
        "itemCount": len(payload.get("items") or []),
        "categoryCount": len(payload.get("categories") or []),
    }
    return _ok(payload)


def method_install_center_github_add(params: dict[str, Any]) -> dict[str, Any]:
    if not create_custom_github_package:
        return _err("GitHub package importer is unavailable.")
    url = str(params.get("url") or "").strip()
    if not url:
        return _err("GitHub URL is required.")
    try:
        created = create_custom_github_package(url, {
            "name": params.get("name") or "",
            "description": params.get("description") or "",
            "installPath": params.get("installPath") or "",
        })
        items = created if isinstance(created, list) else [created]
        global install_catalog_cache
        if install_catalog_cache and merge_custom_github_packages:
            install_catalog_cache = merge_custom_github_packages(install_catalog_cache)
        catalog = method_install_center_catalog({"fresh": False, "allowNetwork": False}).get("result") or {"categories": [], "items": []}
        return _ok({"item": items[0] if items else None, "items": items, "catalog": catalog})
    except Exception as exc:
        return _err(f"Could not add GitHub package: {exc}", traceback.format_exc())


def _install_center_context() -> Any:
    if not InstallCenterContext:
        raise RuntimeError("Install Center context bridge is unavailable.")
    if _sd_mode_enabled():
        return InstallCenterContext("offline", connection=connection, sd_root=str(_sd_root_path(required=True)))
    return InstallCenterContext("online", connection=connection)


def _install_center_catalog() -> dict[str, Any]:
    catalog_result = method_install_center_catalog({"fresh": False, "allowNetwork": True})
    return catalog_result.get("result") or {"categories": [], "items": []}


def _install_center_find_item(item_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    catalog = _install_center_catalog()
    wanted = str(item_id or "").strip()
    item = next((entry for entry in (catalog.get("items") or []) if str(entry.get("id") or "") == wanted), None)
    if not item:
        raise RuntimeError("Install Center item was not found.")
    return catalog, item


def _install_center_ready() -> tuple[bool, str]:
    if _sd_mode_enabled():
        return True, "SD Card Mode"
    if not connection or not connection.is_connected():
        return False, "Connect to a MiSTer or enable SD Card Mode before using Install Center actions."
    return True, "Ready"


def _install_center_enriched_status(item: dict[str, Any], context: Any, check_latest=False, log=None) -> dict[str, Any]:
    status = check_item_status(item, context, check_latest=bool(check_latest), log=log) if check_item_status else {"state": "unknown", "status_text": "Status bridge unavailable", "installed": False}
    status = dict(status or {})
    if action_supported:
        for action in ("install_update", "uninstall", "configure", "run", "open_folder", "choose_install_folder"):
            try:
                status[f"can_{action}"] = bool(action_supported(item, status, action))
            except Exception:
                status[f"can_{action}"] = False
    status.setdefault("status_text", "Status unknown")
    status.setdefault("state", "unknown")
    status.setdefault("installed", False)
    status.setdefault("update_available", False)
    return status


def method_install_center_status_all(params: dict[str, Any]) -> dict[str, Any]:
    if not check_all_status or not InstallCenterContext:
        return _err("Install Center status bridge is unavailable.")
    catalog = _install_center_catalog()
    context = _install_center_context()
    ready, reason = _install_center_ready()
    if not ready:
        return _ok({
            "ready": False,
            "reason": reason,
            "statuses": {
                str(item.get("id") or ""): {"state": "needs_connection", "status_text": "Needs connection", "installed": False, "update_available": False}
                for item in (catalog.get("items") or [])
            },
        })
    statuses = check_all_status(catalog, context, check_latest=bool(params.get("checkLatest", False)))
    enriched = {}
    by_id = {str(item.get("id") or ""): item for item in (catalog.get("items") or [])}
    for item_id, status in (statuses or {}).items():
        item = by_id.get(str(item_id)) or {"id": item_id}
        status = dict(status or {})
        if action_supported:
            for action in ("install_update", "uninstall", "configure", "run", "open_folder", "choose_install_folder"):
                try:
                    status[f"can_{action}"] = bool(action_supported(item, status, action))
                except Exception:
                    status[f"can_{action}"] = False
        enriched[str(item_id)] = status
    return _ok({"ready": True, "reason": "Ready", "statuses": enriched})


def method_install_center_check_all_start(params: dict[str, Any]) -> dict[str, Any]:
    if not check_all_status or not InstallCenterContext:
        return _err("Install Center status bridge is unavailable.")
    ready, reason = _install_center_ready()
    if not ready:
        return _err(reason)

    def run_job(log, job):
        catalog_result = method_install_center_catalog({"fresh": bool(params.get("freshCatalog", False)), "allowNetwork": True})
        catalog = catalog_result.get("result") or {"categories": [], "items": []}
        context = _install_center_context()
        log("Checking Install Center entries for installed status and updates...\n")
        statuses = check_all_status(catalog, context, check_latest=True, log=log)
        enriched = {}
        by_id = {str(item.get("id") or ""): item for item in (catalog.get("items") or [])}
        for item_id, status in (statuses or {}).items():
            item = by_id.get(str(item_id)) or {"id": item_id}
            status = dict(status or {})
            if action_supported:
                for action in ("install_update", "uninstall", "configure", "run", "open_folder", "choose_install_folder"):
                    try:
                        status[f"can_{action}"] = bool(action_supported(item, status, action))
                    except Exception:
                        status[f"can_{action}"] = False
            enriched[str(item_id)] = status
        update_count = sum(1 for item in enriched.values() if item.get("update_available"))
        log(f"Finished Install Center update check. {update_count} update(s) available.\n")
        return {"ready": True, "statuses": enriched, "updateCount": update_count, "catalogMeta": catalog.get("meta") or {}}

    return _ok(_new_job("install_center.check_all", "Install Center version check", run_job))


def method_install_center_check_start(params: dict[str, Any]) -> dict[str, Any]:
    if not check_item_status or not InstallCenterContext:
        return _err("Install Center status bridge is unavailable.")
    item_id = str(params.get("id") or "").strip()
    try:
        _, item = _install_center_find_item(item_id)
    except Exception as exc:
        return _err(str(exc))
    ready, reason = _install_center_ready()
    if not ready:
        return _err(reason)

    def run_job(log, job):
        context = _install_center_context()
        log(f"Checking {item.get('name') or item_id} for updates...\n")
        status = _install_center_enriched_status(item, context, check_latest=True, log=log)
        log(f"Status: {status.get('status_text') or status.get('state') or 'unknown'}\n")
        return {"itemId": item_id, "status": status}

    return _ok(_new_job("install_center.check", f"Check {item.get('name') or item_id}", run_job))


def method_install_center_status(params: dict[str, Any]) -> dict[str, Any]:
    if not check_item_status or not InstallCenterContext:
        return _err("Install Center status bridge is unavailable.")
    item_id = str(params.get("id") or "").strip()
    try:
        _, item = _install_center_find_item(item_id)
    except Exception as exc:
        return _err(str(exc))
    ready, reason = _install_center_ready()
    if not ready:
        return _ok({"state": "needs_connection", "status_text": reason, "installed": False, "update_available": False})
    context = _install_center_context()
    try:
        return _ok(_install_center_enriched_status(item, context, check_latest=bool(params.get("checkLatest", False))))
    except Exception as exc:
        return _err(f"Install Center status check failed: {exc}", traceback.format_exc())


def method_install_center_install_start(params: dict[str, Any]) -> dict[str, Any]:
    if not run_install_or_update or not InstallCenterContext:
        return _err("Install Center installer bridge is unavailable.")
    item_id = str(params.get("id") or "").strip()
    try:
        _, item = _install_center_find_item(item_id)
    except Exception as exc:
        return _err(str(exc))
    ready, reason = _install_center_ready()
    if not ready:
        return _err(reason)

    item_for_job = dict(item)
    if params.get("installPath"):
        item_for_job["_selected_install_path"] = str(params.get("installPath"))
    if params.get("raCoreKeys"):
        item_for_job["_selected_ra_core_keys"] = params.get("raCoreKeys")

    def run_job(log, job):
        context = _install_center_context()
        log(f"Installing or updating {item_for_job.get('name') or item_id}...\n")
        run_install_or_update(item_for_job, context, log)
        status = _install_center_enriched_status(item_for_job, context, check_latest=True, log=log)
        log(f"Final status: {status.get('status_text') or status.get('state') or 'unknown'}\n")
        return {"itemId": item_id, "status": status}

    return _ok(_new_job("install_center.install", f"Install {item_for_job.get('name') or item_id}", run_job))


def method_install_center_uninstall_start(params: dict[str, Any]) -> dict[str, Any]:
    if not run_uninstall or not InstallCenterContext:
        return _err("Install Center uninstaller bridge is unavailable.")
    item_id = str(params.get("id") or "").strip()
    try:
        _, item = _install_center_find_item(item_id)
    except Exception as exc:
        return _err(str(exc))
    ready, reason = _install_center_ready()
    if not ready:
        return _err(reason)

    item_for_job = dict(item)
    if params.get("raCoreKeys"):
        item_for_job["_selected_ra_core_keys"] = params.get("raCoreKeys")

    def run_job(log, job):
        context = _install_center_context()
        log(f"Uninstalling {item_for_job.get('name') or item_id}...\n")
        run_uninstall(item_for_job, context, log)
        status = _install_center_enriched_status(item_for_job, context, check_latest=True, log=log)
        log(f"Final status: {status.get('status_text') or status.get('state') or 'unknown'}\n")
        return {"itemId": item_id, "status": status}

    return _ok(_new_job("install_center.uninstall", f"Uninstall {item_for_job.get('name') or item_id}", run_job))



SCRIPT_HELPERS = [
    {"id": "update_all", "name": "update_all", "description": "Keeps your MiSTer FPGA setup up to date by downloading cores, scripts, databases, tools, and optional community content."},
    {"id": "zaparoo", "name": "Zaparoo", "description": "Launch games, media, scripts, and MiSTer content through NFC cards, tags, barcodes, or the ZapScripts library."},
    {"id": "migrate_sd", "name": "migrate_sd", "description": "Migrates an existing MiSTer SD card setup to another SD card."},
    {"id": "cifs_mount", "name": "cifs_mount", "description": "Mounts a network SMB/CIFS share so games and files can be accessed from a NAS or PC."},
    {"id": "auto_time", "name": "auto_time", "description": "Automatically detects timezone and applies the correct date and time to your MiSTer."},
    {"id": "cd_game_organizer", "name": "CD Game Organizer", "description": "Organizes CD-based games into separate folders to keep virtual memory cards separated per game."},
    {"id": "dav_browser", "name": "DAV Browser", "description": "Browse a WebDAV server, download files, and optionally launch them after downloading."},
    {"id": "ftp_save_sync", "name": "FTP Save Sync", "description": "Syncs saves and optionally savestates to a remote FTP/SFTP server."},
    {"id": "static_wallpaper", "name": "Static Wallpaper", "description": "Uses a fixed MiSTer menu wallpaper instead of the default rotating wallpaper behavior."},
    {"id": "syncthing", "name": "Syncthing", "description": "Peer-to-peer file sync for folders such as saves or other MiSTer files."},
    {"id": "ra_viewer", "name": "RA Viewer", "description": "Shows RetroAchievements progress directly on MiSTer."},
]

SCRIPT_ACTIONS = {
    "update_all": ["install", "uninstall", "configure", "run"],
    "zaparoo": ["install", "enable_boot", "open_web", "uninstall"],
    "migrate_sd": ["install", "uninstall"],
    "cifs_mount": ["install", "configure", "mount", "unmount", "remove_config", "uninstall"],
    "auto_time": ["install", "uninstall"],
    "cd_game_organizer": ["install", "uninstall"],
    "dav_browser": ["install", "configure", "remove_config", "uninstall"],
    "ftp_save_sync": ["install", "configure", "enable_boot", "disable_boot", "remove_config", "uninstall"],
    "static_wallpaper": ["install", "uninstall"],
    "syncthing": ["install", "toggle_boot", "open_web", "uninstall"],
    "ra_viewer": ["install", "configure", "uninstall"],
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


def _script_status_dict(status) -> dict[str, Any]:
    return {
        key: bool(getattr(status, key, False))
        for key in (
            "update_all_installed", "update_all_initialized", "zaparoo_installed", "zaparoo_service_enabled",
            "migrate_sd_installed", "cifs_installed", "cifs_configured", "cifs_common_installed",
            "cifs_common_required", "cifs_umount_installed", "auto_time_installed", "cd_game_organizer_installed",
            "dav_browser_installed", "dav_browser_configured", "ftp_save_sync_installed", "ftp_save_sync_configured",
            "ftp_save_sync_service_enabled", "static_wallpaper_installed", "static_wallpaper_active", "static_wallpaper_saved",
        )
    }


def _script_item_status(script_id: str, status, syncthing_status=None, ra_viewer_status=None) -> dict[str, Any]:
    if script_id == "syncthing" and isinstance(syncthing_status, dict):
        installed = bool(syncthing_status.get("installed"))
        running = bool(syncthing_status.get("running"))
        boot = bool(syncthing_status.get("start_on_boot_enabled"))
        return {"installed": installed, "configured": boot, "running": running, "statusText": syncthing_status.get("status_text") or ("Running" if running else "Installed" if installed else "Not installed"), **syncthing_status}
    if script_id == "ra_viewer" and isinstance(ra_viewer_status, dict):
        installed = bool(ra_viewer_status.get("installed"))
        return {"installed": installed, "configured": bool(ra_viewer_status.get("configured")), "statusText": ra_viewer_status.get("status_text") or ("Installed" if installed else "Not installed"), **ra_viewer_status}

    attr = SCRIPT_STATUS_ATTRS.get(script_id)
    installed = bool(getattr(status, attr, False)) if attr else False
    configured = False
    running = False
    extra = {}
    text = "Installed" if installed else "Not installed"
    if script_id == "update_all" and installed:
        configured = bool(getattr(status, "update_all_initialized", False))
        text = "Installed, initialized" if configured else "Installed, not initialized"
    elif script_id == "zaparoo" and installed:
        configured = bool(getattr(status, "zaparoo_service_enabled", False))
        text = "Installed, start on boot enabled" if configured else "Installed, start on boot disabled"
    elif script_id == "cifs_mount" and installed:
        configured = bool(getattr(status, "cifs_configured", False))
        missing = []
        if not getattr(status, "cifs_umount_installed", False): missing.append("cifs_umount.sh")
        if getattr(status, "cifs_common_required", False) and not getattr(status, "cifs_common_installed", False): missing.append("cifs_common.sh")
        extra["missingRequiredFiles"] = missing
        text = "Configured" if configured else "Installed, not configured"
        if missing: text = f"Update available, missing {', '.join(missing)}"
    elif script_id == "dav_browser" and installed:
        configured = bool(getattr(status, "dav_browser_configured", False))
        text = "Configured" if configured else "Installed, not configured"
    elif script_id == "ftp_save_sync" and installed:
        configured = bool(getattr(status, "ftp_save_sync_configured", False))
        service = bool(getattr(status, "ftp_save_sync_service_enabled", False))
        extra["serviceEnabled"] = service
        text = "Configured, service enabled" if service else "Configured, service disabled" if configured else "Installed, not configured"
    elif script_id == "static_wallpaper" and installed:
        configured = bool(getattr(status, "static_wallpaper_saved", False) or getattr(status, "static_wallpaper_active", False))
        extra["active"] = bool(getattr(status, "static_wallpaper_active", False))
        text = "Installed, wallpaper active" if extra["active"] else "Installed, selection saved" if configured else "Installed"
    return {"installed": installed, "configured": configured, "running": running, "statusText": text, **extra}


def method_scripts_summary(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions:
        return _err("Scripts bridge is unavailable.")
    if not connection or not connection.is_connected():
        return _ok({"ready": False, "reason": "Needs connection", "items": SCRIPT_HELPERS, "status": {}, "statuses": {}})
    try:
        status = scripts_actions.get_scripts_status(connection)
        syncthing_status = None
        ra_viewer_status = None
        try: syncthing_status = scripts_actions.get_syncthing_status(connection)
        except Exception as exc: syncthing_status = {"status_text": f"Status unknown ({exc})"}
        try: ra_viewer_status = scripts_actions.get_ra_viewer_status(connection)
        except Exception as exc: ra_viewer_status = {"status_text": f"Status unknown ({exc})"}
        statuses = {item["id"]: _script_item_status(item["id"], status, syncthing_status, ra_viewer_status) for item in SCRIPT_HELPERS}
        return _ok({"ready": True, "reason": "Ready", "items": SCRIPT_HELPERS, "status": _script_status_dict(status), "statuses": statuses, "actions": SCRIPT_ACTIONS})
    except Exception as exc:
        return _err(f"Scripts status failed: {exc}", traceback.format_exc())


def _script_load_config(script_id: str) -> dict[str, Any]:
    conn = _require_connected()
    if script_id == "cifs_mount": return scripts_actions.load_cifs_config(conn)
    if script_id == "dav_browser": return scripts_actions.load_dav_browser_config(conn)
    if script_id == "ftp_save_sync": return scripts_actions.load_ftp_save_sync_config(conn)
    if script_id == "ra_viewer": return scripts_actions.load_ra_viewer_config(conn)
    if script_id == "update_all":
        return scripts_actions.ensure_update_all_config_bootstrap(conn)
    raise RuntimeError("This script has no editable configuration.")


def method_scripts_config_load(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions: return _err("Scripts bridge is unavailable.")
    script_id = str(params.get("id") or "").strip()
    try: return _ok(_script_load_config(script_id))
    except Exception as exc: return _err(str(exc), traceback.format_exc())


def method_scripts_config_save(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions: return _err("Scripts bridge is unavailable.")
    script_id = str(params.get("id") or "").strip()
    values = params.get("values") or {}
    try:
        conn = _require_connected()
        if script_id == "cifs_mount":
            scripts_actions.save_cifs_config(
                conn,
                values.get("server", ""), values.get("share", ""), values.get("username", ""), values.get("password", ""),
                bool(values.get("mount_at_boot") or values.get("mountAtBoot")),
                share_directory=values.get("share_directory") or values.get("shareDirectory") or "",
                domain=values.get("domain", ""), local_dir=values.get("local_dir") or values.get("localDir") or "cifs/games",
                additional_mount_options=values.get("additional_mount_options") or values.get("additionalMountOptions") or "",
            )
        elif script_id == "dav_browser":
            scripts_actions.save_dav_browser_config(conn, values.get("server_url") or values.get("serverUrl") or "", values.get("username", ""), values.get("password", ""), values.get("remote_path") or values.get("remotePath") or "", bool(values.get("skip_tls_verify") or values.get("skipTlsVerify")))
        elif script_id == "ftp_save_sync":
            scripts_actions.save_ftp_save_sync_config(conn, values.get("protocol", "sftp"), values.get("host", ""), str(values.get("port") or ""), values.get("username", ""), values.get("password", ""), values.get("remote_base") or values.get("remoteBase") or "", values.get("device_name") or values.get("deviceName") or "MiSTer", bool(values.get("sync_savestates") or values.get("syncSavestates")))
        elif script_id == "ra_viewer":
            scripts_actions.save_ra_viewer_config(conn, values.get("username", ""), values.get("api_key") or values.get("apiKey") or "")
        else:
            return _err("This script has no editable configuration.")
        return method_scripts_summary({}).get("result") and _ok(method_scripts_summary({}).get("result")) or _ok({})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_scripts_config_remove(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions: return _err("Scripts bridge is unavailable.")
    script_id = str(params.get("id") or "").strip()
    try:
        conn = _require_connected()
        if script_id == "cifs_mount": scripts_actions.remove_cifs_config(conn)
        elif script_id == "dav_browser": scripts_actions.remove_dav_browser_config(conn)
        elif script_id == "ftp_save_sync": scripts_actions.remove_ftp_save_sync_config(conn)
        else: return _err("This script does not have a removable config.")
        return _ok(method_scripts_summary({}).get("result") or {})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def _run_script_action(script_id: str, action: str, values: dict[str, Any] | None, log) -> None:
    conn = _require_connected()
    values = values or {}
    if script_id == "update_all":
        if action == "install": return scripts_actions.install_update_all(conn, log)
        if action == "uninstall": scripts_actions.uninstall_update_all(conn); log("Uninstall finished.\n"); return
        if action == "configure": scripts_actions.ensure_update_all_config_bootstrap(conn); log("update_all config bootstrap created/verified.\n"); return
        if action == "run": return scripts_actions.run_update_all_stream(conn, log)
    if script_id == "zaparoo":
        if action == "install": return scripts_actions.install_zaparoo(conn, log)
        if action == "enable_boot": scripts_actions.enable_zaparoo_service(conn); log("Zaparoo start on boot enabled.\n"); return
        if action == "open_web": webbrowser.open(f"http://{conn.host}:7497"); log("Opened Zaparoo web interface.\n"); return
        if action == "uninstall": scripts_actions.uninstall_zaparoo(conn); log("Uninstall finished.\n"); return
    if script_id == "migrate_sd":
        if action == "install": return scripts_actions.install_migrate_sd(conn, log)
        if action == "uninstall": scripts_actions.uninstall_migrate_sd(conn); log("Uninstall finished.\n"); return
    if script_id == "cifs_mount":
        if action == "install": return scripts_actions.install_cifs_mount(conn, log)
        if action == "configure": method_scripts_config_save({"id": script_id, "values": values}); log("CIFS config saved.\n"); return
        if action == "mount": scripts_actions.run_cifs_mount(conn); log("cifs_mount.sh run.\n"); return
        if action == "unmount": scripts_actions.run_cifs_umount(conn); log("cifs_umount.sh run.\n"); return
        if action == "remove_config": scripts_actions.remove_cifs_config(conn); log("CIFS config removed.\n"); return
        if action == "uninstall": scripts_actions.uninstall_cifs_mount(conn); log("Uninstall finished.\n"); return
    if script_id == "auto_time":
        if action == "install": return scripts_actions.install_auto_time(conn, log)
        if action == "uninstall": scripts_actions.uninstall_auto_time(conn); log("Uninstall finished.\n"); return
    if script_id == "cd_game_organizer":
        if action == "install": return scripts_actions.install_cd_game_organizer(conn, log)
        if action == "uninstall": scripts_actions.uninstall_cd_game_organizer(conn); log("Uninstall finished.\n"); return
    if script_id == "dav_browser":
        if action == "install": return scripts_actions.install_dav_browser(conn, log)
        if action == "configure": method_scripts_config_save({"id": script_id, "values": values}); log("DAV Browser config saved.\n"); return
        if action == "remove_config": scripts_actions.remove_dav_browser_config(conn); log("DAV Browser config removed.\n"); return
        if action == "uninstall": scripts_actions.uninstall_dav_browser(conn); log("Uninstall finished.\n"); return
    if script_id == "ftp_save_sync":
        if action == "install": return scripts_actions.install_ftp_save_sync(conn, log)
        if action == "configure": method_scripts_config_save({"id": script_id, "values": values}); log("FTP Save Sync config saved.\n"); return
        if action == "enable_boot": scripts_actions.enable_ftp_save_sync_service(conn); log("FTP Save Sync start on boot enabled.\n"); return
        if action == "disable_boot": scripts_actions.disable_ftp_save_sync_service(conn); log("FTP Save Sync start on boot disabled.\n"); return
        if action == "remove_config": scripts_actions.remove_ftp_save_sync_config(conn); log("FTP Save Sync config removed.\n"); return
        if action == "uninstall": scripts_actions.uninstall_ftp_save_sync(conn); log("Uninstall finished.\n"); return
    if script_id == "static_wallpaper":
        if action == "install": return scripts_actions.install_static_wallpaper(conn, log)
        if action == "uninstall": scripts_actions.uninstall_static_wallpaper(conn); log("Uninstall finished.\n"); return
    if script_id == "syncthing":
        if action == "install": return scripts_actions.install_syncthing(conn, log)
        if action == "toggle_boot": scripts_actions.toggle_syncthing_start_on_boot(conn); log("Syncthing start on boot toggled.\n"); return
        if action == "open_web": webbrowser.open(f"http://{conn.host}:8384"); log("Opened Syncthing web config.\n"); return
        if action == "uninstall": scripts_actions.uninstall_syncthing(conn, log); return
    if script_id == "ra_viewer":
        if action == "install": return scripts_actions.install_ra_viewer(conn, log)
        if action == "configure": method_scripts_config_save({"id": script_id, "values": values}); log("RA Viewer config saved.\n"); return
        if action == "uninstall": scripts_actions.uninstall_ra_viewer(conn, log); return
    raise RuntimeError(f"Unsupported script action: {script_id}/{action}")


def method_scripts_command_start(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions: return _err("Scripts bridge is unavailable.")
    script_id = str(params.get("id") or "").strip()
    action = str(params.get("action") or "").strip()
    values = params.get("values") or {}
    if script_id not in SCRIPT_ACTIONS or action not in SCRIPT_ACTIONS.get(script_id, []):
        return _err("Unsupported script action.")
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before using Scripts actions.")

    def run_job(log, job):
        log(f"Running {script_id} / {action}...\n")
        _run_script_action(script_id, action, values, log)
        result = method_scripts_summary({}).get("result") or {}
        log("Finished.\n")
        return {"scriptId": script_id, "action": action, "summary": result}

    return _ok(_new_job("scripts.action", f"{script_id}: {action}", run_job))


def method_scripts_open_folder(params: dict[str, Any]) -> dict[str, Any]:
    if not scripts_actions: return _err("Scripts bridge is unavailable.")
    try:
        conn = _require_connected()
        scripts_actions.open_scripts_folder_on_host(conn.host, conn.username or "root", conn.password or "1")
        return _ok({"opened": True})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_install_center_action_start(params: dict[str, Any]) -> dict[str, Any]:
    item_id = str(params.get("id") or "").strip()
    action = str(params.get("action") or "").strip()
    try:
        _, item = _install_center_find_item(item_id)
    except Exception as exc:
        return _err(str(exc))
    ready, reason = _install_center_ready()
    if not ready:
        return _err(reason)

    def run_job(log, job):
        context = _install_center_context()
        item_for_job = dict(item)
        handler = item_for_job.get("handler") or item_for_job.get("id")
        log(f"Running Install Center action {action} for {item_for_job.get('name') or item_id}...\n")
        if action in {"run", "configure", "mount", "unmount", "remove_config", "enable_boot", "disable_boot", "toggle_boot", "open_web"}:
            script_action = action
            if action == "run" and handler == "update_all":
                if context.offline:
                    if not run_update_all_offline:
                        raise RuntimeError("Offline update_all runner is unavailable.")
                    result = run_update_all_offline(context.sd_root, progress=log)
                    if not getattr(result, "ok", False):
                        raise RuntimeError("Offline update_all failed: " + "; ".join(getattr(result, "errors", []) or []))
                    log(f"Offline update_all finished. Downloaded {getattr(result, 'files_downloaded', 0)} file(s), skipped {getattr(result, 'files_skipped', 0)}.\n")
                else:
                    _run_script_action(handler, "run", params.get("values") or {}, log)
            else:
                if context.offline and action in {"open_web", "mount", "unmount", "enable_boot", "disable_boot", "toggle_boot"}:
                    raise RuntimeError(f"{action.replace('_', ' ')} requires a live MiSTer connection.")
                _run_script_action(handler, script_action, params.get("values") or {}, log)
        elif action == "open_wallpaper_folder":
            if not open_wallpaper_folder: raise RuntimeError("Wallpaper folder bridge is unavailable.")
            open_wallpaper_folder(context)
            log("Opened wallpaper folder.\n")
        elif action in {"install_wallpapers_169", "install_wallpapers_43"}:
            if not install_wallpaper_pack: raise RuntimeError("Wallpaper installer bridge is unavailable.")
            install_wallpaper_pack(item_for_job, context, log, variant="169" if action.endswith("169") else "43")
        elif action == "uninstall_wallpapers":
            if not uninstall_wallpaper_pack: raise RuntimeError("Wallpaper uninstaller bridge is unavailable.")
            uninstall_wallpaper_pack(item_for_job, context, log)
        else:
            raise RuntimeError("Unsupported Install Center action.")
        status = _install_center_enriched_status(item_for_job, context, check_latest=True, log=log)
        return {"itemId": item_id, "action": action, "status": status}

    return _ok(_new_job("install_center.action", f"{item.get('name') or item_id}: {action}", run_job))

def _directory_stats(path: Path) -> dict[str, Any]:
    stats = {"exists": path.exists(), "fileCount": 0, "dirCount": 0, "sizeBytes": 0, "modifiedAt": None}
    if not path.exists():
        return stats
    try:
        stats["modifiedAt"] = path.stat().st_mtime
    except Exception:
        pass
    try:
        for item in path.rglob("*"):
            try:
                if item.is_dir():
                    stats["dirCount"] += 1
                elif item.is_file():
                    stats["fileCount"] += 1
                    stats["sizeBytes"] += item.stat().st_size
            except Exception:
                continue
    except Exception:
        pass
    return stats


def _backup_entry(device_name: str, backup_name: str) -> dict[str, Any]:
    device_root = Path(BACKUP_ROOT or DATA_ROOT / "SaveManager" / "backups") / device_name
    backup_path = device_root / backup_name
    stats = _directory_stats(backup_path)
    saves_stats = _directory_stats(backup_path / "saves")
    savestates_stats = _directory_stats(backup_path / "savestates")
    return {
        "name": backup_name,
        "path": str(backup_path),
        "modifiedAt": stats.get("modifiedAt"),
        "fileCount": stats.get("fileCount", 0),
        "sizeBytes": stats.get("sizeBytes", 0),
        "savesCount": saves_stats.get("fileCount", 0),
        "savestatesCount": savestates_stats.get("fileCount", 0),
    }


def _savemanager_retention() -> int:
    try:
        return max(1, int(_config().get("backup_retention", 10)))
    except Exception:
        return 10


def _current_savemanager_identity(params: dict[str, Any] | None = None) -> tuple[str, str]:
    params = params or {}
    if _sd_mode_enabled():
        return _sd_identity()
    profile_name = active_profile_name or str(params.get("profileName") or "")
    ip_address = getattr(connection, "host", "") if connection else str(params.get("ipAddress") or "")
    return profile_name, ip_address


def method_savemanager_summary(params: dict[str, Any]) -> dict[str, Any]:
    try:
        if ensure_savemanager_dirs:
            ensure_savemanager_dirs()
    except Exception:
        pass

    raw_devices = []
    try:
        raw_devices = list_backup_devices() if list_backup_devices else []
    except Exception:
        raw_devices = []

    devices = []
    for item in raw_devices:
        name = str(item.get("name") or "").strip()
        backups = []
        for backup in item.get("backups", []):
            backup_name = str(backup.get("name") if isinstance(backup, dict) else backup)
            if backup_name:
                backups.append(_backup_entry(name, backup_name))
        devices.append({"name": name, "backups": backups, "backupCount": len(backups)})

    profile_name, ip_address = _current_savemanager_identity(params)
    try:
        current_count = get_backup_count(profile_name=profile_name, ip_address=ip_address) if get_backup_count else 0
    except Exception:
        current_count = 0

    backup_root = Path(BACKUP_ROOT or DATA_ROOT / "SaveManager" / "backups")
    sync_root = Path(SYNC_ROOT or DATA_ROOT / "SaveManager" / "sync")
    total = sum(len(item.get("backups", [])) for item in devices)
    return _ok({
        "devices": devices,
        "backupCount": total,
        "currentBackupCount": current_count,
        "currentDevice": {"profileName": profile_name, "ipAddress": ip_address},
        "retention": _savemanager_retention(),
        "paths": {"backupRoot": str(backup_root.resolve()), "syncRoot": str(sync_root.resolve())},
        "syncStats": _directory_stats(sync_root),
        "connected": bool(connection and connection.is_connected()),
        "sdMode": _sd_mode_payload(),
        "offlineActive": _sd_mode_enabled(),
    })


def _manuals_pdf_payload(item: dict[str, Any]) -> dict[str, Any]:
    payload = dict(item or {})
    source = str(payload.get("source") or "").lower()
    path_value = str(payload.get("path") or "")
    payload["source"] = source or ("cache" if path_value and Path(path_value).exists() else "remote")
    try:
        if payload["source"] in {"cache", "temp"}:
            file_path = Path(path_value)
            payload["exists"] = file_path.exists()
            payload["size"] = file_path.stat().st_size if file_path.exists() else 0
            payload["modified"] = file_path.stat().st_mtime if file_path.exists() else None
    except Exception:
        pass
    return payload


def method_manuals_cached(params: dict[str, Any]) -> dict[str, Any]:
    if not scan_cached_systems or not scan_cached_pdfs:
        return _ok({"systems": []})
    systems = []
    for system in scan_cached_systems():
        pdfs = [_manuals_pdf_payload(pdf) for pdf in scan_cached_pdfs(system)]
        systems.append({"name": system, "pdfs": pdfs, "pdfCount": len(pdfs), "cached": True, "remote": False})
    return _ok({"systems": systems, "cacheRoot": str(get_manuals_cache_root() if get_manuals_cache_root else "")})


def method_manuals_summary(params: dict[str, Any]) -> dict[str, Any]:
    if not scan_cached_systems:
        return _ok({"systems": [], "connected": bool(connection and connection.is_connected())})
    cached = list(scan_cached_systems() or [])
    remote = []
    remote_error = ""
    if connection and connection.is_connected() and scan_remote_systems:
        try:
            remote = list(scan_remote_systems(connection) or [])
        except Exception as exc:
            remote_error = str(exc)
    merged = merge_systems(remote, cached) if merge_systems else sorted(set(remote + cached), key=str.lower)
    systems = []
    for name in merged:
        systems.append({"name": name, "cached": name in cached, "remote": name in remote})
    return _ok({
        "systems": systems,
        "cachedSystems": cached,
        "remoteSystems": remote,
        "systemCount": len(systems),
        "connected": bool(connection and connection.is_connected()),
        "hasCachedManuals": bool(has_cached_manuals() if has_cached_manuals else cached),
        "cacheRoot": str(get_manuals_cache_root() if get_manuals_cache_root else ""),
        "remoteError": remote_error,
    })


def method_manuals_system(params: dict[str, Any]) -> dict[str, Any]:
    system_name = str(params.get("system") or params.get("name") or "").strip()
    if not system_name:
        raise RuntimeError("Choose a manual system first.")
    cached = scan_cached_pdfs(system_name) if scan_cached_pdfs else []
    remote = []
    remote_error = ""
    if connection and connection.is_connected() and scan_remote_pdfs:
        try:
            remote = list(scan_remote_pdfs(connection, system_name) or [])
        except Exception as exc:
            remote_error = str(exc)
    merged = merge_pdfs(remote, cached) if merge_pdfs else list(remote or []) + list(cached or [])
    pdfs = [_manuals_pdf_payload(pdf) for pdf in merged]
    return _ok({
        "system": system_name,
        "pdfs": pdfs,
        "pdfCount": len(pdfs),
        "cachedCount": len(cached or []),
        "remoteCount": len(remote or []),
        "connected": bool(connection and connection.is_connected()),
        "remoteError": remote_error,
    })


def method_manuals_cache(params: dict[str, Any]) -> dict[str, Any]:
    if not cache_remote_pdf:
        raise RuntimeError("Manual caching support is unavailable in this backend build.")
    conn = _require_connected()
    system_name = str(params.get("system") or "").strip()
    remote_path = str(params.get("path") or "").strip()
    filename = str(params.get("name") or params.get("filename") or "").strip()
    keep_cached = bool(params.get("keepCached", True))
    if not system_name or not remote_path or not filename:
        raise RuntimeError("Manual system, path, and filename are required.")
    local_path = cache_remote_pdf(conn, system_name, remote_path, filename, keep_cached=keep_cached)
    payload = _manuals_pdf_payload({
        "name": filename,
        "path": str(local_path),
        "source": "cache" if keep_cached else "temp",
        "system": system_name,
        "keepCached": keep_cached,
    })
    return _ok({"manual": payload, "system": system_name, "summary": method_manuals_summary({})["result"]})

def method_manuals_cache_start(params: dict[str, Any]) -> dict[str, Any]:
    if not cache_remote_pdf:
        raise RuntimeError("Manual caching support is unavailable in this backend build.")
    conn = _require_connected()
    system_name = str(params.get("system") or "").strip()
    remote_path = str(params.get("path") or "").strip()
    filename = str(params.get("name") or params.get("filename") or "").strip()
    keep_cached = bool(params.get("keepCached", True))
    if not system_name or not remote_path or not filename:
        raise RuntimeError("Manual system, path, and filename are required.")

    def target(log, job):
        log(f"Caching {filename} from {system_name}...")
        local_path = cache_remote_pdf(conn, system_name, remote_path, filename, keep_cached=keep_cached)
        payload = _manuals_pdf_payload({
            "name": filename,
            "path": str(local_path),
            "source": "cache" if keep_cached else "temp",
            "system": system_name,
            "keepCached": keep_cached,
        })
        log(f"Cached to {local_path}")
        return {"manual": payload, "system": system_name, "summary": method_manuals_summary({})["result"]}

    return _ok({"job": _new_job("manuals.cache", f"Cache manual: {filename}", target)})


def method_manuals_remove_cached(params: dict[str, Any]) -> dict[str, Any]:
    path_value = str(params.get("path") or "").strip()
    if path_value and remove_cached_pdf:
        remove_cached_pdf(path_value)
        return _ok({"removed": path_value, "summary": method_manuals_summary({})["result"]})
    if clear_manuals_cache:
        clear_manuals_cache()
    return _ok({"removed": "all", "summary": method_manuals_summary({})["result"]})


def method_manuals_cache_root(params: dict[str, Any]) -> dict[str, Any]:
    return _ok({"path": str(get_manuals_cache_root() if get_manuals_cache_root else "")})


def method_backend_capabilities(params: dict[str, Any]) -> dict[str, Any]:
    return _ok({
        "implemented": sorted(METHODS.keys()),
        "notes": [
            "This is the first Electron/VaultKit bridge pass.",
            "PyQt UI modules are intentionally excluded.",
            "Long-running operations should be promoted to streamed jobs in the next pass.",
        ],
    })



def method_backend_diagnostics(params: dict[str, Any]) -> dict[str, Any]:
    module_names = [
        "paramiko", "requests", "PIL", "serial", "yaml",
    ]
    modules = []
    for name in module_names:
        modules.append({"name": name, "available": importlib.util.find_spec(name) is not None})
    config_path = DATA_ROOT / "config.json"
    return _ok({
        "app": {"name": APP_NAME, "version": APP_VERSION, "author": APP_AUTHOR},
        "python": {"executable": sys.executable, "version": sys.version, "platform": sys.platform},
        "paths": {"backendRoot": str(BACKEND_ROOT), "dataRoot": str(DATA_ROOT), "misterAppRoot": str(MISTER_APP_ROOT), "config": str(config_path)},
        "modules": modules,
        "connection": method_connection_status({})["result"],
        "capabilities": sorted(METHODS.keys()) if "METHODS" in globals() else [],
    })


def method_jobs_list(params: dict[str, Any]) -> dict[str, Any]:
    with jobs_lock:
        values = [_public_job(job) for job in jobs.values()]
    values.sort(key=lambda item: item.get("startedAt") or 0, reverse=True)
    return _ok({"jobs": values[:50]})


def method_jobs_status(params: dict[str, Any]) -> dict[str, Any]:
    job_id = str(params.get("id") or "").strip()
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return _err("Job was not found.")
        return _ok(_public_job(job))


def method_jobs_cancel(params: dict[str, Any]) -> dict[str, Any]:
    job_id = str(params.get("id") or "").strip()
    if not job_id:
        return _err("Job id is required.")
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return _err("Job was not found.")
        if job.get("status") not in {"queued", "running"}:
            return _ok(_public_job(job))
        job["cancelRequested"] = True
        job.setdefault("logs", []).append("Cancel requested.")
        return _ok(_public_job(job))


def method_jobs_clear(params: dict[str, Any]) -> dict[str, Any]:
    keep_running = bool(params.get("keepRunning", True))
    with jobs_lock:
        for job_id in list(jobs.keys()):
            if keep_running and jobs[job_id].get("status") == "running":
                continue
            del jobs[job_id]
    return method_jobs_list({})


def method_command_start(params: dict[str, Any]) -> dict[str, Any]:
    command = str(params.get("command") or "").strip()
    if not command:
        return _err("Command is required.")
    if not connection or not connection.is_connected():
        return _err("Not connected to a MiSTer.")

    def run_job(log, job):
        log(f"$ {command}")
        def stream(line):
            log(line)
        connection.run_command_stream(command, stream)
        return {"command": command}

    return _ok(_new_job("command", command, run_job))



def _local_ipv4_candidates() -> list[str]:
    candidates: list[str] = []
    # Preferred route-derived address. No packets are sent for UDP connect.
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            probe.connect(("8.8.8.8", 80))
            address = probe.getsockname()[0]
            if address and not address.startswith("127."):
                candidates.append(address)
        finally:
            probe.close()
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for address in socket.gethostbyname_ex(hostname)[2]:
            if address and not address.startswith("127.") and address not in candidates:
                candidates.append(address)
    except Exception:
        pass

    return candidates


def _scan_ssh_host(ip: str, timeout: float) -> dict[str, Any] | None:
    try:
        with socket.create_connection((ip, 22), timeout=timeout) as sock:
            sock.settimeout(timeout)
            banner = ""
            try:
                banner = sock.recv(96).decode("utf-8", errors="ignore").strip()
            except Exception:
                banner = ""
    except Exception:
        return None

    hostname = ""
    try:
        hostname = socket.gethostbyaddr(ip)[0]
    except Exception:
        hostname = ""

    likely = False
    name_text = f"{hostname} {banner}".lower()
    if "mister" in name_text or "dropbear" in name_text:
        likely = True

    label = hostname or ("Possible MiSTer" if likely else "SSH device")
    return {"ip": ip, "host": ip, "hostname": hostname, "label": label, "port": 22, "banner": banner, "likelyMiSTer": likely}


def method_connection_scan(params: dict[str, Any]) -> dict[str, Any]:
    timeout = float(params.get("timeout") or 0.22)
    timeout = max(0.08, min(1.25, timeout))
    max_workers = int(params.get("workers") or 64)
    max_workers = max(8, min(128, max_workers))
    subnet = str(params.get("subnet") or "").strip()

    networks: list[ipaddress.IPv4Network] = []
    if subnet:
        try:
            networks.append(ipaddress.ip_network(subnet, strict=False))
        except Exception:
            return _err(f"Invalid subnet: {subnet}")
    else:
        for address in _local_ipv4_candidates():
            try:
                networks.append(ipaddress.ip_network(f"{address}/24", strict=False))
            except Exception:
                continue

    # Deduplicate and avoid very large scans from accidental broad masks.
    unique_networks: list[ipaddress.IPv4Network] = []
    seen_networks: set[str] = set()
    for network in networks:
        if network.version != 4:
            continue
        if network.num_addresses > 1024:
            network = ipaddress.ip_network(f"{next(network.hosts())}/24", strict=False)
        key = str(network)
        if key not in seen_networks:
            seen_networks.add(key)
            unique_networks.append(network)

    if not unique_networks:
        return _ok({"devices": [], "networks": [], "message": "No local IPv4 network was detected."})

    ips: list[str] = []
    seen_ips: set[str] = set()
    for network in unique_networks[:4]:
        for ip in network.hosts():
            value = str(ip)
            if value not in seen_ips:
                seen_ips.add(value)
                ips.append(value)

    started = time.time()
    devices: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {executor.submit(_scan_ssh_host, ip, timeout): ip for ip in ips}
        for future in concurrent.futures.as_completed(future_map):
            try:
                result = future.result()
            except Exception:
                result = None
            if result:
                devices.append(result)

    ssh_device_count = len(devices)
    devices = [device for device in devices if device.get("likelyMiSTer")]
    devices.sort(key=lambda item: tuple(int(part) for part in item.get("ip", "0.0.0.0").split(".") if part.isdigit()))
    message = (
        f"Found {len(devices)} MiSTer device{'s' if len(devices) != 1 else ''}."
        if devices
        else ("No MiSTer devices were found on the local network." if ssh_device_count else "No SSH devices were found on the local network.")
    )
    return _ok({
        "devices": devices,
        "networks": [str(network) for network in unique_networks],
        "sshDeviceCount": ssh_device_count,
        "elapsedMs": round((time.time() - started) * 1000),
        "message": message,
    })

def method_connection_test(params: dict[str, Any]) -> dict[str, Any]:
    if not MiSTerConnection:
        return _err("Paramiko connection backend is not available. Install backend requirements.")
    profile = _profile_from_params(params)
    if not profile:
        return _err("No connection profile was provided.")
    test_connection = MiSTerConnection()
    started = time.time()
    try:
        ok = test_connection.connect(
            profile["ip"], profile["username"], profile["password"],
            profile.get("use_ssh_agent", False), profile.get("look_for_ssh_keys", False),
        )
        if ok:
            try:
                hostname = test_connection.run_command("hostname 2>/dev/null || true")
            except Exception:
                hostname = ""
            return _ok({"connected": True, "host": profile["ip"], "username": profile["username"], "hostname": hostname, "elapsedMs": round((time.time() - started) * 1000)})
        return _ok({"connected": False, "host": profile["ip"], "elapsedMs": round((time.time() - started) * 1000), "message": "SSH connection failed."})
    finally:
        try:
            test_connection.disconnect()
        except Exception:
            pass


def method_connection_reboot(params: dict[str, Any]) -> dict[str, Any]:
    global active_profile_name
    profile_name = active_profile_name
    host = getattr(connection, "host", "") if connection else ""
    try:
        _require_connected().reboot()
        try:
            if connection:
                connection.disconnect()
        except Exception:
            pass
        return _ok({"rebooting": True, "profileName": profile_name, "host": host, "reconnectRecommended": True})
    except Exception as exc:
        return _err(str(exc))



DEFAULT_MISTER_INI_URL = "https://raw.githubusercontent.com/Anime0t4ku/mister-companion/main/assets/MiSTer_example.ini"
INI_REMOTE_ROOT = "/media/fat"

MISTER_INI_OPTIONS = {
    "hdmiMode": ["HD Output (Default)", "Direct Video (CRT / Scaler)"],
    "resolutions": [
        "1280x720@60", "1024x768@60", "720x480@60", "720x576@50", "1280x1024@60",
        "800x600@60", "640x480@60", "1280x720@50", "1920x1080@60", "1920x1080@50",
        "1366x768@60", "1024x600@60", "1920x1440@60", "2048x1536@60", "2560x1440@60",
    ],
    "scaling": ["Disabled", "Low Latency", "Exact Refresh"],
    "hdmiAudio": ["Enabled", "Disabled (DVI Mode)"],
    "hdr": ["Disabled", "HLG HDR (recommended)", "DCI P3 HDR"],
    "hdmiLimited": ["Full Range", "Limited Range"],
    "analogue": [
        "RGBS (SCART)", "RGBHV (VGA 15 kHz)", "RGsB (Sync-on-Green)",
        "YPbPr (Component)", "S-Video", "Composite (CVBS)", "VGA Scaler (31 kHz+)", "Custom",
    ],
    "logo": ["Enabled", "Disabled"],
    "amigavisionPreset": ["Disabled", "Enabled"],
    "menuCrtPreset": ["Disabled", "NTSC, Large Text", "NTSC, Small Text", "PAL, Large Text", "PAL, Small Text"],
}


def _normalize_ini_filename(filename: str | None = None) -> str:
    filename = Path(str(filename or "MiSTer.ini").strip()).name
    if filename == "MiSTer.ini":
        return filename
    if filename.startswith("MiSTer_") and filename.endswith(".ini"):
        return filename
    raise ValueError(f"Unsupported MiSTer INI filename: {filename}")


def _ini_path(filename: str | None = None) -> str:
    return f"{INI_REMOTE_ROOT}/{_normalize_ini_filename(filename)}"


def _ini_local_path(filename: str | None = None) -> Path:
    return _sd_root_path(required=True) / _normalize_ini_filename(filename)


def _ini_display_path(filename: str | None = None) -> str:
    return str(_ini_local_path(filename)) if _sd_mode_enabled() else _ini_path(filename)


def _filename_from_path_or_name(value: str | None = None) -> str:
    raw = str(value or "MiSTer.ini").strip()
    if raw.startswith(INI_REMOTE_ROOT + "/"):
        raw = raw.rsplit("/", 1)[-1]
    return _normalize_ini_filename(raw)


def _normalize_ini_text(text: str, ensure_trailing_newline: bool = True) -> str:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).rstrip("\n")
    if ensure_trailing_newline:
        text += "\n"
    return text


def _remote_exists(path: str) -> bool:
    result = _require_connected().run_command(f"test -f {shlex.quote(path)} && echo EXISTS") or ""
    return "EXISTS" in result


def _ini_exists(filename: str | None = None) -> bool:
    if _sd_mode_enabled():
        return _ini_local_path(filename).is_file()
    return _remote_exists(_ini_path(filename))


def _ini_read_text(filename: str | None = None) -> str:
    if _sd_mode_enabled():
        return _ini_local_path(filename).read_text(encoding="utf-8", errors="replace")
    return _remote_read_text(_ini_path(filename))


def _ini_write_text(filename: str | None, text: str, backup: bool = True) -> str:
    if _sd_mode_enabled():
        path = _ini_local_path(filename)
        path.parent.mkdir(parents=True, exist_ok=True)
        if backup and path.exists():
            stamp = time.strftime("%Y%m%d-%H%M%S")
            shutil.copy2(path, path.with_name(f"{path.name}.vaultkit-{stamp}.bak"))
        path.write_text(str(text or ""), encoding="utf-8")
        return str(path)
    return _remote_write_text(_ini_path(filename), text, backup=backup)


def _download_default_ini_text() -> str:
    request = urllib.request.Request(DEFAULT_MISTER_INI_URL, headers={"User-Agent": "MiSTer-Companion-VaultKit"})
    with urllib.request.urlopen(request, timeout=15) as response:
        data = response.read().decode("utf-8", errors="replace")
    text = _normalize_ini_text(data)
    if "[MiSTer]" not in text:
        raise RuntimeError("Downloaded default MiSTer.ini did not look valid.")
    return text


def _ensure_mister_ini_exists() -> str:
    if _ini_exists("MiSTer.ini"):
        return ""
    if _sd_mode_enabled():
        root = _sd_root_path(required=True)
        for candidate in [root / "MiSTer_example.ini", root / "MiSTer_Example.ini"]:
            if candidate.exists():
                shutil.copy2(candidate, _ini_local_path("MiSTer.ini"))
                return "MiSTer.ini was missing, so it was copied from the example INI on the SD Card."
        text = _download_default_ini_text()
        _ini_write_text("MiSTer.ini", text, backup=False)
        return "MiSTer.ini was missing, so it was created on the SD Card from the default template."
    # Prefer an example already on the MiSTer, matching the original app's guarded behavior.
    for candidate in ["/media/fat/MiSTer_example.ini", "/media/fat/MiSTer_Example.ini"]:
        if _remote_exists(candidate):
            result = _require_connected().run_command(f"cp {shlex.quote(candidate)} {shlex.quote(_ini_path('MiSTer.ini'))} && echo COPIED") or ""
            if "COPIED" in result:
                return "MiSTer.ini was missing, so it was copied from the example INI on the MiSTer."
    # Fallback to the public default template used by the original PyQt tab.
    text = _download_default_ini_text()
    _remote_write_text(_ini_path("MiSTer.ini"), text, backup=False)
    return "MiSTer.ini was missing, so it was created from the default template."


def _scan_ini_files() -> list[str]:
    files = []
    if _sd_mode_enabled():
        root = _sd_root_path(required=True)
        candidates = [root / "MiSTer.ini", *root.glob("MiSTer_*.ini")]
        for candidate in candidates:
            try:
                if candidate.is_file():
                    name = _normalize_ini_filename(candidate.name)
                    if name not in files:
                        files.append(name)
            except Exception:
                continue
    else:
        _require_connected()
        command = (
            "cd /media/fat 2>/dev/null || exit 0; "
            "for f in MiSTer.ini MiSTer_*.ini; do "
            "[ -f \"$f\" ] && echo \"$f\"; "
            "done"
        )
        result = connection.run_command(command) or ""
        for line in result.splitlines():
            try:
                name = _normalize_ini_filename(line.strip())
            except Exception:
                continue
            if name not in files:
                files.append(name)
    files.sort(key=lambda item: (item != "MiSTer.ini", item.lower()))
    return files


def _scan_fonts() -> list[str]:
    fonts = []
    if _sd_mode_enabled():
        font_dir = _sd_root_path(required=True) / "font"
        if font_dir.exists():
            for candidate in [*font_dir.glob("*.pf"), *font_dir.glob("*.PF")]:
                name = candidate.name
                if name.lower().endswith(".pf") and name not in fonts:
                    fonts.append(name)
    else:
        _require_connected()
        result = connection.run_command(
            r'if [ -d /media/fat/font ]; then for f in /media/fat/font/*.pf /media/fat/font/*.PF; do [ -e "$f" ] || continue; basename "$f"; done; fi'
        ) or ""
        for line in result.splitlines():
            name = line.strip()
            if name.lower().endswith(".pf") and name not in fonts:
                fonts.append(name)
    fonts.sort(key=str.lower)
    return fonts


def _current_device_path() -> str:
    try:
        from core.mister_settings_backup import get_mister_settings_device_path
        if _sd_mode_enabled():
            profile, host = _sd_identity()
        else:
            profile = active_profile_name or "MiSTer"
            host = getattr(connection, "host", "") if connection else ""
        return get_mister_settings_device_path(profile, host)
    except Exception:
        fallback_name = "SD_Card" if _sd_mode_enabled() else "MiSTer"
        fallback = DATA_ROOT / "MiSTerSettings" / fallback_name
        fallback.mkdir(parents=True, exist_ok=True)
        return str(fallback)


def _retention() -> int:
    try:
        return max(1, int(_config().get("mister_settings_retention", 10)))
    except Exception:
        return 10


def _list_ini_backups(filename: str | None = None) -> list[str]:
    filename = _normalize_ini_filename(filename)
    try:
        from core.mister_settings_backup import list_mister_settings_backups
        return list_mister_settings_backups(_current_device_path(), ini_filename=filename)
    except Exception:
        root = Path(_current_device_path())
        if not root.exists():
            return []
        prefix = f"{filename}."
        return sorted([p.name for p in root.iterdir() if p.is_file() and p.name.startswith(prefix)], reverse=True)


def _create_ini_backup(filename: str | None = None) -> dict[str, Any]:
    filename = _normalize_ini_filename(filename)
    if not _ini_exists(filename):
        return {"backupPath": "", "message": "No existing INI file to back up"}
    if not _sd_mode_enabled():
        try:
            from core.mister_settings_backup import create_mister_settings_backup
            ok, message, backup_file = create_mister_settings_backup(
                _require_connected(), _current_device_path(), _retention(), ini_filename=filename
            )
            if not ok:
                raise RuntimeError(message)
            return {"backupPath": backup_file, "message": message}
        except Exception:
            pass
    # Local/offline fallback.
    root = Path(_current_device_path())
    root.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    backup_file = root / f"{filename}.{stamp}.bak"
    backup_file.write_text(_ini_read_text(filename), encoding="utf-8")
    backups = sorted(root.glob(f"{filename}.*.bak"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in backups[_retention():]:
        try:
            old.unlink()
        except Exception:
            pass
    return {"backupPath": str(backup_file), "message": "Backup created"}


def _restore_ini_backup(filename: str | None, backup_name: str) -> dict[str, Any]:
    filename = _normalize_ini_filename(filename)
    backup_name = Path(str(backup_name or "")).name
    if not backup_name:
        raise RuntimeError("Select a backup to restore.")
    backup_path = str(Path(_current_device_path()) / backup_name)
    if not _sd_mode_enabled():
        try:
            from core.mister_settings_backup import restore_mister_settings_backup
            restore_mister_settings_backup(_require_connected(), backup_path, ini_filename=filename)
        except Exception:
            _remote_write_text(_ini_path(filename), Path(backup_path).read_text(encoding="utf-8", errors="ignore"), backup=True)
    else:
        _ini_write_text(filename, Path(backup_path).read_text(encoding="utf-8", errors="ignore"), backup=True)
    return {"restored": True, "backup": backup_name, "path": _ini_display_path(filename)}


def _extract_font_selection(text: str) -> str:
    match = re.search(r"(?mi)^(?!\s*;)\s*font\s*=\s*font/([^\r\n/]+\.pf)\s*$", text or "")
    return match.group(1).strip() if match else "Default"


def _apply_font_setting(text: str, selected_font: str) -> str:
    font_line = ";font=font/myfont.pf"
    selected_font = (selected_font or "").strip()
    if selected_font and selected_font != "Default":
        font_line = f"font=font/{selected_font}"
    lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").splitlines()
    if not lines:
        lines = ["[MiSTer]"]
    start = None
    end = len(lines)
    for i, line in enumerate(lines):
        if line.strip().lower() == "[mister]":
            start = i
            break
    if start is None:
        lines.extend(["", "[MiSTer]", font_line])
        return _normalize_ini_text("\n".join(lines))
    for i in range(start + 1, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            end = i
            break
    for i in range(start + 1, end):
        if re.match(r"^\s*;?\s*font\s*=", lines[i], flags=re.IGNORECASE):
            lines[i] = font_line
            return _normalize_ini_text("\n".join(lines))
    lines.insert(end, font_line)
    return _normalize_ini_text("\n".join(lines))


def _easy_from_ini_text(text: str) -> dict[str, Any]:
    try:
        from core.mister_ini import parse_mister_ini, easy_mode_values_from_ini_settings
        settings = parse_mister_ini(text)
        values = easy_mode_values_from_ini_settings(settings)
        values["font"] = _extract_font_selection(text)
        return values
    except Exception:
        return {"font": _extract_font_selection(text)}


def _build_text_from_easy(base_text: str, easy_values: dict[str, Any]) -> str:
    from core.mister_ini import build_easy_mode_settings, update_mister_ini_text
    if not (base_text or "").strip():
        base_text = "[MiSTer]\n"
    updated_settings = build_easy_mode_settings(easy_values or {})
    text = update_mister_ini_text(base_text, updated_settings)
    text = _apply_font_setting(text, (easy_values or {}).get("font", "Default"))
    return _normalize_ini_text(text)


def method_mister_ini_options(params: dict[str, Any]) -> dict[str, Any]:
    return _ok({"options": MISTER_INI_OPTIONS, "retention": _retention()})


def method_mister_ini_list(params: dict[str, Any]) -> dict[str, Any]:
    notice = _ensure_mister_ini_exists() if bool(params.get("ensure", True)) else ""
    files = _scan_ini_files()
    selected = _filename_from_path_or_name(params.get("filename") or params.get("path") or (files[0] if files else "MiSTer.ini"))
    if selected not in files and files:
        selected = "MiSTer.ini" if "MiSTer.ini" in files else files[0]
    return _ok({
        "files": files,
        "selectedFilename": selected,
        "fonts": _scan_fonts(),
        "backups": _list_ini_backups(selected),
        "retention": _retention(),
        "notice": notice,
    })


def method_mister_ini_fonts(params: dict[str, Any]) -> dict[str, Any]:
    return _ok({"fonts": _scan_fonts()})


def method_mister_ini_backups_list(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    return _ok({"filename": filename, "backups": _list_ini_backups(filename), "devicePath": _current_device_path(), "retention": _retention()})


def method_mister_ini_backup_create(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    result = _create_ini_backup(filename)
    result.update({"filename": filename, "backups": _list_ini_backups(filename)})
    return _ok(result)


def method_mister_ini_backup_restore(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    backup = str(params.get("backup") or params.get("backupName") or "")
    result = _restore_ini_backup(filename, backup)
    text = _ini_read_text(filename)
    result.update({"text": text, "easy": _easy_from_ini_text(text), "bytes": len(text.encode("utf-8")), "backups": _list_ini_backups(filename)})
    return _ok(result)


def method_mister_ini_parse(params: dict[str, Any]) -> dict[str, Any]:
    text = str(params.get("text") or "")
    return _ok({"easy": _easy_from_ini_text(text)})


def method_mister_ini_preview_easy(params: dict[str, Any]) -> dict[str, Any]:
    text = str(params.get("text") or "")
    easy_values = params.get("easy") or params.get("easyValues") or {}
    new_text = _build_text_from_easy(text, easy_values)
    return _ok({"text": new_text, "easy": _easy_from_ini_text(new_text), "bytes": len(new_text.encode("utf-8"))})


def method_mister_ini_read(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    notice = _ensure_mister_ini_exists() if bool(params.get("ensure", True)) else ""
    path = _ini_display_path(filename)
    text = _ini_read_text(filename)
    parsed = {}
    try:
        from core.mister_ini import parse_mister_ini
        parsed = parse_mister_ini(text)
    except Exception:
        parsed = {}
    files = _scan_ini_files()
    return _ok({
        "filename": filename,
        "path": path,
        "text": _normalize_ini_text(text),
        "parsed": parsed,
        "easy": _easy_from_ini_text(text),
        "files": files,
        "fonts": _scan_fonts(),
        "backups": _list_ini_backups(filename),
        "retention": _retention(),
        "notice": notice,
        "bytes": len(text.encode("utf-8")),
    })


def method_mister_ini_write(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    path = _ini_display_path(filename)
    mode = str(params.get("mode") or "advanced").strip().lower()
    text = str(params.get("text") or "")
    if mode == "easy":
        text = _build_text_from_easy(text, params.get("easy") or params.get("easyValues") or {})
    else:
        text = _normalize_ini_text(text)
    if not text.strip():
        return _err("Refusing to write an empty MiSTer.ini file.")
    backup_info = None
    if bool(params.get("backup", True)):
        backup_info = _create_ini_backup(filename)
    _ini_write_text(filename, text, backup=False)
    return _ok({
        "filename": filename,
        "path": path,
        "text": text,
        "easy": _easy_from_ini_text(text),
        "bytes": len(text.encode("utf-8")),
        "backupCreated": bool(backup_info),
        "backupPath": backup_info.get("backupPath") if backup_info else "",
        "backups": _list_ini_backups(filename),
    })


def method_mister_ini_defaults_restore(params: dict[str, Any]) -> dict[str, Any]:
    filename = _filename_from_path_or_name(params.get("filename") or params.get("path"))
    backup_info = _create_ini_backup(filename) if bool(params.get("backup", True)) and _ini_exists(filename) else None
    text = _download_default_ini_text()
    _ini_write_text(filename, text, backup=False)
    return _ok({
        "filename": filename,
        "path": _ini_display_path(filename),
        "text": text,
        "easy": _easy_from_ini_text(text),
        "bytes": len(text.encode("utf-8")),
        "backupCreated": bool(backup_info),
        "backupPath": backup_info.get("backupPath") if backup_info else "",
        "backups": _list_ini_backups(filename),
    })


def method_mister_ini_retention_set(params: dict[str, Any]) -> dict[str, Any]:
    value = max(1, int(params.get("value") or params.get("retention") or 10))
    config = _config()
    config["mister_settings_retention"] = value
    _save_config(config)
    return _ok({"retention": value})

def method_savemanager_backup_start(params: dict[str, Any]) -> dict[str, Any]:
    offline = _sd_mode_enabled()
    if offline and not create_backup_local:
        return _err("Offline SaveManager backup bridge is unavailable.")
    if not offline and not create_backup:
        return _err("SaveManager backup bridge is unavailable.")
    if not offline and (not connection or not connection.is_connected()):
        return _err("Connect to a MiSTer or enable SD Card Mode before starting a backup.")
    profile_name, ip_address = _current_savemanager_identity(params)

    def run_job(log, job):
        if offline:
            backup_path = create_backup_local(str(_sd_root_path(required=True)), _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log)
        else:
            backup_path = create_backup(connection, _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log)
        return {"backupPath": str(backup_path), "summary": method_savemanager_summary({}).get("result")}

    return _ok(_new_job("savemanager.backup", "SaveManager backup" + (" (SD Card)" if offline else ""), run_job))


def method_savemanager_restore_start(params: dict[str, Any]) -> dict[str, Any]:
    offline = _sd_mode_enabled()
    if offline and not restore_backup_local:
        return _err("Offline SaveManager restore bridge is unavailable.")
    if not offline and not restore_backup:
        return _err("SaveManager restore bridge is unavailable.")
    if not offline and (not connection or not connection.is_connected()):
        return _err("Connect to a MiSTer or enable SD Card Mode before restoring a backup.")
    source_device = str(params.get("deviceName") or params.get("sourceDeviceName") or "").strip()
    backup_name = str(params.get("backupName") or params.get("backup") or "").strip()
    if not source_device:
        return _err("Choose a backup device to restore from.")
    if not backup_name:
        return _err("Choose a backup to restore.")
    profile_name, ip_address = _current_savemanager_identity(params)
    backup_before = bool(params.get("backupBeforeRestore", True))

    def run_job(log, job):
        safety_backup = ""
        if backup_before:
            log("Creating safety backup before restore...")
            if offline:
                if not create_backup_local:
                    raise RuntimeError("Offline safety backup is unavailable.")
                safety_backup = str(create_backup_local(str(_sd_root_path(required=True)), _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log))
            else:
                if not create_backup:
                    raise RuntimeError("Safety backup is unavailable.")
                safety_backup = str(create_backup(connection, _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log))
        if offline:
            restore_backup_local(str(_sd_root_path(required=True)), backup_name, profile_name=profile_name, ip_address=ip_address, source_device_name=source_device, log_callback=log)
        else:
            restore_backup(
                connection,
                backup_name,
                profile_name=profile_name,
                ip_address=ip_address,
                source_device_name=source_device,
                log_callback=log,
            )
        return {
            "restored": True,
            "sourceDevice": source_device,
            "backupName": backup_name,
            "safetyBackupPath": safety_backup,
            "summary": method_savemanager_summary({}).get("result"),
        }

    return _ok(_new_job("savemanager.restore", f"Restore {source_device}/{backup_name}", run_job))


def method_savemanager_sync_start(params: dict[str, Any]) -> dict[str, Any]:
    offline = _sd_mode_enabled()
    if offline and not sync_saves_local:
        return _err("Offline SaveManager merge bridge is unavailable.")
    if not offline and not sync_saves:
        return _err("SaveManager sync bridge is unavailable.")
    if not offline and (not connection or not connection.is_connected()):
        return _err("Connect to a MiSTer or enable SD Card Mode before merging saves.")
    profile_name, ip_address = _current_savemanager_identity(params)
    backup_before = bool(params.get("backupBeforeMerge", params.get("backupBeforeSync", True)))

    def run_job(log, job):
        safety_backup = ""
        if backup_before:
            log("Creating safety backup before merge...")
            if offline:
                if not create_backup_local:
                    raise RuntimeError("Offline safety backup is unavailable.")
                safety_backup = str(create_backup_local(str(_sd_root_path(required=True)), _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log))
            else:
                if not create_backup:
                    raise RuntimeError("Safety backup is unavailable.")
                safety_backup = str(create_backup(connection, _config(), profile_name=profile_name, ip_address=ip_address, log_callback=log))
        if offline:
            sync_saves_local(str(_sd_root_path(required=True)), log_callback=log)
        else:
            sync_saves(connection, log_callback=log)
        return {"synced": True, "safetyBackupPath": safety_backup, "summary": method_savemanager_summary({}).get("result")}

    return _ok(_new_job("savemanager.merge", "SaveManager merge" + (" (SD Card)" if offline else ""), run_job))


def method_savemanager_retention_set(params: dict[str, Any]) -> dict[str, Any]:
    value = int(params.get("value") or params.get("retention") or 10)
    config = _config()
    if save_retention_setting:
        value = save_retention_setting(config, value)
    else:
        value = max(1, value)
        config["backup_retention"] = value
        _save_config(config)
    return _ok({"retention": value, "summary": method_savemanager_summary({}).get("result")})


def method_savemanager_rebuild_sync_start(params: dict[str, Any]) -> dict[str, Any]:
    if not rebuild_sync_folder_from_latest_backups:
        return _err("SaveManager merge-folder rebuild bridge is unavailable.")

    def run_job(log, job):
        rebuild_sync_folder_from_latest_backups(log_callback=log)
        return {"rebuilt": True, "summary": method_savemanager_summary({}).get("result")}

    return _ok(_new_job("savemanager.rebuild_sync", "Rebuild SaveManager merge folder", run_job))


def _current_zapscripts_db_path(params: dict[str, Any] | None = None) -> Path | None:
    params = params or {}
    if not get_media_db_path:
        return None
    host = getattr(connection, "host", "") if connection else ""
    profile_name = active_profile_name or str(params.get("profileName") or "").strip() or None
    if not host:
        host = str(params.get("ipAddress") or params.get("host") or "").strip()
    if not host:
        return None
    try:
        return Path(get_media_db_path(profile_name, host))
    except Exception:
        safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", profile_name or host or "MiSTer")
        return DATA_ROOT / "zaplauncher" / f"{safe_name}_media.db"


def _zapscripts_read_local_entries(db_path: Path | None, limit: int | None = None) -> tuple[list[dict[str, Any]], str]:
    if not db_path or not db_path.exists():
        return [], ""
    if not read_media_db_entries:
        return [], "ZapScripts database reader is unavailable."
    try:
        entries = read_media_db_entries(db_path)
        if limit is not None and limit >= 0:
            entries = entries[:limit]
        return entries, ""
    except Exception as exc:
        return [], str(exc)


def _zapscripts_db_columns(cursor, table: str) -> set[str]:
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        return {str(row[1]) for row in cursor.fetchall()}
    except Exception:
        return set()


def _zapscripts_open_media_db(db_path: Path | None):
    if not db_path or not db_path.exists():
        return None
    db = sqlite3.connect(str(db_path))
    db.text_factory = lambda value: value.decode("utf-8", errors="replace")
    db.row_factory = sqlite3.Row
    return db


def _zapscripts_validate_media_schema(cursor) -> tuple[set[str], set[str], set[str]]:
    media_columns = _zapscripts_db_columns(cursor, "Media")
    title_columns = _zapscripts_db_columns(cursor, "MediaTitles")
    system_columns = _zapscripts_db_columns(cursor, "Systems")
    required_media = {"Path", "ParentDir", "MediaTitleDBID", "SystemDBID"}
    required_titles = {"DBID", "Name"}
    required_systems = {"DBID", "SystemID", "Name"}
    missing = []
    if not required_media.issubset(media_columns):
        missing.append("Media")
    if not required_titles.issubset(title_columns):
        missing.append("MediaTitles")
    if not required_systems.issubset(system_columns):
        missing.append("Systems")
    if missing:
        raise RuntimeError("media.db schema mismatch: " + ", ".join(missing))
    return media_columns, title_columns, system_columns


def _zapscripts_last_scan(db_path: Path | None):
    if db_path and get_last_scan_time:
        try:
            return get_last_scan_time(db_path)
        except Exception:
            return None
    return None


def _zapscripts_empty_db_payload(db_path: Path | None, read_error: str = "") -> dict[str, Any]:
    return {
        "entries": [],
        "systems": [],
        "counts": {"games": 0, "scripts": 0, "missing": 0, "total": 0},
        "db": {
            "path": str(db_path) if db_path else "",
            "exists": bool(db_path and db_path.exists()),
            "lastScanTime": _zapscripts_last_scan(db_path),
            "readError": read_error,
        },
    }


def _zapscripts_db_summary(db_path: Path | None, scripts: list[dict[str, Any]] | None = None, read_error: str = "") -> dict[str, Any]:
    scripts = scripts or []
    payload = _zapscripts_empty_db_payload(db_path, read_error=read_error)
    payload["scripts"] = scripts
    payload["counts"]["scripts"] = len(scripts)
    payload["counts"]["total"] = len(scripts)
    if not db_path or not db_path.exists():
        return payload

    db = None
    try:
        db = _zapscripts_open_media_db(db_path)
        if db is None:
            return payload
        cursor = db.cursor()
        media_columns, _, _ = _zapscripts_validate_media_schema(cursor)
        missing_expr = "COALESCE(m.IsMissing, 0)" if "IsMissing" in media_columns else "0"
        cursor.execute("""
            SELECT COALESCE(s.Name, s.SystemID, 'Unknown') AS SystemName, COUNT(*) AS CountValue
            FROM Media m
            LEFT JOIN Systems s ON s.DBID = m.SystemDBID
            GROUP BY SystemName
            ORDER BY LOWER(SystemName)
        """)
        systems = [{"name": str(row["SystemName"] or "Unknown"), "count": int(row["CountValue"] or 0)} for row in cursor.fetchall()]
        games = sum(item["count"] for item in systems)
        cursor.execute(f"SELECT COUNT(*) AS MissingCount FROM Media m WHERE {missing_expr} != 0")
        missing = int((cursor.fetchone() or {"MissingCount": 0})["MissingCount"] or 0)
        payload.update({
            "systems": systems,
            "counts": {
                "games": games,
                "scripts": len(scripts),
                "missing": missing,
                "total": games + len(scripts),
            },
            "db": {
                "path": str(db_path),
                "exists": True,
                "lastScanTime": _zapscripts_last_scan(db_path),
                "readError": read_error,
            },
        })
        return payload
    except Exception as exc:
        payload["db"] = {
            "path": str(db_path) if db_path else "",
            "exists": bool(db_path and db_path.exists()),
            "lastScanTime": _zapscripts_last_scan(db_path),
            "readError": str(exc),
        }
        return payload
    finally:
        try:
            if db is not None:
                db.close()
        except Exception:
            pass


def _zapscripts_query_conditions(system: str, query: str):
    where = []
    params: list[Any] = []
    system = str(system or "").strip()
    if system and system not in ("All", "Scripts"):
        where.append("(COALESCE(s.Name, s.SystemID, 'Unknown') = ? OR s.SystemID = ?)")
        params.extend([system, system])
    q = str(query or "").strip().lower()
    if q:
        like = f"%{q}%"
        where.append("(" + " OR ".join([
            "LOWER(COALESCE(mt.Name, '')) LIKE ?",
            "LOWER(COALESCE(m.Path, '')) LIKE ?",
            "LOWER(COALESCE(m.ParentDir, '')) LIKE ?",
            "LOWER(COALESCE(s.Name, '')) LIKE ?",
            "LOWER(COALESCE(s.SystemID, '')) LIKE ?",
        ]) + ")")
        params.extend([like, like, like, like, like])
    return ("WHERE " + " AND ".join(where)) if where else "", params


def _zapscripts_filename_from_path(path: str, parent_dir: str = "") -> str:
    path = str(path or "")
    parent_dir = str(parent_dir or "")
    if parent_dir and path.startswith(parent_dir):
        candidate = path[len(parent_dir):].lstrip("/")
        if candidate:
            return candidate
    return path.rstrip("/").rsplit("/", 1)[-1]


def _zapscripts_query_local_entries(db_path: Path | None, system: str = "All", query: str = "", offset: int = 0, limit: int = 260) -> dict[str, Any]:
    offset = max(0, int(offset or 0))
    limit = max(1, min(1000, int(limit or 260)))
    if str(system or "") == "Scripts":
        return {"entries": [], "total": 0, "offset": offset, "limit": limit, "readError": ""}
    if not db_path or not db_path.exists():
        return {"entries": [], "total": 0, "offset": offset, "limit": limit, "readError": ""}

    db = None
    try:
        db = _zapscripts_open_media_db(db_path)
        if db is None:
            return {"entries": [], "total": 0, "offset": offset, "limit": limit, "readError": ""}
        cursor = db.cursor()
        media_columns, _, _ = _zapscripts_validate_media_schema(cursor)
        is_missing_expr = "m.IsMissing AS IsMissing," if "IsMissing" in media_columns else "0 AS IsMissing,"
        where_sql, params = _zapscripts_query_conditions(system, query)
        base_from = """
            FROM Media m
            LEFT JOIN MediaTitles mt ON mt.DBID = m.MediaTitleDBID
            LEFT JOIN Systems s ON s.DBID = m.SystemDBID
        """
        cursor.execute(f"SELECT COUNT(*) AS TotalCount {base_from} {where_sql}", params)
        total = int((cursor.fetchone() or {"TotalCount": 0})["TotalCount"] or 0)
        cursor.execute(f"""
            SELECT
                m.DBID AS MediaDBID,
                m.Path AS FullPath,
                m.ParentDir AS ParentDir,
                {is_missing_expr}
                mt.Name AS TitleName,
                s.SystemID AS SystemID,
                s.Name AS SystemName
            {base_from}
            {where_sql}
            ORDER BY LOWER(COALESCE(s.Name, s.SystemID, 'Unknown')), LOWER(COALESCE(mt.Name, m.Path, '')), LOWER(COALESCE(m.Path, ''))
            LIMIT ? OFFSET ?
        """, [*params, limit, offset])
        entries = []
        for row in cursor.fetchall():
            path = str(row["FullPath"] or "")
            parent_dir = str(row["ParentDir"] or "")
            filename = _zapscripts_filename_from_path(path, parent_dir)
            title_name = str(row["TitleName"] or "")
            system_id = str(row["SystemID"] or "Unknown") or "Unknown"
            system_name = str(row["SystemName"] or system_id or "Unknown")
            display_name = filename or title_name or path
            entries.append({
                "name": display_name,
                "filename": filename or display_name,
                "title_name": title_name,
                "path": path,
                "parent_dir": parent_dir,
                "directory": parent_dir,
                "type": "game",
                "system": system_name,
                "system_id": system_id,
                "system_name": system_name,
                "zapScript": None,
                "is_missing": bool(row["IsMissing"]),
                "media_dbid": row["MediaDBID"],
            })
        return {"entries": entries, "total": total, "offset": offset, "limit": limit, "readError": ""}
    except Exception as exc:
        return {"entries": [], "total": 0, "offset": offset, "limit": limit, "readError": str(exc)}
    finally:
        try:
            if db is not None:
                db.close()
        except Exception:
            pass


def _zapscripts_expected_api_unavailable(message: str) -> bool:
    lowered = str(message or "").lower()
    return any(term in lowered for term in (
        "returned 404",
        "http 404",
        "connection refused",
        "refused the connection",
        "timed out",
        "timeout",
        "no route to host",
        "network is unreachable",
    ))

def _zapscripts_entries_summary(entries: list[dict[str, Any]], scripts: list[dict[str, Any]], db_path: Path | None, read_error: str = "") -> dict[str, Any]:
    systems: dict[str, int] = {}
    missing_count = 0
    for item in entries:
        system = str(item.get("system") or item.get("system_name") or "Unknown")
        systems[system] = systems.get(system, 0) + 1
        if item.get("is_missing"):
            missing_count += 1
    last_scan = None
    if db_path and get_last_scan_time:
        try:
            last_scan = get_last_scan_time(db_path)
        except Exception:
            last_scan = None
    return {
        "entries": entries,
        "scripts": scripts,
        "systems": [{"name": name, "count": count} for name, count in sorted(systems.items(), key=lambda kv: kv[0].lower())],
        "counts": {
            "games": len(entries),
            "scripts": len(scripts),
            "missing": missing_count,
            "total": len(entries) + len(scripts),
        },
        "db": {
            "path": str(db_path) if db_path else "",
            "exists": bool(db_path and db_path.exists()),
            "lastScanTime": last_scan,
            "readError": read_error,
        },
    }


def _zapscripts_remote_db_status() -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return {"exists": None, "source": "disconnected"}
    try:
        output = connection.run_command(
            "if [ -f /media/fat/zaparoo/media.db ]; then "
            "echo EXISTS; wc -c < /media/fat/zaparoo/media.db 2>/dev/null; "
            "else echo MISSING; fi"
        )
        lines = [line.strip() for line in str(output or "").splitlines() if line.strip()]
        exists = bool(lines and lines[0] == "EXISTS")
        size = 0
        if exists and len(lines) > 1:
            try:
                size = int(lines[1])
            except Exception:
                size = 0
        return {"exists": exists, "size": size, "source": "ssh"}
    except Exception as exc:
        return {"exists": None, "source": "ssh", "apiError": f"Could not check /media/fat/zaparoo/media.db: {exc}"}



def _zapscripts_parse_probe_output(output: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in str(output or "").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _zapscripts_remote_service_probe() -> dict[str, Any]:
    """Fast SSH-side Zaparoo install/startup/port probe."""
    if not connection or not connection.is_connected():
        return {
            "connected": False,
            "zaparoo_installed": False,
            "zaparoo_service_enabled": False,
            "zaparoo_service_running": False,
            "zaparoo_port_listening": False,
        }
    command = """sh -lc '
script=""
for p in /media/fat/Scripts/zaparoo.sh /media/fat/Scripts/Zaparoo.sh; do
  if [ -f "$p" ]; then script="$p"; break; fi
done
startup="no"
if [ -f /media/fat/linux/user-startup.sh ] && grep -Eq "mrext/zaparoo|zaparoo\\.sh[[:space:]]+-service" /media/fat/linux/user-startup.sh 2>/dev/null; then startup="yes"; fi
port="unknown"
listeners=""
if command -v netstat >/dev/null 2>&1; then listeners="$(netstat -ltn 2>/dev/null)"; fi
if [ -z "$listeners" ] && command -v ss >/dev/null 2>&1; then listeners="$(ss -ltn 2>/dev/null)"; fi
if [ -n "$listeners" ]; then
  if printf "%s\n" "$listeners" | grep -Eq "(^|[^0-9])7497([^0-9]|$)"; then port="yes"; else port="no"; fi
fi
printf "installed=%s\n" "$([ -n "$script" ] && echo yes || echo no)"
printf "script_path=%s\n" "$script"
printf "startup=%s\n" "$startup"
printf "port=%s\n" "$port"
'"""
    try:
        values = _zapscripts_parse_probe_output(connection.run_command(command) or "")
        installed = values.get("installed") == "yes"
        startup = values.get("startup") == "yes"
        port_value = values.get("port")
        port_listening = True if port_value == "yes" else False if port_value == "no" else None
        return {
            "connected": True,
            "zaparoo_installed": installed,
            "zaparoo_service_enabled": startup,
            "zaparoo_service_running": bool(port_listening is True),
            "zaparoo_port_listening": port_listening,
            "zaparoo_script_path": values.get("script_path") or "",
            "probe_source": "ssh",
        }
    except Exception as exc:
        return {
            "connected": True,
            "zaparoo_installed": False,
            "zaparoo_service_enabled": False,
            "zaparoo_service_running": False,
            "zaparoo_port_listening": False,
            "probe_source": "ssh",
            "error": str(exc),
        }


def _zapscripts_current_state() -> dict[str, Any]:
    """Return fresh ZapScripts/Zaparoo state without relying on stale page cache."""
    if not connection or not connection.is_connected():
        return {
            "zaparoo_installed": False,
            "zaparoo_service_enabled": False,
            "zaparoo_service_running": False,
            "zaparoo_port_listening": False,
            "connected": False,
        }

    # Prefer a single explicit SSH probe over the older helper's two-command
    # snapshot. This catches the service/script appearing after an install or
    # manual start without forcing the user to disconnect/reconnect.
    state = _zapscripts_remote_service_probe()
    if state.get("error") and get_zapscripts_state:
        try:
            fallback = get_zapscripts_state(connection) or {}
            state.update({k: v for k, v in fallback.items() if k not in state or state.get(k) in (None, "")})
        except Exception:
            pass
    return {**state, "connected": True}


def _zapscripts_blocked_action(action_label: str, state: dict[str, Any]) -> str:
    if not state.get("connected"):
        return "Connect to a MiSTer before using ZapScripts."
    if not state.get("zaparoo_installed"):
        return f"Zaparoo is not installed, so {action_label} is unavailable. Install Zaparoo from Install Center first."
    if state.get("error"):
        return f"Could not verify Zaparoo service state: {state['error']}"
    if not state.get("zaparoo_service_enabled") and not state.get("zaparoo_service_running"):
        return f"Zaparoo is installed but its service is not running, so {action_label} is unavailable. Start Zaparoo before launching or sending controls."
    return ""


def _zapscripts_api_error_message(exc: Exception) -> str:
    message = str(exc or "").strip()
    if not message:
        return "Zaparoo API is unavailable."
    # Keep launcher/control failures user-readable and prevent Electron from
    # printing Python tracebacks for expected disabled-service/API states.
    return message

def _zapscripts_probe_api_status(media_status: dict[str, Any], state: dict[str, Any], force: bool = False) -> dict[str, Any]:
    installed = bool(state.get("zaparoo_installed"))
    port_state = state.get("zaparoo_port_listening")
    likely_running = bool(state.get("zaparoo_service_running") or port_state is True)
    enabled_unknown_port = bool(state.get("zaparoo_service_enabled") and port_state is None)
    should_probe = bool(installed and get_media_database_status and (force or likely_running or enabled_unknown_port))

    if should_probe:
        try:
            api_status = get_media_database_status(connection, timeout=2)
            state["zaparoo_service_running"] = True
            state["zaparoo_port_listening"] = True
            media_status.update({
                "available": True,
                "apiAvailable": True,
                "serviceRunning": True,
                "source": "api",
                **api_status,
            })
        except Exception as exc:
            message = str(exc)
            media_status.update({
                "available": False,
                "apiAvailable": False,
                "serviceRunning": False,
                "source": media_status.get("source") or "ssh",
            })
            if _zapscripts_expected_api_unavailable(message):
                media_status["apiNote"] = "Zaparoo service is not running or is not answering on the expected API endpoint. Cached browsing still works."
                media_status["apiDetail"] = message
            else:
                media_status["apiError"] = message
    elif installed:
        media_status.update({
            "available": False,
            "apiAvailable": False,
            "serviceRunning": bool(likely_running),
            "serviceDisabled": not bool(state.get("zaparoo_service_enabled")),
            "source": media_status.get("source") or "ssh",
        })
    return media_status


def method_zapscripts_summary(params: dict[str, Any]) -> dict[str, Any]:
    include_entries = bool(params.get("includeEntries", False))
    limit_raw = params.get("limit")
    limit = None
    if limit_raw not in (None, ""):
        try:
            limit = max(0, int(limit_raw))
        except Exception:
            limit = None
    db_path = _current_zapscripts_db_path(params)
    entries: list[dict[str, Any]] = []
    read_error = ""
    if include_entries:
        entries, read_error = _zapscripts_read_local_entries(db_path, limit=limit)
    scripts = []
    state = {
        "zaparoo_installed": False,
        "zaparoo_service_enabled": False,
        "zaparoo_service_running": False,
        "zaparoo_port_listening": False,
    }
    media_status = {"available": False, "exists": None, "error": "", "source": ""}
    connected = bool(connection and connection.is_connected())
    if connected:
        state = _zapscripts_current_state()
        try:
            if zapscripts_list_scripts:
                scripts = zapscripts_list_scripts(connection)
        except Exception as exc:
            media_status["scriptsError"] = str(exc)

        media_status.update(_zapscripts_remote_db_status())
        media_status = _zapscripts_probe_api_status(media_status, state, force=bool(params.get("forceServiceProbe") or params.get("force")))

    payload = _zapscripts_entries_summary(entries, scripts, db_path, read_error) if include_entries else _zapscripts_db_summary(db_path, scripts, read_error)
    payload.update({"connected": connected, "state": state, "mediaStatus": media_status})
    return _ok(payload)


def method_zapscripts_page(params: dict[str, Any]) -> dict[str, Any]:
    db_path = _current_zapscripts_db_path(params)
    system = str(params.get("system") or "All")
    query = str(params.get("query") or "")
    offset = int(params.get("offset") or 0)
    limit = int(params.get("limit") or 260)
    page = _zapscripts_query_local_entries(db_path, system=system, query=query, offset=offset, limit=limit)
    page.update({"system": system, "query": query, "dbPath": str(db_path) if db_path else ""})
    return _ok(page)


def method_zapscripts_service_start(params: dict[str, Any]) -> dict[str, Any]:
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before starting the Zaparoo service.")
    if not scripts_actions:
        return _err("Scripts bridge is unavailable.")

    try:
        state = _zapscripts_current_state()
        if not state.get("zaparoo_installed"):
            return _ok({
                "started": False,
                "error": "Zaparoo is not installed. Install Zaparoo from Install Center first.",
                "state": state,
            })

        # Keep the startup entry in sync, then start the process immediately for
        # this session. This mirrors the existing MiSTer startup hook but avoids
        # requiring a reboot just to make ZapScripts usable.
        try:
            scripts_actions.enable_zaparoo_service(connection)
        except Exception:
            # A start attempt can still be useful even if editing startup failed.
            pass

        output = connection.run_command(
            "sh -lc '"
            "if [ ! -f /media/fat/Scripts/zaparoo.sh ]; then echo MISSING; exit 1; fi; "
            "chmod +x /media/fat/Scripts/zaparoo.sh 2>/dev/null || true; "
            "nohup /media/fat/Scripts/zaparoo.sh -service start >/tmp/zaparoo-service-start.log 2>&1 < /dev/null & "
            "echo STARTED"
            "'"
        ) or ""

        if "MISSING" in output:
            state = _zapscripts_current_state()
            return _ok({
                "started": False,
                "error": "Zaparoo script is missing from /media/fat/Scripts/zaparoo.sh.",
                "state": state,
                "output": output,
            })

        media_status: dict[str, Any] = {}
        state = _zapscripts_current_state()
        for _ in range(8):
            media_status = _zapscripts_probe_api_status({}, state, force=True)
            if media_status.get("apiAvailable"):
                break
            time.sleep(1)
            state = _zapscripts_current_state()

        summary = method_zapscripts_summary({"includeEntries": False, "forceServiceProbe": True}).get("result") or {}
        summary_state = summary.get("state") or state or {}
        summary_media = summary.get("mediaStatus") or media_status or {}
        started = bool(
            summary_media.get("apiAvailable")
            or summary_media.get("serviceRunning")
            or summary_state.get("zaparoo_service_running")
            or media_status.get("apiAvailable")
            or media_status.get("serviceRunning")
        )
        return _ok({
            "started": started,
            "error": "Zaparoo service start was requested, but the service did not answer yet." if not started else "",
            "output": output,
            "state": summary_state,
            "mediaStatus": summary_media,
            "summary": summary,
        })
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_zapscripts_scan_start(params: dict[str, Any]) -> dict[str, Any]:
    if not fetch_media_from_db_cache:
        return _err("ZapScripts scan bridge is unavailable.")
    if not connection or not connection.is_connected():
        return _err("Connect to a MiSTer before scanning ZapScripts.")
    db_path = _current_zapscripts_db_path(params)
    if not db_path:
        return _err("No profile/IP is available for the local ZapScripts media.db cache.")

    def run_job(log, job):
        log("Checking Zaparoo state...")
        if get_zapscripts_state:
            state = get_zapscripts_state(connection)
            if not state.get("zaparoo_installed"):
                raise RuntimeError("Zaparoo is not installed. Install it from Install Center first.")
            if not state.get("zaparoo_service_enabled"):
                raise RuntimeError("Zaparoo service is not enabled. Enable it before scanning.")
        log("Downloading /media/fat/zaparoo/media.db...")
        progress_last = {"value": 0}
        def progress_cb(*args):
            value = 0
            if len(args) >= 2:
                value = int(args[1] or 0)
            elif args:
                value = int(args[0] or 0)
            if value and (value - progress_last["value"] >= 500 or progress_last["value"] == 0):
                progress_last["value"] = value
                log(f"Read {value} media record(s)...")
        entries = fetch_media_from_db_cache(connection, db_path, progress_callback=progress_cb)
        scripts = []
        if zapscripts_list_scripts:
            try:
                scripts = zapscripts_list_scripts(connection)
            except Exception as exc:
                log(f"Could not list scripts: {exc}")
        # Re-read only lightweight counts for the UI instead of returning the full
        # media.db over IPC after every scan. The page endpoint streams rows in
        # smaller chunks when the user browses/searches.
        summary = _zapscripts_db_summary(db_path, scripts)
        state = _zapscripts_current_state()
        media_status = _zapscripts_probe_api_status(_zapscripts_remote_db_status(), state, force=True)
        log(f"Scan complete: {summary['counts']['games']} games, {summary['counts']['scripts']} scripts.")
        return {"summary": {**summary, "connected": True, "state": state, "mediaStatus": media_status}}

    return _ok(_new_job("zapscripts.scan", "ZapScripts scan", run_job))


def method_zapscripts_launch(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscripts_launch_media:
        return _err("ZapScripts launch bridge is unavailable.")
    item = params.get("item") or {}
    if not isinstance(item, dict) or not item:
        return _err("No ZapScripts item was provided.")

    state = _zapscripts_current_state()
    blocked = _zapscripts_blocked_action("launch", state)
    if blocked:
        return _ok({"launched": False, "item": item, "blocked": True, "error": blocked, "state": state})

    try:
        result = zapscripts_launch_media(connection, item, timeout=int(params.get("timeout") or 5))
        return _ok({"launched": True, "item": item, "response": result, "state": state})
    except Exception as exc:
        return _ok({
            "launched": False,
            "item": item,
            "apiUnavailable": True,
            "error": _zapscripts_api_error_message(exc),
            "state": state,
        })


def method_zapscripts_control(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscripts_send_input_command:
        return _err("ZapScripts control bridge is unavailable.")
    action = str(params.get("action") or "").strip().lower()
    command = str(params.get("command") or "").strip()
    command_map = {
        "bluetooth": "**input.keyboard:{f11}",
        "osd": "**input.keyboard:{f12}",
        "wallpaper": "**input.keyboard:{f1}",
        "home": "**stop",
        "stop": "**stop",
    }
    if not command:
        command = command_map.get(action, "")
    if not command:
        return _err("Choose a ZapScripts control or provide a command.")

    state = _zapscripts_current_state()
    blocked = _zapscripts_blocked_action("controls", state)
    if blocked:
        return _ok({"sent": False, "command": command, "blocked": True, "error": blocked, "state": state})

    try:
        result = zapscripts_send_input_command(connection, command, timeout=int(params.get("timeout") or 5))
        return _ok({"sent": True, "command": command, "response": result, "state": state})
    except Exception as exc:
        return _ok({
            "sent": False,
            "command": command,
            "apiUnavailable": True,
            "error": _zapscripts_api_error_message(exc),
            "state": state,
        })



# ---- ZapScraper bridge ----------------------------------------------------
ZAPSCRAPER_SOURCE_SELECTED_SD = "Selected SD Card"
ZAPSCRAPER_SOURCE_CUSTOM_FOLDER = "Custom Games Folder"
ZAPSCRAPER_IMAGE_SIZE_HDTV = "HDTV Mode"
ZAPSCRAPER_IMAGE_SIZE_CRT = "CRT Mode"


def _zapscraper_default_settings() -> dict[str, Any]:
    default_media = get_default_zaparoo_companion_media_names() if get_default_zaparoo_companion_media_names else ["Screenshot", "2D Boxart", "Game Logo"]
    return {
        "sourceMode": ZAPSCRAPER_SOURCE_CUSTOM_FOLDER,
        "sourcePath": "",
        "username": "",
        "password": "",
        "devId": "",
        "devPassword": "",
        "devSoftName": "mister-companion",
        "loggedIn": False,
        "accountName": "",
        "outputFormat": "Zaparoo Companion",
        "imageSource": "2D Boxart",
        "region": "Auto",
        "regionPriority": "USA",
        "zaparooMediaSources": default_media,
        "skipExistingMetadata": True,
        "skipExistingImages": True,
        "skipGamesWithMetadataIgnoreIncompleteMedia": False,
        "imageSize": ZAPSCRAPER_IMAGE_SIZE_HDTV,
        "crtMode": False,
        "rebuildFromScratch": False,
    }


def _zapscraper_config() -> dict[str, Any]:
    cfg = _config()
    raw = cfg.get("zapscraper") if isinstance(cfg, dict) else {}
    raw = raw if isinstance(raw, dict) else {}
    defaults = _zapscraper_default_settings()
    legacy_map = {
        "source_mode": "sourceMode",
        "custom_games_folder": "sourcePath",
        "output_format": "outputFormat",
        "image_source": "imageSource",
        "region_priority": "regionPriority",
        "zaparoo_media_sources": "zaparooMediaSources",
        "skip_existing_metadata": "skipExistingMetadata",
        "skip_existing_images": "skipExistingImages",
        "skip_games_with_metadata_ignore_incomplete_media": "skipGamesWithMetadataIgnoreIncompleteMedia",
        "image_size": "imageSize",
        "crt_mode": "crtMode",
        "logged_in": "loggedIn",
        "account_name": "accountName",
        "dev_id": "devId",
        "developer_id": "devId",
        "ss_dev_id": "devId",
        "dev_password": "devPassword",
        "developer_password": "devPassword",
        "ss_dev_password": "devPassword",
        "dev_softname": "devSoftName",
        "softname": "devSoftName",
    }
    result = dict(defaults)
    for key, value in raw.items():
        result[legacy_map.get(key, key)] = value
    if not isinstance(result.get("zaparooMediaSources"), list) or not result.get("zaparooMediaSources"):
        result["zaparooMediaSources"] = defaults["zaparooMediaSources"]
    if not result.get("sourceMode"):
        result["sourceMode"] = ZAPSCRAPER_SOURCE_CUSTOM_FOLDER
    if not result.get("imageSize"):
        result["imageSize"] = ZAPSCRAPER_IMAGE_SIZE_CRT if result.get("crtMode") else ZAPSCRAPER_IMAGE_SIZE_HDTV
    result["crtMode"] = result.get("imageSize") == ZAPSCRAPER_IMAGE_SIZE_CRT or bool(result.get("crtMode"))
    return result


def _zapscraper_save_config(settings: dict[str, Any]) -> dict[str, Any]:
    current = _zapscraper_config()
    updates = dict(settings or {})
    if updates.get("imageSize"):
        updates["crtMode"] = updates.get("imageSize") == ZAPSCRAPER_IMAGE_SIZE_CRT
    merged = {**current, **updates}
    _zapscraper_apply_dev_credentials(merged)
    cfg = _config()
    cfg["zapscraper"] = merged
    _save_config(cfg)
    return merged


def _zapscraper_apply_dev_credentials(settings: dict[str, Any] | None = None) -> bool:
    settings = settings if isinstance(settings, dict) else _zapscraper_config()
    if set_dev_credentials:
        set_dev_credentials(
            settings.get("devId") or settings.get("developerId") or settings.get("ssDevId") or "",
            settings.get("devPassword") or settings.get("developerPassword") or settings.get("ssDevPassword") or "",
            settings.get("devSoftName") or settings.get("softname") or "mister-companion",
        )
    return bool(has_dev_credentials and has_dev_credentials())


def _zapscraper_has_dev_credentials(settings: dict[str, Any] | None = None) -> bool:
    return _zapscraper_apply_dev_credentials(settings)


def _zapscraper_options() -> dict[str, Any]:
    return {
        "sourceModes": [ZAPSCRAPER_SOURCE_CUSTOM_FOLDER, ZAPSCRAPER_SOURCE_SELECTED_SD],
        "outputFormats": get_output_format_names() if get_output_format_names else ["Zaparoo Companion", "Recalbox Compatible"],
        "imageSources": get_image_source_names() if get_image_source_names else ["2D Boxart", "Screenshot", "Titlescreen", "Game Logo", "3D Boxart"],
        "regions": get_region_names() if get_region_names else ["Auto", "USA", "Japan", "Europe"],
        "regionPriorities": ["USA", "Japan", "Europe"],
        "imageSizes": [ZAPSCRAPER_IMAGE_SIZE_HDTV, ZAPSCRAPER_IMAGE_SIZE_CRT],
        "zaparooMediaSources": get_zaparoo_companion_media_names() if get_zaparoo_companion_media_names else ["Screenshot", "Title Screen", "2D Boxart", "3D Boxart", "Game Logo"],
        "defaultZaparooMediaSources": get_default_zaparoo_companion_media_names() if get_default_zaparoo_companion_media_names else ["Screenshot", "2D Boxart", "Game Logo"],
        "hasDevCredentials": _zapscraper_has_dev_credentials(_zapscraper_config()),
    }


def _zapscraper_source_params(params: dict[str, Any]) -> tuple[str, str]:
    settings = _zapscraper_config()
    source_mode = str(params.get("sourceMode") or settings.get("sourceMode") or ZAPSCRAPER_SOURCE_CUSTOM_FOLDER).strip()
    source_path = str(params.get("sourcePath") or settings.get("sourcePath") or "").strip()
    return source_mode, source_path


def _zapscraper_summarize_system(system: dict[str, Any]) -> dict[str, Any]:
    roms = system.get("roms") if isinstance(system.get("roms"), list) else []
    base = {key: value for key, value in system.items() if key != "roms"}
    return {
        **base,
        "count": int(system.get("count") or len(roms) or 0),
        "romCount": int(system.get("count") or len(roms) or 0),
        "sampleRoms": [
            {
                "filename": rom.get("filename") or Path(str(rom.get("path") or "")).name,
                "relativePath": rom.get("relative_path") or rom.get("relativePath") or "",
            }
            for rom in roms[:3]
            if isinstance(rom, dict)
        ],
    }


def _zapscraper_systems_payload(source_mode: str, source_path: str, systems: list[dict[str, Any]], cache_exists: bool | None = None) -> dict[str, Any]:
    if cache_exists is None:
        cache_exists = bool(zapscraper_scan_cache_exists and zapscraper_scan_cache_exists(source_mode, source_path))
    safe_systems = [_zapscraper_summarize_system(system) for system in (systems or []) if isinstance(system, dict)]
    return {
        "sourceMode": source_mode,
        "sourcePath": source_path,
        "cacheExists": cache_exists,
        "systems": safe_systems,
        "systemCount": len(safe_systems),
        "romCount": sum(int(system.get("romCount") or system.get("count") or 0) for system in safe_systems),
    }


def _zapscraper_selected_systems(params: dict[str, Any]) -> list[dict[str, Any]]:
    systems = params.get("systems")
    if not isinstance(systems, list):
        source_mode, source_path = _zapscraper_source_params(params)
        systems = zapscraper_load_scan_cache_systems(source_mode, source_path) if zapscraper_load_scan_cache_systems else []
    selected_paths = params.get("selectedPaths")
    if isinstance(selected_paths, list) and selected_paths:
        selected = {str(path) for path in selected_paths}
        systems = [system for system in systems if str(system.get("path") or "") in selected]
    return [system for system in systems if isinstance(system, dict)]


def _zapscraper_scrape_options(params: dict[str, Any]) -> dict[str, Any]:
    settings = _zapscraper_config()
    merged = {**settings, **(params.get("options") if isinstance(params.get("options"), dict) else {})}
    if params.get("outputFormat"):
        merged["outputFormat"] = params.get("outputFormat")
    if params.get("imageSource"):
        merged["imageSource"] = params.get("imageSource")
    if params.get("region"):
        merged["region"] = params.get("region")
    if params.get("zaparooMediaSources") is not None:
        merged["zaparooMediaSources"] = params.get("zaparooMediaSources")
    image_size = merged.get("imageSize") or (ZAPSCRAPER_IMAGE_SIZE_CRT if merged.get("crtMode") else ZAPSCRAPER_IMAGE_SIZE_HDTV)
    merged["crtMode"] = image_size == ZAPSCRAPER_IMAGE_SIZE_CRT or bool(merged.get("crtMode"))
    return merged


def _zapscraper_plan_actions_from_params(params: dict[str, Any], log: Callable[[str], None] | None = None) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    if not zapscraper_plan_scrape_actions:
        raise RuntimeError("ZapScraper planner bridge is unavailable.")
    systems = _zapscraper_selected_systems(params)
    options = _zapscraper_scrape_options(params)
    if not systems:
        raise RuntimeError("No systems selected. Scan a source and select at least one system first.")
    actions: list[dict[str, Any]] = []
    for system in systems:
        label = system.get("label") or system.get("folder") or Path(str(system.get("path") or "")).name or "Unknown"
        if log:
            log(f"Planning {label}...")
        system_actions = zapscraper_plan_scrape_actions(
            system,
            options.get("imageSource") or "2D Boxart",
            skip_existing_metadata=bool(options.get("skipExistingMetadata", True)),
            skip_existing_images=bool(options.get("skipExistingImages", True)),
            skip_games_with_metadata_ignore_incomplete_media=bool(options.get("skipGamesWithMetadataIgnoreIncompleteMedia", False)),
            update_changed_images=True,
            output_format=options.get("outputFormat") or "Zaparoo Companion",
            zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
            crt_mode=bool(options.get("crtMode", False)),
        )
        actions.extend(system_actions)
        if log:
            log(f"{label}: {len(system_actions)} pending action(s).")
    return systems, actions, options


def method_zapscraper_options(params: dict[str, Any]) -> dict[str, Any]:
    return _ok(_zapscraper_options())


def method_zapscraper_summary(params: dict[str, Any]) -> dict[str, Any]:
    source_mode, source_path = _zapscraper_source_params(params)
    settings = _zapscraper_config()
    systems = zapscraper_load_scan_cache_systems(source_mode, source_path) if zapscraper_load_scan_cache_systems and source_path else []
    return _ok({
        "settings": settings,
        "options": _zapscraper_options(),
        **_zapscraper_systems_payload(source_mode, source_path, systems),
        "plans": [
            {"id": key, "actionCount": len(value.get("actions") or []), "createdAt": value.get("createdAt"), "systems": value.get("systemsSummary") or []}
            for key, value in sorted(zapscraper_plans.items(), key=lambda kv: kv[1].get("createdAt", 0), reverse=True)
        ][:10],
    })


def method_zapscraper_settings_save(params: dict[str, Any]) -> dict[str, Any]:
    settings = params.get("settings") if isinstance(params.get("settings"), dict) else params
    merged = _zapscraper_save_config(settings or {})
    source_mode, source_path = _zapscraper_source_params(merged)
    systems = zapscraper_load_scan_cache_systems(source_mode, source_path) if zapscraper_load_scan_cache_systems and source_path else []
    return _ok({"settings": merged, **_zapscraper_systems_payload(source_mode, source_path, systems)})


def method_zapscraper_scan_start(params: dict[str, Any]) -> dict[str, Any]:
    source_mode, source_path = _zapscraper_source_params(params)
    if not source_path:
        return _err("Choose a games folder or SD card root before scanning.")
    custom = "custom" in source_mode.lower()
    scan_func = zapscraper_scan_games_folder if custom else zapscraper_scan_sd_card
    if not scan_func or not zapscraper_save_scan_cache:
        return _err("ZapScraper scan bridge is unavailable.")

    _zapscraper_save_config({"sourceMode": source_mode, "sourcePath": source_path})

    def run_job(log, job):
        log(f"Scanning {source_mode}: {source_path}")
        last = {"current": -1, "games": -1}
        def progress(message, current, total, games_found):
            current = int(current or 0)
            games_found = int(games_found or 0)
            if current != last["current"] or games_found != last["games"]:
                last["current"] = current
                last["games"] = games_found
                total_text = f"/{int(total or 0)}" if total else ""
                log(f"{message or 'Scanning'} ({current}{total_text}) · {games_found} game(s)")
        def stop_checker():
            return bool(job.get("cancelRequested"))
        systems = scan_func(source_path, progress_callback=progress, stop_checker=stop_checker)
        if stop_checker():
            log("Scan stopped by user.")
            return {"zapscraperStopped": {"kind": "scan"}}
        cache_path = zapscraper_save_scan_cache(source_mode, source_path, systems)
        payload = _zapscraper_systems_payload(source_mode, source_path, systems, cache_exists=True)
        log(f"Scan complete: {payload['systemCount']} systems, {payload['romCount']} ROMs.")
        log(f"Cache: {cache_path}")
        return {"zapscraper": payload}

    return _ok(_new_job("zapscraper.scan", "ZapScraper scan", run_job))


def method_zapscraper_plan_start(params: dict[str, Any]) -> dict[str, Any]:
    def run_job(log, job):
        systems, actions, options = _zapscraper_plan_actions_from_params(params, log=log)
        if job.get("cancelRequested"):
            log("Plan stopped by user.")
            return {"zapscraperStopped": {"kind": "plan"}}
        plan_id = uuid.uuid4().hex[:12]
        systems_summary = [{"label": s.get("label") or s.get("folder"), "path": s.get("path"), "count": s.get("count") or len(s.get("roms") or [])} for s in systems]
        with zapscraper_plans_lock:
            zapscraper_plans[plan_id] = {
                "id": plan_id,
                "createdAt": time.time(),
                "actions": actions,
                "options": options,
                "systemsSummary": systems_summary,
            }
            # prune old plans, keep the newest 8
            ordered = sorted(zapscraper_plans.items(), key=lambda kv: kv[1].get("createdAt", 0), reverse=True)
            for old_key, _ in ordered[8:]:
                zapscraper_plans.pop(old_key, None)
        log(f"Plan ready: {len(actions)} action(s) across {len(systems)} system(s).")
        return {"zapscraperPlan": {"id": plan_id, "actionCount": len(actions), "systems": systems_summary, "preview": actions[:30]}}
    return _ok(_new_job("zapscraper.plan", "ZapScraper plan", run_job))


def method_zapscraper_scrape_start(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscraper_run_scrape_actions:
        return _err("ZapScraper scrape bridge is unavailable.")
    plan_id = str(params.get("planId") or "").strip()
    actions: list[dict[str, Any]] = []
    options: dict[str, Any] = {}
    if plan_id:
        plan = zapscraper_plans.get(plan_id) or {}
        actions = list(plan.get("actions") or [])
        options = dict(plan.get("options") or {})
    if not actions:
        # Plan inline if a plan was not explicitly supplied.
        try:
            _systems, actions, options = _zapscraper_plan_actions_from_params(params)
        except Exception as exc:
            return _err(str(exc))
    if not actions:
        return _err("No pending scrape actions. Plan selected systems first or change the skip options.")
    settings = _zapscraper_config()
    options = {**settings, **options, **(params.get("options") if isinstance(params.get("options"), dict) else {})}
    username = str(params.get("username") or options.get("username") or "").strip()
    password = str(params.get("password") or options.get("password") or "")
    if not username or not password:
        return _err("Enter and save ScreenScraper credentials before scraping.")
    if not _zapscraper_has_dev_credentials(options if "options" in locals() and isinstance(options, dict) else _zapscraper_config()):
        return _err("ScreenScraper developer credentials are missing in this build, so scraping cannot start.")

    def run_job(log, job):
        completed = {"value": 0}
        latest_quota = {"value": {}}
        def progress(index, total, rom_filename):
            completed["value"] = int(index or 0)
            log(f"Progress {int(index or 0)}/{int(total or 0)} · {rom_filename}")
        def quota(info):
            if isinstance(info, dict):
                latest_quota["value"] = info
                if zapscraper_format_quota_info:
                    try:
                        log(zapscraper_format_quota_info(info))
                    except Exception:
                        pass
        def stop_checker():
            return bool(job.get("cancelRequested"))
        zapscraper_run_scrape_actions(
            actions,
            username=username,
            password=password,
            output_format=options.get("outputFormat") or "Zaparoo Companion",
            image_source_name=options.get("imageSource") or "2D Boxart",
            selected_region=options.get("region") or "Auto",
            skip_existing_metadata=bool(options.get("skipExistingMetadata", True)),
            zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
            progress_callback=progress,
            log_callback=log,
            quota_callback=quota,
            stop_checker=stop_checker,
            crt_mode=bool(options.get("crtMode", False)),
        )
        log(f"Scrape complete: {completed['value']} / {len(actions)} action(s).")
        return {"zapscraperScrape": {"completed": completed["value"], "total": len(actions), "quota": latest_quota["value"], "planId": plan_id}}
    return _ok(_new_job("zapscraper.scrape", "ZapScraper scrape", run_job))


def method_zapscraper_login_start(params: dict[str, Any]) -> dict[str, Any]:
    _zapscraper_save_config(params or {})
    if not zapscraper_test_login:
        return _err("ZapScraper login bridge is unavailable.")
    username = str(params.get("username") or _zapscraper_config().get("username") or "").strip()
    password = str(params.get("password") or _zapscraper_config().get("password") or "")
    if not username or not password:
        return _err("Enter a ScreenScraper username and password first.")
    if not _zapscraper_has_dev_credentials(options if "options" in locals() and isinstance(options, dict) else _zapscraper_config()):
        return _err("ScreenScraper developer credentials are missing in this build.")

    _zapscraper_save_config({"username": username, "password": password, "loggedIn": False, "accountName": ""})

    def run_job(log, job):
        latest_quota = {"value": {}}
        def quota(info):
            if isinstance(info, dict):
                latest_quota["value"] = info
                if zapscraper_format_quota_info:
                    try:
                        log(zapscraper_format_quota_info(info))
                    except Exception:
                        pass
        log("Testing ScreenScraper login...")
        result = zapscraper_test_login(username, password, quota_callback=quota)
        user = result.get("user") if isinstance(result, dict) else {}
        account_name = str((user or {}).get("pseudo") or (user or {}).get("ssid") or username).strip()
        settings = _zapscraper_save_config({"username": username, "password": password, "loggedIn": True, "accountName": account_name})
        log(result.get("message") if isinstance(result, dict) and result.get("message") else f"Logged in as {account_name}.")
        return {"zapscraperLogin": {"settings": settings, "result": result, "quota": latest_quota["value"]}}
    return _ok(_new_job("zapscraper.login", "ScreenScraper login", run_job))


def _zapscraper_system_by_path(params: dict[str, Any]) -> dict[str, Any]:
    system_path = str(params.get("systemPath") or params.get("path") or "").strip()
    if not system_path:
        raise RuntimeError("System path is required.")
    source_mode, source_path = _zapscraper_source_params(params)
    systems = zapscraper_load_scan_cache_systems(source_mode, source_path) if zapscraper_load_scan_cache_systems and source_path else []
    for system in systems or []:
        if str(system.get("path") or "") == system_path:
            return system
    # Allow direct full-system payload fallback for review/apply tools.
    direct = params.get("system")
    if isinstance(direct, dict) and str(direct.get("path") or "") == system_path:
        return direct
    raise RuntimeError("Selected system was not found in the current ZapScraper scan cache.")


def _zapscraper_is_zaparoo_format(options: dict[str, Any]) -> bool:
    output_format = str(options.get("outputFormat") or "Zaparoo Companion")
    if get_output_format_id:
        try:
            return get_output_format_id(output_format) == OUTPUT_FORMAT_ZAPAROO_COMPANION
        except Exception:
            pass
    return "zaparoo" in output_format.lower()


def _zapscraper_review_payload(system: dict[str, Any], options: dict[str, Any]) -> dict[str, Any]:
    if _zapscraper_is_zaparoo_format(options):
        if not zapscraper_build_zaparoo_review_items:
            raise RuntimeError("ZapScraper Zaparoo review bridge is unavailable.")
        media_sources = options.get("zaparooMediaSources") or _zapscraper_config().get("zaparooMediaSources") or []
        items = zapscraper_build_zaparoo_review_items(system, media_source_names=media_sources)
        for item in items:
            if isinstance(item, dict) and zapscraper_default_zaparoo_search_text:
                try:
                    item["defaultSearch"] = zapscraper_default_zaparoo_search_text(item)
                except Exception:
                    item["defaultSearch"] = item.get("display_name") or item.get("relative_path") or ""
        summary = {"matched": 0, "missingMedia": 0, "unmatched": 0}
        for item in items:
            status = str(item.get("status") or "") if isinstance(item, dict) else ""
            if status == "matched": summary["matched"] += 1
            elif status == "missing_media": summary["missingMedia"] += 1
            else: summary["unmatched"] += 1
        return {
            "mode": "zaparoo",
            "system": _zapscraper_summarize_system(system),
            "items": items,
            "summary": {**summary, "total": len(items)},
        }
    if not zapscraper_build_gamelist_review_items:
        raise RuntimeError("ZapScraper gamelist review bridge is unavailable.")
    items = zapscraper_build_gamelist_review_items(system)
    for item in items:
        if isinstance(item, dict) and zapscraper_default_manual_search_text:
            try:
                item["defaultSearch"] = zapscraper_default_manual_search_text(item)
            except Exception:
                item["defaultSearch"] = item.get("display_name") or item.get("relative_path") or ""
    summary = {"complete": 0, "missingImage": 0, "missingMetadata": 0}
    for item in items:
        status = str(item.get("status") or "") if isinstance(item, dict) else ""
        if status == "complete": summary["complete"] += 1
        elif status == "missing_image": summary["missingImage"] += 1
        else: summary["missingMetadata"] += 1
    return {
        "mode": "recalbox",
        "system": _zapscraper_summarize_system(system),
        "items": items,
        "summary": {**summary, "total": len(items)},
    }


def method_zapscraper_logout(params: dict[str, Any]) -> dict[str, Any]:
    settings = _zapscraper_save_config({"loggedIn": False, "accountName": ""})
    return _ok({"settings": settings})


def method_zapscraper_clear_cache(params: dict[str, Any]) -> dict[str, Any]:
    source_mode, source_path = _zapscraper_source_params(params)
    if not source_path:
        return _err("Choose a games folder or SD card root first.")
    if not zapscraper_clear_scan_cache:
        return _err("ZapScraper cache bridge is unavailable.")
    removed = bool(zapscraper_clear_scan_cache(source_mode, source_path))
    return _ok({"removed": removed, "settings": _zapscraper_config(), **_zapscraper_systems_payload(source_mode, source_path, [], cache_exists=False)})


def method_zapscraper_clear_output_start(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscraper_clear_output_for_system:
        return _err("ZapScraper output cleanup bridge is unavailable.")
    try:
        systems = _zapscraper_selected_systems(params)
    except Exception as exc:
        return _err(str(exc))
    if not systems:
        return _err("Select at least one system to clean.")
    options = _zapscraper_scrape_options(params)
    def run_job(log, job):
        cleaned = []
        for system in systems:
            if job.get("cancelRequested"):
                log("Cleanup stopped by user.")
                break
            label = system.get("label") or system.get("folder") or Path(str(system.get("path") or "")).name or "Unknown"
            log(f"Cleaning scrape output for {label}...")
            zapscraper_clear_output_for_system(
                system,
                output_format=options.get("outputFormat") or "Zaparoo Companion",
                image_source=options.get("imageSource") or "2D Boxart",
                zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
            )
            cleaned.append({"label": label, "path": system.get("path")})
        log(f"Cleanup complete: {len(cleaned)} system(s).")
        return {"zapscraperCleanup": {"cleaned": cleaned}}
    return _ok(_new_job("zapscraper.cleanup", "ZapScraper cleanup", run_job))


def method_zapscraper_review(params: dict[str, Any]) -> dict[str, Any]:
    try:
        system = _zapscraper_system_by_path(params)
        options = _zapscraper_scrape_options(params)
        return _ok(_zapscraper_review_payload(system, options))
    except Exception as exc:
        return _err(str(exc))


def method_zapscraper_review_search_start(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscraper_search_games:
        return _err("ZapScraper manual search bridge is unavailable.")
    options = _zapscraper_scrape_options(params)
    username = str(params.get("username") or options.get("username") or "").strip()
    password = str(params.get("password") or options.get("password") or "")
    query = str(params.get("query") or "").strip()
    system_id = int(params.get("systemId") or params.get("system_id") or 0)
    if not username or not password:
        return _err("ScreenScraper credentials are required for manual search.")
    if not query:
        return _err("Search text is required.")
    if not system_id:
        return _err("This system is missing a ScreenScraper system ID.")
    if not _zapscraper_has_dev_credentials(options if "options" in locals() and isinstance(options, dict) else _zapscraper_config()):
        return _err("ScreenScraper developer credentials are missing in this build.")
    def run_job(log, job):
        log(f"Searching ScreenScraper: {query}")
        results = zapscraper_search_games(username=username, password=password, query=query, system_id=system_id)
        if job.get("cancelRequested"):
            log("Manual search stopped by user.")
            return {"zapscraperReviewSearch": {"results": []}}
        log(f"Found {len(results or [])} result(s).")
        return {"zapscraperReviewSearch": {"query": query, "systemId": system_id, "results": results or []}}
    return _ok(_new_job("zapscraper.review.search", "ZapScraper manual search", run_job))


def method_zapscraper_review_apply_start(params: dict[str, Any]) -> dict[str, Any]:
    options = _zapscraper_scrape_options(params)
    username = str(params.get("username") or options.get("username") or "").strip()
    password = str(params.get("password") or options.get("password") or "")
    item = params.get("item") if isinstance(params.get("item"), dict) else {}
    selected_result = params.get("selectedResult") if isinstance(params.get("selectedResult"), dict) else {}
    if not username or not password:
        return _err("ScreenScraper credentials are required for manual apply.")
    if not item:
        return _err("Review item is required.")
    if not selected_result:
        return _err("Select a ScreenScraper result first.")
    if not _zapscraper_has_dev_credentials(options if "options" in locals() and isinstance(options, dict) else _zapscraper_config()):
        return _err("ScreenScraper developer credentials are missing in this build.")
    try:
        system = _zapscraper_system_by_path(params)
    except Exception as exc:
        return _err(str(exc))
    system_path = str(system.get("path") or "")
    relative_path = str(item.get("relative_path") or item.get("relativePath") or "").strip()
    rom = item.get("rom") if isinstance(item.get("rom"), dict) else {}
    system_id = int(params.get("systemId") or system.get("screenscraper_id") or 0)
    if not relative_path:
        return _err("Selected item is missing a relative path.")
    if not system_id:
        return _err("This system is missing a ScreenScraper system ID.")
    mode_is_zaparoo = _zapscraper_is_zaparoo_format(options)
    apply_func = zapscraper_apply_zaparoo_match if mode_is_zaparoo else zapscraper_apply_manual_result
    if not apply_func:
        return _err("ZapScraper manual apply bridge is unavailable.")
    def run_job(log, job):
        label = selected_result.get("name") or selected_result.get("title") or "selected result"
        log(f"Applying manual match: {label}")
        if mode_is_zaparoo:
            result = apply_func(
                system_path=system_path,
                relative_path=relative_path,
                rom=rom,
                selected_result=selected_result,
                username=username,
                password=password,
                selected_region=options.get("regionPriority") or options.get("region") or "USA",
                system_id=system_id,
                media_source_names=options.get("zaparooMediaSources") or [],
            )
        else:
            result = apply_func(
                system_path=system_path,
                relative_path=relative_path,
                rom=rom,
                selected_result=selected_result,
                username=username,
                password=password,
                image_source_name=options.get("imageSource") or "2D Boxart",
                selected_region=options.get("region") or "Auto",
                system_id=system_id,
            )
        refreshed = _zapscraper_review_payload(system, options)
        log("Manual match applied.")
        return {"zapscraperReviewApply": {"result": result, "review": refreshed}}
    return _ok(_new_job("zapscraper.review.apply", "ZapScraper manual apply", run_job))


def method_zapscraper_scrape_selected_start(params: dict[str, Any]) -> dict[str, Any]:
    if not zapscraper_run_scrape_actions or not zapscraper_plan_scrape_actions:
        return _err("ZapScraper scrape bridge is unavailable.")
    options = _zapscraper_scrape_options(params)
    username = str(params.get("username") or options.get("username") or "").strip()
    password = str(params.get("password") or options.get("password") or "")
    if not username or not password:
        return _err("Enter and save ScreenScraper credentials before scraping.")
    if not _zapscraper_has_dev_credentials(options if "options" in locals() and isinstance(options, dict) else _zapscraper_config()):
        return _err("ScreenScraper developer credentials are missing in this build, so scraping cannot start.")
    try:
        systems = _zapscraper_selected_systems(params)
    except Exception as exc:
        return _err(str(exc))
    if not systems:
        return _err("No systems selected. Scan a source and select at least one system first.")
    rebuild = bool(options.get("rebuildFromScratch", False))
    def run_job(log, job):
        actions = []
        for system in systems:
            if job.get("cancelRequested"):
                log("Scrape stopped while planning.")
                return {"zapscraperStopped": {"kind": "scrapeSelected", "phase": "planning"}}
            label = system.get("label") or system.get("folder") or Path(str(system.get("path") or "")).name or "Unknown"
            if rebuild and zapscraper_clear_output_for_system:
                log(f"Rebuild from scratch: clearing {label}...")
                zapscraper_clear_output_for_system(
                    system,
                    output_format=options.get("outputFormat") or "Zaparoo Companion",
                    image_source=options.get("imageSource") or "2D Boxart",
                    zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
                )
            log(f"Planning {label}...")
            actions.extend(zapscraper_plan_scrape_actions(
                system,
                options.get("imageSource") or "2D Boxart",
                skip_existing_metadata=bool(options.get("skipExistingMetadata", True)),
                skip_existing_images=bool(options.get("skipExistingImages", True)),
                skip_games_with_metadata_ignore_incomplete_media=bool(options.get("skipGamesWithMetadataIgnoreIncompleteMedia", False)),
                update_changed_images=True,
                output_format=options.get("outputFormat") or "Zaparoo Companion",
                zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
                crt_mode=bool(options.get("crtMode", False)),
            ))
        if not actions:
            log("Nothing to scrape. Selected systems already match the chosen options.")
            return {"zapscraperScrape": {"completed": 0, "total": 0}}
        completed = {"value": 0}
        latest_quota = {"value": {}}
        def progress(index, total, rom_filename):
            completed["value"] = int(index or 0)
            log(f"Progress {int(index or 0)}/{int(total or 0)} · {rom_filename}")
        def quota(info):
            if isinstance(info, dict):
                latest_quota["value"] = info
                if zapscraper_format_quota_info:
                    try:
                        log(zapscraper_format_quota_info(info))
                    except Exception:
                        pass
        def stop_checker():
            return bool(job.get("cancelRequested"))
        log(f"Starting scrape for {len(actions)} action(s).")
        zapscraper_run_scrape_actions(
            actions,
            username=username,
            password=password,
            output_format=options.get("outputFormat") or "Zaparoo Companion",
            image_source_name=options.get("imageSource") or "2D Boxart",
            selected_region=options.get("region") or "Auto",
            skip_existing_metadata=bool(options.get("skipExistingMetadata", True)),
            zaparoo_media_source_names=options.get("zaparooMediaSources") or [],
            progress_callback=progress,
            log_callback=log,
            quota_callback=quota,
            stop_checker=stop_checker,
            crt_mode=bool(options.get("crtMode", False)),
        )
        log(f"Scrape complete: {completed['value']} / {len(actions)} action(s).")
        return {"zapscraperScrape": {"completed": completed["value"], "total": len(actions), "quota": latest_quota["value"]}}
    return _ok(_new_job("zapscraper.scrape", "ZapScraper scrape selected", run_job))



# ---- Flash SD bridge --------------------------------------------------------
FLASH_MODES = {
    "mc_fusion": {"label": "MC-Fusion", "folder": "mc-fusion"},
    "mr_fusion": {"label": "Mr. Fusion", "folder": "mr-fusion"},
    "superstation": {"label": "SuperStationOne SD Card Installer", "folder": "superstation"},
}


def _flash_supported() -> bool:
    return bool(is_flash_supported and is_flash_supported())


def _flash_mode(value: str | None) -> str:
    mode = str(value or "mc_fusion").strip()
    if mode not in FLASH_MODES:
        raise RuntimeError(f"Unsupported Flash SD installer: {mode}")
    return mode


def _path_text(path_obj: Any) -> str:
    return str(path_obj) if path_obj else ""


def _flash_privileges() -> dict[str, Any]:
    system = platform.system()
    if system == "Windows":
        admin = bool(is_admin_windows and is_admin_windows())
        return {
            "status": "ready" if admin else "warning",
            "message": "Administrator privileges detected." if admin else "Run MiSTer Companion EX as Administrator to flash SD cards.",
            "hasPrivileges": admin,
        }
    if system == "Linux":
        root = bool(is_root_linux and is_root_linux())
        return {
            "status": "ready" if root else "warning",
            "message": "Root privileges detected." if root else "Run MiSTer Companion EX with sudo, pkexec, or root privileges to flash SD cards.",
            "hasPrivileges": root,
        }
    if system == "Darwin":
        return {
            "status": "warning",
            "message": "macOS may ask for your password when balena CLI writes the SD card.",
            "hasPrivileges": None,
        }
    return {"status": "unsupported", "message": "Flashing is not supported on this platform.", "hasPrivileges": False}


def _flash_balena_status() -> dict[str, Any]:
    installed = bool(has_balena_cli and has_balena_cli())
    path = ""
    if installed:
        try:
            path = _path_text(get_balena_executable())
        except Exception:
            path = ""
    return {
        "installed": installed,
        "ready": installed,
        "path": path,
        "label": "Ready" if installed else "Not downloaded",
    }


def _flash_image_status(mode: str) -> dict[str, Any]:
    mode = _flash_mode(mode)
    if mode == "mc_fusion":
        if get_mc_fusion_image_status:
            try:
                status = dict(get_mc_fusion_image_status() or {})
            except Exception as exc:
                status = {"installed": bool(has_mc_fusion_image and has_mc_fusion_image()), "error": str(exc)}
        else:
            status = {"installed": False, "error": "MC-Fusion bridge is unavailable."}
        try:
            status["path"] = _path_text(get_mc_fusion_image()) if status.get("installed") else ""
        except Exception:
            status.setdefault("path", "")
        status.setdefault("label", "Ready" if status.get("installed") else "Not downloaded")
        return status

    if mode == "mr_fusion":
        installed = bool(has_mr_fusion_image and has_mr_fusion_image())
        name = ""
        path = ""
        if installed:
            try:
                image = get_mr_fusion_image()
                path = _path_text(image)
                name = getattr(image, "name", "") or Path(str(image)).name
            except Exception:
                pass
        return {
            "installed": installed,
            "up_to_date": None,
            "local_name": name or None,
            "latest_name": None,
            "update_available": False,
            "path": path,
            "label": "Ready" if installed else "Not downloaded",
        }

    if get_superstation_image_status:
        try:
            status = dict(get_superstation_image_status() or {})
        except Exception as exc:
            status = {"installed": bool(has_superstation_image and has_superstation_image()), "error": str(exc)}
    else:
        status = {"installed": False, "error": "SuperStation bridge is unavailable."}
    try:
        status["path"] = _path_text(get_superstation_image()) if status.get("installed") else ""
    except Exception:
        status.setdefault("path", "")
    status.setdefault("label", "Ready" if status.get("installed") else "Not downloaded")
    return status


def _flash_summary(mode: str = "mc_fusion", include_drives: bool = False) -> dict[str, Any]:
    mode = _flash_mode(mode)
    supported = _flash_supported()
    modes = [{"id": key, "label": value["label"]} for key, value in FLASH_MODES.items()]
    tools = {
        "root": _path_text(FLASH_TOOLS_DIR),
        "balena": _path_text(FLASH_BALENA_DIR),
        "mcFusion": _path_text(FLASH_MC_FUSION_DIR),
        "mrFusion": _path_text(FLASH_MR_FUSION_DIR),
        "superstation": _path_text(FLASH_SUPERSTATION_DIR),
    }
    payload = {
        "mode": mode,
        "modes": modes,
        "supported": supported,
        "platform": platform.system(),
        "platformKey": get_platform_key() if get_platform_key else "unsupported",
        "archKey": get_arch_key() if get_arch_key else "unknown",
        "privileges": _flash_privileges(),
        "balena": _flash_balena_status() if has_balena_cli else {"installed": False, "ready": False, "label": "Unavailable"},
        "image": _flash_image_status(mode),
        "tools": tools,
        "drives": [],
        "info": {
            "mc_fusion": "MC-Fusion is a MiSTer Companion EX focused fork of Mr. Fusion.",
            "mr_fusion": "Mr. Fusion prepares a standard MiSTer SD card installer.",
            "superstation": "SuperStationOne SD Card Installer prepares a SuperStationOne installer image.",
        },
    }
    payload["canFlash"] = bool(supported and payload["balena"].get("ready") and payload["image"].get("installed"))
    if include_drives and list_available_drives:
        payload["drives"] = list_available_drives()
    return payload


def method_flash_summary(params: dict[str, Any]) -> dict[str, Any]:
    try:
        return _ok(_flash_summary(params.get("mode"), include_drives=bool(params.get("includeDrives"))))
    except Exception as exc:
        return _err(str(exc))


def _selected_flash_image(mode: str) -> Path:
    mode = _flash_mode(mode)
    if mode == "mc_fusion":
        if not get_mc_fusion_image:
            raise RuntimeError("MC-Fusion image bridge is unavailable.")
        return Path(get_mc_fusion_image())
    if mode == "mr_fusion":
        if not get_mr_fusion_image:
            raise RuntimeError("Mr. Fusion image bridge is unavailable.")
        return Path(get_mr_fusion_image())
    if not get_superstation_image:
        raise RuntimeError("SuperStation image bridge is unavailable.")
    return Path(get_superstation_image())


def method_flash_image_start(params: dict[str, Any]) -> dict[str, Any]:
    mode = _flash_mode(params.get("mode"))
    action = str(params.get("action") or "download").strip().lower()
    if action not in {"download", "remove"}:
        return _err("Flash image action must be download or remove.")
    if not _flash_supported():
        return _err("Flash SD is not supported on this platform.")

    label = FLASH_MODES[mode]["label"]

    def run_job(log, job):
        if action == "download":
            if mode == "mc_fusion":
                if not ensure_mc_fusion_image: raise RuntimeError("MC-Fusion download bridge is unavailable.")
                ensure_mc_fusion_image(force_download=True, log_callback=log)
            elif mode == "mr_fusion":
                if not ensure_mr_fusion_image: raise RuntimeError("Mr. Fusion download bridge is unavailable.")
                ensure_mr_fusion_image(force_download=True, log_callback=log)
            else:
                if not ensure_superstation_image: raise RuntimeError("SuperStation download bridge is unavailable.")
                ensure_superstation_image(force_download=True, log_callback=log)
            log(f"{label} image download complete.")
        else:
            if mode == "mc_fusion":
                if not remove_mc_fusion_image: raise RuntimeError("MC-Fusion removal bridge is unavailable.")
                remove_mc_fusion_image(log_callback=log)
            elif mode == "mr_fusion":
                if not remove_mr_fusion_image: raise RuntimeError("Mr. Fusion removal bridge is unavailable.")
                remove_mr_fusion_image(log_callback=log)
            else:
                if not remove_superstation_image: raise RuntimeError("SuperStation removal bridge is unavailable.")
                remove_superstation_image(log_callback=log)
            log(f"{label} image files removed.")
        return {"flash": _flash_summary(mode)}

    return _ok(_new_job(f"flash.image.{action}", f"Flash SD {label} {action}", run_job))


def method_flash_balena_start(params: dict[str, Any]) -> dict[str, Any]:
    action = str(params.get("action") or "download").strip().lower()
    if action not in {"download", "remove"}:
        return _err("balena CLI action must be download or remove.")
    if not _flash_supported():
        return _err("Flash SD is not supported on this platform.")

    def run_job(log, job):
        if action == "download":
            if not ensure_balena_cli: raise RuntimeError("balena CLI download bridge is unavailable.")
            ensure_balena_cli(force_download=True, log_callback=log)
            log("balena CLI download complete.")
        else:
            if not remove_balena_cli: raise RuntimeError("balena CLI removal bridge is unavailable.")
            remove_balena_cli(log_callback=log)
            log("balena CLI files removed.")
        return {"flash": _flash_summary(params.get("mode") or "mc_fusion")}

    return _ok(_new_job(f"flash.balena.{action}", f"Flash SD balena CLI {action}", run_job))


def method_flash_drives_start(params: dict[str, Any]) -> dict[str, Any]:
    mode = _flash_mode(params.get("mode"))
    if not _flash_supported():
        return _err("Flash SD is not supported on this platform.")
    if not list_available_drives:
        return _err("Drive listing bridge is unavailable.")

    def run_job(log, job):
        drives = list_available_drives(log_callback=log)
        log(f"Found {len(drives)} available drive(s).")
        summary = _flash_summary(mode)
        summary["drives"] = drives
        return {"flash": summary}

    return _ok(_new_job("flash.drives", "Flash SD refresh drives", run_job))


def method_flash_start(params: dict[str, Any]) -> dict[str, Any]:
    mode = _flash_mode(params.get("mode"))
    drive = str(params.get("drive") or "").strip()
    password = params.get("password")
    if not _flash_supported():
        return _err("Flash SD is not supported on this platform.")
    if not drive:
        return _err("Select a target drive first.")
    if not flash_image:
        return _err("Flash image bridge is unavailable.")

    try:
        image_path = _selected_flash_image(mode)
    except Exception as exc:
        return _err(str(exc))

    label = FLASH_MODES[mode]["label"]

    def run_job(log, job):
        log("DANGER: This job erases the selected drive.")
        _file_job_progress(job, 0, 100, "Preparing flash")

        def progress(current: int, total: int, label_text: str = "Flashing"):
            _file_job_progress(job, current, total, label_text or "Flashing")

        flash_image(
            image_path,
            drive,
            log_callback=log,
            password=str(password or "") or None,
            progress_callback=progress,
        )
        _file_job_progress(job, 1, 1, "Flash complete")
        log("Flash complete.")
        return {"flash": _flash_summary(mode), "flashed": {"mode": mode, "label": label, "drive": drive, "image": str(image_path)}}

    return _ok(_new_job("flash.write", f"Flash SD {label}", run_job))


def method_flash_backup_start(params: dict[str, Any]) -> dict[str, Any]:
    drive = str(params.get("drive") or "").strip()
    output_path = str(params.get("outputPath") or params.get("path") or "").strip()
    size = params.get("size") or params.get("totalSize")
    mode = _flash_mode(params.get("mode") or "mc_fusion")
    if not _flash_supported():
        return _err("Flash SD is not supported on this platform.")
    if not drive:
        return _err("Select a source drive first.")
    if not output_path:
        return _err("Choose where to save the SD card image.")
    if not backup_drive_to_image:
        return _err("SD backup bridge is unavailable.")

    try:
        total_size = int(size or 0)
    except Exception:
        total_size = 0

    def run_job(log, job):
        log("DANGER: This job reads the selected physical drive into an image file.")
        _file_job_progress(job, 0, total_size if total_size > 0 else 0, "Preparing backup")

        def progress(current: int, total: int, label_text: str = "Backing up"):
            _file_job_progress(job, current, total, label_text or "Backing up")

        target = backup_drive_to_image(
            drive,
            output_path,
            total_size=total_size if total_size > 0 else None,
            log_callback=log,
            progress_callback=progress,
            stop_checker=lambda: bool(job.get("cancelRequested")),
        )
        _file_job_progress(job, 1, 1, "Backup complete")
        return {"flash": _flash_summary(mode), "backup": {"drive": drive, "image": str(target), "size": total_size}}

    return _ok(_new_job("flash.backup", "Backup SD card image", run_job))


def _file_browser_ready() -> tuple[bool, str]:
    if not file_browser_core:
        return False, "File Browser bridge is unavailable."
    if not connection or not connection.is_connected():
        return False, "Connect to a MiSTer before using File Browser."
    return True, ""


def _file_browser_path(params: dict[str, Any], key: str = "path", fallback: str = "/media/fat") -> str:
    value = params.get(key)
    if value is None or str(value).strip() == "":
        value = fallback
    return file_browser_core.clamp_to_root(value, fallback=fallback)


def _file_browser_sources(params: dict[str, Any], plural_key: str = "sources", singular_key: str = "source") -> list[str]:
    values = params.get(plural_key)
    if values is None:
        values = [params.get(singular_key)]
    if not isinstance(values, list):
        values = [values]
    paths: list[str] = []
    for value in values:
        if value is None or str(value).strip() == "":
            continue
        path = file_browser_core.clamp_to_root(value)
        if path not in paths:
            paths.append(path)
    return paths


def _file_browser_local_paths(params: dict[str, Any]) -> list[str]:
    values = params.get("localPaths")
    if values is None:
        values = [params.get("localPath")]
    if not isinstance(values, list):
        values = [values]
    paths: list[str] = []
    for value in values:
        path = str(value or "").strip()
        if path and path not in paths:
            paths.append(path)
    return paths


def _file_browser_basename(remote_path: str) -> str:
    return str(remote_path or "").rstrip("/").rsplit("/", 1)[-1] or str(remote_path or "")


def _file_browser_entry_payload(path: str, entries: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    entries = list(entries or [])
    for entry in entries:
        entry["sizeLabel"] = file_browser_core.format_size(entry.get("size", 0)) if file_browser_core else ""
        try:
            entry["modifiedAtLabel"] = datetime.fromtimestamp(int(entry.get("mtime") or 0)).strftime("%Y-%m-%d %H:%M") if entry.get("mtime") else ""
        except Exception:
            entry["modifiedAtLabel"] = ""
    return {
        "path": path,
        "parent": file_browser_core.parent_path(path) if file_browser_core else path,
        "root": file_browser_core.root_for_path(path) if file_browser_core else "",
        "roots": file_browser_core.available_roots(connection) if file_browser_core else [],
        "entries": entries,
        "count": len(entries),
    }


def method_file_browser_summary(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _ok({"ready": False, "connected": bool(connection and connection.is_connected()), "message": reason, "roots": [], "path": "/media/fat", "entries": []})
    try:
        roots = file_browser_core.available_roots(connection)
        path = _file_browser_path(params, "path", roots[0]["path"] if roots else "/media/fat")
        listing = file_browser_core.list_directory(connection, path)
        payload = _file_browser_entry_payload(listing.get("path") or path, listing.get("entries") or [])
        payload.update({"ready": True, "connected": True})
        return _ok(payload)
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_file_browser_list(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    try:
        path = _file_browser_path(params)
        listing = file_browser_core.list_directory(connection, path)
        payload = _file_browser_entry_payload(listing.get("path") or path, listing.get("entries") or [])
        payload.update({"ready": True, "connected": True})
        return _ok(payload)
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_file_browser_mkdir(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    try:
        base = _file_browser_path(params)
        name = str(params.get("name") or "").strip().strip("/")
        if not name or "/" in name or "\\" in name:
            return _err("Enter a valid folder name.")
        target = file_browser_core.join_remote_path(base, name)
        file_browser_core.make_directory(connection, target)
        return method_file_browser_list({"path": base})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_file_browser_rename(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    try:
        source = _file_browser_path(params, "source")
        name = str(params.get("name") or "").strip().strip("/")
        if not name or "/" in name or "\\" in name:
            return _err("Enter a valid new name.")
        parent = file_browser_core.parent_path(source)
        target = file_browser_core.join_remote_path(parent, name)
        file_browser_core.rename_path(connection, source, target, overwrite=bool(params.get("overwrite")))
        return method_file_browser_list({"path": parent})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def _file_job_progress(job: dict[str, Any], transferred: int, total: int, label: str = "") -> None:
    try:
        transferred = int(transferred or 0)
        total = int(total or 0)
    except Exception:
        transferred, total = 0, 0
    percent = int((transferred / total) * 100) if total > 0 else 0
    with jobs_lock:
        job["progress"] = {
            "current": transferred,
            "total": total,
            "percent": max(0, min(100, percent)),
            "label": label,
        }


def method_file_browser_conflicts(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    mode = str(params.get("mode") or "").strip().lower()
    conflicts: list[dict[str, Any]] = []
    try:
        if mode == "upload":
            remote_dir = _file_browser_path(params, "path")
            sftp = connection.client.open_sftp()
            try:
                for local_path in _file_browser_local_paths(params):
                    name = Path(local_path).name
                    if not name:
                        continue
                    target = file_browser_core.join_remote_path(remote_dir, name)
                    if file_browser_core.sftp_exists(sftp, target):
                        conflicts.append({"name": name, "path": target, "kind": "remote"})
            finally:
                sftp.close()
        elif mode == "download":
            local_dir = Path(str(params.get("localDir") or "").strip())
            if not local_dir:
                return _err("Choose a local destination folder.")
            for source in _file_browser_sources(params):
                name = _file_browser_basename(source)
                target = local_dir / name
                if target.exists():
                    conflicts.append({"name": name, "path": str(target), "kind": "local"})
        elif mode in {"copy", "move"}:
            target_dir = _file_browser_path(params, "targetDir")
            sftp = connection.client.open_sftp()
            try:
                for source in _file_browser_sources(params):
                    name = _file_browser_basename(source)
                    target = file_browser_core.join_remote_path(target_dir, name)
                    if source == target:
                        conflicts.append({"name": name, "path": target, "kind": "same-path", "message": "Source and destination are the same."})
                    elif file_browser_core.sftp_exists(sftp, target):
                        conflicts.append({"name": name, "path": target, "kind": "remote"})
            finally:
                sftp.close()
        elif mode == "rename":
            source = _file_browser_path(params, "source")
            name = str(params.get("name") or "").strip().strip("/")
            if not name or "/" in name or "\\" in name:
                return _err("Enter a valid new name.")
            parent = file_browser_core.parent_path(source)
            target = file_browser_core.join_remote_path(parent, name)
            sftp = connection.client.open_sftp()
            try:
                if source == target:
                    conflicts.append({"name": name, "path": target, "kind": "same-path", "message": "Source and destination are the same."})
                elif file_browser_core.sftp_exists(sftp, target):
                    conflicts.append({"name": name, "path": target, "kind": "remote"})
            finally:
                sftp.close()
        elif mode == "mkdir":
            base = _file_browser_path(params)
            name = str(params.get("name") or "").strip().strip("/")
            if not name or "/" in name or "\\" in name:
                return _err("Enter a valid folder name.")
            target = file_browser_core.join_remote_path(base, name)
            sftp = connection.client.open_sftp()
            try:
                if file_browser_core.sftp_exists(sftp, target):
                    conflicts.append({"name": name, "path": target, "kind": "remote"})
            finally:
                sftp.close()
        return _ok({"mode": mode, "conflicts": conflicts, "count": len(conflicts)})
    except Exception as exc:
        return _err(str(exc), traceback.format_exc())


def method_file_browser_upload_start(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    local_paths = _file_browser_local_paths(params)
    remote_dir = _file_browser_path(params, "path")
    if not local_paths:
        return _err("Choose one or more local files or folders to upload.")

    def run_job(log, job):
        log(f"Uploading {len(local_paths)} item{'s' if len(local_paths) != 1 else ''} to {remote_dir}...")
        progress = lambda transferred, total: _file_job_progress(job, transferred, total, "Uploading")
        targets = []
        for index, local_path in enumerate(local_paths, start=1):
            log(f"[{index}/{len(local_paths)}] {local_path}")
            target = file_browser_core.upload_path(connection, local_path, remote_dir, progress_callback=progress, message_callback=log, overwrite=bool(params.get("overwrite")))
            targets.append(target)
        _file_job_progress(job, 1, 1, "Complete")
        log("Upload complete.")
        listing = file_browser_core.list_directory(connection, remote_dir)
        return {"path": remote_dir, "targets": targets, "target": targets[0] if len(targets) == 1 else "", "summary": _file_browser_entry_payload(listing.get("path") or remote_dir, listing.get("entries") or [])}

    return _ok(_new_job("fileBrowser.upload", f"Upload to {remote_dir}", run_job))


def method_file_browser_download_start(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    sources = _file_browser_sources(params)
    local_dir = str(params.get("localDir") or "").strip()
    if not sources:
        return _err("Select one or more items to download.")
    if not local_dir:
        return _err("Choose a local destination folder.")

    def run_job(log, job):
        log(f"Downloading {len(sources)} item{'s' if len(sources) != 1 else ''} to {local_dir}...")
        progress = lambda transferred, total: _file_job_progress(job, transferred, total, "Downloading")
        local_paths = []
        for index, source in enumerate(sources, start=1):
            log(f"[{index}/{len(sources)}] {source}")
            target = file_browser_core.download_path(connection, source, local_dir, progress_callback=progress, message_callback=log, overwrite=bool(params.get("overwrite")))
            local_paths.append(target)
        _file_job_progress(job, 1, 1, "Complete")
        log("Download complete.")
        return {"sources": sources, "localPaths": local_paths, "localPath": local_paths[0] if len(local_paths) == 1 else local_dir}

    return _ok(_new_job("fileBrowser.download", f"Download {len(sources)} item{'s' if len(sources) != 1 else ''}", run_job))


def method_file_browser_delete_start(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    sources = _file_browser_sources(params)
    if not sources:
        return _err("Select one or more items to delete.")
    parent = file_browser_core.parent_path(sources[0])

    def run_job(log, job):
        log(f"Deleting {len(sources)} item{'s' if len(sources) != 1 else ''}...")
        for index, source in enumerate(sources, start=1):
            log(f"[{index}/{len(sources)}] {source}")
            file_browser_core.delete_path(connection, source)
        _file_job_progress(job, 1, 1, "Complete")
        log("Delete complete.")
        listing = file_browser_core.list_directory(connection, parent)
        return {"path": parent, "summary": _file_browser_entry_payload(listing.get("path") or parent, listing.get("entries") or [])}

    return _ok(_new_job("fileBrowser.delete", f"Delete {len(sources)} item{'s' if len(sources) != 1 else ''}", run_job))


def method_file_browser_copy_start(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    sources = _file_browser_sources(params)
    target_dir = _file_browser_path(params, "targetDir")
    if not sources:
        return _err("Select one or more items to copy.")

    def run_job(log, job):
        log(f"Copying {len(sources)} item{'s' if len(sources) != 1 else ''} to {target_dir}...")
        progress = lambda transferred, total: _file_job_progress(job, transferred, total, "Copying")
        targets = []
        for index, source in enumerate(sources, start=1):
            log(f"[{index}/{len(sources)}] {source}")
            target = file_browser_core.copy_path(connection, source, target_dir, progress_callback=progress, message_callback=log, overwrite=bool(params.get("overwrite")))
            targets.append(target)
        _file_job_progress(job, 1, 1, "Complete")
        log("Copy complete.")
        listing = file_browser_core.list_directory(connection, target_dir)
        return {"path": target_dir, "targets": targets, "target": targets[0] if len(targets) == 1 else "", "summary": _file_browser_entry_payload(listing.get("path") or target_dir, listing.get("entries") or [])}

    return _ok(_new_job("fileBrowser.copy", f"Copy {len(sources)} item{'s' if len(sources) != 1 else ''}", run_job))


def method_file_browser_move_start(params: dict[str, Any]) -> dict[str, Any]:
    ready, reason = _file_browser_ready()
    if not ready:
        return _err(reason)
    sources = _file_browser_sources(params)
    target_dir = _file_browser_path(params, "targetDir")
    if not sources:
        return _err("Select one or more items to move.")

    def run_job(log, job):
        log(f"Moving {len(sources)} item{'s' if len(sources) != 1 else ''} to {target_dir}...")
        progress = lambda transferred, total: _file_job_progress(job, transferred, total, "Moving")
        targets = []
        for index, source in enumerate(sources, start=1):
            log(f"[{index}/{len(sources)}] {source}")
            target = file_browser_core.move_path(connection, source, target_dir, progress_callback=progress, message_callback=log, overwrite=bool(params.get("overwrite")))
            targets.append(target)
        _file_job_progress(job, 1, 1, "Complete")
        log("Move complete.")
        listing = file_browser_core.list_directory(connection, target_dir)
        return {"path": target_dir, "targets": targets, "target": targets[0] if len(targets) == 1 else "", "summary": _file_browser_entry_payload(listing.get("path") or target_dir, listing.get("entries") or [])}

    return _ok(_new_job("fileBrowser.move", f"Move {len(sources)} item{'s' if len(sources) != 1 else ''}", run_job))


METHODS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "ping": method_ping,
    "backend.diagnostics": method_backend_diagnostics,
    "backend.capabilities": method_backend_capabilities,
    "config.get": method_config_get,
    "profiles.list": method_profiles_list,
    "profiles.save": method_profiles_save,
    "profiles.delete": method_profiles_delete,
    "connection.status": method_connection_status,
    "connection.test": method_connection_test,
    "connection.scan": method_connection_scan,
    "connection.connect": method_connection_connect,
    "connection.disconnect": method_connection_disconnect,
    "connection.reboot": method_connection_reboot,
    "sdMode.status": method_sd_mode_status,
    "sdMode.set": method_sd_mode_set,
    "sdMode.clear": method_sd_mode_clear,
    "command.run": method_command_run,
    "command.start": method_command_start,
    "fileBrowser.summary": method_file_browser_summary,
    "fileBrowser.list": method_file_browser_list,
    "fileBrowser.mkdir": method_file_browser_mkdir,
    "fileBrowser.rename": method_file_browser_rename,
    "fileBrowser.conflicts": method_file_browser_conflicts,
    "fileBrowser.upload.start": method_file_browser_upload_start,
    "fileBrowser.download.start": method_file_browser_download_start,
    "fileBrowser.delete.start": method_file_browser_delete_start,
    "fileBrowser.copy.start": method_file_browser_copy_start,
    "fileBrowser.move.start": method_file_browser_move_start,
    "device.summary": method_device_summary,
    "device.smb.set": method_device_smb_set,
    "device.returnMenu": method_device_return_to_menu,
    "remote.status": method_remote_status,
    "remote.command.start": method_remote_command_start,
    "remote.input": method_remote_input,
    "remote.disconnect": method_remote_disconnect,
    "flash.summary": method_flash_summary,
    "flash.image.start": method_flash_image_start,
    "flash.balena.start": method_flash_balena_start,
    "flash.drives.start": method_flash_drives_start,
    "flash.start": method_flash_start,
    "flash.backup.start": method_flash_backup_start,
    "retroAchievements.settings": method_retroachievements_settings,
    "retroAchievements.settings.save": method_retroachievements_settings_save,
    "retroAchievements.dashboard": method_retroachievements_dashboard,
    "retroAchievements.game": method_retroachievements_game,
    "installCenter.catalog": method_install_center_catalog,
    "installCenter.github.add": method_install_center_github_add,
    "installCenter.status": method_install_center_status,
    "installCenter.statusAll": method_install_center_status_all,
    "installCenter.check.start": method_install_center_check_start,
    "installCenter.checkAll.start": method_install_center_check_all_start,
    "installCenter.install.start": method_install_center_install_start,
    "installCenter.uninstall.start": method_install_center_uninstall_start,
    "installCenter.action.start": method_install_center_action_start,
    "scripts.summary": method_scripts_summary,
    "scripts.command.start": method_scripts_command_start,
    "scripts.config.load": method_scripts_config_load,
    "scripts.config.save": method_scripts_config_save,
    "scripts.config.remove": method_scripts_config_remove,
    "scripts.openFolder": method_scripts_open_folder,
    "saveManager.summary": method_savemanager_summary,
    "saveManager.backup.start": method_savemanager_backup_start,
    "saveManager.restore.start": method_savemanager_restore_start,
    "saveManager.sync.start": method_savemanager_sync_start,
    "saveManager.merge.start": method_savemanager_sync_start,
    "saveManager.retention.set": method_savemanager_retention_set,
    "saveManager.rebuildSync.start": method_savemanager_rebuild_sync_start,
    "manuals.cached": method_manuals_cached,
    "manuals.summary": method_manuals_summary,
    "manuals.system": method_manuals_system,
    "manuals.cache": method_manuals_cache,
    "manuals.cache.start": method_manuals_cache_start,
    "manuals.removeCached": method_manuals_remove_cached,
    "manuals.cacheRoot": method_manuals_cache_root,
    "zapscripts.summary": method_zapscripts_summary,
    "zapscripts.page": method_zapscripts_page,
    "zapscripts.service.start": method_zapscripts_service_start,
    "zapscripts.scan.start": method_zapscripts_scan_start,
    "zapscripts.launch": method_zapscripts_launch,
    "zapscripts.control": method_zapscripts_control,
    "zapscraper.options": method_zapscraper_options,
    "zapscraper.summary": method_zapscraper_summary,
    "zapscraper.settings.save": method_zapscraper_settings_save,
    "zapscraper.logout": method_zapscraper_logout,
    "zapscraper.clearCache": method_zapscraper_clear_cache,
    "zapscraper.clearOutput.start": method_zapscraper_clear_output_start,
    "zapscraper.scan.start": method_zapscraper_scan_start,
    "zapscraper.plan.start": method_zapscraper_plan_start,
    "zapscraper.scrape.start": method_zapscraper_scrape_start,
    "zapscraper.scrapeSelected.start": method_zapscraper_scrape_selected_start,
    "zapscraper.login.start": method_zapscraper_login_start,
    "zapscraper.review": method_zapscraper_review,
    "zapscraper.review.search.start": method_zapscraper_review_search_start,
    "zapscraper.review.apply.start": method_zapscraper_review_apply_start,
    "misterIni.options": method_mister_ini_options,
    "misterIni.list": method_mister_ini_list,
    "misterIni.fonts": method_mister_ini_fonts,
    "misterIni.backups.list": method_mister_ini_backups_list,
    "misterIni.backup.create": method_mister_ini_backup_create,
    "misterIni.backup.restore": method_mister_ini_backup_restore,
    "misterIni.parse": method_mister_ini_parse,
    "misterIni.previewEasy": method_mister_ini_preview_easy,
    "misterIni.defaults.restore": method_mister_ini_defaults_restore,
    "misterIni.retention.set": method_mister_ini_retention_set,
    "misterIni.read": method_mister_ini_read,
    "misterIni.write": method_mister_ini_write,
    "jobs.list": method_jobs_list,
    "jobs.status": method_jobs_status,
    "jobs.cancel": method_jobs_cancel,
    "jobs.clear": method_jobs_clear,
}


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    method = str(request.get("method") or "").strip()
    params = request.get("params") or {}
    if not isinstance(params, dict):
        params = {"value": params}
    if method not in METHODS:
        response = _err(f"Unknown backend method: {method}")
    else:
        try:
            response = METHODS[method](params)
        except Exception as exc:
            response = _err(str(exc), traceback.format_exc())
    response["id"] = request_id
    return response


def main() -> int:
    # Let Electron know the child process is alive. stderr keeps stdout clean for JSON-RPC.
    print(f"{APP_NAME} VaultKit backend ready ({APP_VERSION})", file=sys.stderr, flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError("Request must be an object")
            response = handle_request(request)
        except Exception as exc:
            response = _err(str(exc), traceback.format_exc())
            response["id"] = None
        sys.stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
