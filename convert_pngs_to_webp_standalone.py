#!/usr/bin/env python3
"""Replace PNGs recursively with lossless WebPs; move originals into pngs/.

Place this script in any folder and run:
    python3 convert_pngs_to_webp_standalone.py

Defaults to the script's own folder, regardless of the terminal directory.
Original subfolder paths are preserved inside pngs/, which is excluded from
future scans. Requires the cwebp command-line encoder.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def find_pngs(root: Path) -> list[Path]:
    """Find .png/.PNG files, excluding the root backup and all symlinks."""
    pngs = []
    for folder, directories, files in os.walk(root, followlinks=False):
        directories[:] = sorted(
            name for name in directories
            if not (Path(folder) / name).is_symlink()
            and (Path(folder) / name) != root / "pngs"
        )
        for name in sorted(files):
            path = Path(folder) / name
            if path.suffix.lower() == ".png" and path.is_file() and not path.is_symlink():
                pngs.append(path)
    return pngs


def convert_png(png: Path, encoder: str) -> None:
    """Finish encoding before replacing a destination; preserve it on failure."""
    target = png.with_suffix(".webp")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=".webp-conversion-", suffix=".webp", dir=png.parent, delete=False
        ) as output:
            temporary = Path(output.name)
        subprocess.run(
            [encoder, "-quiet", "-lossless", "-exact", "-z", "9", "-mt",
             str(png), "-o", str(temporary)],
            check=True,
        )
        if temporary.stat().st_size == 0:
            raise OSError("Encoder produced an empty output file")
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def backup_destination(png: Path, root: Path) -> Path:
    """Preserve relative paths and older originals when names collide."""
    backup = root / "pngs" / png.relative_to(root)
    for parent in backup.parents:
        if parent == root:
            break
        if parent.is_symlink():
            raise OSError(f"Backup directory must not be a symlink: {parent}")
    candidate = backup
    number = 1
    while candidate.exists() or candidate.is_symlink():
        candidate = backup.with_name(f"{backup.stem}.{number}{backup.suffix}")
        number += 1
    return candidate


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "path", nargs="?", type=Path, default=Path(__file__).resolve().parent,
        help="Folder to scan (default: the folder containing this script)",
    )
    parser.add_argument("--dry-run", action="store_true", help="List conversions without writing files")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing WebPs after successful conversion")
    args = parser.parse_args()
    root = args.path.expanduser().resolve()
    if not root.is_dir():
        print(f"Error: folder does not exist: {root}", file=sys.stderr)
        return 1
    encoder = shutil.which("cwebp")
    if not args.dry_run and encoder is None:
        print("Error: cwebp is required. On macOS, install it with: brew install webp", file=sys.stderr)
        return 1

    backup_root = root / "pngs"
    if backup_root.is_symlink() or (backup_root.exists() and not backup_root.is_dir()):
        print(f"Error: backup path must be a normal folder: {backup_root}", file=sys.stderr)
        return 1
    if not args.dry_run:
        backup_root.mkdir(exist_ok=True)

    converted = skipped = failed = 0
    for png in find_pngs(root):
        target = png.with_suffix(".webp")
        if target.exists() and not args.overwrite:
            skipped += 1
            continue
        if args.dry_run:
            print(f"Would convert: {png} -> {target}")
            print(f"Would move original into: {backup_root / png.relative_to(root)}")
            converted += 1
            continue
        try:
            backup = backup_destination(png, root)
            backup.parent.mkdir(parents=True, exist_ok=True)
            convert_png(png, encoder)
            shutil.move(str(png), str(backup))
        except (OSError, subprocess.CalledProcessError) as error:
            print(f"Failed: {png}: {error}", file=sys.stderr)
            failed += 1
            continue
        print(f"Converted: {png} -> {target}")
        print(f"Moved original: {backup}")
        converted += 1

    action = "Would convert" if args.dry_run else "Converted"
    print(f"{action} {converted} file(s); skipped {skipped} existing WebP(s); failed {failed}.")
    print(f"Original PNG backups: {backup_root}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
