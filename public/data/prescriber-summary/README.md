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
