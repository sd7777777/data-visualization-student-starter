#!/usr/bin/env python3
"""Create the Week 8 brand/generic drug-mix summary.

Streams the CMS provider file once and writes drug-mix.json next to the main
summary. Brand-name and generic totals come from the Brnd_* and Gnrc_* fields.

CMS suppresses a subgroup count between 1 and 10 and counter-suppresses one
neighbouring subgroup. Generic values are almost always reported, and brand +
generic + other always equals the record total, so the non-generic share is
measured as (total − generic). Records whose generic values are suppressed are
excluded from shares and reported as coverage; nothing is imputed.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

from prepare_data import STATE_NAMES

SPECIALTY_COUNT = 30


def number(value: str) -> float | None:
    value = value.strip()
    if not value or value in {"*", "#"}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def blank() -> list[float]:
    # records, claims, cost, covered records, covered claims, covered cost,
    # generic claims, generic cost
    return [0.0] * 8


def add(bucket: list[float], claims: float, cost: float, generic: tuple[float, float] | None) -> None:
    bucket[0] += 1
    bucket[1] += claims
    bucket[2] += cost
    if generic is not None:
        bucket[3] += 1
        bucket[4] += claims
        bucket[5] += cost
        bucket[6] += generic[0]
        bucket[7] += generic[1]


def clean(bucket: list[float]) -> list[float]:
    return [round(value) for value in bucket]


def prepare(source: Path, output: Path) -> None:
    areas: dict[str, list[float]] = defaultdict(blank)
    specialties: dict[tuple[str, str], list[float]] = defaultdict(blank)
    # Brand vs other split, measured only where all three subgroups are reported.
    split = {"brandClaims": 0.0, "brandCost": 0.0, "otherClaims": 0.0, "otherCost": 0.0}
    rows = 0
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        for rows, row in enumerate(csv.DictReader(handle), start=1):
            state = row["Prscrbr_State_Abrvtn"].strip() or "XX"
            specialty = row["Prscrbr_Type"].strip() or "Unclassified"
            claims = number(row["Tot_Clms"]) or 0
            cost = number(row["Tot_Drug_Cst"]) or 0
            generic_claims = number(row["Gnrc_Tot_Clms"])
            generic_cost = number(row["Gnrc_Tot_Drug_Cst"])
            generic = (
                (generic_claims, generic_cost)
                if generic_claims is not None and generic_cost is not None
                else None
            )
            for area in ("US", state):
                add(areas[area], claims, cost, generic)
                add(specialties[(area, specialty)], claims, cost, generic)
            parts = [number(row[field]) for field in ("Brnd_Tot_Clms", "Brnd_Tot_Drug_Cst", "Othr_Tot_Clms", "Othr_Tot_Drug_Cst")]
            if None not in parts:
                split["brandClaims"] += parts[0]
                split["brandCost"] += parts[1]
                split["otherClaims"] += parts[2]
                split["otherCost"] += parts[3]

    national = sorted(
        (name for area, name in specialties if area == "US"),
        key=lambda name: specialties[("US", name)][2],
        reverse=True,
    )[:SPECIALTY_COUNT]
    retained_cost = sum(specialties[("US", name)][2] for name in national)

    payload = {
        "meta": {
            "year": 2024,
            "rows": rows,
            "fields": ["records", "claims", "cost", "coveredRecords", "coveredClaims", "coveredCost", "genericClaims", "genericCost"],
            "specialtyCount": SPECIALTY_COUNT,
            "retainedCostShare": round(retained_cost / areas["US"][2], 4),
            "otherShareOfNonGeneric": {
                "claims": round(split["otherClaims"] / (split["brandClaims"] + split["otherClaims"]), 4),
                "cost": round(split["otherCost"] / (split["brandCost"] + split["otherCost"]), 4),
            },
            "source": "https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider",
        },
        "specialties": national,
        "areas": [
            {
                "code": code,
                "name": "United States" if code == "US" else STATE_NAMES.get(code, code),
                "total": clean(total),
                "specialties": [
                    clean(specialties[(code, name)]) if (code, name) in specialties else None
                    for name in national
                ],
            }
            for code, total in sorted(areas.items(), key=lambda item: (item[0] != "US", STATE_NAMES.get(item[0], item[0])))
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {output} ({output.stat().st_size / 1024:.1f} KB) from {rows:,} rows")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.output)
