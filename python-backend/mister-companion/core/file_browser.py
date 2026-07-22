import os
import posixpath
import shlex
import shutil
import stat
import uuid
from pathlib import Path

SAFE_ROOTS = ["/media/fat", "/media/usb0"]
DEFAULT_ROOT = "/media/fat"
USB_ROOT = "/media/usb0"
TRASH_DIR_NAME = ".mister-companion-trash"


class TransferCancelled(Exception):
    pass


def _check_cancel(cancel_callback):
    if cancel_callback and cancel_callback():
        raise TransferCancelled("File operation cancelled.")


def normalize_remote_path(path):
    path = str(path or DEFAULT_ROOT).replace("\\", "/").strip()
    if not path.startswith("/"):
        path = "/" + path
    normalized = posixpath.normpath(path)
    if normalized == ".":
        normalized = DEFAULT_ROOT
    return normalized


def root_for_path(path):
    path = normalize_remote_path(path)
    matches = [root for root in SAFE_ROOTS if path == root or path.startswith(root + "/")]
    if not matches:
        return ""
    return max(matches, key=len)


def is_safe_path(path):
    return bool(root_for_path(path))


def clamp_to_root(path, fallback=DEFAULT_ROOT):
    path = normalize_remote_path(path)
    if is_safe_path(path):
        return path
    return fallback


def require_safe_path(path):
    """Return a normalized MiSTer storage path or fail closed.

    `clamp_to_root` remains useful for harmless UI defaults, but mutation paths
    must never turn malformed input into `/media/fat` implicitly.
    """
    normalized = normalize_remote_path(path)
    if not is_safe_path(normalized):
        raise ValueError("Path must stay inside /media/fat or /media/usb0.")
    return normalized


def _path_is_within(path, root):
    path = normalize_remote_path(path)
    root = normalize_remote_path(root)
    return path == root or path.startswith(root.rstrip("/") + "/")


def validate_remote_path(sftp, path, allow_missing=False):
    """Reject lexical and symlink escapes from the supported storage roots."""
    path = require_safe_path(path)
    root = root_for_path(path)
    canonical_root = normalize_remote_path(sftp.normalize(root))

    existing = path
    if allow_missing:
        while not sftp_exists(sftp, existing):
            parent = posixpath.dirname(existing.rstrip("/")) or "/"
            if parent == existing or not _path_is_within(parent, root):
                existing = root
                break
            existing = parent

    canonical_existing = normalize_remote_path(sftp.normalize(existing))
    relative = posixpath.relpath(path, existing)
    canonical_path = canonical_existing if relative == "." else normalize_remote_path(
        posixpath.join(canonical_existing, relative)
    )
    if not _path_is_within(canonical_path, canonical_root):
        raise ValueError("Path resolves outside the selected MiSTer storage root.")
    return path


def parent_path(path):
    path = normalize_remote_path(path)
    root = root_for_path(path)
    if not root or path == root:
        return path
    parent = posixpath.dirname(path.rstrip("/"))
    if parent == "/":
        return root
    if not (parent == root or parent.startswith(root + "/")):
        return root
    return parent


def join_remote_path(base, name):
    base = normalize_remote_path(base)
    name = str(name or "").replace("\\", "/").strip("/")
    return normalize_remote_path(posixpath.join(base, name))


def format_size(size):
    try:
        size = int(size)
    except Exception:
        return ""

    if size < 1024:
        return f"{size} B"

    units = ["KB", "MB", "GB", "TB"]
    value = float(size)
    for unit in units:
        value /= 1024.0
        if value < 1024.0 or unit == units[-1]:
            if value >= 100:
                return f"{value:.0f} {unit}"
            if value >= 10:
                return f"{value:.1f} {unit}"
            return f"{value:.2f} {unit}"

    return f"{size} B"


def local_path_size(local_path):
    path = Path(local_path)
    if path.is_file() or path.is_symlink():
        return int(path.stat().st_size or 0)
    return sum(int(item.stat().st_size or 0) for item in path.rglob("*") if item.is_file())


def remote_paths_size(connection, remote_paths, cancel_callback=None):
    sftp = connection.client.open_sftp()
    try:
        def measure(path):
            _check_cancel(cancel_callback)
            attr = getattr(sftp, "lstat", sftp.stat)(path)
            if not stat.S_ISDIR(attr.st_mode):
                return int(attr.st_size or 0)
            total = 0
            for child in sftp.listdir_attr(path):
                if child.filename not in {".", ".."}:
                    total += measure(join_remote_path(path, child.filename))
            return total

        return [measure(require_safe_path(path)) for path in remote_paths]
    finally:
        sftp.close()


def available_space(connection, remote_path):
    """Return the free space for the mounted volume containing remote_path."""
    remote_path = clamp_to_root(remote_path)
    volume_root = root_for_path(remote_path) or DEFAULT_ROOT
    try:
        output = connection.run_command(
            f"df -k {shlex.quote(volume_root)} 2>/dev/null | tail -1"
        ) or ""
        fields = str(output).strip().split()
        available_bytes = int(fields[3]) * 1024 if len(fields) >= 4 else 0
    except Exception:
        available_bytes = 0

    return {
        "availableBytes": available_bytes,
        "availableLabel": format_size(available_bytes) if available_bytes > 0 else "",
    }


def sftp_exists(sftp, path):
    try:
        getattr(sftp, "lstat", sftp.stat)(path)
        return True
    except Exception:
        return False


def _remote_staging_path(target_path, purpose="part"):
    parent = posixpath.dirname(target_path.rstrip("/"))
    name = posixpath.basename(target_path.rstrip("/")) or "item"
    return posixpath.join(parent, f".{name}.mce-{purpose}-{uuid.uuid4().hex}")


def _is_internal_transfer_name(name):
    return name == TRASH_DIR_NAME or (
        name.startswith(".") and (".mce-part-" in name or ".mce-backup-" in name)
    )


def available_remote_name(sftp, target_dir, desired_name):
    """Return desired_name or a Finder-style non-conflicting sibling name."""
    desired_name = posixpath.basename(str(desired_name or "").strip())
    if not desired_name:
        raise ValueError("Destination name is required.")
    target = join_remote_path(target_dir, desired_name)
    if not sftp_exists(sftp, target):
        return desired_name
    stem, suffix = posixpath.splitext(desired_name)
    for index in range(1, 10000):
        marker = " copy" if index == 1 else f" copy {index}"
        candidate = f"{stem}{marker}{suffix}"
        if not sftp_exists(sftp, join_remote_path(target_dir, candidate)):
            return candidate
    raise FileExistsError(f"Could not find an available name for {desired_name}.")


def _remove_remote_if_exists(sftp, path):
    if sftp_exists(sftp, path):
        delete_path_with_sftp(sftp, path)


def _verify_remote_file_size(sftp, path, expected_size):
    actual_size = int(sftp.stat(path).st_size or 0)
    expected_size = int(expected_size or 0)
    if actual_size != expected_size:
        raise OSError(
            f"Transfer verification failed for {posixpath.basename(path)}: "
            f"expected {expected_size} bytes, received {actual_size}."
        )


def _verify_local_file_size(path, expected_size):
    actual_size = Path(path).stat().st_size
    expected_size = int(expected_size or 0)
    if actual_size != expected_size:
        raise OSError(
            f"Transfer verification failed for {Path(path).name}: "
            f"expected {expected_size} bytes, received {actual_size}."
        )


def _commit_remote_staged_path(sftp, staged_path, target_path, overwrite=False):
    """Atomically expose a fully-written sibling path at target_path.

    Existing content is first renamed to a private backup and is restored if
    the staged rename fails. This avoids deleting a good destination before a
    replacement transfer has completed.
    """
    backup_path = ""
    target_exists = sftp_exists(sftp, target_path)
    if target_exists and not overwrite:
        raise FileExistsError(f"Target already exists: {target_path}")
    if target_exists:
        backup_path = _remote_staging_path(target_path, "backup")
        sftp.rename(target_path, backup_path)
    try:
        sftp.rename(staged_path, target_path)
    except Exception:
        if backup_path and sftp_exists(sftp, backup_path) and not sftp_exists(sftp, target_path):
            sftp.rename(backup_path, target_path)
        raise
    if backup_path:
        try:
            _remove_remote_if_exists(sftp, backup_path)
        except Exception:
            # The committed target is valid. A hidden backup is safer than
            # reporting a failed transfer after the atomic swap succeeded.
            pass


def _local_staging_path(target, purpose="part"):
    target = Path(target)
    return target.parent / f".{target.name}.mce-{purpose}-{uuid.uuid4().hex}"


def _remove_local_if_exists(path):
    path = Path(path)
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def _commit_local_staged_path(staged, target, overwrite=False):
    staged = Path(staged)
    target = Path(target)
    backup = None
    if target.exists() or target.is_symlink():
        if not overwrite:
            raise FileExistsError(f"Target already exists: {target}")
        backup = _local_staging_path(target, "backup")
        target.rename(backup)
    try:
        staged.replace(target)
    except Exception:
        if backup and backup.exists() and not target.exists():
            backup.rename(target)
        raise
    if backup:
        try:
            _remove_local_if_exists(backup)
        except Exception:
            pass


def remote_exists(connection, path):
    path = require_safe_path(path)
    sftp = connection.client.open_sftp()
    try:
        validate_remote_path(sftp, path, allow_missing=True)
        return sftp_exists(sftp, path)
    finally:
        sftp.close()


def available_roots(connection):
    sftp = connection.client.open_sftp()
    try:
        roots = [{"name": "SD Card", "path": DEFAULT_ROOT, "available": sftp_exists(sftp, DEFAULT_ROOT)}]
        if sftp_exists(sftp, USB_ROOT):
            roots.append({"name": "USB Drive", "path": USB_ROOT, "available": True})
        return roots
    finally:
        sftp.close()


def list_directory(connection, remote_path):
    remote_path = require_safe_path(remote_path)
    sftp = connection.client.open_sftp()
    try:
        validate_remote_path(sftp, remote_path)
        entries = []
        for attr in sftp.listdir_attr(remote_path):
            name = attr.filename
            if name in {".", ".."} or _is_internal_transfer_name(name):
                continue

            is_dir = stat.S_ISDIR(attr.st_mode)
            item_path = join_remote_path(remote_path, name)
            entries.append(
                {
                    "name": name,
                    "path": item_path,
                    "is_dir": is_dir,
                    "type": "Folder" if is_dir else "File",
                    "size": int(attr.st_size or 0),
                    "mtime": int(attr.st_mtime or 0),
                }
            )

        entries.sort(key=lambda item: (not item["is_dir"], item["name"].lower()))
        return {
            "path": remote_path,
            "entries": entries,
            **available_space(connection, remote_path),
        }
    finally:
        sftp.close()


def ensure_remote_dir(sftp, remote_dir):
    remote_dir = normalize_remote_path(remote_dir)
    parts = [part for part in remote_dir.split("/") if part]
    current = ""
    for part in parts:
        current += "/" + part
        try:
            sftp.stat(current)
        except Exception:
            sftp.mkdir(current)


def upload_path(connection, local_path, remote_dir, progress_callback=None, message_callback=None, target_name=None, overwrite=False, cancel_callback=None):
    local_path = Path(local_path)
    if not local_path.exists():
        raise FileNotFoundError(f"Local source does not exist: {local_path}")
    remote_dir = require_safe_path(remote_dir)
    sftp = connection.client.open_sftp()
    staged_path = ""
    try:
        _check_cancel(cancel_callback)
        validate_remote_path(sftp, remote_dir)
        name = target_name or local_path.name
        if not name or Path(name).name != name:
            raise ValueError("Upload target must be a single file or folder name.")
        target_path = join_remote_path(remote_dir, name)
        validate_remote_path(sftp, target_path, allow_missing=True)
        if sftp_exists(sftp, target_path) and not overwrite:
            raise FileExistsError(f"Target already exists: {target_path}")
        staged_path = _remote_staging_path(target_path)

        if local_path.is_dir():
            upload_folder(sftp, local_path, staged_path, progress_callback, message_callback, cancel_callback)
        else:
            if message_callback:
                message_callback(f"Uploading {local_path.name}...")
            def upload_progress(transferred, total):
                _check_cancel(cancel_callback)
                if progress_callback:
                    progress_callback(transferred, total)
            sftp.put(str(local_path), staged_path, callback=upload_progress)
            _verify_remote_file_size(sftp, staged_path, local_path.stat().st_size)

        _commit_remote_staged_path(sftp, staged_path, target_path, overwrite=overwrite)
        staged_path = ""
        return target_path
    except Exception:
        if staged_path:
            try:
                _remove_remote_if_exists(sftp, staged_path)
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def upload_folder(sftp, local_folder, remote_folder, progress_callback=None, message_callback=None, cancel_callback=None):
    ensure_remote_dir(sftp, remote_folder)
    for root, dirs, files in os.walk(local_folder):
        _check_cancel(cancel_callback)
        root_path = Path(root)
        relative = root_path.relative_to(local_folder)
        current_remote = remote_folder if str(relative) == "." else join_remote_path(remote_folder, str(relative).replace(os.sep, "/"))
        ensure_remote_dir(sftp, current_remote)

        for dirname in dirs:
            ensure_remote_dir(sftp, join_remote_path(current_remote, dirname))

        for filename in files:
            _check_cancel(cancel_callback)
            local_file = root_path / filename
            remote_file = join_remote_path(current_remote, filename)
            if message_callback:
                message_callback(f"Uploading {local_file.name}...")
            def upload_progress(transferred, total):
                _check_cancel(cancel_callback)
                if progress_callback:
                    progress_callback(transferred, total)
            sftp.put(str(local_file), remote_file, callback=upload_progress)
            _verify_remote_file_size(sftp, remote_file, local_file.stat().st_size)


def download_path(connection, remote_path, local_dir, progress_callback=None, message_callback=None, target_name=None, overwrite=False, cancel_callback=None):
    remote_path = require_safe_path(remote_path)
    local_dir = Path(local_dir)
    local_dir.mkdir(parents=True, exist_ok=True)
    sftp = connection.client.open_sftp()
    staged_target = None
    try:
        _check_cancel(cancel_callback)
        validate_remote_path(sftp, remote_path)
        attr = sftp.stat(remote_path)
        name = target_name or posixpath.basename(remote_path.rstrip("/"))
        if not name or Path(name).name != name:
            raise ValueError("Download target must be a single file or folder name.")
        target = local_dir / name
        if (target.exists() or target.is_symlink()) and not overwrite:
            raise FileExistsError(f"Target already exists: {target}")
        staged_target = _local_staging_path(target)

        if stat.S_ISDIR(attr.st_mode):
            download_folder(sftp, remote_path, staged_target, progress_callback, message_callback, cancel_callback)
        else:
            if message_callback:
                message_callback(f"Downloading {name}...")
            def download_progress(transferred, total):
                _check_cancel(cancel_callback)
                if progress_callback:
                    progress_callback(transferred, total)
            sftp.get(remote_path, str(staged_target), callback=download_progress)
            _verify_local_file_size(staged_target, attr.st_size)
        _commit_local_staged_path(staged_target, target, overwrite=overwrite)
        staged_target = None
        return str(target)
    except Exception:
        if staged_target is not None:
            try:
                _remove_local_if_exists(staged_target)
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def download_folder(sftp, remote_folder, local_folder, progress_callback=None, message_callback=None, cancel_callback=None):
    local_folder = Path(local_folder)
    local_folder.mkdir(parents=True, exist_ok=True)
    for attr in sftp.listdir_attr(remote_folder):
        _check_cancel(cancel_callback)
        name = attr.filename
        if name in {".", ".."}:
            continue
        remote_item = join_remote_path(remote_folder, name)
        validate_remote_path(sftp, remote_item)
        local_item = local_folder / name
        if stat.S_ISDIR(attr.st_mode):
            download_folder(sftp, remote_item, local_item, progress_callback, message_callback, cancel_callback)
        else:
            if message_callback:
                message_callback(f"Downloading {name}...")
            def download_progress(transferred, total):
                _check_cancel(cancel_callback)
                if progress_callback:
                    progress_callback(transferred, total)
            sftp.get(remote_item, str(local_item), callback=download_progress)
            _verify_local_file_size(local_item, attr.st_size)


def make_directory(connection, remote_path):
    remote_path = require_safe_path(remote_path)
    sftp = connection.client.open_sftp()
    try:
        validate_remote_path(sftp, remote_path, allow_missing=True)
        sftp.mkdir(remote_path)
    finally:
        sftp.close()


def rename_path(connection, old_path, new_path, overwrite=False):
    old_path = require_safe_path(old_path)
    new_path = require_safe_path(new_path)
    if root_for_path(old_path) != root_for_path(new_path):
        raise ValueError("Items cannot be moved outside the selected storage root.")
    if old_path == root_for_path(old_path):
        raise ValueError("The storage root cannot be renamed.")
    sftp = connection.client.open_sftp()
    try:
        validate_remote_path(sftp, old_path)
        validate_remote_path(sftp, new_path, allow_missing=True)
        _commit_remote_staged_path(sftp, old_path, new_path, overwrite=overwrite)
    finally:
        sftp.close()


def trash_paths(connection, remote_paths, progress_callback=None, cancel_callback=None):
    """Move items into a hidden, same-volume trash batch for later restore."""
    paths = [require_safe_path(path) for path in remote_paths]
    if not paths:
        return []
    batch_id = uuid.uuid4().hex
    sftp = connection.client.open_sftp()
    moved = []
    try:
        for index, source_path in enumerate(paths, start=1):
            _check_cancel(cancel_callback)
            root = root_for_path(source_path)
            if source_path == root:
                raise ValueError("The storage root cannot be moved to Trash.")
            validate_remote_path(sftp, source_path)
            trash_root = join_remote_path(root, TRASH_DIR_NAME)
            batch_dir = join_remote_path(trash_root, batch_id)
            ensure_remote_dir(sftp, batch_dir)
            name = available_remote_name(sftp, batch_dir, posixpath.basename(source_path.rstrip("/")))
            trash_path = join_remote_path(batch_dir, name)
            sftp.rename(source_path, trash_path)
            moved.append({
                "originalPath": source_path,
                "trashPath": trash_path,
                "name": posixpath.basename(source_path.rstrip("/")),
                "batchId": batch_id,
            })
            if progress_callback:
                progress_callback(index, len(paths))
        return moved
    except Exception:
        for item in reversed(moved):
            try:
                if sftp_exists(sftp, item["trashPath"]) and not sftp_exists(sftp, item["originalPath"]):
                    sftp.rename(item["trashPath"], item["originalPath"])
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def restore_trash_items(connection, items, conflict_policy="keepBoth", progress_callback=None, cancel_callback=None):
    """Restore a prior trash batch, preserving new files by default."""
    policy = str(conflict_policy or "keepBoth").strip().lower()
    if policy not in {"keepboth", "replace", "skip"}:
        raise ValueError("Unsupported restore conflict policy.")
    sftp = connection.client.open_sftp()
    restored = []
    try:
        values = list(items or [])
        for index, raw_item in enumerate(values, start=1):
            _check_cancel(cancel_callback)
            original_path = require_safe_path(raw_item.get("originalPath"))
            trash_path = require_safe_path(raw_item.get("trashPath"))
            root = root_for_path(trash_path)
            trash_root = join_remote_path(root, TRASH_DIR_NAME)
            if not _path_is_within(trash_path, trash_root):
                raise ValueError("Restore source is not inside MiSTer Companion Trash.")
            validate_remote_path(sftp, trash_path)
            validate_remote_path(sftp, original_path, allow_missing=True)
            target_path = original_path
            if sftp_exists(sftp, target_path):
                if policy == "skip":
                    continue
                if policy == "keepboth":
                    parent = parent_path(target_path)
                    name = available_remote_name(sftp, parent, posixpath.basename(target_path))
                    target_path = join_remote_path(parent, name)
            _commit_remote_staged_path(
                sftp,
                trash_path,
                target_path,
                overwrite=policy == "replace",
            )
            restored.append({**raw_item, "restoredPath": target_path})
            if progress_callback:
                progress_callback(index, len(values))
        return restored
    except Exception:
        for item in reversed(restored):
            try:
                restored_path = item.get("restoredPath")
                trash_path = item.get("trashPath")
                if restored_path and trash_path and sftp_exists(sftp, restored_path) and not sftp_exists(sftp, trash_path):
                    ensure_remote_dir(sftp, posixpath.dirname(trash_path))
                    sftp.rename(restored_path, trash_path)
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def copy_path(connection, source_path, target_dir, target_name=None, overwrite=False, progress_callback=None, message_callback=None, cancel_callback=None):
    source_path = require_safe_path(source_path)
    target_dir = require_safe_path(target_dir)
    source_root = root_for_path(source_path)
    target_root = root_for_path(target_dir)
    if not source_root or not target_root:
        raise ValueError("Source and destination must be inside MiSTer storage.")

    sftp = connection.client.open_sftp()
    staged_path = ""
    try:
        _check_cancel(cancel_callback)
        validate_remote_path(sftp, source_path)
        validate_remote_path(sftp, target_dir)
        attr = sftp.stat(source_path)
        name = target_name or posixpath.basename(source_path.rstrip("/"))
        if not name or posixpath.basename(name) != name:
            raise ValueError("Copy target must be a single file or folder name.")
        target_path = join_remote_path(target_dir, name)
        validate_remote_path(sftp, target_path, allow_missing=True)
        if source_path == target_path:
            raise ValueError("Source and destination are the same.")
        if stat.S_ISDIR(attr.st_mode) and _path_is_within(target_dir, source_path):
            raise ValueError("A folder cannot be copied into itself or one of its descendants.")
        if sftp_exists(sftp, target_path) and not overwrite:
            raise FileExistsError(f"Target already exists: {target_path}")
        staged_path = _remote_staging_path(target_path)
        if stat.S_ISDIR(attr.st_mode):
            copy_folder_with_sftp(sftp, source_path, staged_path, progress_callback, message_callback, cancel_callback)
        else:
            copy_file_with_sftp(sftp, source_path, staged_path, progress_callback, message_callback, cancel_callback)
        _commit_remote_staged_path(sftp, staged_path, target_path, overwrite=overwrite)
        staged_path = ""
        return target_path
    except Exception:
        if staged_path:
            try:
                _remove_remote_if_exists(sftp, staged_path)
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def move_path(connection, source_path, target_dir, target_name=None, overwrite=False, progress_callback=None, message_callback=None, cancel_callback=None):
    source_path = require_safe_path(source_path)
    target_dir = require_safe_path(target_dir)
    source_root = root_for_path(source_path)
    target_root = root_for_path(target_dir)
    if not source_root or not target_root:
        raise ValueError("Source and destination must be inside MiSTer storage.")
    if source_path == source_root:
        raise ValueError("The storage root cannot be moved.")

    sftp = connection.client.open_sftp()
    staged_path = ""
    try:
        _check_cancel(cancel_callback)
        validate_remote_path(sftp, source_path)
        validate_remote_path(sftp, target_dir)
        name = target_name or posixpath.basename(source_path.rstrip("/"))
        if not name or posixpath.basename(name) != name:
            raise ValueError("Move target must be a single file or folder name.")
        target_path = join_remote_path(target_dir, name)
        validate_remote_path(sftp, target_path, allow_missing=True)
        if source_path == target_path:
            raise ValueError("Source and destination are the same.")
        attr = sftp.stat(source_path)
        if stat.S_ISDIR(attr.st_mode) and _path_is_within(target_dir, source_path):
            raise ValueError("A folder cannot be moved into itself or one of its descendants.")
        if source_root == target_root:
            _commit_remote_staged_path(sftp, source_path, target_path, overwrite=overwrite)
            return target_path

        if sftp_exists(sftp, target_path) and not overwrite:
            raise FileExistsError(f"Target already exists: {target_path}")
        staged_path = _remote_staging_path(target_path)
        if stat.S_ISDIR(attr.st_mode):
            copy_folder_with_sftp(sftp, source_path, staged_path, progress_callback, message_callback, cancel_callback)
        else:
            copy_file_with_sftp(sftp, source_path, staged_path, progress_callback, message_callback, cancel_callback)
        _commit_remote_staged_path(sftp, staged_path, target_path, overwrite=overwrite)
        staged_path = ""
        delete_path_with_sftp(sftp, source_path)
        return target_path
    except Exception:
        if staged_path:
            try:
                _remove_remote_if_exists(sftp, staged_path)
            except Exception:
                pass
        raise
    finally:
        sftp.close()


def copy_file_with_sftp(sftp, source_path, target_path, progress_callback=None, message_callback=None, cancel_callback=None):
    _check_cancel(cancel_callback)
    if message_callback:
        message_callback(f"Copying {posixpath.basename(source_path)}...")
    attr = sftp.stat(source_path)
    total = int(attr.st_size or 0)
    transferred = 0
    with sftp.open(source_path, "rb") as source_file:
        with sftp.open(target_path, "wb") as target_file:
            while True:
                _check_cancel(cancel_callback)
                chunk = source_file.read(1024 * 1024)
                if not chunk:
                    break
                target_file.write(chunk)
                transferred += len(chunk)
                if progress_callback:
                    progress_callback(transferred, total)
    _verify_remote_file_size(sftp, target_path, total)


def copy_folder_with_sftp(sftp, source_folder, target_folder, progress_callback=None, message_callback=None, cancel_callback=None):
    _check_cancel(cancel_callback)
    ensure_remote_dir(sftp, target_folder)
    for attr in sftp.listdir_attr(source_folder):
        _check_cancel(cancel_callback)
        name = attr.filename
        if name in {".", ".."}:
            continue
        source_item = join_remote_path(source_folder, name)
        validate_remote_path(sftp, source_item)
        target_item = join_remote_path(target_folder, name)
        if stat.S_ISDIR(attr.st_mode):
            copy_folder_with_sftp(sftp, source_item, target_item, progress_callback, message_callback, cancel_callback)
        else:
            copy_file_with_sftp(sftp, source_item, target_item, progress_callback, message_callback, cancel_callback)


def delete_path(connection, remote_path):
    remote_path = require_safe_path(remote_path)
    root = root_for_path(remote_path)
    if not root or remote_path == root:
        raise ValueError("The storage root cannot be deleted.")
    sftp = connection.client.open_sftp()
    try:
        validate_remote_path(sftp, remote_path)
        delete_path_with_sftp(sftp, remote_path)
    finally:
        sftp.close()


def delete_path_with_sftp(sftp, remote_path):
    # Never follow a symlink while deleting recursively. Removing the link is
    # safe; traversing its target could escape the selected storage tree.
    attr = getattr(sftp, "lstat", sftp.stat)(remote_path)
    if stat.S_ISDIR(attr.st_mode):
        for child in sftp.listdir_attr(remote_path):
            if child.filename in {".", ".."}:
                continue
            delete_path_with_sftp(sftp, join_remote_path(remote_path, child.filename))
        sftp.rmdir(remote_path)
    else:
        sftp.remove(remote_path)
