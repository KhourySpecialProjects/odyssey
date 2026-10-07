---
name: Big-O Notation Without the Fear
description: Read Big-O and spot it in code, so you can tell when a program will slow down as its data grows.
overview: Big-O describes how the work an algorithm does grows as its input grows. This droplet explains what it measures, walks through the common classes from O(1) to O(n²), and shows how to spot them in Python code.
funFact: The mathematician Paul Bachmann introduced Big-O notation in an 1894 book on number theory, decades before the first electronic computers.
authors: contentcreator1
type: knowledge
focusArea: technical
difficulty: beginner
tags: algorithms
objectives:
- Explain what Big-O measures and why it drops constants
- Compare the common classes from O(1) to O(n²)
- Estimate the Big-O of loops, nested loops, halving and membership checks in Python
---

# What Big-O measures

You can time your code with a stopwatch, but the number you get depends on your laptop, what else is running, and the input you happened to try. Big-O answers a more useful question: **as the input grows, how fast does the work grow?**

Say your club website keeps its member list in a Python list, and checking whether someone is a member means looking at each name in turn. With 100 members, that's up to 100 comparisons. With 10,000 members, it's up to 10,000. The work grows in step with the size of the input, and Big-O writes that as O(n), where n is the size of the input.

%definition Big-O notation describes how an algorithm's running time, or the memory it uses, grows as the size of its input, called n, grows.

## Counting steps, not seconds

Here's that membership check in code:

```python
def is_member(members, name):
    for member in members:
        if member == name:
            return True
    return False
```

If the name is first in the list, the function returns after one comparison. If the name isn't there at all, it compares against every member. Unless someone says otherwise, a Big-O describes the worst case, since that's a guarantee: no input of that size makes the code do more work. So `is_member` is O(n).

Big-O doesn't count seconds. It counts basic steps, like comparisons, additions and lookups, as a function of n, and it cares about how that count grows more than about its exact value.

## Dropping constants and smaller terms

Suppose an algorithm takes 3n² + 5n + 2 steps. For small inputs every term matters, but as n grows, the n² term takes over:

| n | 3n² | 5n | 2 |
|---|---|---|---|
| 10 | 300 | 50 | 2 |
| 1,000 | 3,000,000 | 5,000 | 2 |

At n = 1,000, the 5n + 2 part is less than 1 percent of the total. So Big-O keeps only the fastest-growing term and drops its constant factor:

$$3n^2 + 5n + 2 = O(n^2)$$

Constants like the 3 depend on details such as what you count as one step, and the seconds each step takes depend on your machine. Neither changes the shape of the growth: double n, and the work still roughly quadruples. That shape is what Big-O captures.

%more-information Formally, Big-O is an upper bound, so an O(n) algorithm is technically O(n²) too. In practice, people quote the tightest class that fits, and algorithms courses add Big-Omega and Big-Theta for lower and tight bounds.

%%multiple-choice
- An algorithm takes 4n + 10 steps on an input of size n. After dropping constants and smaller terms, what is its Big-O?
- O(1)
- O(log n)
- O(n) <
- O(n²)

# The common classes

Most code you'll write lands in one of a handful of Big-O classes. Here they are from slowest-growing to fastest-growing:

| Big-O | Name | Example | When n doubles |
|---|---|---|---|
| O(1) | Constant | Looking up a student by ID in a Python dictionary | The work stays about the same |
| O(log n) | Logarithmic | Finding a word in a printed dictionary by opening it in the middle, then halving | One more step |
| O(n) | Linear | Reading every name on a sign-up sheet | The work doubles |
| O(n log n) | Linearithmic | Sorting a class roster with sorted() | A little more than doubles |
| O(n²) | Quadratic | Every club member shaking hands with every other member | The work quadruples |

A few notes on the table:

- Dictionary and set lookups are O(1) on average. In rare cases they can be slower, but you can usually treat them as constant.
- The logs here are base 2, so log n is roughly how many times you can halve n before you reach 1. The base doesn't matter in Big-O, because switching bases only multiplies by a constant.
- The handshake example is quadratic because n members make n(n - 1)/2 handshakes, and that grows like n².

## How fast they grow

The gap between classes is small for small inputs and enormous for large ones:

| n | log n | n log n | n² |
|---|---|---|---|
| 10 | about 3 | about 33 | 100 |
| 1,000 | about 10 | about 10,000 | 1,000,000 |
| 1,000,000 | about 20 | about 20 million | 1 trillion |

Suppose each step takes one microsecond. On a million items, n log n steps take about 20 seconds, while n² steps take more than 11 days.

Some algorithms grow faster still. Exponential time, O(2ⁿ), doubles the work every time n grows by just one. That's what happens when code tries every possible subset, like every team you could form from a class of students.

%important Big-O tells you how code scales, not how fast it is on small inputs. For a list of 20 items, an O(n²) algorithm can beat an O(n log n) one that has more overhead.

%%true-false
- If an O(n²) function takes 1 second on 1,000 students, you would expect it to take about 4 seconds on 2,000 students.
- true

# Spotting complexity in code

You can estimate Big-O by reading code, without timing anything. Find the loops, work out how many times each one runs, and check what happens inside them.

## One loop over the input

```python
def highest_gpa(students):
    best = students[0]["gpa"]
    for student in students:
        if student["gpa"] > best:
            best = student["gpa"]
    return best
```

The loop visits each of the n students once and does a fixed amount of work each time, so `highest_gpa` is O(n). Two loops one after the other are still O(n): n + n is 2n, and Big-O drops the 2.

## A loop inside a loop

```python
def has_duplicate_email(emails):
    for i in range(len(emails)):
        for j in range(i + 1, len(emails)):
            if emails[i] == emails[j]:
                return True
    return False
```

For each email, the inner loop checks every email after it. In the worst case that's (n - 1) + (n - 2) + ... + 1 comparisons, which adds up to n(n - 1)/2, so the function is O(n²). When nested loops run over two different inputs, say n students and m courses, the total is O(n × m).

## Halving

```python
def find_id(sorted_ids, target):
    low, high = 0, len(sorted_ids) - 1
    while low <= high:
        middle = (low + high) // 2
        if sorted_ids[middle] == target:
            return middle
        if sorted_ids[middle] < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1
```

This is binary search on a sorted list of student IDs. Each pass through the loop throws away half of what's left, so a million IDs take at most 20 passes. Code that halves its input on every step is O(log n). Python's `bisect` module has binary search built in.

## Hidden loops

Some single lines are loops in disguise. `name in some_list` checks items one at a time until it finds a match, so it's O(n). `name in some_set` jumps straight to where the name would be stored, so it's O(1) on average. Inside a loop, that difference adds up.

```python
def members_attending(signups, members):
    return [name for name in signups if name in members]
```

If `members` is a list, every `in` check scans it, so n signups and m members cost O(n × m). Converting it to a set first makes each check O(1) on average:

```python
def members_attending(signups, members):
    member_set = set(members)
    return [name for name in signups if name in member_set]
```

Building the set takes O(m) once and the loop takes O(n), so the function is now O(n + m). Watch for other lines that hide a loop, too: `max()`, `sum()`, and the list methods `index()`, `remove()` and `insert(0, x)` are all O(n), and `sorted()` is O(n log n).

%caution A single line can hide a loop. Calling in, index or remove on a list inside a loop over a list of similar size turns an O(n) loop into O(n²).

%%open-ended
- A function loops over n signups and, for each one, uses in to check whether the name is in a list of n members. What is its Big-O, and how could you make it faster?
- It's O(n²), because each in check scans the whole members list. Converting the list to a set first makes each check O(1) on average, so the function becomes O(n).
