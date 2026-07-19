import json
from pathlib import Path
import subprocess
import sys
import unittest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
BACKEND_SCRIPT = BACKEND_ROOT / "main.py"


class BackendProtocolTests(unittest.TestCase):
    def run_backend(self, requests):
        payload = "".join(json.dumps(request) + "\n" for request in requests)
        completed = subprocess.run(
            [sys.executable, str(BACKEND_SCRIPT)],
            input=payload,
            text=True,
            capture_output=True,
            cwd=BACKEND_ROOT,
            timeout=20,
            check=False,
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        return [json.loads(line) for line in completed.stdout.splitlines() if line.strip()]

    def test_ping_returns_identity_and_request_id(self):
        [response] = self.run_backend([
            {"id": "test-ping", "method": "ping", "params": {}},
        ])

        self.assertTrue(response["ok"])
        self.assertEqual(response["id"], "test-ping")
        self.assertEqual(response["result"]["name"], "MiSTer Companion EX")
        self.assertIn("python", response["result"])

    def test_unknown_method_is_a_structured_error(self):
        [response] = self.run_backend([
            {"id": 42, "method": "does.not.exist", "params": {}},
        ])

        self.assertFalse(response["ok"])
        self.assertEqual(response["id"], 42)
        self.assertIn("Unknown backend method", response["error"])


if __name__ == "__main__":
    unittest.main()
