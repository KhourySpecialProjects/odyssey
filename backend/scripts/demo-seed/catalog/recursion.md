---
name: Thinking Recursively
description: Write functions that call themselves, trace them on the call stack, and know when a loop is the better tool.
overview: A recursive function solves a problem by solving a smaller version of the same problem. This droplet covers base cases and recursive cases, what the call stack does while recursion runs, and why recursion suits nested data like folder trees.
funFact: The name of the GNU free software project is a recursive acronym that stands for GNU's Not Unix.
authors: contentcreator1
type: skill
focusArea: technical
difficulty: intermediate
tags: algorithms, python
objectives:
- Write a recursive function with a base case and a recursive case
- Trace recursive calls on the call stack and explain a RecursionError
- Use recursion to process nested data, and recognize when a loop is simpler
---

# Base case and recursive case

A **recursive function** is a function that calls itself. That sounds circular, but it works as long as each call hands a smaller version of the problem to the next one, until the problem is small enough to answer directly.

Take adding up the credits on your schedule. The total of `[4, 4, 1, 4]` is 4 plus the total of `[4, 1, 4]`. That's the same problem, one item shorter. Keep going and you reach the empty list, whose total is 0.

```python
def total_credits(credits):
    if not credits:  # base case: an empty list
        return 0
    return credits[0] + total_credits(credits[1:])  # recursive case


print(total_credits([4, 4, 1, 4]))  # 13
```

%definition The base case is an input the function answers directly, without calling itself. The recursive case covers every other input by calling the function again on a smaller one.

## The two parts

Every recursive function needs both:

- A **base case** that returns an answer without recursing. Here it's the empty list, whose total is 0.
- A **recursive case** that makes the problem smaller, calls the function on the smaller problem, and uses the result. Here `credits[1:]` is the list without its first item, and the function adds `credits[0]` to the total of the rest.

The recursive case has to move toward the base case. If `total_credits` passed along the same list instead of `credits[1:]`, it would never reach the empty list, and the calls would continue until Python stopped them. The next lesson shows what that looks like.

## Three questions for writing one

When you write a recursive function, answer these in order:

1. What's the smallest input, and what's the answer for it?
2. How can I make the input smaller?
3. If the function already worked on the smaller input, how would I use that answer?

The third question takes practice. While you're writing the function, don't try to trace every call in your head. Assume the recursive call returns the right answer for the smaller input, and work out only the one step that's left.

Here's that process for reversing a string. The smallest inputs are strings of zero or one characters, which are their own reverse. A string gets smaller when you drop its first character. And once the rest of the string is reversed, the first character goes on the end.

```python
def reverse(text):
    if len(text) <= 1:
        return text
    return reverse(text[1:]) + text[0]


print(reverse("khoury"))  # yruohk
```

%%multiple-choice
- In total_credits, which input does the base case handle?
- A list with one item
- An empty list <
- The first item of the list
- Any list longer than 1,000 items

# Following the call stack

When one function calls another, Python pauses the caller, runs the function it called, and picks up where it left off once that function returns. To keep track, it uses the **call stack**. Each call that's still running gets a frame holding its arguments and local variables, and the newest frame sits on top. Recursion works the same way, except that every frame belongs to the same function.

%definition The call stack holds the function calls that have started but not yet returned. Each call has its own frame, with its own arguments and local variables.

## Tracing a call

This version of `total_credits` prints each call as it starts and each result as it returns, indented by how deep the call is.

```python
def total_credits(credits, depth=0):
    indent = "    " * depth
    print(f"{indent}total_credits({credits})")
    if not credits:
        result = 0
    else:
        result = credits[0] + total_credits(credits[1:], depth + 1)
    print(f"{indent}returns {result}")
    return result


total_credits([4, 1, 4])
```

```text
total_credits([4, 1, 4])
    total_credits([1, 4])
        total_credits([4])
            total_credits([])
            returns 0
        returns 4
    returns 5
returns 9
```

Read it from the top. Four calls start before any of them finishes, so at the deepest point all four frames are on the stack at once. The call on the empty list is the last to start and the first to return. Then each waiting frame finishes its own addition with the value it got back: 4 + 0, then 1 + 4, then 4 + 5.

Each frame also has its own `credits`. While the deepest call sees an empty list, the first call's `credits` is still `[4, 1, 4]`.

## Forgetting the base case

Here's a countdown with no base case:

```python
def count_down(n):
    print(n)
    count_down(n - 1)


count_down(3)
```

It prints 3, 2, 1, 0, -1 and keeps going. Every call adds a frame, and no call ever returns. CPython, the standard Python interpreter, sets a recursion limit of 1,000 by default, so after about a thousand numbers the program stops with an error whose last line starts like this:

```text
RecursionError: maximum recursion depth exceeded
```

The fix is a base case that the recursive case moves toward:

```python
def count_down(n):
    if n <= 0:
        print("Done")
        return
    print(n)
    count_down(n - 1)
```

Using `<=` rather than `==` means a negative start, or a fractional one like 2.5, still stops.

%warning A RecursionError usually means a missing base case, or a recursive case that never reaches it. Check for those before you raise the limit with sys.setrecursionlimit.

%%true-false
- When a recursive function runs, the first call to start is also the first call to return.
- false

# Recursion on nested data

Adding up a flat list doesn't really need recursion, since a loop or `sum()` does it more simply. Recursion earns its place when the data contains smaller versions of itself: folders inside folders, replies to replies in a discussion thread, JSON objects inside JSON objects.

## Walking a folder tree

Here's a group project's folder, written as nested dictionaries. Each folder has a list of files and a list of subfolders, and each subfolder has the same shape.

```python
project = {
    "name": "group-project",
    "files": ["README.md", "requirements.txt"],
    "folders": [
        {"name": "data", "files": ["students.csv"], "folders": []},
        {
            "name": "src",
            "files": ["app.py", "grades.py"],
            "folders": [
                {"name": "tests", "files": ["test_grades.py"], "folders": []},
            ],
        },
    ],
}
```

To count every file, count the files in this folder, then add the count for each subfolder. Counting a subfolder is the same problem on a smaller folder.

```python
def count_files(folder):
    count = len(folder["files"])
    for subfolder in folder["folders"]:
        count += count_files(subfolder)
    return count


print(count_files(project))  # 6
```

There's no `if` for the base case. A folder with no subfolders is the base case: the loop body never runs, and the function returns that folder's own file count.

A plain loop struggles here, because you don't know ahead of time how deep the folders go. Recursion follows each branch as far down as it goes, then comes back up.

The same idea works on real folders with `pathlib`. The standard library's `os.walk()` can do this walk for you, but writing it once shows what it's doing.

```python
from pathlib import Path


def count_files(folder):
    count = 0
    for entry in folder.iterdir():
        if entry.is_dir():
            count += count_files(entry)
        else:
            count += 1
    return count


print(count_files(Path(".")))
```

`Path(".")` is the folder you run the code from, so this counts every file in it and in all of its subfolders.

## When a loop is the better tool

- **Flat data.** For a list of credits or a roster, a loop or a built-in like `sum()` or `max()` is shorter, clearer and faster.
- **Very deep data.** Every level of recursion adds a frame, so the `total_credits` from the first lesson raises a RecursionError on a list of 5,000 credits, while `sum()` handles millions. Unlike some languages, Python doesn't optimize tail calls, so how you write the recursive call doesn't change this.
- **Hidden copying.** `credits[1:]` copies the rest of the list on every call, so the recursive `total_credits` does far more work than a loop would.

%important Reach for recursion when a problem breaks into smaller problems of the same shape, like folders inside folders. For a flat list, a loop is simpler and can't hit the recursion limit.

%%open-ended
- Why does count_files suit recursion better than total_credits does?
- Folders can be nested to any depth, and recursion follows each branch however deep it goes. A flat list of credits is simpler with a loop or sum(), and recursing over a long list can hit the recursion limit.
