"""Package the local extension for the store without changing local OAuth config."""

import argparse
import json
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
LOCAL_CLIENT = "507144567625-q5n7osjjf23noonbkgfh38fgbsrm53ur.apps.googleusercontent.com"
STORE_CLIENT = "507144567625-j9jksj66rlojenggufeh32htefhidf6m.apps.googleusercontent.com"
STORE_ID = "adenkikljhpdapfnoflcdenodikgckob"
RUNTIME_FILES = (
    "autofill.js", "background.js", "content.js", "outreach.js", "popup.js",
    "sheets.js", "storage.js", "telemetry.js", "popup.html", "manifest.json",
    "icons/icon16.png", "icons/icon48.png", "icons/icon128.png",
)


def package_store(source=ROOT / "Code", output=ROOT / "releases"):
    source, output = Path(source), Path(output)
    manifest = json.loads((source / "manifest.json").read_text())
    if manifest["oauth2"]["client_id"] != LOCAL_CLIENT:
        raise ValueError("Code/manifest.json must use the local OAuth client before packaging")
    if "key" in manifest:
        raise ValueError("Unexpected manifest key; verify extension identity before packaging")
    manifest["oauth2"]["client_id"] = STORE_CLIENT
    contents = {name: (source / name).read_bytes() for name in RUNTIME_FILES}
    contents["manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    output.mkdir(parents=True, exist_ok=True)
    destination = output / f"jobsearch-aide-{manifest['version']}.zip"
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in contents.items():
            archive.writestr(name, content)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == set(RUNTIME_FILES)
        assert all(archive.read(name) == content for name, content in contents.items())
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "releases")
    args = parser.parse_args()
    print(package_store(output=args.output_dir))
    print(f"Store OAuth client set for {STORE_ID}; local Code files unchanged.")
