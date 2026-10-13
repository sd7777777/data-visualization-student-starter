# Browser-ready CMS prescriber summary

`summary.json` is derived from the 2024 **Medicare Part D Prescribers - by Provider** CSV published by the Centers for Medicare & Medicaid Services.

- Source: https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider
- Source grain: one record per National Provider Identifier (NPI)
- Source size: 1,416,883 rows and 84 columns
- Derived file size: approximately 608 KB
- Refresh script: `scripts/prepare_data.py`

## Attributes retained in the derived file

| Attribute | Type | Meaning |
| --- | --- | --- |
| `code`, `name` | Categorical / spatial identifier | State, territory, special area, or national grouping |
| `specialty` | Categorical | CMS-derived provider specialty |
| `providers` | Quantitative count | Provider records in the grouping |
| `claims` | Quantitative count | Part D claims, including refills |
| `cost` | Quantitative currency | Aggregate drug cost across claims |
| `costPerClaim` | Quantitative ratio | Aggregate drug cost divided by claims |
| `opioidShare` | Quantitative percentage | Reported opioid claims divided by all claims |
| `antibioticShare` | Quantitative percentage | Reported antibiotic claims divided by all claims |
| `averageRisk` | Quantitative score | Beneficiary-weighted average HCC risk score where reported |
| `npi` | Categorical identifier | National Provider Identifier for a highlighted provider record |
| `city`, `state` | Categorical / spatial identifier | Provider location reported in NPPES |
| `year` | Temporal (year) | Calendar year represented by the source data |

## Transformations

The script aggregates totals for the national view and each provider state/territory. It retains the 32 specialties with the highest total drug cost in each geography, state profiles for the 18 leading national specialties, fixed-bin distributions over all provider records, completeness and suppression-marker counts for all 84 source fields, and the ten highest-cost provider records for supporting detail. It does not impute suppressed values.

Provider beneficiary counts are not summed into a geography-level unique-beneficiary figure because one beneficiary may receive prescriptions from multiple providers.

## `drug-mix.json` — brand-name and generic drugs (Week 8)

Refresh script: `scripts/prepare_drug_mix.py` (same source CSV). About 100 KB.

Each geography has a `total` and one entry per specialty in `specialties` (the 30 highest-cost national specialties, 97% of national drug cost; `null` where a place has no records). Every entry is an array in this order:

| Position | Meaning |
| --- | --- |
| 0 `records` | Provider records |
| 1 `claims`, 2 `cost` | All claims and total drug cost |
| 3 `coveredRecords`, 4 `coveredClaims`, 5 `coveredCost` | The same, restricted to records whose generic claims and cost are reported |
| 6 `genericClaims`, 7 `genericCost` | Generic (ANDA) claims and cost within covered records |

Brand-name (NDA, BLA, authorized generic) plus CMS's small "other" category is `covered − generic`; brand + generic + other equals each record's total. Records with suppressed generic values are excluded rather than imputed. `meta.otherShareOfNonGeneric` reports how much of the non-generic group is "other", measured where all three subgroups are reported. Drug cost is gross of manufacturer rebates.
