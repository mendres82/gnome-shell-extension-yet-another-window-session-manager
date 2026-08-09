#!/usr/bin/env bash
# Pack the extension into build/dist/${uuid}-v${version-name}.zip (version-name from metadata.json).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
METADATA="${ROOT}/metadata.json"

VERSION="$(grep -o '"version-name"[[:space:]]*:[[:space:]]*"[^"]*"' "$METADATA" | cut -d'"' -f4)"
UUID="$(grep -o '"uuid"[[:space:]]*:[[:space:]]*"[^"]*"' "$METADATA" | cut -d'"' -f4)"

if [ -z "$VERSION" ] || [ -z "$UUID" ]; then
    echo "Failed to read uuid/version-name from ${METADATA}" >&2
    exit 1
fi

DIST="${ROOT}/build/dist"
OUT="${DIST}/${UUID}-v${VERSION}.zip"

cd "$ROOT"
mkdir -p "$DIST"
rm -f "$OUT"

shopt -s nullglob
mo_files=(locale/*/LC_MESSAGES/*.mo)
if [ ${#mo_files[@]} -eq 0 ]; then
    echo "No locale/*/LC_MESSAGES/*.mo files found. Run ./build/i18n-compile-locales.sh first." >&2
    exit 1
fi

args=(
    metadata.json
    stylesheet.css
    LICENSE
    schemas
    icons
    ui
    utils
    model
    dbus-interfaces
    template
    locale
    *.js
)

python3 - "$OUT" "${args[@]}" <<'PY'
import sys
import zipfile
from pathlib import Path

out = Path(sys.argv[1])
paths = [Path(p) for p in sys.argv[2:]]

skip = {"schemas/gschemas.compiled"}

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for path in paths:
        if path.is_dir():
            for file in sorted(path.rglob("*")):
                if file.is_file() and file.as_posix() not in skip:
                    zf.write(file, file.as_posix())
        elif path.is_file():
            if path.as_posix() not in skip:
                zf.write(path, path.as_posix())
        else:
            raise SystemExit(f"Missing path: {path}")

print(f"Created {out.resolve()}")
PY
