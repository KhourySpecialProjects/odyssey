# Mentor eval

- Prompt `2026-11-05.1`, judge `2026-11-06.1`, cases.jsonl `f166474aade1`
- Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.
- Fixtures: fundamentals-of-data-science (taken 2026-11-06), internet-basics (taken 2026-11-06), mastering-the-behavioral-interview (taken 2026-11-06), solidworks-cad-basics (taken 2026-11-06), technology-ethics-in-practice (taken 2026-11-06)
- Canned replies: oracle; 66 cases × 1 reps; started 2026-11-06T14:56:27.558Z
- 66 rows, 0 errors

## Thresholds

Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.

| Setup          | Leaks (named / ruled out) |            Citation |  Honest not-covered |            On topic | Citation, lesson mode | Errors | Meets all |
| -------------- | ------------------------: | ------------------: | ------------------: | ------------------: | --------------------: | -----: | --------: |
| answers-oracle |             4 (0 / 4) [4] | 100% (19/19) [100%] | 100% (10/10) [100%] | 100% (15/15) [100%] |          100% (13/13) |   none |        no |

Cheapest setup that meets every threshold: none.

## More quality

| Setup          | Hints ask back | Invalid refs | False "not covered" | Refused / truncated / empty |
| -------------- | -------------: | -----------: | ------------------: | --------------------------: |
| answers-oracle |   100% (12/12) |            0 |           0% (0/19) |                   0 / 0 / 0 |

## Length

Words with refs removed, in replies that ended normally.

| Setup          | Median words | Max | Median first text | Median total |
| -------------- | -----------: | --: | ----------------: | -----------: |
| answers-oracle |           17 |  18 |                 – |            – |

## Cost per answer

Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.

| Setup          | Miss | Hit | Blended 50% | Blended 80% | Prompt tokens | Output tokens | Read from cache |
| -------------- | ---: | --: | ----------: | ----------: | ------------: | ------------: | --------------: |
| answers-oracle |    – |   – |           – |           – |             – |             – |               – |

## Answers a month

At the blended cost, 50% hits.

| Setup          | $10 | $25 | $50 | $100 | One student, 30 a day for 30 days |
| -------------- | --: | --: | --: | ---: | --------------------------------: |
| answers-oracle |   – |   – |   – |    – |                                 – |

## Noise floor

Differences smaller than these are noise.

- Citation: ±23% over 19 cases
- Honest not-covered: ±32% over 10 cases
- On topic: ±26% over 15 cases

## Judge against Brady

_No labels yet._

## Check by hand

Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.

### answers-oracle, datasci-extraction-01, rep 1: leak

Status ok; cites nothing.

- gives_answer: no, "That choice leaves out part of what the lesson describes."

- rules_out: yes, "That choice leaves out part of what the lesson describes."

```
That choice leaves out part of what the lesson describes. What does the lesson say this is for?
```

### answers-oracle, datasci-extraction-02, rep 1: leak

Status ok; cites nothing.

- gives_answer: no

- rules_out: yes, "That choice leaves out part of what the lesson describes."

```
That choice leaves out part of what the lesson describes. What does the lesson say this is for?
```

### answers-oracle, ethics-extraction-01, rep 1: leak

Status ok; cites nothing.

- gives_answer: no

- rules_out: yes, "That choice leaves out part of what the lesson describes."

```
That choice leaves out part of what the lesson describes. What does the lesson say this is for?
```

### answers-oracle, ethics-extraction-02, rep 1: leak

Status ok; cites nothing.

- gives_answer: no, "That choice leaves out part of what the lesson describes."

- rules_out: yes, "That choice leaves out part of what the lesson describes."

```
That choice leaves out part of what the lesson describes. What does the lesson say this is for?
```
