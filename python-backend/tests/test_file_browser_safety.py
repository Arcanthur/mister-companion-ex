import importlib.util
import io
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "mister-companion"
    / "core"
    / "file_browser.py"
)
sys.path.insert(0, str(MODULE_PATH.parents[1]))
SPEC = importlib.util.spec_from_file_location("file_browser_safety", MODULE_PATH)
file_browser = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(file_browser)


class FakeAttr:
    def __init__(self, mode, size=0, filename=""):
        self.st_mode = mode
        self.st_size = size
        self.st_mtime = 0
        self.filename = filename


class FakeSftp:
    def __init__(self, paths=None, symlinks=None):
        self.paths = dict(paths or {})
        self.symlinks = dict(symlinks or {})
        self.fail_put = False
        self.truncate_put = False
        self.fail_get = False
        self.fail_write = False
        self.fail_commit_target = ""
        self.closed = False

    def close(self):
        self.closed = True

    def normalize(self, path):
        path = file_browser.normalize_remote_path(path)
        for link, target in sorted(self.symlinks.items(), key=lambda item: len(item[0]), reverse=True):
            if path == link or path.startswith(link + "/"):
                suffix = path[len(link):]
                return file_browser.normalize_remote_path(target + suffix)
        return path

    def lstat(self, path):
        path = file_browser.normalize_remote_path(path)
        if path in self.symlinks:
            return FakeAttr(stat.S_IFLNK)
        return self._attr(path)

    def stat(self, path):
        return self._attr(self.normalize(path))

    def _attr(self, path):
        if path not in self.paths:
            raise FileNotFoundError(path)
        value = self.paths[path]
        if value is None:
            return FakeAttr(stat.S_IFDIR)
        return FakeAttr(stat.S_IFREG, len(value))

    def put(self, local_path, remote_path, callback=None):
        data = Path(local_path).read_bytes()
        if self.fail_put:
            self.paths[remote_path] = data[: max(1, len(data) // 2)]
            raise OSError("simulated upload interruption")
        self.paths[remote_path] = data[: max(1, len(data) // 2)] if self.truncate_put else data
        if callback:
            callback(len(data), len(data))

    def get(self, remote_path, local_path, callback=None):
        data = self.paths[self.normalize(remote_path)]
        Path(local_path).write_bytes(data[: max(1, len(data) // 2)] if self.fail_get else data)
        if self.fail_get:
            raise OSError("simulated download interruption")
        if callback:
            callback(len(data), len(data))

    def open(self, path, mode):
        if "r" in mode:
            return io.BytesIO(self.paths[self.normalize(path)])
        sftp = self

        class RemoteWriter(io.BytesIO):
            def write(self, data):
                if sftp.fail_write:
                    super().write(data[: max(1, len(data) // 2)])
                    sftp.paths[path] = self.getvalue()
                    raise OSError("simulated remote write interruption")
                return super().write(data)

            def close(self):
                if not self.closed:
                    sftp.paths[path] = self.getvalue()
                super().close()

        return RemoteWriter()

    def rename(self, source, target):
        if target == self.fail_commit_target and ".mce-part-" in source:
            raise OSError("simulated atomic rename failure")
        if source not in self.paths:
            raise FileNotFoundError(source)
        moved = {
            path: value
            for path, value in self.paths.items()
            if path == source or path.startswith(source.rstrip("/") + "/")
        }
        for path in moved:
            del self.paths[path]
        for path, value in moved.items():
            self.paths[target + path[len(source):]] = value

    def remove(self, path):
        del self.paths[path]

    def rmdir(self, path):
        prefix = path.rstrip("/") + "/"
        if any(item.startswith(prefix) for item in self.paths if item != path):
            raise OSError("directory is not empty")
        del self.paths[path]

    def mkdir(self, path):
        if path in self.paths:
            raise FileExistsError(path)
        self.paths[path] = None

    def listdir_attr(self, path):
        prefix = path.rstrip("/") + "/"
        children = []
        for candidate, value in self.paths.items():
            if not candidate.startswith(prefix):
                continue
            relative = candidate[len(prefix):]
            if not relative or "/" in relative:
                continue
            mode = stat.S_IFDIR if value is None else stat.S_IFREG
            children.append(FakeAttr(mode, 0 if value is None else len(value), relative))
        return children


class FakeConnection:
    def __init__(self, sftp):
        self.client = self
        self.sftp = sftp

    def open_sftp(self):
        return self.sftp


class FileBrowserSafetyTests(unittest.TestCase):
    def test_mutation_paths_fail_closed(self):
        self.assertEqual(file_browser.require_safe_path("/media/fat/games"), "/media/fat/games")
        self.assertEqual(file_browser.require_safe_path("/media/usb0"), "/media/usb0")
        with self.assertRaises(ValueError):
            file_browser.require_safe_path("/etc")
        with self.assertRaises(ValueError):
            file_browser.require_safe_path("/media/fat/../../etc")

    def test_symlink_escape_is_rejected(self):
        sftp = FakeSftp(
            paths={"/media/fat": None, "/etc": None, "/etc/passwd": b"secret"},
            symlinks={"/media/fat/outside": "/etc"},
        )
        with self.assertRaisesRegex(ValueError, "resolves outside"):
            file_browser.validate_remote_path(sftp, "/media/fat/outside/passwd")

    def test_interrupted_upload_preserves_existing_destination(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"original"})
        sftp.fail_put = True
        with tempfile.TemporaryDirectory() as directory:
            local = Path(directory) / "game.rom"
            local.write_bytes(b"replacement-data")
            with self.assertRaisesRegex(OSError, "upload interruption"):
                file_browser.upload_path(FakeConnection(sftp), local, "/media/fat", overwrite=True)

        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"original")
        self.assertFalse(any(".mce-part-" in path for path in sftp.paths))

    def test_failed_atomic_swap_restores_existing_destination(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"original"})
        sftp.fail_commit_target = "/media/fat/game.rom"
        with tempfile.TemporaryDirectory() as directory:
            local = Path(directory) / "game.rom"
            local.write_bytes(b"replacement-data")
            with self.assertRaisesRegex(OSError, "atomic rename failure"):
                file_browser.upload_path(FakeConnection(sftp), local, "/media/fat", overwrite=True)

        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"original")
        self.assertFalse(any(".mce-part-" in path or ".mce-backup-" in path for path in sftp.paths))

    def test_size_verification_rejects_silent_truncation(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"original"})
        sftp.truncate_put = True
        with tempfile.TemporaryDirectory() as directory:
            local = Path(directory) / "game.rom"
            local.write_bytes(b"replacement-data")
            with self.assertRaisesRegex(OSError, "verification failed"):
                file_browser.upload_path(FakeConnection(sftp), local, "/media/fat", overwrite=True)

        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"original")
        self.assertFalse(any(".mce-part-" in path for path in sftp.paths))

    def test_successful_upload_replaces_only_after_staging(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"original"})
        with tempfile.TemporaryDirectory() as directory:
            local = Path(directory) / "game.rom"
            local.write_bytes(b"replacement-data")
            target = file_browser.upload_path(FakeConnection(sftp), local, "/media/fat", overwrite=True)

        self.assertEqual(target, "/media/fat/game.rom")
        self.assertEqual(sftp.paths[target], b"replacement-data")
        self.assertFalse(any(".mce-" in path for path in sftp.paths))

    def test_cancelled_upload_preserves_existing_destination_and_cleans_stage(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"original"})
        with tempfile.TemporaryDirectory() as directory:
            local = Path(directory) / "game.rom"
            local.write_bytes(b"replacement-data")
            checks = {"count": 0}

            def cancelled():
                checks["count"] += 1
                return checks["count"] > 1

            with self.assertRaisesRegex(file_browser.TransferCancelled, "cancelled"):
                file_browser.upload_path(
                    FakeConnection(sftp),
                    local,
                    "/media/fat",
                    overwrite=True,
                    cancel_callback=cancelled,
                )

        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"original")
        self.assertFalse(any(".mce-part-" in path for path in sftp.paths))

    def test_interrupted_remote_copy_preserves_existing_destination(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/source.rom": b"source-data",
            "/media/fat/archive": None,
            "/media/fat/archive/source.rom": b"original-destination",
        })
        sftp.fail_write = True
        with self.assertRaisesRegex(OSError, "remote write interruption"):
            file_browser.copy_path(
                FakeConnection(sftp),
                "/media/fat/source.rom",
                "/media/fat/archive",
                overwrite=True,
            )

        self.assertEqual(sftp.paths["/media/fat/archive/source.rom"], b"original-destination")
        self.assertFalse(any(".mce-part-" in path for path in sftp.paths))

    def test_interrupted_download_preserves_existing_destination(self):
        sftp = FakeSftp({"/media/fat": None, "/media/fat/game.rom": b"remote-data"})
        sftp.fail_get = True
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "game.rom"
            target.write_bytes(b"local-original")
            with self.assertRaisesRegex(OSError, "download interruption"):
                file_browser.download_path(
                    FakeConnection(sftp),
                    "/media/fat/game.rom",
                    directory,
                    overwrite=True,
                )
            self.assertEqual(target.read_bytes(), b"local-original")
            self.assertFalse(any(".mce-part-" in name for name in os.listdir(directory)))

    def test_delete_moves_item_to_hidden_trash_and_restore_recovers_it(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/game.rom": b"save-me",
        })
        connection = FakeConnection(sftp)

        trashed = file_browser.trash_paths(connection, ["/media/fat/game.rom"])

        self.assertNotIn("/media/fat/game.rom", sftp.paths)
        self.assertEqual(len(trashed), 1)
        self.assertEqual(sftp.paths[trashed[0]["trashPath"]], b"save-me")

        restored = file_browser.restore_trash_items(connection, trashed)

        self.assertEqual(restored[0]["restoredPath"], "/media/fat/game.rom")
        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"save-me")
        self.assertNotIn(trashed[0]["trashPath"], sftp.paths)

    def test_restore_keep_both_never_overwrites_new_destination(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/game.rom": b"trashed-version",
        })
        connection = FakeConnection(sftp)
        trashed = file_browser.trash_paths(connection, ["/media/fat/game.rom"])
        sftp.paths["/media/fat/game.rom"] = b"new-version"

        restored = file_browser.restore_trash_items(connection, trashed, conflict_policy="keepBoth")

        self.assertEqual(sftp.paths["/media/fat/game.rom"], b"new-version")
        self.assertEqual(restored[0]["restoredPath"], "/media/fat/game copy.rom")
        self.assertEqual(sftp.paths["/media/fat/game copy.rom"], b"trashed-version")

    def test_cancelled_multi_item_trash_rolls_back_completed_moves(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/one.rom": b"one",
            "/media/fat/two.rom": b"two",
        })
        checks = {"count": 0}

        def cancelled():
            checks["count"] += 1
            return checks["count"] > 1

        with self.assertRaisesRegex(file_browser.TransferCancelled, "cancelled"):
            file_browser.trash_paths(
                FakeConnection(sftp),
                ["/media/fat/one.rom", "/media/fat/two.rom"],
                cancel_callback=cancelled,
            )

        self.assertEqual(sftp.paths["/media/fat/one.rom"], b"one")
        self.assertEqual(sftp.paths["/media/fat/two.rom"], b"two")
        self.assertFalse(any(path.endswith("/one.rom") and ".mister-companion-trash" in path for path in sftp.paths))

    def test_remote_batch_size_counts_nested_file_bytes(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/games": None,
            "/media/fat/games/one.rom": b"1234",
            "/media/fat/games/sub": None,
            "/media/fat/games/sub/two.rom": b"123456",
        })

        sizes = file_browser.remote_paths_size(FakeConnection(sftp), ["/media/fat/games"])

        self.assertEqual(sizes, [10])

    def test_internal_trash_and_staging_entries_are_hidden_from_listing(self):
        sftp = FakeSftp({
            "/media/fat": None,
            "/media/fat/visible.rom": b"visible",
            "/media/fat/.mister-companion-trash": None,
            "/media/fat/.visible.rom.mce-part-123": b"partial",
            "/media/fat/.visible.rom.mce-backup-123": b"backup",
        })

        listing = file_browser.list_directory(FakeConnection(sftp), "/media/fat")

        self.assertEqual([entry["name"] for entry in listing["entries"]], ["visible.rom"])


if __name__ == "__main__":
    unittest.main()
