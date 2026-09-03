# Bee Colony Loss dataset

This CSV is the full public **Bee Colonies** dataset used for TidyTuesday week 2 on January 11, 2022. It contains 1,222 quarterly records from 2015 through April–June 2021, including Ohio and 44 other reporting states plus two aggregate labels. The file is about 72 KB, well below the course's 8 MB limit, so it can be loaded directly by the Vite frontend.

## Source and concept

- Download location: [TidyTuesday `colony.csv` on GitHub](https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2022/2022-01-11/colony.csv)
- Dataset documentation: [TidyTuesday Bee Colonies README](https://github.com/rfordatascience/tidytuesday/blob/main/data/2022/2022-01-11/readme.md)
- Original data context: [USDA/NASS Bee and Honey surveys](https://www.nass.usda.gov/Surveys/Guide_to_NASS_Surveys/Bee_and_Honey/)
- Related research using USDA colony-loss data: [Honey bee colony loss linked to parasites, pesticides and extreme weather](https://pmc.ncbi.nlm.nih.gov/articles/PMC9714769/)

The dataset describes managed honey bee colonies reported by beekeepers. It is not a census of all wild bees, and colony counts are not directly comparable to the total number of bees in the environment. The source reports `colony_lost_pct` as a whole-number percentage (for example, `48` means 48%). `NA` means that the source did not report a value for that field.

## Attribute analysis

| Attribute | Meaning | Type |
| --- | --- | --- |
| `year` | Survey year | Time / discrete year |
| `months` | Three-month reporting window | Time interval / categorical |
| `state` | U.S. state or source aggregate label | Categorical / geographic ID |
| `colony_n` | Number of colonies in the operation sample | Quantitative |
| `colony_max` | Maximum number of colonies during the quarter | Quantitative |
| `colony_lost` | Number of colonies lost during the quarter | Quantitative |
| `colony_lost_pct` | Percent of colonies lost during the quarter | Quantitative / percentage |
| `colony_added` | Number of colonies added during the quarter | Quantitative |
| `colony_reno` | Number of colonies renovated during the quarter | Quantitative |
| `colony_reno_pct` | Percent of colonies renovated during the quarter | Quantitative / percentage |

No synthetic values were generated for this file. The rows are the downloaded TidyTuesday/USDA source records, kept with the source's missing-value markers.
