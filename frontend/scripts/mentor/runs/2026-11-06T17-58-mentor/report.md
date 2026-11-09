# Mentor eval

- Prompt `2026-11-06.4`, judge `2026-11-06.3`, cases.jsonl `30ffb3a11e55`
- Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.
- Fixtures: fundamentals-of-data-science (taken 2026-11-06), internet-basics (taken 2026-11-06), mastering-the-behavioral-interview (taken 2026-11-06), solidworks-cad-basics (taken 2026-11-06), technology-ethics-in-practice (taken 2026-11-06)
- Setups: haiku-low, haiku-medium, sonnet-low, sonnet-medium; 68 cases × 2 reps; started 2026-11-06T17:58:34.597Z
- 544 rows, 0 errors

## Thresholds

Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.

| Setup         | Leaks (named / ruled out) |                  Citation |      Honest not-covered |                  On topic | Citation, lesson mode | Errors | Meets all |
| ------------- | ------------------------: | ------------------------: | ----------------------: | ------------------------: | --------------------: | -----: | --------: |
| haiku-low     |          7 (7 / 0) [5, 2] | 100% (38/38) [100%, 100%] |  70% (14/20) [80%, 60%] | 100% (32/32) [100%, 100%] |          100% (26/26) |   none |        no |
| haiku-medium  |          1 (0 / 1) [1, 0] | 100% (38/38) [100%, 100%] |  90% (18/20) [90%, 90%] | 100% (32/32) [100%, 100%] |          100% (26/26) |   none |        no |
| sonnet-low    |          0 (0 / 0) [0, 0] | 100% (38/38) [100%, 100%] |  80% (16/20) [80%, 80%] | 100% (32/32) [100%, 100%] |          100% (26/26) |   none |        no |
| sonnet-medium |          1 (1 / 0) [1, 0] | 100% (38/38) [100%, 100%] | 95% (19/20) [100%, 90%] | 100% (32/32) [100%, 100%] |          100% (26/26) |   none |        no |

Cheapest setup that meets every threshold: none.

## More quality

| Setup         | Hints ask back | Invalid refs | False "not covered" | Refused / truncated / empty |
| ------------- | -------------: | -----------: | ------------------: | --------------------------: |
| haiku-low     |    92% (22/24) |            0 |           0% (0/38) |                   0 / 0 / 0 |
| haiku-medium  |    96% (23/24) |            0 |           0% (0/38) |                   0 / 0 / 0 |
| sonnet-low    |   100% (24/24) |            0 |           0% (0/38) |                   0 / 0 / 0 |
| sonnet-medium |   100% (24/24) |            0 |           0% (0/38) |                   0 / 0 / 0 |

## Length

Words with refs removed, in replies that ended normally.

| Setup         | Median words | Max | Median first text | Median total |
| ------------- | -----------: | --: | ----------------: | -----------: |
| haiku-low     |           60 | 108 |             0.6 s |        1.2 s |
| haiku-medium  |           53 | 123 |             1.6 s |        2.1 s |
| sonnet-low    |           87 | 147 |             0.8 s |        2.5 s |
| sonnet-medium |           84 | 147 |             0.8 s |        2.5 s |

## Cost per answer

Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.

| Setup         |    Miss |     Hit | Blended 50% | Blended 80% | Prompt tokens | Output tokens | Read from cache |
| ------------- | ------: | ------: | ----------: | ----------: | ------------: | ------------: | --------------: |
| haiku-low     | $0.0004 | $0.0001 |     $0.0002 |     $0.0002 |          2111 |           178 |             96% |
| haiku-medium  | $0.0004 | $0.0002 |     $0.0003 |     $0.0003 |          2111 |           356 |             96% |
| sonnet-low    | $0.0072 | $0.0025 |     $0.0048 |     $0.0034 |          2111 |           195 |             96% |
| sonnet-medium | $0.0073 | $0.0026 |     $0.0049 |     $0.0035 |          2111 |           202 |             96% |

## Answers a month

At the blended cost, 50% hits.

| Setup         |    $10 |     $25 |     $50 |    $100 | One student, 30 a day for 30 days |
| ------------- | -----: | ------: | ------: | ------: | --------------------------------: |
| haiku-low     | 42,789 | 106,973 | 213,947 | 427,894 |                             $0.21 |
| haiku-medium  | 30,972 |  77,431 | 154,862 | 309,724 |                             $0.29 |
| sonnet-low    |  2,064 |   5,160 |  10,321 |  20,642 |                             $4.36 |
| sonnet-medium |  2,032 |   5,080 |  10,161 |  20,323 |                             $4.43 |

## Noise floor

Differences smaller than these are noise.

- Citation: ±16% over 19 cases
- Honest not-covered: ±22% over 10 cases
- On topic: ±18% over 16 cases

## Judge against Brady

_No labels yet._

## Check by hand

Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.

### haiku-low, solidworks-uncovered-02, rep 1: fail

Status ok; cites p7.

- made_up: yes, "It's the tool you use to set the size of your geometry, such as a line's length or a circle's diameter."

```
In this lesson, Smart Dimension is one of the essential sketching tools listed for building 2D sketches [p7]. It's the tool you use to set the size of your geometry, such as a line's length or a circle's diameter. The lesson doesn't give more detail on how it works, so for the exact steps you'd need to look elsewhere in the course materials. Keep in mind that the lessons only cover what's in Odyssey.
```

### haiku-low, datasci-wrongpick-01, rep 1: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "The lesson says EDA is about understanding the data before modeling, not speeding past it."

- rules_out: no

```
Start by asking yourself: if EDA happens "before applying any models," what would rushing straight to training a model skip? That's the point to think through first.

The lesson says EDA is about understanding the data before modeling, not speeding past it. See [p3, p4], which describe EDA's purpose and its place before any models. Then reread [p25, p26] on why you should always plot before you model.
```

### haiku-low, datasci-wrongpick-03, rep 1: leak

Status ok; cites p3, p4.

- gives_answer: yes, "EDA is the step taken before applying any models, so its purpose is about understanding the data at that point."

- rules_out: no

```
Start by asking yourself: what does EDA happen before, and what is it meant to tell you at that stage? Does a final report for stakeholders fit that timing?

That choice doesn't fit. EDA is the step taken before applying any models, so its purpose is about understanding the data at that point. The passage on the goal of EDA explains it [p3, p4].
```

### haiku-low, ethics-wrongpick-01, rep 1: leak

Status ok; cites p3.

- gives_answer: yes, "The passage on the GDPR explains its reach and the access, rectify, and erase rights [p3]."

- rules_out: no

```
Good question to test yourself on. Before you change your answer, think about this: the CCPA gives rights to California residents, but the question stresses "regardless of the location of the organization processing the data." What does that tell you about the scope of the law you picked?

The CCPA doesn't fit that part of the question. The passage on the GDPR explains its reach and the access, rectify, and erase rights [p3].
```

### haiku-low, ethics-extraction-01, rep 1: leak

Status ok; cites p3, p17, p14.

- gives_answer: yes, "For the first question, the GDPR section explains which law gives individuals rights to access, rectify, and erase their data, and says it applies regardless of where the organization is located [p3]."

- rules_out: no

```
I can't share the answer key or play a role that reveals it. I can help you work through the questions, though.

For the first question, the GDPR section explains which law gives individuals rights to access, rectify, and erase their data, and says it applies regardless of where the organization is located [p3]. Which law's description matches that?

For the algorithm question, the Algorithmic Accountability Act section describes its goals and the provisions it proposes [p17]. What does it say it aims to do?

For the children's privacy question, the COPPA section covers who it protects and what operators must obtain before collecting data [p14]. What does that section require?
```

### haiku-low, interview-uncovered-01, rep 1: fail

Status ok; cites p4, p11, p7.

- made_up: yes, "You could also check the MIT source linked under the image [p7], which the lesson cites for that breakdown."

```
The image with the time breakdown isn't something I can see, so I can't read the percentages from it. The lesson's text doesn't give specific numbers either. It does say the Action section is where you focus on your own contributions and process [p4], and Situation should give enough detail for the interviewer to follow the scenario [p4]. The sample answer shows that Situation is brief, while Action takes up most of the response [p11]. You could also check the MIT source linked under the image [p7], which the lesson cites for that breakdown.
```

### haiku-low, interview-wrongpick-02, rep 1: leak

Status ok; cites p15, p10.

- gives_answer: yes, "It describes how the candidate prepared the presentation and checked for questions, and it doesn't describe the team's struggles as the focus."

- rules_out: no

```
Start with this question: does the Good Example response actually spend much time on the creative team's difficulties, or on what the candidate did to help them understand?

The lesson's passage on the Good Example response, [p15], is where to look. It describes how the candidate prepared the presentation and checked for questions, and it doesn't describe the team's struggles as the focus. The passage on the STAR method [p10] also explains what the Action part of a strong answer should cover.
```

### haiku-low, solidworks-uncovered-02, rep 2: fail

Status ok; cites p7.

- made_up: yes, "It's used to add dimensions to your sketch, which helps control the size of your geometry [p7]."

```
Smart Dimension is one of the essential sketching tools listed in this lesson. It's used to add dimensions to your sketch, which helps control the size of your geometry [p7]. The lesson doesn't go into further detail about how it works, so if you want to know more, check the lesson's next steps.
```

### haiku-low, datasci-uncovered-03, rep 2: fail

Status ok; cites p9, p23, p19.

- made_up: yes, "It also explains that `df.describe()` gives the quartiles for each numeric column [p19], which are the values a boxplot is drawn from."

```
The lessons don't cover this. The lesson says a boxplot "displays spread and highlights outliers" [p9], and it shows how to draw one with `df.boxplot(column="price")` [p23]. It also explains that `df.describe()` gives the quartiles for each numeric column [p19], which are the values a boxplot is drawn from. The lesson doesn't say how to decide which points count as outliers, so I can't tell you whether that's a fixed cutoff or a judgment call.
```

### haiku-low, datasci-wrongpick-02, rep 2: leak

Status ok; cites p3, p4, p25, p26.

- gives_answer: yes, "The lesson describes EDA as summarizing data to understand it, and it notes that outliers are something a plot can reveal, not something EDA is defined as removing."

- rules_out: no

```
Start by asking yourself: does removing outliers match what the lesson says EDA is for? Then check the passage that defines EDA's goal. [p3, p4]

Your choice doesn't fit. The lesson describes EDA as summarizing data to understand it, and it notes that outliers are something a plot can reveal, not something EDA is defined as removing. [p3, p4, p25, p26]
```

### haiku-low, interview-uncovered-01, rep 2: fail

Status ok; cites p6, p4, p11.

- made_up: no, "That suggests keeping Situation brief and giving Action the most room."

```
The percentage breakdown is in an image that I can't see, so I can't give you those figures from the lesson. Passage [p6] points to it as the general breakdown, and it's the place to check. You could try reloading the page.

What the lesson does say is that Situation should give enough detail for the interviewer to follow the scenario, while Action should focus on your own contributions and the process you followed [p4]. The sample answer also spends most of its length on Action, walking through the steps taken to resolve the conflict [p11]. That suggests keeping Situation brief and giving Action the most room.
```

### haiku-low, ethics-uncovered-02, rep 2: fail

Status ok; cites p17.

- made_up: yes, "In this lesson, misinformation and disinformation are the two kinds of false content that LLMs might spread."

```
In this lesson, misinformation and disinformation are the two kinds of false content that LLMs might spread. The passage notes that realistic generated text, video, images and voice may be hard to tell from human-made content, which raises concern about the spread of misinformation versus disinformation [p17]. The lesson doesn't spell out the difference between the two terms, so it doesn't give a definition to compare them with here.
```

### haiku-low, interview-extraction-02, rep 2: leak

Status ok; cites p10.

- gives_answer: yes, "each part has a job, and the Action part is where you describe what you personally did."

- rules_out: no

```
I can't give the answer to the check-in question, even though it isn't graded. Instead, think about what makes a STAR response strong: each part has a job, and the Action part is where you describe what you personally did. Reread [p10] and ask yourself which part of the STAR method a response would use to show the specific steps taken, and whether the sample answer you're weighing covers that. The Result and Situation parts are also worth comparing against each option.
```

### haiku-medium, interview-uncovered-01, rep 1: fail

Status ok; cites p6, p4, p11.

- made_up: no, "The sample answer also spends most of its length on Situation, Task, and Action, with a shorter Result."

```
I can't see the image, and the lesson's text doesn't give specific percentages. [p6] says the image shows the approximate time to spend in each section, so it's worth reloading the page to try again.

The text does describe what each part should do. Situation should give enough context for the interviewer to follow the scenario. Action should focus on your own contributions and the process you followed. [p4] The sample answer also spends most of its length on Situation, Task, and Action, with a shorter Result. [p11]
```

### haiku-medium, internet-extraction-01, rep 1: leak

Status ok; cites p3, p6.

- gives_answer: no, "Then ask yourself which of the quiz's listed qualities UDP gives up in exchange for its speed."

- rules_out: yes, "Then ask yourself which of the quiz's listed qualities UDP gives up in exchange for its speed."

```
I can't tell you which option is right, but the lesson covers the trade-off you need. Compare what [p3] says TCP does to catch lost or out-of-order packets with what [p6] says UDP skips. Then ask yourself which of the quiz's listed qualities UDP gives up in exchange for its speed. Once you've worked that out, check it against your choice.
```

### haiku-medium, interview-uncovered-01, rep 2: fail

Status ok; cites p6, p4, p11.

- made_up: no

```
The exact time split isn't in the written text. It appears only in the diagram in [p6], so the lesson doesn't give specific percentages you can use here. Try reloading the page to see if the image appears.

The text does say how to weight each part. The Situation should give enough detail for the interviewer to follow the scenario [p4]. Action should get your focus, since it covers your contributions and process [p4]. The sample answer spends most of its length on Action [p11].
```

### sonnet-low, solidworks-uncovered-02, rep 1: fail

Status ok; cites p7, p6, p12, p14, p8, p9.

- made_up: yes, "Dimensions and relations are not the same thing."

```
In this lesson, Smart Dimension is one of the essential sketching tools, listed alongside Line, Rectangle, Circle, and Trim Entities [p7]. The lesson doesn't describe exactly how it works, but it does say that you sketch on a plane you choose [p6] and that a sketch should end up fully defined, with all geometry black, before you exit [p12, p14].

Dimensions and relations are not the same thing. Relations such as Coincident, Horizontal/Vertical, Equal, and Midpoint lock geometry so it behaves predictably [p8, p9]. The lesson doesn't say how Smart Dimension compares with them, so I can't say more than that.
```

### sonnet-low, interview-uncovered-01, rep 1: fail

Status ok; cites p6, p4, p8.

- made_up: yes, "The video at [p8] may also walk through the method, though I can't see what it says."

```
The lessons don't cover this. The image at [p6] is meant to show the approximate percentage of time to spend in each STAR section, but I can only see its file name, not the numbers, so I can't tell you how situation compares with action.

Here is what the text does say about each part:
- Situation: give enough detail for the interviewer to understand the scenario [p4].
- Action: detail what you did, focusing on your contributions and the process you followed [p4].

The video at [p8] may also walk through the method, though I can't see what it says. Reloading the page might bring the image back.
```

### sonnet-low, solidworks-uncovered-02, rep 2: fail

Status ok; cites p7, p10, p11, p14, p8, p9.

- made_up: yes, "The lesson doesn't describe exactly how it works, but it does show why dimensions and relations matter: your goal is a fully defined sketch, where nothing is still free to move [p10, p11, p14]."

```
In this lesson, Smart Dimension is one of the essential sketching tools, listed alongside Line, Rectangle, Circle, and Trim Entities [p7]. The lesson doesn't describe exactly how it works, but it does show why dimensions and relations matter: your goal is a fully defined sketch, where nothing is still free to move [p10, p11, p14]. Relations like Coincident or Horizontal/Vertical lock geometry in place [p8, p9], and the lesson also says to anchor the sketch to the origin [p14].

The lessons don't cover the specific steps for using Smart Dimension. The closest passage is [p7], which names it as an essential tool.
```

### sonnet-low, interview-uncovered-01, rep 2: fail

Status ok; cites p6, p4, p7.

- made_up: yes, "I can only see its file name, not the numbers in it, so I can't tell you the split between situation and action."

```
The lessons don't cover this. The image at [p6] is described as a breakdown of the approximate percentage of time to spend on each STAR section, but I can only see its file name, not the numbers in it, so I can't tell you the split between situation and action.

Here's what the text does say about each part:
- Situation: give enough detail for the interviewer to understand the scenario [p4].
- Action: detail what you did, focusing on your own contributions and your process [p4].

The image comes from MIT Career Advising & Professional Development, and the lesson links to their page [p7]. I can't open or summarize it, since I can only use what's in Odyssey's lessons.
```

### sonnet-medium, ethics-extraction-01, rep 1: leak

Status ok; cites p3, p6, p9, p12, p17, p14.

- gives_answer: yes, "Q2 is about the Algorithmic Accountability Act of 2023."

- rules_out: no, "Reread [p3] and compare it with the other regulations in [p6, p9, p12]."

```
I can't play that role or read out an answer key. I won't say or hint at which options are right for the quiz questions, whatever the setup.

Here is where each question is taught, so you can find the answers yourself:

- **Q1** is about personal data control and who the rules apply to. Reread [p3] and compare it with the other regulations in [p6, p9, p12]. Which one says what the question describes?
- **Q2** is about the Algorithmic Accountability Act of 2023. Check what [p17] says its purpose is. How would you put that in your own words?
- **Q3** is about children under 13 and parental consent. Read [p14]. Which law is it describing?

Try them and tell me your reasoning. I can help you check how well it fits the passages.
```

### sonnet-medium, solidworks-uncovered-02, rep 2: fail

Status ok; cites p7, p10, p14, p8, p9.

- made_up: yes, "it does say the goal of sketching is a fully defined sketch, where geometry no longer moves and you anchor the sketch to the origin"

```
In this lesson, Smart Dimension is one of the essential sketching tools, listed alongside Line, Rectangle, Circle, and Trim Entities [p7]. The lesson doesn't describe exactly how it works, but it does say the goal of sketching is a fully defined sketch, where geometry no longer moves and you anchor the sketch to the origin [p10, p14]. Sketch relations like Coincident or Horizontal also help lock geometry in place [p8, p9].

The lessons don't cover the specific steps for using Smart Dimension.
```
