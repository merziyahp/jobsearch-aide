import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("package_store", ROOT / "scripts/package_store.py")
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class StorePackagingTests(unittest.TestCase):
    def test_store_differs_only_in_oauth_client_and_local_source_is_unchanged(self):
        source = ROOT / "Code"
        before = {name: (source / name).read_bytes() for name in packaging.RUNTIME_FILES}
        with tempfile.TemporaryDirectory() as output:
            destination = packaging.package_store(source, output)
            with zipfile.ZipFile(destination) as archive:
                self.assertEqual(set(archive.namelist()), set(before))
                local_manifest = json.loads(before["manifest.json"])
                store_manifest = json.loads(archive.read("manifest.json"))
                self.assertEqual(store_manifest["oauth2"]["client_id"], packaging.STORE_CLIENT)
                store_manifest["oauth2"]["client_id"] = packaging.LOCAL_CLIENT
                self.assertEqual(store_manifest, local_manifest)
                for name in before:
                    if name != "manifest.json":
                        self.assertEqual(archive.read(name), before[name])
        for name in before:
            self.assertEqual((source / name).read_bytes(), before[name])

    def test_rejects_accidentally_switched_local_client(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "Code"
            shutil.copytree(ROOT / "Code", source)
            manifest = json.loads((source / "manifest.json").read_text())
            manifest["oauth2"]["client_id"] = packaging.STORE_CLIENT
            (source / "manifest.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "local OAuth client"):
                packaging.package_store(source, Path(temporary) / "releases")


if __name__ == "__main__":
    unittest.main()
