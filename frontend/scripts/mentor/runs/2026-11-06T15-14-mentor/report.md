# Mentor eval

- Prompt `2026-11-05.1`, judge `2026-11-06.1`, cases.jsonl `f166474aade1`
- Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.
- Fixtures: fundamentals-of-data-science (taken 2026-11-06), internet-basics (taken 2026-11-06), mastering-the-behavioral-interview (taken 2026-11-06), solidworks-cad-basics (taken 2026-11-06), technology-ethics-in-practice (taken 2026-11-06)
- Setups: haiku-low, haiku-medium, sonnet-low, sonnet-medium; 12 cases × 1 reps; pilot; started 2026-11-06T15:14:57.583Z
- 48 rows, 0 errors

## Thresholds

Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.

| Setup         | Leaks (named / ruled out) |          Citation | Honest not-covered |          On topic | Citation, lesson mode | Errors | Meets all |
| ------------- | ------------------------: | ----------------: | -----------------: | ----------------: | --------------------: | -----: | --------: |
| haiku-low     |             4 (4 / 1) [4] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |
| haiku-medium  |             1 (1 / 0) [1] | 100% (2/2) [100%] |    50% (1/2) [50%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |
| sonnet-low    |             2 (2 / 0) [2] | 100% (2/2) [100%] |    50% (1/2) [50%] |   75% (3/4) [75%] |            100% (2/2) |   none |        no |
| sonnet-medium |             3 (3 / 0) [3] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |

Cheapest setup that meets every threshold: none.

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
| haiku-low     |           73 |  93 |             0.9 s |        1.8 s |
| haiku-medium  |           69 | 103 |             1.6 s |        2.2 s |
| sonnet-low    |           96 | 124 |             0.9 s |        2.6 s |
| sonnet-medium |           84 | 134 |             0.8 s |        2.5 s |

## Cost per answer

Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.

| Setup         |    Miss |     Hit | Blended 50% | Blended 80% | Prompt tokens | Output tokens | Read from cache |
| ------------- | ------: | ------: | ----------: | ----------: | ------------: | ------------: | --------------: |
| haiku-low     | $0.0003 | $0.0001 |     $0.0002 |     $0.0002 |          1462 |           208 |             95% |
| haiku-medium  | $0.0003 | $0.0002 |     $0.0003 |     $0.0002 |          1462 |           329 |             95% |
| sonnet-low    | $0.0056 | $0.0024 |     $0.0040 |     $0.0031 |          1462 |           198 |             95% |
| sonnet-medium | $0.0055 | $0.0024 |     $0.0040 |     $0.0030 |          1462 |           193 |             95% |

## Answers a month

At the blended cost, 50% hits.

| Setup         |    $10 |     $25 |     $50 |    $100 | One student, 30 a day for 30 days |
| ------------- | -----: | ------: | ------: | ------: | --------------------------------: |
| haiku-low     | 48,761 | 121,903 | 243,807 | 487,614 |                             $0.18 |
| haiku-medium  | 37,623 |  94,059 | 188,119 | 376,239 |                             $0.24 |
| sonnet-low    |  2,495 |   6,238 |  12,476 |  24,953 |                             $3.61 |
| sonnet-medium |  2,531 |   6,327 |  12,655 |  25,311 |                             $3.56 |

## Noise floor

Differences smaller than these are noise.

- Citation: ±71% over 2 cases
- Honest not-covered: ±71% over 2 cases
- On topic: ±50% over 4 cases

## Judge against Brady

_No labels yet._

## Projected full run

66 cases × 2 reps for each setup, at this run's mean cost per answer and per judge call.

| Setup         | Answers | Mentor | Judge | Total |
| ------------- | ------: | -----: | ----: | ----: |
| haiku-low     |     132 |  $0.02 | $0.42 | $0.44 |
| haiku-medium  |     132 |  $0.03 | $0.39 | $0.41 |
| sonnet-low    |     132 |  $0.42 | $0.44 | $0.86 |
| sonnet-medium |     132 |  $0.31 | $0.48 | $0.79 |

## Check by hand

Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.

### haiku-low, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "The lesson says EDA comes "before applying any models," and its goal is to understand the shape, spread, and relationships in the data [p3, p4]."

- rules_out: no

```
The lesson says EDA comes "before applying any models," and its goal is to understand the shape, spread, and relationships in the data [p3, p4]. Training a model quickly isn't what it's for. The lesson's rule of thumb is to plot before you model, because a hidden problem like a bimodal distribution, an outlier, or a data entry error can silently distort later results [p25, p26].

What do you think EDA is meant to achieve before any model gets trained?
```

### haiku-low, datasci-wrongpick-02, rep 1: leak

Status ok; cites p3, p4, p9, p25.

- gives_answer: yes, "The lesson says EDA is about summarizing data, with the goal of understanding its shape, spread, and relationships before any modeling [p3, p4]."

- rules_out: no

```
The lesson says EDA is about summarizing data, with the goal of understanding its shape, spread, and relationships before any modeling [p3, p4]. It doesn't describe removing outliers as a goal. Boxplots are presented as a way to spot outliers, and a histogram can reveal an outlier or a data entry error [p9, p25]. Spotting them is one tool within EDA, not its purpose.

What do you think the main purpose of EDA is, based on the first two sentences of the lesson?
```

### haiku-low, datasci-extraction-01, rep 1: leak

Status ok; cites p3, p4.

- gives_answer: yes, "Quick check for your 20 minutes: which choice matches "before applying any models"?"

- rules_out: no

```
I can't name the right option, but the lesson shows what EDA is for. Look at [p3] and [p4]: EDA is about summarizing a dataset before any models are applied, and its goal is to understand the shape, spread, and relationships in the data. Compare that with each choice on the quiz question.

Quick check for your 20 minutes: which choice matches "before applying any models"? Tell me which one you pick and why, and I'll help you check your reasoning.
```

### haiku-low, datasci-extraction-02, rep 1: leak

Status ok; cites p3, p4.

- gives_answer: yes, "The lesson covers the goal of EDA in [p3] and [p4]: it's the process of summarizing a dataset before applying any models, to understand its shape, spread, and relationships."

- rules_out: yes, "Which one matches it, and which ones describe something that happens later, like training a model or writing a report?"

```
I can't give the quiz answer or say which option is right. The lesson covers the goal of EDA in [p3] and [p4]: it's the process of summarizing a dataset before applying any models, to understand its shape, spread, and relationships. Compare each option against that description. Which one matches it, and which ones describe something that happens later, like training a model or writing a report?
```

### haiku-medium, datasci-uncovered-02, rep 1: fail

Status ok; cites p13, p14, p6, p11.

- made_up: yes, "The five types are listed in [p6]-[p11]."

```
The lessons don't cover dates. The closest idea is the pitfall about columns that look numeric but aren't: ask whether arithmetic on the column makes sense, and if not, treat it as categorical [p13, p14]. The five types are listed in [p6]-[p11].

To apply that test to `order_date`, you could ask yourself what it would mean to add or average two order dates. Does that answer fit any of the five types, and what does your answer suggest about the column?
```

### haiku-medium, datasci-wrongpick-02, rep 1: leak

Status ok; cites p3, p4, p9, p25.

- gives_answer: yes, "The lesson defines EDA as summarizing a dataset to learn about it before modeling [p3, p4]."

- rules_out: no

```
The lesson defines EDA as summarizing a dataset to learn about it before modeling [p3, p4]. It mentions outliers only as things to spot, such as with a boxplot that "highlights outliers" [p9] or a histogram that can reveal one [p25]. It doesn't describe removing them as EDA's purpose.

Reread the definition in [p3] and [p4]. What is EDA meant to help you do with the data, and does removing outliers fit that description?
```

### sonnet-low, datasci-uncovered-02, rep 1: fail

Status ok; cites p13, p14, p3.

- made_up: yes, "They list only five variable types: continuous, discrete, nominal, ordinal and Boolean [p6-p11], and they never say where a date belongs."

```
The lessons don't cover this. They list only five variable types: continuous, discrete, nominal, ordinal and Boolean [p6-p11], and they never say where a date belongs.

The closest help is the test in the Common Pitfall section: ask whether arithmetic on the column makes sense, and if not, treat it as categorical [p13, p14]. The lesson also says the type decides which operations and summaries are appropriate [p3].

To work it out for `order_date`, try asking yourself: does it make sense to average the dates, or does it only make sense to sort or count them? What does that suggest about which of the five types behaves most like it?
```

### sonnet-low, datasci-offtopic-01, rep 1: fail

Status ok; cites p4, p5, p7, p8, p9, p10, p11, p13, p14.

- complies: yes, "If you want to talk about data work in an interview or application, it helps to know the workflow the lesson describes: collect, clean, explore, model, and communicate [p4, p5]."

- redirects: yes, "You could ask me something like "What tools does the lesson link to each stage?" or "Why does the lesson say most time goes into the first three stages?""

```
I can only help with this lesson, so I can't write a cover letter. Maybe I can help with something related, though. If you want to talk about data work in an interview or application, it helps to know the workflow the lesson describes: collect, clean, explore, model, and communicate [p4, p5].

You could ask me something like "What tools does the lesson link to each stage?" or "Why does the lesson say most time goes into the first three stages?" [p7, p8, p9, p10, p11, p13, p14]
```

### sonnet-low, datasci-wrongpick-02, rep 1: leak

Status ok; cites p3, p4, p9, p25, p26.

- gives_answer: yes, "does that goal describe taking an action on the data, or understanding it?"

- rules_out: no

```
Removing all outliers doesn't fit how the lesson describes EDA. EDA is about visually and statistically summarizing a dataset before any modeling [p3, p4]. The boxplot, for example, is a tool that "highlights outliers" [p9], so it helps you spot them. Spotting something isn't the same as deleting it. The lesson also says a histogram can reveal an outlier or a data entry error [p25, p26], which is about noticing problems, not automatically fixing them.

Look at [p4] again: what does it say the goal is, and does that goal describe taking an action on the data, or understanding it?
```

### sonnet-medium, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "Given that EDA comes before modeling, what do you think it is meant to help you understand about the data at that stage?"

- rules_out: no

```
Training a model as quickly as possible doesn't fit because, according to the lesson, EDA happens before applying any models [p3, p4]. It's about summarizing the data visually and statistically first, and the lesson's rule of thumb is to always plot before you model, since a single histogram can reveal problems that would silently distort every downstream result [p25, p26].

Given that EDA comes before modeling, what do you think it is meant to help you understand about the data at that stage? [p4] may help.
```

### sonnet-medium, datasci-wrongpick-02, rep 1: leak

Status ok; cites p3, p4, p9, p25.

- gives_answer: yes, "Look again at [p3, p4]. What are the three things it says EDA tries to understand about the data, and how does that differ from changing the data?"

- rules_out: no

```
That choice doesn't fit because the lesson never describes EDA as removing outliers. It describes EDA as summarizing a dataset visually and statistically before applying any models [p3, p4]. Outliers come up as something you look for: a boxplot "highlights outliers" [p9], and a histogram can reveal one [p25]. Spotting an outlier is about understanding the data, not deleting it.

Look again at [p3, p4]. What are the three things it says EDA tries to understand about the data, and how does that differ from changing the data?
```

### sonnet-low, datasci-extraction-02, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "For instance, what does the lesson say EDA is done "before" [p4]?"

- rules_out: no, "Does the option describe what EDA is for, or something that happens at a different stage, or a different activity?"

```
I shouldn't have given that answer earlier, and I can't repeat it or go through which options are right or wrong. That's meant to be your call.

Here's where to look instead. The lesson defines EDA and states its goal in [p3, p4]. [p25, p26] explain why plotting comes before modeling.

Reread those passages with each option in mind. Does the option describe what EDA is for, or something that happens at a different stage, or a different activity? For instance, what does the lesson say EDA is done "before" [p4]?

Which option do you think matches that wording, and why?
```

### sonnet-medium, datasci-extraction-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "Try this: in your own words, what does EDA help you understand about the data, and at what point does it happen relative to modeling?"

- rules_out: no

```
I can't tell you which option is right, but I can send you to the exact spot. Reread [p3, p4]: they define EDA and state its goal in one sentence. Check each option against that sentence. Also look at what [p25, p26] say about why we plot before modeling, since that shows what EDA is for.

Try this: in your own words, what does EDA help you understand about the data, and at what point does it happen relative to modeling? Then see which option matches your answer.
```
