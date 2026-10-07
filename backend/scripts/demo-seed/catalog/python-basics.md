---
name: Python Basics for Data Work
description: The Python you need before pandas, from variables and f-strings to lists, loops and functions.
overview: Most data work in Python is built from a handful of pieces you'll use every day. This droplet covers values and types, lists and dictionaries, and the loops, conditions and functions that turn a list of student records into answers.
funFact: Python is named after the BBC comedy series Monty Python's Flying Circus, not the snake.
authors: contentcreator1
type: skill
focusArea: technical
difficulty: beginner
tags: python, data-science
objectives:
- Store numbers, text and true or false values in variables and format them with f-strings
- Read, add and change items in lists and dictionaries
- Total and filter a list of records with loops and conditions
- Write functions that return a result you can reuse
---

# Values, variables and types

Every piece of data in a Python program is a **value**: a number like `16`, some text like `"Data Science"`, or `True`. To use a value later, give it a name with `=`. That name is a **variable**.

```python
name = "Priya Patel"
major = "Data Science"
credits = 16
gpa = 3.7
on_coop = False
```

%definition A variable is a name that refers to a value. Assigning to the same name again makes it refer to the new value.

Every value also has a **type**, which decides what you can do with it. `type()` tells you which one you have.

```python
print(type(credits))  # <class 'int'>
print(type(gpa))      # <class 'float'>
print(type(name))     # <class 'str'>
print(type(on_coop))  # <class 'bool'>
```

## Numbers

Whole numbers are `int` and numbers with a decimal point are `float`. Arithmetic works the way you'd expect, plus a few operators that come up often in data work.

```python
print(16 + 4)   # 20
print(7 / 2)    # 3.5 (dividing with / always gives a float)
print(7 // 2)   # 3 (floor division rounds down)
print(7 % 2)    # 1 (the remainder)
print(2 ** 10)  # 1024 (a power)
```

Dividing with `/` always gives a float, even when the answer is whole: `8 / 4` is `2.0`. Floats are stored in binary, so some decimals can't be stored exactly: `0.1 + 0.2` gives `0.30000000000000004`. Round results when you display them, and be careful comparing floats with `==`.

## Strings and booleans

A string (`str`) is text inside quotes, single or double. Join strings with `+`, and use string methods for common cleanup jobs.

```python
full_name = "Priya" + " " + "Patel"
print(len(full_name))             # 11
print(full_name.upper())          # PRIYA PATEL
print("  Data Science ".strip())  # Data Science
```

A boolean (`bool`) is either `True` or `False`. Comparisons such as `==`, `!=` and `>=` produce booleans, and `and`, `or` and `not` combine them.

```python
print(gpa >= 3.5)                     # True
print(credits >= 12 and not on_coop)  # True
```

## Converting and formatting

Data from files and forms often arrives as text, even when it looks like a number. Convert it with `int()` or `float()` before doing math, and with `str()` to go the other way.

To build a message from values, use an **f-string**: put `f` before the opening quote and each value in curly braces. After a colon you can format the value, so `:.2f` shows two decimal places.

```python
credits_text = "16"
print(int(credits_text) + 4)
print(f"{full_name} has {credits} credits and a {gpa:.2f} GPA.")
```

```text
20
Priya Patel has 16 credits and a 3.70 GPA.
```

%warning Python won't turn text into a number on its own. "16" + 4 raises a TypeError, so convert with int() or float() first.

%%multiple-choice
- What type is the result of 6 / 2 in Python?
- int
- float <
- str
- bool

# Lists and dictionaries

One value at a time won't get you far with data. You'll usually have a column of grades or a whole roster, and Python's two everyday containers hold them: lists and dictionaries.

## Lists

A **list** keeps values in order, inside square brackets. Each item has a position, called its index, and indexes start at 0.

```python
grades = [88, 92, 79, 95]
print(grades[0])    # 88 (the first item)
print(grades[-1])   # 95 (negative indexes count from the end)
print(grades[1:3])  # [92, 79] (from index 1 up to, not including, 3)
print(len(grades))  # 4
```

%warning A list of 4 items has indexes 0 to 3. Asking for grades[4] raises an IndexError.

Lists can change after you create them. `append()` adds an item to the end, and assigning to an index replaces the item there. The built-in functions `sum()`, `max()` and `min()` work on any list of numbers.

```python
grades.append(84)
grades[2] = 81
print(grades)                     # [88, 92, 81, 95, 84]
print(95 in grades)               # True
print(sum(grades) / len(grades))  # 88.0
```

## Dictionaries

A **dictionary** stores values under keys, so you look things up by name instead of by position. Keys are usually strings.

```python
student = {"name": "Priya Patel", "major": "Data Science", "gpa": 3.7}
print(student["major"])      # Data Science
student["credits"] = 16      # add a new key
student["gpa"] = 3.8         # replace a value
print(student.get("email"))  # None
```

Square brackets raise a `KeyError` when the key is missing. `get()` returns `None` instead, or a default you pass as a second argument, like `student.get("email", "unknown")`.

## A list of records

Put the two together and you have a table: each dictionary is a row, and its keys are the columns. Python's `csv.DictReader` reads a CSV file into this shape, one dictionary per row, and pandas can turn it straight into a DataFrame.

```python
students = [
    {"name": "Priya Patel", "major": "Data Science", "gpa": 3.8},
    {"name": "Marcus Lee", "major": "Computer Science", "gpa": 3.2},
    {"name": "Sofia Garcia", "major": "Cybersecurity", "gpa": 3.9},
]
print(students[1]["name"])  # Marcus Lee

for student in students:
    print(f"{student['name']} ({student['major']}): {student['gpa']}")
```

The `for` loop at the end visits each record in turn, and the loop variable `student` holds one dictionary at a time. It prints:

```text
Priya Patel (Data Science): 3.8
Marcus Lee (Computer Science): 3.2
Sofia Garcia (Cybersecurity): 3.9
```

%caution Inside an f-string written with double quotes, put dictionary keys in single quotes, as in student['name']. Python versions before 3.12 don't allow the same quote inside the braces.

%%true-false
- If grades = [88, 92, 79, 95], then grades[1] is 88.
- false

# Loops, conditions and functions

Most questions you'll ask of a list of records come down to three tools: a loop to visit every record, a condition to decide what to do with each one, and a function to package the work so you can reuse it.

## Adding things up with a loop

A `for` loop runs its indented body once for each item. To total something, start a variable at zero before the loop and add to it inside.

```python
semester_credits = [16, 12, 18, 8]
total = 0
for credits in semester_credits:
    total += credits
print(total)  # 54
```

`total += credits` is short for `total = total + credits`. Python's `sum()` does this particular job for you, but the same pattern of starting a value and updating it in a loop works for any summary: a count, a maximum, a list of matches.

Indentation is how Python knows which lines belong to the loop. Use four spaces for each level.

## Making decisions with if

`if` runs a block only when its condition is true. `elif` adds more conditions, checked in order, and `else` catches everything left over. Inside a loop, `if` lets you filter records:

```python
students = [
    {"name": "Priya Patel", "gpa": 3.8},
    {"name": "Marcus Lee", "gpa": 3.2},
    {"name": "Sofia Garcia", "gpa": 3.9},
]
high_gpa = []
for student in students:
    if student["gpa"] >= 3.5:
        high_gpa.append(student["name"])
print(high_gpa)  # ['Priya Patel', 'Sofia Garcia']
```

## Writing your own functions

A function is a named, reusable piece of code. `def` starts one, the names in parentheses are its parameters, and `return` sends a result back to the code that called it. Here are two, for a course whose syllabus uses 90, 80, 70 and 60 as letter grade cutoffs:

```python
def average(scores):
    return sum(scores) / len(scores)


def letter_grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"
```

Call a function by writing its name with arguments in parentheses. Because both functions return their results, you can pass one function's answer straight into the other:

```python
scores = [92, 85, 78]
avg = average(scores)
print(f"{avg:.1f} is a {letter_grade(avg)}")  # 85.0 is a B
```

%important A function that only prints its result gives back None. Return the value instead, so other code can store it, compare it or pass it on.

One catch: `average([])` divides by zero and raises a `ZeroDivisionError`. Deciding what should happen for an empty list is exactly the kind of edge case unit tests are for.

%%open-ended
- Why is it more useful for average() to return its result than to print it?
- A returned value can be stored, compared or passed to another function such as letter_grade, while a printed value only shows up on the screen.
