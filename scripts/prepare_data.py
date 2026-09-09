#!/usr/bin/env python3
"""Create the compact, browser-ready dataset used by the site.

The CMS provider file is roughly 750 MB. This script streams it once and writes
an intentionally small JSON summary suitable for GitHub Pages.
"""

from __future__ import annotations

import argparse
import csv
import heapq
import json
from collections import defaultdict
from pathlib import Path


STATE_NAMES = {
    "AK": "Alaska", "AL": "Alabama", "AR": "Arkansas", "AS": "American Samoa",
    "AZ": "Arizona", "CA": "California", "CO": "Colorado", "CT": "Connecticut",
    "DC": "District of Columbia", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "GU": "Guam", "HI": "Hawaii", "IA": "Iowa", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "MA": "Massachusetts", "MD": "Maryland", "ME": "Maine", "MI": "Michigan",
    "MN": "Minnesota", "MO": "Missouri", "MP": "Northern Mariana Islands",
    "MS": "Mississippi", "MT": "Montana", "NC": "North Carolina", "ND": "North Dakota",
    "NE": "Nebraska", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NV": "Nevada", "NY": "New York", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "PR": "Puerto Rico", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VA": "Virginia", "VI": "U.S. Virgin Islands", "VT": "Vermont",
    "WA": "Washington", "WI": "Wisconsin", "WV": "West Virginia", "WY": "Wyoming",
    "AA": "Armed Forces Americas", "AE": "Armed Forces Europe", "AP": "Armed Forces Pacific",
    "XX": "Unknown", "ZZ": "Foreign country",
}


def number(value: str) -> float | None:
    if not value or value in {"*", "#"}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def blank_bucket() -> dict[str, float]:
    return {
        "providers": 0,
        "claims": 0.0,
        "cost": 0.0,
        "opioidClaims": 0.0,
        "antibioticClaims": 0.0,
        "riskWeighted": 0.0,
        "riskWeight": 0.0,
    }


def clean_bucket(bucket: dict[str, float]) -> dict[str, int | float]:
    claims = bucket["claims"]
    risk_weight = bucket["riskWeight"]
    return {
        "providers": int(bucket["providers"]),
        "claims": round(claims),
        "cost": round(bucket["cost"]),
        "costPerClaim": round(bucket["cost"] / claims, 2) if claims else 0,
        "opioidShare": round(bucket["opioidClaims"] / claims * 100, 2) if claims else 0,
        "antibioticShare": round(bucket["antibioticClaims"] / claims * 100, 2) if claims else 0,
        "averageRisk": round(bucket["riskWeighted"] / risk_weight, 2) if risk_weight else None,
    }


def provider_name(row: dict[str, str]) -> str:
    if row["Prscrbr_Ent_Cd"] == "O":
        return row["Prscrbr_Last_Org_Name"].strip().title()
    parts = [row["Prscrbr_First_Name"].strip(), row["Prscrbr_MI"].strip(), row["Prscrbr_Last_Org_Name"].strip()]
    return " ".join(part for part in parts if part).title()


def prepare(source: Path, output: Path) -> None:
    area_totals: dict[str, dict[str, float]] = defaultdict(blank_bucket)
    specialties: dict[tuple[str, str], dict[str, float]] = defaultdict(blank_bucket)
    top_providers: dict[str, list[tuple[float, int, dict[str, object]]]] = defaultdict(list)
    row_count = 0

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        column_count = len(reader.fieldnames or [])
        for row_count, row in enumerate(reader, start=1):
            state = row["Prscrbr_State_Abrvtn"].strip() or "XX"
            specialty = row["Prscrbr_Type"].strip() or "Unclassified"
            claims = number(row["Tot_Clms"]) or 0
            cost = number(row["Tot_Drug_Cst"]) or 0
            opioid_claims = number(row["Opioid_Tot_Clms"]) or 0
            antibiotic_claims = number(row["Antbtc_Tot_Clms"]) or 0
            beneficiaries = number(row["Tot_Benes"])
            risk = number(row["Bene_Avg_Risk_Scre"])

            for area in ("US", state):
                for bucket in (area_totals[area], specialties[(area, specialty)]):
                    bucket["providers"] += 1
                    bucket["claims"] += claims
                    bucket["cost"] += cost
                    bucket["opioidClaims"] += opioid_claims
                    bucket["antibioticClaims"] += antibiotic_claims
                    if beneficiaries is not None and risk is not None:
                        bucket["riskWeighted"] += beneficiaries * risk
                        bucket["riskWeight"] += beneficiaries

            provider = {
                "npi": row["Prscrbr_NPI"],
                "name": provider_name(row),
                "city": row["Prscrbr_City"].strip().title(),
                "state": state,
                "specialty": specialty,
                "claims": round(claims),
                "cost": round(cost),
                "costPerClaim": round(cost / claims, 2) if claims else 0,
                "opioidRate": number(row["Opioid_Prscrbr_Rate"]),
            }
            for area in ("US", state):
                heap = top_providers[area]
                item = (cost, row_count, provider)
                if len(heap) < 10:
                    heapq.heappush(heap, item)
                elif cost > heap[0][0]:
                    heapq.heapreplace(heap, item)

    areas = []
    for code, total in area_totals.items():
        area_groups = [
            {"specialty": specialty, **clean_bucket(bucket)}
            for (area, specialty), bucket in specialties.items()
            if area == code
        ]
        area_groups.sort(key=lambda item: item["cost"], reverse=True)
        providers = [item[2] for item in sorted(top_providers[code], reverse=True)]
        areas.append({
            "code": code,
            "name": "United States" if code == "US" else STATE_NAMES.get(code, code),
            "summary": clean_bucket(total),
            "specialties": area_groups[:32],
            "topProviders": providers,
        })

    areas.sort(key=lambda item: (item["code"] != "US", item["name"]))
    payload = {
        "meta": {
            "title": "Medicare Part D Prescribers - by Provider",
            "year": 2024,
            "rows": row_count,
            "columns": column_count,
            "source": "https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider",
            "note": "Provider-level totals. Suppressed subgroup values are excluded, so opioid and antibiotic shares are conservative lower-bound estimates.",
        },
        "areas": areas,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {output} ({output.stat().st_size / 1024:.1f} KB) from {row_count:,} rows")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.output)
