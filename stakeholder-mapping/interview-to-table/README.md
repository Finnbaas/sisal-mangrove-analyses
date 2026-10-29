# From interview to table

Turn the interviews of the [map interview](../map-interview/) into one table, sorted into three themes. The table is
what the Stakeholders page of the Sisal Mangrove Monitor shows.

## What the method is

Every statement is sorted into one of three themes (extent, condition, disturbance and recovery) and written as one row:
area number, zone, change, period, start and end year, certainty, cause, stakeholder code and type, and a paraphrase in
English. In Sisal, the three themes on the Stakeholders page come from this table, with one quote per stakeholder per area.

## What is in this folder

| File | What it is |
|---|---|
| `coding_sheet_template.csv` | The empty coding sheet: the columns, and one example row. |
| `theme_rules.md` | What goes into each theme, with one Sisal example each, and the rules for years and certainty. |
| `sisal_example.csv` | Our Sisal table: 43 rows, one per quote, exported from the website data. Stakeholder codes only, no names. |

## The columns

| Column | What it is |
|---|---|
| `theme` | `extent`, `condition` or `disturbance-recovery`. |
| `area_number` | The number the stakeholder gave the area on the map. The same area can have several rows (one per stakeholder). |
| `zone` | Where the area is, in words. |
| `change` | What changed. Extent: the change (loss, gain, expected loss). Condition: the signal. Disturbance and recovery: the disturbance. |
| `period` | When, as the stakeholder said it, for example `1988 to 1990` or `Past 5 years`. |
| `start_year`, `end_year` | The period as years (rules in `theme_rules.md`). `end_year` is empty when the change is ongoing. |
| `certainty` | `exact`, `approximate`, `ongoing` or `expected`. |
| `cause` | The cause the stakeholder gave (empty for disturbance and recovery, where the cause is part of the disturbance). |
| `cause_type` | Only for condition: `natural` or `anthropogenic`. |
| `recovery`, `recovery_mode` | Only for disturbance and recovery: how far the mangrove recovered, and whether naturally or assisted. |
| `stakeholder_code`, `stakeholder_type` | For example `CR1` and `Community restoration group`. Never a name. |
| `paraphrase` | The statement in English, in the stakeholder's own view. Hearsay is marked as such. |

## Steps

1. Open `coding_sheet_template.csv` in a spreadsheet program (use UTF-8, so accents show correctly).
2. Sort each statement into extent, condition, or disturbance and recovery (see `theme_rules.md`).
3. Write one row per area per stakeholder. The paraphrase gives their view in their words, not your interpretation.
4. Turn the period into a start and end year, and mark it exact, approximate, ongoing or expected (see `theme_rules.md`).
5. Check every row for names and personal details, and remove them.

## Notes

- Statements are paraphrased in English from translated transcripts, so the paraphrase is not word for word.
- Templates are under CC BY 4.0, code under MIT.
