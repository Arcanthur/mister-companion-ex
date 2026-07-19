import json
import re
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path

from websocket import create_connection


REMOTE_MEDIA_DB_PATH = "/media/fat/zaparoo/media.db"
ZAPAROO_API_ENDPOINTS = ("/api/v0.1", "/api/v0", "/api/")


class ZaparooApiError(RuntimeError):
    pass


def _safe_text(value) -> str:
    if value is None:
        return ""

    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")

    return str(value)


def _build_ws_url(connection, endpoint: str = "/api/v0.1") -> str:
    host = getattr(connection, "host", "").strip()
    if not host:
        raise ZaparooApiError("No MiSTer IP is available.")

    endpoint = endpoint or "/api/v0.1"
    if not endpoint.startswith("/"):
        endpoint = f"/{endpoint}"

    return f"ws://{host}:7497{endpoint}"


def _compact_api_error(exc: Exception, endpoint: str = "") -> str:
    text = str(exc or "").strip()
    lowered = text.lower()
    target = endpoint or "Zaparoo API"

    if "handshake status 404" in lowered or "404 not found" in lowered:
        return f"{target} returned 404. The Zaparoo service may be disabled, not started yet, or using a different API endpoint."
    if "connection refused" in lowered or "actively refused" in lowered:
        return "Zaparoo API refused the connection on port 7497. The service is probably not running."
    if "timed out" in lowered or "timeout" in lowered:
        return "Zaparoo API timed out on port 7497."
    if "no route to host" in lowered or "network is unreachable" in lowered:
        return "Zaparoo API is unreachable from this computer."

    # websocket-client can include a full HTTP header dump in handshake errors.
    # Keep the UI from becoming a wall of protocol confetti.
    if "header" in lowered or "handshake" in lowered:
        first = text.splitlines()[0].strip() if text else "Handshake failed"
        return f"{target} handshake failed: {first}"

    return text or f"{target} is unavailable."


def _raise_response_error(response):
    if isinstance(response, dict) and response.get("error"):
        error = response["error"]
        if isinstance(error, dict):
            message = error.get("message") or str(error)
        else:
            message = str(error)
        raise ZaparooApiError(message)


def _parse_api_response(response_raw):
    try:
        response = json.loads(response_raw)
    except Exception:
        response = {"raw": response_raw}

    _raise_response_error(response)
    return response


def _build_http_url(connection, endpoint: str = "/api/v0.1") -> str:
    host = getattr(connection, "host", "").strip()
    if not host:
        raise ZaparooApiError("No MiSTer IP is available.")

    endpoint = endpoint or "/api/v0.1"
    if not endpoint.startswith("/"):
        endpoint = f"/{endpoint}"

    return f"http://{host}:7497{endpoint}"


def _send_http_payload(connection, endpoint: str, payload: dict, timeout: int = 5):
    request = urllib.request.Request(
        _build_http_url(connection, endpoint),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response_raw = response.read().decode("utf-8", errors="replace")
            return _parse_api_response(response_raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        message = f"HTTP {exc.code} {exc.reason}"
        if detail:
            message = f"{message}: {detail.splitlines()[0][:160]}"
        raise ZaparooApiError(message) from exc


def _send_ws_payload(connection, payload: dict, timeout: int = 5):
    errors = []

    # Prefer the documented WebSocket transport. If the service/firmware rejects
    # WebSockets on a given endpoint, fall back to documented HTTP POST before
    # giving up. This keeps ZapScripts usable with a wider range of Zaparoo
    # installs without making the UI wait on a huge stack of retries.
    for transport in ("ws", "http"):
        for endpoint in ZAPAROO_API_ENDPOINTS:
            ws = None
            try:
                if transport == "http":
                    return _send_http_payload(connection, endpoint, payload, timeout=timeout)

                ws_url = _build_ws_url(connection, endpoint)
                ws = create_connection(
                    ws_url,
                    timeout=timeout,
                    suppress_origin=True,
                )

                ws.send(json.dumps(payload))
                response_raw = ws.recv()
                return _parse_api_response(response_raw)

            except Exception as e:
                if isinstance(e, ZaparooApiError) and not any(term in str(e).lower() for term in ("404", "handshake", "connection", "timeout", "refused")):
                    raise
                prefix = "HTTP " if transport == "http" else ""
                errors.append(prefix + _compact_api_error(e, endpoint))
            finally:
                if ws is not None:
                    try:
                        ws.close()
                    except Exception:
                        pass

    # Dedupe while preserving order.
    seen = set()
    compact_errors = []
    for error in errors:
        if error and error not in seen:
            seen.add(error)
            compact_errors.append(error)

    raise ZaparooApiError("; ".join(compact_errors) or "Zaparoo API is unavailable.")


def run_zaparoo_command(connection, command: str, timeout: int = 5):
    if not command:
        raise ValueError("Command is required.")

    payload = {
        "jsonrpc": "2.0",
        "method": "run",
        "params": command,
        "id": 1,
    }

    return _send_ws_payload(connection, payload, timeout=timeout)


def run_script(connection, script_name: str, timeout: int = 5):
    script_name = (script_name or "").strip()

    if not script_name:
        raise ValueError("Script name is required.")

    if script_name.endswith(".sh"):
        script_name = script_name[:-3]

    return run_zaparoo_command(
        connection,
        f"**mister.script:{script_name}.sh",
        timeout=timeout,
    )


def send_input_command(connection, command: str, timeout: int = 5):
    return run_zaparoo_command(connection, command, timeout=timeout)


def get_media_database_status(connection, timeout: int = 5) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "method": "media",
        "id": 1,
    }

    response = _send_ws_payload(connection, payload, timeout=timeout)
    result = response.get("result", {}) if isinstance(response, dict) else {}
    database = result.get("database", {}) if isinstance(result, dict) else {}

    return {
        "exists": bool(database.get("exists", False)),
        "indexing": bool(database.get("indexing", False)),
        "optimizing": bool(database.get("optimizing", False)),
        "total_media": database.get("totalMedia", 0),
        "current_step": database.get("currentStep"),
        "total_steps": database.get("totalSteps"),
        "current_step_display": database.get("currentStepDisplay"),
        "total_files": database.get("totalFiles"),
    }


def _open_sftp(connection):
    """
    Open an SFTP session using the existing MiSTer Companion connection object.
    """
    if not connection or not connection.is_connected():
        raise ZaparooApiError("Not connected to MiSTer.")

    for method_name in ("open_sftp", "get_sftp", "create_sftp"):
        method = getattr(connection, method_name, None)
        if callable(method):
            sftp = method()
            if sftp:
                return sftp, True

    for attr_name in ("sftp", "sftp_client"):
        sftp = getattr(connection, attr_name, None)
        if sftp:
            return sftp, False

    for attr_name in ("ssh", "client", "ssh_client"):
        ssh = getattr(connection, attr_name, None)
        if ssh and hasattr(ssh, "open_sftp"):
            return ssh.open_sftp(), True

    raise ZaparooApiError(
        "Could not open SFTP session from the active MiSTer connection."
    )


def download_media_db(connection, local_path: Path) -> Path:
    """
    Download Zaparoo's media.db from the MiSTer.

    Remote:
        /media/fat/zaparoo/media.db

    Local:
        zaplauncher/<profile_or_ip>_media.db
    """
    if not local_path:
        raise ZaparooApiError("No local media.db path was provided.")

    local_path = Path(local_path)
    local_path.parent.mkdir(parents=True, exist_ok=True)

    tmp_path = local_path.with_suffix(local_path.suffix + ".tmp")

    sftp = None
    should_close = False

    try:
        sftp, should_close = _open_sftp(connection)

        try:
            sftp.get(REMOTE_MEDIA_DB_PATH, str(tmp_path))
        except FileNotFoundError:
            raise ZaparooApiError(
                f"Zaparoo media database was not found:\n{REMOTE_MEDIA_DB_PATH}"
            )
        except OSError as e:
            raise ZaparooApiError(
                f"Could not download Zaparoo media database:\n{e}"
            ) from e

        tmp_path.replace(local_path)
        return local_path

    finally:
        try:
            if should_close and sftp:
                sftp.close()
        except Exception:
            pass

        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass


def _get_table_columns(cursor, table_name: str) -> set[str]:
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    return {str(row[1]) for row in cursor.fetchall()}


def _make_filename(path: str, parent_dir: str | None = None) -> str:
    path = _safe_text(path)
    parent_dir = _safe_text(parent_dir)

    if parent_dir and path.startswith(parent_dir):
        filename = path[len(parent_dir):].lstrip("/")
        if filename:
            return filename

    stripped = path.rstrip("/")
    if not stripped:
        return ""

    return Path(stripped).name


_CD_TRACK_RE = re.compile(
    r"""
    (?:
        [\s._-]*
        \(?
        track
        [\s._-]*
        \d+
        \)?
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _path_ext(path: str) -> str:
    filename = Path(_safe_text(path).rstrip("/").split("/")[-1]).name
    return Path(filename).suffix.lower()


def _filename_stem_from_path(path: str) -> str:
    filename = Path(_safe_text(path).rstrip("/").split("/")[-1]).name
    return Path(filename).stem.strip()


def _normalize_cd_set_name(name: str) -> str:
    name = _safe_text(name)
    name = Path(name).stem
    name = _CD_TRACK_RE.sub("", name)
    name = re.sub(r"\s+", " ", name)
    name = name.strip(" ._-")
    return name.lower()


def _cue_matches_bin(cue_path: str, bin_path: str) -> bool:
    cue_name = _normalize_cd_set_name(_filename_stem_from_path(cue_path))
    bin_name = _normalize_cd_set_name(_filename_stem_from_path(bin_path))

    if not cue_name or not bin_name:
        return False

    if cue_name == bin_name:
        return True

    if bin_name.startswith(cue_name):
        return True

    if cue_name.startswith(bin_name):
        return True

    return False


def _looks_like_cd_track_bin(path: str) -> bool:
    filename = Path(_safe_text(path).rstrip("/").split("/")[-1]).name

    if not filename.lower().endswith(".bin"):
        return False

    return bool(_CD_TRACK_RE.search(Path(filename).stem))


def _build_cue_lookup(rows: list[sqlite3.Row]) -> dict[str, list[str]]:
    cue_lookup = {}

    for row in rows:
        path = _safe_text(row["FullPath"])
        parent_dir = _safe_text(row["ParentDir"])

        if _path_ext(path) != ".cue":
            continue

        cue_lookup.setdefault(parent_dir, []).append(path)

    return cue_lookup


def _should_hide_bin_entry(path: str, parent_dir: str, cue_lookup: dict[str, list[str]]) -> bool:
    if _path_ext(path) != ".bin":
        return False

    matching_cues = cue_lookup.get(parent_dir, [])

    for cue_path in matching_cues:
        if _cue_matches_bin(cue_path, path):
            return True

    if _looks_like_cd_track_bin(path):
        return True

    return False


def read_media_db_entries(
    local_path: Path,
    progress_callback=None,
    include_missing: bool = True,
) -> list[dict]:
    """
    Read a downloaded Zaparoo media.db and return ZapScripts-compatible entries.
    """
    local_path = Path(local_path)

    if not local_path.exists():
        raise ZaparooApiError(f"Local media.db not found:\n{local_path}")

    entries = []

    try:
        db = sqlite3.connect(str(local_path))

        db.text_factory = lambda value: value.decode("utf-8", errors="replace")

        db.row_factory = sqlite3.Row
    except Exception as e:
        raise ZaparooApiError(f"Could not open media.db:\n{e}") from e

    try:
        cursor = db.cursor()

        media_columns = _get_table_columns(cursor, "Media")
        title_columns = _get_table_columns(cursor, "MediaTitles")
        system_columns = _get_table_columns(cursor, "Systems")

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
            raise ZaparooApiError(
                "media.db does not have the expected Zaparoo schema. "
                f"Problem table(s): {', '.join(missing)}"
            )

        where = ""
        if not include_missing and "IsMissing" in media_columns:
            where = "WHERE COALESCE(m.IsMissing, 0) = 0"

        cursor.execute(f"SELECT COUNT(*) FROM Media m {where}")
        total = int(cursor.fetchone()[0] or 0)

        query = f"""
            SELECT
                m.DBID AS MediaDBID,
                m.Path AS FullPath,
                m.ParentDir AS ParentDir,
                {"m.IsMissing AS IsMissing," if "IsMissing" in media_columns else "0 AS IsMissing,"}
                mt.Name AS TitleName,
                s.SystemID AS SystemID,
                s.Name AS SystemName
            FROM Media m
            LEFT JOIN MediaTitles mt ON mt.DBID = m.MediaTitleDBID
            LEFT JOIN Systems s ON s.DBID = m.SystemDBID
            {where}
            ORDER BY s.SystemID, mt.Name, m.Path
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        cue_lookup = _build_cue_lookup(rows)

        scanned = 0

        for row in rows:
            scanned += 1

            path = _safe_text(row["FullPath"])
            parent_dir = _safe_text(row["ParentDir"])

            if _should_hide_bin_entry(path, parent_dir, cue_lookup):
                if progress_callback and (scanned % 500 == 0 or scanned == total):
                    try:
                        progress_callback(1, scanned, {"total": total})
                    except TypeError:
                        progress_callback(scanned)
                continue

            filename = _make_filename(path, parent_dir)

            title_name = _safe_text(row["TitleName"])
            system_id = _safe_text(row["SystemID"]) or "Unknown"
            system_name = _safe_text(row["SystemName"]) or system_id or "Unknown"

            display_name = filename or title_name or path

            entries.append(
                {
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
                }
            )

            if progress_callback and (scanned % 500 == 0 or scanned == total):
                try:
                    progress_callback(1, scanned, {"total": total})
                except TypeError:
                    progress_callback(scanned)

        return entries

    except ZaparooApiError:
        raise
    except Exception as e:
        raise ZaparooApiError(f"Could not read media.db:\n{e}") from e
    finally:
        try:
            db.close()
        except Exception:
            pass



def _fast_basename(path: str) -> str:
    path = _safe_text(path).rstrip("/")
    if not path:
        return ""
    return path.rsplit("/", 1)[-1]


def _fast_suffix(path: str) -> str:
    filename = _fast_basename(path)
    dot = filename.rfind(".")
    if dot <= 0:
        return ""
    return filename[dot:].lower()


def _fast_stem(path: str) -> str:
    filename = _fast_basename(path)
    dot = filename.rfind(".")
    if dot <= 0:
        return filename.strip()
    return filename[:dot].strip()


def _normalize_cd_set_name_fast(name: str) -> str:
    name = _safe_text(name)
    name = _fast_stem(name)
    name = _CD_TRACK_RE.sub("", name)
    name = re.sub(r"\s+", " ", name)
    name = name.strip(" ._-")
    return name.lower()


def _cue_matches_bin_fast(cue_path: str, bin_path: str) -> bool:
    cue_name = _normalize_cd_set_name_fast(cue_path)
    bin_name = _normalize_cd_set_name_fast(bin_path)

    if not cue_name or not bin_name:
        return False

    return cue_name == bin_name or bin_name.startswith(cue_name) or cue_name.startswith(bin_name)


def _looks_like_cd_track_bin_fast(path: str) -> bool:
    filename = _fast_basename(path)
    return filename.lower().endswith(".bin") and bool(_CD_TRACK_RE.search(_fast_stem(filename)))


def _should_hide_bin_entry_fast(path: str, parent_dir: str, cue_lookup: dict[str, list[str]]) -> bool:
    if _fast_suffix(path) != ".bin":
        return False

    for cue_path in cue_lookup.get(parent_dir, []):
        if _cue_matches_bin_fast(cue_path, path):
            return True

    return _looks_like_cd_track_bin_fast(path)


def _make_filename_fast(path: str, parent_dir: str | None = None) -> str:
    path = _safe_text(path)
    parent_dir = _safe_text(parent_dir)

    if parent_dir and path.startswith(parent_dir):
        filename = path[len(parent_dir):].lstrip("/")
        if filename:
            return filename

    return _fast_basename(path)


def _raise_if_cancelled(cancel_callback):
    if callable(cancel_callback) and cancel_callback():
        raise RuntimeError("__LOAD_CANCELLED__")


def read_media_db_entries_macos_fast(
    local_path: Path,
    progress_callback=None,
    include_missing: bool = True,
    cancel_callback=None,
) -> list[dict]:
    local_path = Path(local_path)

    if not local_path.exists():
        raise ZaparooApiError(f"Local media.db not found:\n{local_path}")

    entries = []

    try:
        db = sqlite3.connect(str(local_path))
        db.text_factory = lambda value: value.decode("utf-8", errors="replace")
        db.row_factory = sqlite3.Row
    except Exception as e:
        raise ZaparooApiError(f"Could not open media.db:\n{e}") from e

    try:
        cursor = db.cursor()
        media_columns = _get_table_columns(cursor, "Media")
        title_columns = _get_table_columns(cursor, "MediaTitles")
        system_columns = _get_table_columns(cursor, "Systems")

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
            raise ZaparooApiError(
                "media.db does not have the expected Zaparoo schema. "
                f"Problem table(s): {', '.join(missing)}"
            )

        where = ""
        if not include_missing and "IsMissing" in media_columns:
            where = "WHERE COALESCE(m.IsMissing, 0) = 0"

        cursor.execute(f"SELECT COUNT(*) FROM Media m {where}")
        total = int(cursor.fetchone()[0] or 0)

        _raise_if_cancelled(cancel_callback)

        cue_lookup = {}
        cue_where = "AND" if where else "WHERE"
        cue_query = f'''
            SELECT m.Path AS FullPath, m.ParentDir AS ParentDir
            FROM Media m
            {where}
            {cue_where} LOWER(m.Path) LIKE '%.cue'
        '''
        for row in cursor.execute(cue_query):
            _raise_if_cancelled(cancel_callback)
            parent_dir = _safe_text(row["ParentDir"])
            path = _safe_text(row["FullPath"])
            cue_lookup.setdefault(parent_dir, []).append(path)

        _raise_if_cancelled(cancel_callback)

        query = f'''
            SELECT
                m.DBID AS MediaDBID,
                m.Path AS FullPath,
                m.ParentDir AS ParentDir,
                {"m.IsMissing AS IsMissing," if "IsMissing" in media_columns else "0 AS IsMissing,"}
                mt.Name AS TitleName,
                s.SystemID AS SystemID,
                s.Name AS SystemName
            FROM Media m
            LEFT JOIN MediaTitles mt ON mt.DBID = m.MediaTitleDBID
            LEFT JOIN Systems s ON s.DBID = m.SystemDBID
            {where}
        '''

        scanned = 0
        for row in cursor.execute(query):
            scanned += 1

            if scanned % 1000 == 0:
                _raise_if_cancelled(cancel_callback)

            path = _safe_text(row["FullPath"])
            parent_dir = _safe_text(row["ParentDir"])

            if _should_hide_bin_entry_fast(path, parent_dir, cue_lookup):
                if progress_callback and (scanned % 500 == 0 or scanned == total):
                    progress_callback(scanned)
                continue

            filename = _make_filename_fast(path, parent_dir)
            title_name = _safe_text(row["TitleName"])
            system_id = _safe_text(row["SystemID"]) or "Unknown"
            system_name = _safe_text(row["SystemName"]) or system_id or "Unknown"
            display_name = filename or title_name or path

            entries.append(
                {
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
                }
            )

            if progress_callback and (scanned % 500 == 0 or scanned == total):
                progress_callback(scanned)

        return entries

    except ZaparooApiError:
        raise
    except RuntimeError as e:
        if str(e) == "__LOAD_CANCELLED__":
            raise
        raise ZaparooApiError(f"Could not read media.db:\n{e}") from e
    except Exception as e:
        raise ZaparooApiError(f"Could not read media.db:\n{e}") from e
    finally:
        try:
            db.close()
        except Exception:
            pass

def fetch_media_from_db_cache(
    connection,
    local_path: Path,
    progress_callback=None,
) -> list[dict]:
    """
    Download media.db from MiSTer and read it into ZapScripts-compatible entries.
    """
    download_media_db(connection, local_path)
    return read_media_db_entries(local_path, progress_callback=progress_callback)


def list_scripts(connection) -> list[dict]:
    """
    Return all .sh files in /media/fat/Scripts as launcher entries.
    """
    if not connection.is_connected():
        return []

    output = connection.run_command(
        r'find /media/fat/Scripts -maxdepth 1 -type f -name "*.sh" | sort'
    )

    scripts = []
    for line in (output or "").splitlines():
        path = line.strip()
        if not path:
            continue

        filename = Path(path).name
        scripts.append(
            {
                "name": filename,
                "filename": filename,
                "path": path,
                "system": "Scripts",
                "type": "script",
            }
        )

    return scripts


def _normalize_zaparoo_launch_text(command: str) -> str:
    command = _safe_text(command).strip()
    if not command:
        return ""

    # media.search returns @System/Title style ZapScripts. The run method
    # accepts that text directly.
    if command.startswith("@"):
        return command

    # Existing explicit ZapScript commands should be sent as-is.
    if command.startswith("**"):
        return command

    # Bare absolute paths are launch commands.
    if command.startswith("/"):
        return f"**launch:{command}"

    return command


def _media_search_for_zapscript(connection, item: dict, timeout: int = 5) -> str:
    """
    Resolve an exact Zaparoo launch script from the live media API.

    Local media.db cache rows do not always include the same zapScript field
    returned by the Zaparoo media.search API. When the API is available, ask it
    for the selected item and prefer its canonical zapScript string.
    """
    if not item:
        return ""

    search_terms = []
    for key in ("title_name", "name", "filename"):
        value = _safe_text(item.get(key)).strip()
        if value and value not in search_terms:
            search_terms.append(value)

    # Trim extensions for better search matching.
    filename = _safe_text(item.get("filename") or item.get("name")).strip()
    if filename:
        stem = Path(filename).stem.strip()
        if stem and stem not in search_terms:
            search_terms.append(stem)

    path = _safe_text(item.get("path")).strip()
    system_id = _safe_text(item.get("system_id") or item.get("systemId")).strip()

    candidates = []
    seen = set()

    def add_candidate(candidate):
        if not isinstance(candidate, dict):
            return
        zap_script = _safe_text(candidate.get("zapScript") or candidate.get("zap_script")).strip()
        if not zap_script or zap_script in seen:
            return
        seen.add(zap_script)
        candidates.append((candidate, zap_script))

    for term in search_terms[:4]:
        params = {
            "query": term,
            "maxResults": 75,
            "fuzzySystem": True,
        }
        if system_id:
            params["systems"] = [system_id]

        payload = {
            "jsonrpc": "2.0",
            "method": "media.search",
            "params": params,
            "id": 1,
        }

        try:
            response = _send_ws_payload(connection, payload, timeout=timeout)
        except Exception:
            continue

        result = response.get("result", {}) if isinstance(response, dict) else {}
        for candidate in result.get("results", []) or []:
            add_candidate(candidate)

        if candidates:
            break

    if not candidates:
        return ""

    def score(candidate: dict) -> int:
        score_value = 0
        candidate_path = _safe_text(candidate.get("path")).strip()
        candidate_relative = _safe_text(candidate.get("relativePath")).strip()
        candidate_name = _safe_text(candidate.get("name")).strip()
        candidate_system = candidate.get("system") if isinstance(candidate.get("system"), dict) else {}
        candidate_system_id = _safe_text(candidate_system.get("id")).strip()

        if path and candidate_path == path:
            score_value += 1000
        elif path and candidate_relative and path.endswith(candidate_relative):
            score_value += 600
        elif path and candidate_path and path.endswith(candidate_path):
            score_value += 500

        if system_id and candidate_system_id and system_id.lower() == candidate_system_id.lower():
            score_value += 150

        for term in search_terms:
            if term and candidate_name.lower() == term.lower():
                score_value += 100
                break

        return score_value

    candidates.sort(key=lambda pair: score(pair[0]), reverse=True)
    return candidates[0][1]


def _launch_candidates_for_item(connection, item: dict, timeout: int = 5) -> list[str]:
    commands = []

    def add(command):
        command = _normalize_zaparoo_launch_text(command)
        if command and command not in commands:
            commands.append(command)

    add(item.get("zapScript") or item.get("zap_script"))

    # Prefer the canonical ZapScript returned by the live API when possible.
    # This avoids weak local reconstructions from media.db cache rows.
    add(_media_search_for_zapscript(connection, item, timeout=timeout))

    path = _safe_text(item.get("path")).strip()
    if path:
        add(f"**launch:{path}")

    system_id = _safe_text(item.get("system_id") or item.get("systemId")).strip()
    title = _safe_text(item.get("title_name") or item.get("name") or item.get("filename")).strip()
    if system_id and title:
        add(f"@{system_id}/{Path(title).stem}")

    return commands


def launch_media(connection, item: dict, timeout: int = 5):
    """
    Launch a cached media item or script item.

    Local ZapScripts library rows are read from media.db, but the safest launch
    text comes from the live Zaparoo API. Try canonical zapScript first, then
    path/title fallbacks.
    """
    item_type = (item or {}).get("type", "").strip().lower()

    if item_type == "script":
        script_name = (
            item.get("filename")
            or item.get("name")
            or Path(item.get("path", "")).name
        )
        return run_script(connection, script_name, timeout=timeout)

    commands = _launch_candidates_for_item(connection, item or {}, timeout=timeout)
    if not commands:
        raise ZaparooApiError("Selected item does not contain launchable data.")

    errors = []
    for command in commands:
        try:
            response = run_zaparoo_command(connection, command, timeout=timeout)
            return {
                "command": command,
                "response": response,
                "tried": commands,
            }
        except Exception as exc:
            errors.append(f"{command}: {_compact_api_error(exc)}")

    raise ZaparooApiError("; ".join(errors) or "Could not launch selected item.")


def get_zapscripts_state(connection) -> dict:
    if not connection.is_connected():
        return {
            "zaparoo_installed": False,
            "zaparoo_service_enabled": False,
            "zaparoo_service_running": False,
            "zaparoo_port_listening": False,
        }

    output = connection.run_command("""sh -lc '
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
'""")
    values = {}
    for line in str(output or "").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    port_value = values.get("port")
    port_listening = True if port_value == "yes" else False if port_value == "no" else None
    return {
        "zaparoo_installed": values.get("installed") == "yes",
        "zaparoo_service_enabled": values.get("startup") == "yes",
        "zaparoo_service_running": bool(port_listening is True),
        "zaparoo_port_listening": port_listening,
        "zaparoo_script_path": values.get("script_path") or "",
    }
