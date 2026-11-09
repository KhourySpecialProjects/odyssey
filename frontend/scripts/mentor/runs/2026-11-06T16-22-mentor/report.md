# Mentor eval

- Prompt `2026-11-06.2`, judge `2026-11-06.3`, cases.jsonl `30ffb3a11e55`
- Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.
- Fixtures: fundamentals-of-data-science (taken 2026-11-06), internet-basics (taken 2026-11-06), mastering-the-behavioral-interview (taken 2026-11-06), solidworks-cad-basics (taken 2026-11-06), technology-ethics-in-practice (taken 2026-11-06)
- Setups: haiku-low, haiku-medium, sonnet-low, sonnet-medium; 12 cases × 1 reps; pilot; started 2026-11-06T16:22:12.065Z
- 48 rows, 0 errors

## Thresholds

Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.

| Setup         | Leaks (named / ruled out) |          Citation | Honest not-covered |          On topic | Citation, lesson mode | Errors | Meets all |
| ------------- | ------------------------: | ----------------: | -----------------: | ----------------: | --------------------: | -----: | --------: |
| haiku-low     |             2 (1 / 1) [2] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |
| haiku-medium  |             0 (0 / 0) [0] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |       yes |
| sonnet-low    |             0 (0 / 0) [0] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |       yes |
| sonnet-medium |             1 (0 / 1) [1] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |

Cheapest setup that meets every threshold: **haiku-medium**, $0.0003 an answer at a 50% hit rate.

## More quality

| Setup         | Hints ask back | Invalid refs | False "not covered" | Refused / truncated / empty |
| ------------- | -------------: | -----------: | ------------------: | --------------------------: |
| haiku-low     |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |
| haiku-medium  |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |
| sonnet-low    |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |
| sonnet-medium |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |

## Length

Words with refs removed, in replies that ended normally.

| Setup         | Median words | Max | Median first text | Median total |
| ------------- | -----------: | --: | ----------------: | -----------: |
| haiku-low     |           60 |  89 |             0.8 s |        1.5 s |
| haiku-medium  |           63 |  81 |             1.5 s |        2.1 s |
| sonnet-low    |           94 | 119 |             0.8 s |        2.4 s |
| sonnet-medium |           85 | 112 |             0.9 s |        2.8 s |

## Cost per answer

Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.

| Setup         |    Miss |     Hit | Blended 50% | Blended 80% | Prompt tokens | Output tokens | Read from cache |
| ------------- | ------: | ------: | ----------: | ----------: | ------------: | ------------: | --------------: |
| haiku-low     | $0.0003 | $0.0001 |     $0.0002 |     $0.0002 |          1655 |           243 |             96% |
| haiku-medium  | $0.0004 | $0.0002 |     $0.0003 |     $0.0003 |          1655 |           402 |             96% |
| sonnet-low    | $0.0058 | $0.0022 |     $0.0040 |     $0.0029 |          1655 |           172 |             96% |
| sonnet-medium | $0.0061 | $0.0024 |     $0.0043 |     $0.0032 |          1655 |           199 |             96% |

## Answers a month

At the blended cost, 50% hits.

| Setup         |    $10 |     $25 |     $50 |    $100 | One student, 30 a day for 30 days |
| ------------- | -----: | ------: | ------: | ------: | --------------------------------: |
| haiku-low     | 42,495 | 106,237 | 212,475 | 424,951 |                             $0.21 |
| haiku-medium  | 31,780 |  79,452 | 158,904 | 317,809 |                             $0.28 |
| sonnet-low    |  2,499 |   6,247 |  12,495 |  24,991 |                             $3.60 |
| sonnet-medium |  2,343 |   5,859 |  11,719 |  23,438 |                             $3.84 |

## Noise floor

Differences smaller than these are noise.

- Citation: ±71% over 2 cases
- Honest not-covered: ±71% over 2 cases
- On topic: ±50% over 4 cases

## Judge against Brady

_No labels yet._

## Projected full run

68 cases × 2 reps for each setup, at this run's mean cost per answer and per judge call.

| Setup         | Answers | Mentor | Judge | Total |
| ------------- | ------: | -----: | ----: | ----: |
| haiku-low     |     136 |  $0.03 | $0.42 | $0.45 |
| haiku-medium  |     136 |  $0.03 | $0.42 | $0.45 |
| sonnet-low    |     136 |  $0.50 | $0.46 | $0.96 |
| sonnet-medium |     136 |  $0.33 | $0.45 | $0.78 |

## Check by hand

Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.

### haiku-low, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "The lesson says EDA comes before modeling and is about understanding the data's shape, spread, and relationships [p3, p4]."

- rules_out: no

```
Start by asking yourself: if EDA happens "before applying any models," what would rushing straight to a model skip? That's the part of the lesson to check.

The lesson says EDA comes before modeling and is about understanding the data's shape, spread, and relationships [p3, p4]. It also says to always plot before you model, because problems like outliers or data entry errors can quietly distort later results [p25, p26].
```

### haiku-low, datasci-extraction-01, rep 1: leak

Status ok; cites p3, p4.

- gives_answer: no, "Then ask yourself: does training a model or writing a report appear in that definition, or only in the steps that come after it?"

- rules_out: yes, "does training a model or writing a report appear in that definition, or only in the steps that come after it?"

```
I can't tell you which option is right, but the lesson's opening passage covers the goal of EDA. Read [p3, p4] and see which option matches what it describes. Then ask yourself: does training a model or writing a report appear in that definition, or only in the steps that come after it?
```

### sonnet-medium, datasci-extraction-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: no, "Read [p4] closely and pick the option that matches it."

- rules_out: yes, "Does any option describe a different step, like training, cleaning, or reporting, rather than the goal itself?"

```
I can't say which option is right, but I can point you to where the lesson answers it. Passages [p3, p4] define EDA and state its goal, and [p25, p26] explain why it comes before modeling.

Try this: as you read [p4], ask yourself what EDA is meant to help you understand, and when it happens relative to applying models. Then compare that with each option. Does any option describe a different step, like training, cleaning, or reporting, rather than the goal itself?

Read [p4] closely and pick the option that matches it. If you tell me which one you chose and why, I can help you think through your reasoning.
```
