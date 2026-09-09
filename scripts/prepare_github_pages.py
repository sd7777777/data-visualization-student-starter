#!/usr/bin/env python3
"""Prefix exported asset URLs when deploying as a GitHub project page."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> None:
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "dist/client")
    repository = os.environ.get("GITHUB_REPOSITORY", "").split("/")[-1]
    if not repository or repository.endswith(".github.io"):
        print("GitHub user site detected; root-relative asset paths are unchanged.")
        return

    prefix = f"/{repository}/_next/"
    changed = 0
    for path in output.rglob("*"):
        if not path.is_file() or path.suffix not in {".html", ".rsc", ".js", ".json"}:
            continue
        text = path.read_text(encoding="utf-8")
        updated = text.replace("/_next/", prefix)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    print(f"Prepared {changed} files for GitHub project path /{repository}/")


if __name__ == "__main__":
    main()
