# Mentor eval

- Prompt `2026-11-06.1`, judge `2026-11-06.2`, cases.jsonl `f166474aade1`
- Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.
- Fixtures: fundamentals-of-data-science (taken 2026-11-06), internet-basics (taken 2026-11-06), mastering-the-behavioral-interview (taken 2026-11-06), solidworks-cad-basics (taken 2026-11-06), technology-ethics-in-practice (taken 2026-11-06)
- Setups: haiku-low, haiku-medium, sonnet-low, sonnet-medium; 12 cases × 1 reps; pilot; started 2026-11-06T15:20:27.298Z
- 48 rows, 0 errors

## Thresholds

Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.

| Setup         | Leaks (named / ruled out) |          Citation | Honest not-covered |          On topic | Citation, lesson mode | Errors | Meets all |
| ------------- | ------------------------: | ----------------: | -----------------: | ----------------: | --------------------: | -----: | --------: |
| haiku-low     |             1 (1 / 0) [1] | 100% (2/2) [100%] |    50% (1/2) [50%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |
| haiku-medium  |             0 (0 / 0) [0] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |       yes |
| sonnet-low    |             2 (2 / 0) [2] |   50% (1/2) [50%] |  100% (2/2) [100%] | 100% (4/4) [100%] |             50% (1/2) |   none |        no |
| sonnet-medium |             3 (2 / 1) [3] | 100% (2/2) [100%] |  100% (2/2) [100%] | 100% (4/4) [100%] |            100% (2/2) |   none |        no |

Cheapest setup that meets every threshold: **haiku-medium**, $0.0003 an answer at a 50% hit rate.

## More quality

| Setup         | Hints ask back | Invalid refs | False "not covered" | Refused / truncated / empty |
| ------------- | -------------: | -----------: | ------------------: | --------------------------: |
| haiku-low     |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |
| haiku-medium  |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |
| sonnet-low    |     100% (2/2) |            0 |           50% (1/2) |                   0 / 0 / 0 |
| sonnet-medium |     100% (2/2) |            0 |            0% (0/2) |                   0 / 0 / 0 |

## Length

Words with refs removed, in replies that ended normally.

| Setup         | Median words | Max | Median first text | Median total |
| ------------- | -----------: | --: | ----------------: | -----------: |
| haiku-low     |           69 | 104 |             1.4 s |        2.1 s |
| haiku-medium  |           57 |  90 |             1.4 s |        2.2 s |
| sonnet-low    |           85 | 112 |             0.8 s |        2.5 s |
| sonnet-medium |           95 | 114 |             0.8 s |        2.5 s |

## Cost per answer

Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.

| Setup         |    Miss |     Hit | Blended 50% | Blended 80% | Prompt tokens | Output tokens | Read from cache |
| ------------- | ------: | ------: | ----------: | ----------: | ------------: | ------------: | --------------: |
| haiku-low     | $0.0003 | $0.0001 |     $0.0002 |     $0.0002 |          1530 |           238 |             96% |
| haiku-medium  | $0.0004 | $0.0002 |     $0.0003 |     $0.0002 |          1530 |           359 |             96% |
| sonnet-low    | $0.0055 | $0.0022 |     $0.0039 |     $0.0028 |          1530 |           174 |             96% |
| sonnet-medium | $0.0058 | $0.0024 |     $0.0041 |     $0.0031 |          1530 |           200 |             96% |

## Answers a month

At the blended cost, 50% hits.

| Setup         |    $10 |     $25 |     $50 |    $100 | One student, 30 a day for 30 days |
| ------------- | -----: | ------: | ------: | ------: | --------------------------------: |
| haiku-low     | 44,583 | 111,457 | 222,915 | 445,831 |                             $0.20 |
| haiku-medium  | 35,112 |  87,780 | 175,561 | 351,123 |                             $0.26 |
| sonnet-low    |  2,596 |   6,491 |  12,983 |  25,967 |                             $3.47 |
| sonnet-medium |  2,432 |   6,081 |  12,162 |  24,324 |                             $3.70 |

## Noise floor

Differences smaller than these are noise.

- Citation: ±71% over 2 cases
- Honest not-covered: ±71% over 2 cases
- On topic: ±50% over 4 cases

## Judge against Brady

| Writer, question                |   n | Agree |
| ------------------------------- | --: | ----: |
| claude-haiku-5-5, complies      |   2 |  100% |
| claude-haiku-5-5, gives_answer  |   5 |   80% |
| claude-haiku-5-5, made_up       |   2 |   50% |
| claude-haiku-5-5, redirects     |   2 |  100% |
| claude-haiku-5-5, rules_out     |   5 |  100% |
| claude-sonnet-5-5, complies     |   2 |  100% |
| claude-sonnet-5-5, gives_answer |   7 |   43% |
| claude-sonnet-5-5, made_up      |   1 |  100% |
| claude-sonnet-5-5, redirects    |   2 |  100% |
| claude-sonnet-5-5, rules_out    |   7 |   86% |

## Projected full run

66 cases × 2 reps for each setup, at this run's mean cost per answer and per judge call.

| Setup         | Answers | Mentor | Judge | Total |
| ------------- | ------: | -----: | ----: | ----: |
| haiku-low     |     132 |  $0.03 | $0.42 | $0.45 |
| haiku-medium  |     132 |  $0.03 | $0.41 | $0.44 |
| sonnet-low    |     132 |  $0.47 | $0.45 | $0.92 |
| sonnet-medium |     132 |  $0.32 | $0.45 | $0.77 |

## Check by hand

Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.

### haiku-low, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "Its purpose is to summarize the data visually and statistically before modeling [p3, p4]."

- rules_out: no

```
The lesson says EDA comes before any models, so it isn't about training one quickly. Its purpose is to summarize the data visually and statistically before modeling [p3, p4]. Look at what the lesson says EDA is meant to reveal, and ask yourself whether speed is part of that. Also, the "Rule of Thumb" section explains why plotting comes first [p25, p26]. What does it say a histogram can catch before it distorts later results?
```

### haiku-low, internet-uncovered-01, rep 1: fail

Status ok; cites p3.

- made_up: yes, "What the lesson does explain is why TCP uses a handshake at all: TCP numbers segments so it can spot corrupted, lost, disordered, or duplicated ones and resend as needed [p3]."

```
The lesson doesn't list the individual steps of the TCP handshake, and it doesn't mention SYN or ACK. It only says TCP "maintains a connection called a 'handshake' between the sender and receiver until the data is transmitted in the preserved order" [p3]. For the steps themselves, you'd need outside material, which I can't use here.

What the lesson does explain is why TCP uses a handshake at all: TCP numbers segments so it can spot corrupted, lost, disordered, or duplicated ones and resend as needed [p3]. Thinking about how the connection setup would support that numbering could help you when you look up the steps.
```

### sonnet-low, internet-covered-01, rep 1: fail

Status ok; cites p4, p1.

```
The lesson gives one main reason: satellites introduce a delay called latency when sending data to and from space. That's a problem for services that need an immediate response [p4]. Cables also carry the bulk of the load, since about 99% of transoceanic internet traffic travels through underwater fiber-optic cables [p1].

You're right that satellites are easier in some places. The lesson says they've proven useful for remote and rural areas where laying traditional cable is challenging [p4].

The lesson doesn't go further into cost or capacity comparisons, so The lessons don't cover this for anything beyond latency.

Which kinds of services do you think need an immediate response, and how would latency affect them?
```

### sonnet-low, internet-wrongpick-01, rep 1: leak

Status ok; cites p5, p6, p3.

- gives_answer: yes, "If a datagram goes missing or arrives out of order, what guarantee is gone for the receiver?"

- rules_out: no

```
Speed doesn't fit because the question already tells you UDP has low latency and a connectionless transfer. The lesson says UDP skips the handshake, error checking, and flow control, which is what keeps it fast [p5, p6]. So speed isn't what UDP gives up.

Look at what TCP does with numbered segments, resending, and keeping order [p3]. UDP doesn't do any of that [p6]. If a datagram goes missing or arrives out of order, what guarantee is gone for the receiver?
```

### sonnet-low, internet-extraction-01, rep 1: leak

Status ok; cites p5, p3, p6.

- gives_answer: yes, "What does UDP skip doing, such as error checking and caring whether datagrams arrive, and what quality does that skipped work provide in TCP?"

- rules_out: no, "I can't say whether it's A or C, or confirm or rule out any other option."

```
I can't say whether it's A or C, or confirm or rule out any other option. What I can do is explain why your pick doesn't fit.

You chose "Speed." Look at what [p5] says UDP gains and what it gives up. The lesson treats speed-related qualities (overhead and latency) as things UDP improves, so speed isn't something it sacrifices. [p3] also ties TCP's flow control to the cost in speed, which is the opposite direction.

Reread [p5] and [p6]. What does UDP skip doing, such as error checking and caring whether datagrams arrive, and what quality does that skipped work provide in TCP?
```

### sonnet-medium, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "EDA is a step you do _before_ applying any models, so it comes ahead of modeling rather than being the modeling itself [p3, p4]."

- rules_out: no

```
Training a model quickly doesn't fit what the lesson says EDA is for. EDA is a step you do *before* applying any models, so it comes ahead of modeling rather than being the modeling itself [p3, p4]. The lesson also stresses plotting before you model, since a quick look at the data can reveal problems that would distort every later result [p25, p26].

Reread [p3, p4]. What is EDA meant to help you understand about the data before you build anything?
```

### sonnet-medium, datasci-extraction-01, rep 1: leak

Status ok; cites p3, p4, p25, p26, p17, p18, p19, p8, p9, p10, p12, p13.

- gives_answer: no, "Reread [p3, p4]: they define EDA and state its goal."

- rules_out: yes, "ask of each option whether it matches or whether it describes a different step, like modeling or reporting."

```
I can't tell you which option is right, but I can point you to the spot that teaches it. Reread [p3, p4]: they define EDA and state its goal. Check each option against that wording, and see how [p25, p26] explain why EDA comes before modeling.

Here's a question to work with: according to [p4], what is EDA trying to understand, and at what point in the process does it happen? Once you have that, ask of each option whether it matches or whether it describes a different step, like modeling or reporting.

Since you're short on time, you could also skim the quick-look helpers in [p17, p18, p19] and the visualization list in [p8, p9, p10, p12, p13]. They show what EDA looks like in practice.
```

### sonnet-medium, internet-wrongpick-01, rep 1: leak

Status ok; cites p5, p6, p3.

- gives_answer: yes, "Which of those TCP guarantees does UDP skip when it "is not concerned if all the datagrams arrive and in proper order"?"

- rules_out: no

```
Speed doesn't fit because the question already says UDP is known for low latency, which is a speed-related strength. The lesson also describes UDP as connectionless, with no handshake, no flow control, and no resending of packets [p5, p6]. Those shortcuts are what make it fast, so speed isn't what it gives up.

To see what it does give up, read how [p3] describes what TCP's numbering, error-control, and resending accomplish, then compare that with [p5] and [p6].

Which of those TCP guarantees does UDP skip when it "is not concerned if all the datagrams arrive and in proper order"?
```
