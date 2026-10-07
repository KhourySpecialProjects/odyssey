---
name: Study Strategies That Actually Work
description: Swap rereading and cramming for study habits that help you remember the material on exam day.
overview: Rereading and cramming feel productive, but they don't hold up well on exam day. This droplet covers the study habits that learning research supports, and how to use them in your CS courses.
funFact: Rubber duck debugging takes its name from a story in The Pragmatic Programmer, a 1999 book by Andrew Hunt and David Thomas, in which a programmer carries around a rubber duck and explains code to it.
authors: contentcreator2
type: knowledge
focusArea: personal
difficulty: beginner
tags: study-skills
objectives:
- Use retrieval practice instead of rereading
- Space out study sessions and mix problem types
- Prepare for CS exams by tracing and writing code by hand
- Walk into an exam practiced and rested
---

# Testing yourself instead of rereading

Rereading your notes and highlighting feel productive. The material starts to look familiar, so it feels learned. But recognizing something on a page isn't the same as recalling it on an exam, with nothing in front of you but the question.

%definition Retrieval practice means pulling information out of your memory, for example by answering questions with your notes closed.

Studies of student learning consistently find that retrieval practice leads to better long-term memory than spending the same time rereading. Each time you pull an idea out of memory, it gets easier to recall the next time.

## Ways to test yourself

- After a lecture, close your notes and write down everything you remember. Then open them and fill in what you missed.
- Turn your notes into questions. Answering "What's the difference between a list and a tuple in Python?" does more for you than rereading the slide with the answer.
- Use flashcards, and say or write each answer before you flip the card.
- Try practice problems before you look at the worked example.

## Check your answers

Testing yourself only helps if you find out what you got wrong. Check each answer against your notes, the textbook or a solution, and start your next session with the questions you missed.

## Expect it to feel harder

Recalling is harder than rereading, and you'll get things wrong at first. That's normal. The effort of pulling an answer out of memory is part of what makes it stick, and every miss shows you exactly what to study next. Researchers call this kind of productive struggle a desirable difficulty.

%warning Feeling familiar with your notes isn't the same as knowing them. Close them and test yourself to find out.

%%multiple-choice
- Which of these is retrieval practice?
- Rereading the chapter the night before the exam
- Highlighting the key terms in your notes
- Writing down everything you remember with your notes closed <
- Copying your notes into a neater notebook

# Spacing and mixing your practice

How you schedule your studying matters, not just how many hours you put in. Two changes to your schedule make the same hours count for more: spreading your sessions out and mixing problem types.

## Spread your sessions out

Cramming packs your studying into one long session right before an exam. It can get you through the next morning, but much of it fades soon after, just when the final needs it. **Spacing** means studying the same material in several shorter sessions over days or weeks. Studies consistently find that spaced practice leads to longer-lasting memory than the same amount of time in one sitting.

A simple schedule for each lecture:

1. Quiz yourself on it the next day.
2. Quiz yourself again a few days later.
3. Revisit it a week or two after that, mixed in with newer material.

Flashcard apps that use spaced repetition do this scheduling for you, and show you the cards you miss more often.

## Mix problem types

When you practice, you can **block**, doing ten problems of one type before moving to the next, or **interleave**, mixing types in one session. Blocking feels smoother, because you know which method to use before you read the problem. An exam won't tell you which method to use, and interleaving makes you practice that choice. Studies of math and problem-solving practice often find that students who interleave do better on later tests, even though practice feels harder.

Here's what a week of spaced, mixed practice might look like in CS 3200:

| Day | Study session |
|---|---|
| Monday | After the joins lecture, write two join queries |
| Tuesday | Write three join queries from memory and check them |
| Thursday | Solve a mixed set of join, GROUP BY and subquery problems |
| Next Monday | Quiz yourself on last week before starting the new topic |

%important Spaced, mixed practice feels slower than cramming one topic at a time. That feeling doesn't mean you're learning less.

%%true-false
- Spreading your study time over several days usually leads to better long-term memory than spending the same amount of time in one session.
- true

# Studying for CS exams

Many CS exams ask you to read and write code with no computer to run it. Practice under the same conditions.

## Trace code by hand

Before you run a snippet, predict exactly what it prints. Track every variable in a table as it changes:

```python
total = 0
for i in range(1, 5):
    if i % 2 == 0:
        total += i
print(total)
```

| i | Even? | total |
|---|---|---|
| 1 | No | 0 |
| 2 | Yes | 2 |
| 3 | No | 2 |
| 4 | Yes | 6 |

`range(1, 5)` stops before 5, so the loop ends after `i` is 4 and the code prints 6. If you predicted something else, you've found exactly what to review.

## Write code without an editor

If your exam is on paper, practice on paper. Write complete functions by hand, with no autocomplete and no running. Then type your code in exactly as written and run it. Every error you find, from a missing colon to a loop that runs one time too many, is something to practice before the exam.

## Explain it to someone else

Explain a topic out loud to a friend, a study group or even a rubber duck. The moment you say "and then it just works", you've found a gap to fill. In a study group, take turns: each person teaches one topic, and the others ask questions.

## Take a practice exam

If your instructor shares practice or past exams, take at least one under exam conditions: timed, closed notes and no phone. Use the rest to practice topic by topic.

## Sleep before the exam

Research on sleep and memory consistently finds that sleep helps you hold on to what you studied, and that losing sleep hurts attention and problem solving. An all-nighter trades a night of sleep for a few hours of tired review.

%caution Don't spend the night before an exam learning new material. Review what you know with a short self-quiz, then go to bed.

%%open-ended
- Why is tracing code by hand good preparation for a CS exam?
- It makes you predict exactly what the code does step by step, the way exam questions do, so a wrong prediction shows you what you don't understand yet.
