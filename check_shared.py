"""
check_shared.py - Checks that the shared files are identical in every package.

WHAT IT DOES
    Some code is shared between packages (for example load_data.py, which reads the input CSV). Each
    package must work on its own, so every package holds its own copy. This script compares the copies
    and reports the ones that differ from the first copy.

WHAT IT READS
    The files listed in SHARED_FILES, in every folder below climatology/ and satellite/.

HOW TO USE
    Run from the main folder of the repository:  python check_shared.py
    It prints OK, or the packages whose copy is different (and stops with an error code).
    To change a shared file: change it in one package, copy it to the others, run this script again.
"""

import sys
from pathlib import Path

# The files that must be identical in every package that has them.
SHARED_FILES = ["load_data.py"]

ROOT = Path(__file__).resolve().parent


def main():
    problems = 0
    for name in SHARED_FILES:
        copies = sorted(p for p in ROOT.rglob(name) if "venv" not in p.parts)
        if not copies:
            print(f"{name}: no copies found.")
            continue
        first = copies[0].read_bytes()
        different = [p for p in copies[1:] if p.read_bytes() != first]
        print(f"{name}: {len(copies)} copies, compared with {copies[0].relative_to(ROOT)}")
        for p in different:
            print(f"  DIFFERENT: {p.relative_to(ROOT)}")
        problems += len(different)
    if problems:
        print(f"\n{problems} copy/copies differ. Copy the right version over them.")
        sys.exit(1)
    print("\nOK: all shared files are identical.")


if __name__ == "__main__":
    main()
