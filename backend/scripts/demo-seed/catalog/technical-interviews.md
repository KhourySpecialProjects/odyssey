---
name: Preparing for Technical Interviews
description: Know what each round tests, solve problems out loud, and practice in a way that carries over to the real thing.
overview: Technical interviews test how you solve problems and explain your thinking, not just whether you reach the answer. This droplet covers what each round looks like, a step-by-step way to work through a coding problem out loud, and how to practice so it shows on interview day.
funFact: The word algorithm comes from Algoritmi, the Latin form of the name of al-Khwarizmi, a ninth-century mathematician who worked at the House of Wisdom in Baghdad.
authors: contentcreator2, contentcreator1
type: skill
focusArea: professional
difficulty: intermediate
tags: career, algorithms
objectives:
- Describe the common rounds of a technical interview
- Work through a coding problem out loud, from clarifying questions to tests
- Improve a brute force solution with a dictionary
- Practice with mock interviews, timed problems and patterns
---

# Knowing what to expect

Technical interviews vary by company, but most follow a similar path. If you know the rounds ahead of time, you can prepare for each one instead of guessing.

## The usual rounds

| Round | What happens | How to prepare |
|---|---|---|
| Online assessment | You solve timed coding problems alone on a website, usually graded by automated tests | Practice timed problems in the language you'll use |
| Recruiter screen | A short call about your background, interests and availability | Have a short summary ready of who you are and what you're looking for |
| Technical interview | One or two problems in a shared editor while you explain your thinking | Practice solving problems out loud |
| Behavioral interview | Questions about how you've handled teamwork, conflict and mistakes | Prepare specific stories from projects, jobs and clubs |
| Final round | Several interviews in a row, often mixing coding and behavioral questions | Review your notes from earlier rounds and get a good night's sleep |

Not every company uses every round. Some combine rounds or give a take-home project instead of a live problem, and a few ask you to design a larger system, though that's less common for co-op and intern roles.

When a company invites you to interview, ask the recruiter what each round covers, which languages you can use, and whether you'll run your code. It's a normal question, and the answers tell you what to practice.

## What interviewers look for

The final answer is only part of a coding interview. Interviewers usually watch for:

- Whether you understand the problem before you start writing code.
- How clearly you explain your thinking as you go.
- Whether your code works and is easy to read.
- Whether you test it and catch your own bugs.
- How you respond to hints. Using a hint well counts in your favor.

%important Interviewers are judging how you think and communicate, not just whether your final code is right.

## Behavioral questions

Even technical interviews often include questions like "Tell me about a time you disagreed with a teammate." Answer with one specific story: the situation, what you did, and how it turned out. Have a few ready from group projects, jobs and clubs.

%%multiple-choice
- What are interviewers usually evaluating in a coding interview?
- Only whether your final code passes every test
- How you understand the problem, explain your thinking and test your code <
- How quickly you can type a solution
- Whether you've seen the problem before

# Solving a problem out loud

Most coding problems can be worked through with the same six steps. Saying each step out loud shows the interviewer how you think, and it keeps you from rushing into code.

1. **Clarify.** Restate the problem and ask about the inputs, the output and edge cases.
2. **Try examples.** Work through a small example by hand, plus an edge case or two.
3. **Start with brute force.** Describe the simplest correct solution and how fast it runs.
4. **Improve.** Look for repeated work you can remove.
5. **Code.** Write the solution, explaining as you go.
6. **Test.** Walk through your examples line by line, then the edge cases.

## A worked example: two sum

The interviewer says: given a list of integers and a target, return the indices of two numbers that add up to the target.

**Clarify.** Can I use the same element twice? No. Is there always an answer? Not always, so return `None` if there isn't one. Can numbers repeat or be negative? Yes.

**Try examples.** For `[2, 7, 11, 15]` and a target of 9, the answer is indices 0 and 1, because 2 + 7 is 9. For `[3, 3]` and a target of 6, it's 0 and 1, which checks that you never pair a number with itself.

**Start with brute force.** Check every pair. It's correct, but it takes O(n²) time, because each number gets compared with every number after it.

```python
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return i, j
    return None
```

**Improve.** For each number, the partner you need is `target - num`. Instead of searching the rest of the list for it, store each number you've seen in a dictionary that maps it to its index. Check for the partner before you add the current number, so a number can't pair with itself. Dictionary lookups take constant time on average, so one pass is enough: O(n) time, using O(n) extra space.

**Code.** Explain each line as you write it:

```python
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}  # number -> index where we saw it
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return seen[complement], i
        seen[num] = i
    return None
```

**Test.** Run your examples, then the edge cases:

```python
assert two_sum([2, 7, 11, 15], 9) == (0, 1)
assert two_sum([3, 2, 4], 6) == (1, 2)
assert two_sum([3, 3], 6) == (0, 1)
assert two_sum([1, 2, 3], 100) is None
assert two_sum([], 5) is None
print("All tests passed")
```

%warning Don't start coding until you and the interviewer agree on what the function takes and returns. Changing that halfway through costs more time than asking.

%%open-ended
- Why does the dictionary solution check for the partner before adding the current number?
- So a number can't be paired with itself. When you check first, the dictionary only holds earlier numbers, so any match is at a different index.

# Practicing well

Solving problems silently at your desk isn't the same as interviewing. Practice the way you'll be tested: out loud, on a clock, and with someone watching.

## Mock interviews

Pair up with a friend and take turns. One of you picks a problem and plays the interviewer, and the other solves it out loud. Afterwards, the interviewer gives honest feedback. Was the approach clear? Did you test your code? Did you go quiet when you got stuck?

Coding clubs sometimes run mock interviews, and your co-op advisor may know of other options.

## Timed practice

Set a timer for about as long as a real interview round, and take one problem all the way through: clarify, brute force, improve, code and test. When time's up, stop. If you didn't finish, study a solution, then come back a few days later and solve it again from scratch.

%caution Reading a solution and nodding along isn't practice. Close it and write the code yourself.

## Learn patterns, not answers

You probably won't get a problem you've already practiced, but you will see familiar patterns. After each problem, name the pattern it used, so the next problem with the same clue is easier to recognize.

| Pattern | Clue in the problem | Example |
|---|---|---|
| Hash map | You need to find a matching pair or count things | Two sum |
| Two pointers | A sorted list, or a string you can read from both ends | Check whether a word is a palindrome |
| Sliding window | The longest or shortest stretch of a list or string that meets a condition | Longest substring without repeated characters |
| Binary search | Sorted data and a value to find | Find a student ID in a sorted roster |
| Breadth-first search | The fewest steps between two points in a grid or unweighted graph | Shortest path out of a maze |
| Depth-first search | Visiting every node in a tree or every path in a graph | Maximum depth of a binary tree |

Keep a log of the problems you miss, with the pattern and what tripped you up. Revisit them a few days later.

## After the interview

- Send a short thank-you email to your recruiter or interviewer within a day.
- Write down the questions you were asked and how you answered while you still remember them.
- If you don't get an offer, ask the recruiter whether they can share feedback. Not every company does, but it's fine to ask.

%%true-false
- Once you understand a solution you've read, you can count that problem as practiced.
- false
