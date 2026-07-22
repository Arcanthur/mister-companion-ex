import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "mister-companion"
    / "core"
    / "manuals.py"
)
sys.path.insert(0, str(MODULE_PATH.parents[1]))
SPEC = importlib.util.spec_from_file_location("manuals_temp_cleanup", MODULE_PATH)
manuals = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manuals)


class ManualsTempCleanupTests(unittest.TestCase):
    def test_cleanup_removes_only_viewer_temp_tree(self):
        with tempfile.TemporaryDirectory() as directory:
            cache_root = Path(directory) / "Manuals"
            temp_pdf = cache_root / ".viewer_temp" / "Dreamcast" / "manual.pdf"
            cached_pdf = cache_root / "Dreamcast" / "manual.pdf"
            temp_pdf.parent.mkdir(parents=True)
            cached_pdf.parent.mkdir(parents=True)
            temp_pdf.write_bytes(b"temporary")
            cached_pdf.write_bytes(b"cached")

            with patch.object(manuals, "get_manuals_cache_root", return_value=cache_root):
                self.assertTrue(manuals.cleanup_temp_manuals())
                self.assertFalse((cache_root / ".viewer_temp").exists())
                self.assertTrue(cached_pdf.exists())
                self.assertFalse(manuals.cleanup_temp_manuals())


if __name__ == "__main__":
    unittest.main()
