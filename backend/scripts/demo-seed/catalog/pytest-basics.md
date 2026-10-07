---
name: Unit Testing with pytest
description: Write small tests that catch bugs before your teammates or an autograder do.
overview: A unit test runs one piece of your code on an input you chose and checks the answer. This droplet covers writing and running tests with pytest, testing edge cases and errors, and cutting repetition with fixtures and parametrize.
funFact: Python's built-in unittest module was originally inspired by JUnit, a unit testing framework for Java.
authors: contentcreator1, contentcreator2
type: skill
focusArea: technical
difficulty: intermediate
tags: python, testing
objectives:
- Write test functions with plain assert statements and run them with pytest
- Read a pytest failure report to see what went wrong
- Test edge cases, boundaries and expected errors
- Share setup with fixtures and run one test on many inputs with parametrize
---

# Your first test

A **unit test** is a short function that runs one piece of your code on an input you picked and checks the answer. Once you have a few, you can rerun them every time you change the code and know in seconds whether something broke.

pytest is a popular testing tool for Python. Install it with `python -m pip install pytest`.

%definition A unit test checks one small piece of code, usually a single function, on its own.

## Writing a test

Say your group project has a module called `grades.py`:

```python
def average(scores):
    return sum(scores) / len(scores)
```

Tests go in their own file, with a name that starts with `test_`, like `test_grades.py`. Each test is a function whose name starts with `test`, and it checks a result with a plain `assert` statement.

```python
from grades import average


def test_average_of_three_scores():
    assert average([90, 85, 80]) == 85


def test_average_of_one_score():
    assert average([72]) == 72
```

`assert` checks that a condition is true. When it's false, Python raises an `AssertionError`, and pytest reports the test as failed.

## Running pytest

Run `pytest` from the folder that holds both files. It collects files named `test_*.py` or `*_test.py`, runs every function in them whose name starts with `test`, and prints a short header followed by the results:

```text
collected 2 items

test_grades.py ..                                        [100%]

====================== 2 passed in 0.00s =======================
```

Each dot is a test that passed, and a failing test shows up as an F. Add `-v` to list every test by name, or `-x` to stop at the first failure.

%important pytest only runs functions whose names start with test. A function called check_average in a test file is quietly ignored.

## Reading a failure

Now suppose a teammate changes `average` to use floor division:

```python
def average(scores):
    return sum(scores) // len(scores)
```

Both tests still pass, because both answers happen to be whole numbers. A test whose answer isn't a whole number catches the bug, so add one to the end of `test_grades.py`:

```python
def test_average_with_a_half():
    assert average([90, 85]) == 87.5
```

This time pytest prints an F and a report for the failing test:

```text
___________________ test_average_with_a_half ___________________

    def test_average_with_a_half():
>       assert average([90, 85]) == 87.5
E       assert 87 == 87.5
E        +  where 87 = average([90, 85])

test_grades.py:13: AssertionError
```

The `>` marks the line that failed. The lines starting with `E` show what pytest saw: `average([90, 85])` returned 87, not 87.5. The last line gives the file and line number. pytest rewrites plain `assert` statements to produce this detail, so you don't need special assertion methods.

The lesson here is about choosing inputs. A test that passes for both the buggy code and the correct code can't tell them apart.

%%multiple-choice
- In test_grades.py, which of these functions will pytest run as a test?
- check_average
- average_test
- test_average <
- verify_average

# Testing edge cases and errors

Code usually works for the input you had in mind while you wrote it. Bugs hide in the inputs you didn't think about, so good tests go looking for them.

## Edge cases worth trying

For any function, run through this list:

- Empty input: an empty list, an empty string, zero.
- A single item.
- Boundaries: the exact values where the behavior changes, and the values just on either side.
- Values out of range, like a negative score.
- Bad input that should raise an error.

## Testing boundaries

Here's a letter grade function for `grades.py`, with cutoffs at 90, 80, 70 and 60:

```python
def letter_grade(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"
```

Off-by-one mistakes happen right at a cutoff. If someone writes `score > 90`, a 95 still gets an A but a score of exactly 90 drops to a B. Test the cutoff itself and a value just below it.

```python
def test_exactly_90_is_an_a():
    assert letter_grade(90) == "A"


def test_just_below_90_is_a_b():
    assert letter_grade(89.9) == "B"
```

## Testing that code raises an error

Right now `average([])` raises a `ZeroDivisionError`, which doesn't tell the caller what they did wrong. A clearer choice is to raise a `ValueError` with a message, so update `average` in `grades.py`:

```python
def average(scores):
    if not scores:
        raise ValueError("can't average an empty list of scores")
    return sum(scores) / len(scores)
```

`pytest.raises` checks that the code inside its `with` block raises the exception you name. The test fails if the block raises nothing, or raises a different kind of exception. Add `match` to check the message too. It's a regular expression that pytest searches for in the error message. Here's the test, along with the imports that now go at the top of `test_grades.py`:

```python
import pytest

from grades import average, letter_grade


def test_average_of_empty_list_raises():
    with pytest.raises(ValueError, match="empty"):
        average([])
```

## Comparing floats

The average of 90, 85 and 78 is 84.333 repeating, which a float can only store approximately. Rather than typing digits until the test passes, use `pytest.approx` to compare within a tolerance you choose.

```python
def test_average_of_uneven_scores():
    assert average([90, 85, 78]) == pytest.approx(84.33, abs=0.01)
```

%warning Comparing floats with == can fail even when the math is right, because floats are stored in binary. Use pytest.approx for float results.

%%true-false
- A test that uses pytest.raises(ValueError) passes if the code inside the with block raises no exception at all.
- false

# Fixtures and parametrize

As a test file grows, two kinds of repetition creep in: the same setup at the top of many tests, and the same test copied with different numbers. pytest has a tool for each.

## Sharing setup with fixtures

Say `grades.py` also has a small class that keeps each student's scores:

```python
class Gradebook:
    def __init__(self):
        self.scores = {}

    def add_score(self, student, score):
        self.scores.setdefault(student, []).append(score)

    def average_for(self, student):
        return average(self.scores[student])
```

Instead of building a gradebook inside every test, write a **fixture**: a function marked with `@pytest.fixture` that returns what your tests need. This one goes in a new file, `test_gradebook.py`:

```python
import pytest

from grades import Gradebook


@pytest.fixture
def gradebook():
    book = Gradebook()
    book.add_score("Priya", 92)
    book.add_score("Priya", 88)
    book.add_score("Marcus", 75)
    return book
```

A test asks for a fixture by using its name as a parameter. pytest calls the fixture and passes in whatever it returns.

```python
def test_average_for_priya(gradebook):
    assert gradebook.average_for("Priya") == 90


def test_new_score_changes_average(gradebook):
    gradebook.add_score("Marcus", 85)
    assert gradebook.average_for("Marcus") == 80
```

Each test gets a fresh gradebook, so the score the second test adds can't leak into any other test.

- To share fixtures between test files, put them in a file named `conftest.py` in the same folder. pytest loads it automatically, without an import.
- If a fixture needs to clean up, use `yield` instead of `return`. The code after `yield` runs once the test finishes.
- pytest also has built-in fixtures. `tmp_path`, for example, gives each test its own temporary folder for code that reads or writes files.

%definition A fixture is a function that prepares something a test needs, such as an object, a file or sample data. pytest runs it and passes the result to each test that names it.

## Running one test on many inputs

Boundary tests all look alike: call `letter_grade` with a score and compare the letter. `@pytest.mark.parametrize` turns them into one test that runs once per case. Add this to `test_grades.py`:

```python
@pytest.mark.parametrize(
    "score, expected",
    [
        (95, "A"),
        (90, "A"),
        (89.9, "B"),
        (80, "B"),
        (70, "C"),
        (60, "D"),
        (59.9, "F"),
    ],
)
def test_letter_grade(score, expected):
    assert letter_grade(score) == expected
```

The first argument names the parameters, and each tuple in the list is one case. pytest reports every case as its own test, named after its inputs, like `test_letter_grade[89.9-B]`. If 90 started returning a B, only the `test_letter_grade[90-A]` case would fail, so you'd know exactly which input broke.

The [pytest documentation](https://docs.pytest.org/) lists the other built-in fixtures, such as `capsys` for checking what your code prints.

%%open-ended
- You have six tests for letter_grade that differ only in the score and the expected letter. Which pytest feature would you use, and why?
- pytest.mark.parametrize, because it runs one test function once for each score and expected letter pair and reports each case separately.
