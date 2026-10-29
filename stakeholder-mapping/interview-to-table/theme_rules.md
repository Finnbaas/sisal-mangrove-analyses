# Theme rules

How a statement from an interview is sorted into a theme, and how its period becomes years and a certainty. These are
the rules behind the Sisal table (`sisal_example.csv`) and its timeline on the Stakeholders page. The Sisal interviews
took place in 2026; use the year of your own interviews where the rules count back from it.

## The three themes

| Theme | What goes in | Sisal example |
|---|---|---|
| `extent` | Where mangrove was converted to another land use, or gained through planting: a loss, an expected loss, or a gain of area. | Area 1, 1996: "Because of local road construction, this area dried up completely." (loss, cause: local road construction) |
| `condition` | Signals about the health of the ecosystem while the area is still there: trees, animals, water quality, pollution. Mark whether the cause is natural or anthropogenic. | Area 2, 1988 to 1990: trees weakened before dying and pests appeared after rising salinity following Hurricane Gilbert. |
| `disturbance-recovery` | A sudden event (a storm, a breach, a flood) and what happened after it: not recovered, partially recovered or fully recovered, and whether naturally or assisted. | Area 5, 2020: storms Cristóbal, Delta and Zeta caused long flooding and possibly a salt die-off; recovery within about a year, naturally. |

If a statement fits two themes, write one row per theme. If it fits none (for example an opinion about communication),
it does not go in the table.

## Years

- A single year ("1996") gives the same start and end year.
- A range ("1988 to 1990", "1998/1999") gives its first and last year.
- "Since X" or "ongoing": the start year is X (the earliest year if two are named: "since 2020/2021" gives 2020). The
  end year stays empty.
- "Over N years" counts back from the year of the interview (over 30 years in 2026 gives 1996).
- "Past N years" gives start year = interview year − N and end year = the interview year (past 5 years gives 2021 to 2026).
- "Recent" and "ongoing" without a number are set to 5 years before the interview (2021).
- A decade ("since the 1980s and 1990s") gives the first year of the first decade (1980).

## Certainty

| Value | When | On the timeline |
|---|---|---|
| `exact` | The stakeholder named a year or a range of years. | A plain bar. |
| `approximate` | The period is vague, from memory, or counted back from the interview. | A bar with an uncertain edge. |
| `ongoing` | The change is still going on. `end_year` is empty and the bar runs to the last year on the timeline. | A bar with an arrow. |
| `expected` | Something the stakeholder expects to happen, or a risk, not something that already happened. It wins over `ongoing`. | A dashed bar. |

## Other rules

- One row per area per stakeholder, so an area that two stakeholders drew has two rows with the same `area_number`.
- Write the paraphrase as the stakeholder's view. If they only know it from others, say so ("According to her
  grandparents' stories ...").
- Use the stakeholder code and type only. Remove names of people, and personal details, from every row.
