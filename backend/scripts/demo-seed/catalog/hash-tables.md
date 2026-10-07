---
name: How Hash Tables Work
description: Why a Python dict can find any key quickly, even with millions of entries.
overview: A hash table turns each key into an array index, so finding a value doesn't mean searching through everything. This droplet covers hash functions, collisions and resizing, and how Python's dict and set put them to work.
funFact: Since Python 3.7, dictionaries are guaranteed to keep keys in the order you inserted them, a behavior that began as a side effect of a more compact dict design in Python 3.6.
authors: contentcreator1
type: knowledge
focusArea: technical
difficulty: intermediate
tags: algorithms
objectives:
- Explain how a hash function maps a key to a bucket
- Compare chaining and open addressing for handling collisions
- Describe how load factor and resizing keep lookups fast
- Choose valid dictionary keys and predict when lookups slow down
---

# Buckets and hash functions

Say your club website keeps its 5,000 members in a Python list. To check whether "Jordan Lee" is a member, Python compares names one at a time until it finds a match or reaches the end. Double the members and the worst case doubles too.

A hash table skips that search. It stores entries in an array of slots called **buckets**, and it computes which bucket a key belongs in instead of looking for it. Arrays are good at jumping straight to a position by its index, and a hash table puts that to work.

%definition A hash function turns a key, like a student's name, into an integer called a hash. The hash table uses that integer to choose a bucket.

## From key to bucket

Finding a key's bucket takes two steps: hash the key, then take the remainder after dividing by the number of buckets. In Python, that remainder is always between 0 and one less than the number of buckets, so it's always a valid index.

```python
def simple_hash(key: str) -> int:
    total = 0
    for ch in key:
        total = total * 31 + ord(ch)
    return total

num_buckets = 8
print(simple_hash("Maya"))                  # 2390972
print(simple_hash("Maya") % num_buckets)    # 4
print(simple_hash("Jordan") % num_buckets)  # 4
```

`ord` returns a character's Unicode code point, so the function builds one large number from the letters of the name. To store Maya's record, the table puts it in bucket 4. To find it later, the table runs the same two steps, lands on bucket 4 again, and checks only what's there.

## What makes a good hash function

- **Deterministic.** While the table exists, the same key must always produce the same hash, or the table would look in the wrong bucket.
- **Evenly spread.** Keys should scatter across the buckets so that no bucket gets crowded.
- **Fast.** Every insert and every lookup starts by hashing the key.

Here's what goes wrong with a weak one. If you only added up the character codes, "Mary" and "Myra" would both hash to 409, because they use the same letters, and so would every other arrangement of those letters. Multiplying by 31 at each step makes the order of the letters matter, so `simple_hash` gives them different hashes: 2390779 and 2413819.

Even a good hash function can send two keys to the same bucket. Notice that "Jordan" also landed in bucket 4. That's a **collision**, and every hash table needs a plan for it.

%%multiple-choice
- Which property must every hash function have?
- Different keys always get different hashes
- A key gets the same hash every time the table hashes it <
- Every hash is smaller than the number of buckets
- Keys come back out in sorted order

# Collisions, load factor and resizing

There are far more possible keys than buckets, so collisions can't be avoided, and by chance they start long before the table is full. Hash tables handle them in one of two main ways.

## Chaining

With **separate chaining**, each bucket holds a small list of key and value pairs. Inserting adds a pair to the bucket's list, or replaces the value if the key is already there. Looking up a key means going to its bucket and comparing keys until one matches.

```python
class GradeBook:
    def __init__(self, num_buckets: int = 8) -> None:
        self.buckets: list[list[tuple[str, str]]] = [[] for _ in range(num_buckets)]

    def put(self, name: str, grade: str) -> None:
        bucket = self.buckets[hash(name) % len(self.buckets)]
        for i, (key, _) in enumerate(bucket):
            if key == name:
                bucket[i] = (name, grade)
                return
        bucket.append((name, grade))

    def get(self, name: str) -> str:
        bucket = self.buckets[hash(name) % len(self.buckets)]
        for key, grade in bucket:
            if key == name:
                return grade
        raise KeyError(name)
```

This version uses Python's built-in `hash` function. A lookup only compares the keys in one bucket, and that list stays short as long as keys are spread out.

## Open addressing

With **open addressing**, every entry lives directly in the array, one per slot. When a key's slot is taken, the table probes other slots in a fixed order. The simplest order, linear probing, tries the next slot, then the next, wrapping around at the end. A lookup follows the same path until it finds the key or reaches an empty slot. Here's linear probing with `simple_hash` and 8 buckets:

```text
Insert Maya     bucket 4 is empty, so Maya goes there
Insert Jordan   bucket 4 is taken and bucket 5 is empty, so Jordan goes in 5
Find Jordan     bucket 4 holds Maya, bucket 5 holds Jordan: found
Find Priya      bucket 7 is empty, so Priya isn't in the table
```

%caution With open addressing, deleting can't just empty a slot. If Maya's bucket were cleared, a search for Jordan would stop at the empty bucket 4 and wrongly report him missing, so implementations leave a marker in the slot instead.

Java's HashMap uses chaining. The standard Python interpreter uses open addressing for dict, with a probe order that jumps around the table instead of stepping one slot at a time.

## Load factor and resizing

The **load factor** measures how full a table is:

$$\text{load factor} = \frac{\text{number of entries}}{\text{number of buckets}}$$

As the load factor rises, chains and probe paths get longer, so lookups slow down. To prevent that, a hash table resizes once its load factor passes a limit: it allocates a bigger array, usually about twice the size, and reinserts every entry. Java's HashMap, for example, does this when its load factor passes 0.75 by default.

Every entry has to be rehashed, because its bucket depends on the number of buckets. With `simple_hash` and 16 buckets instead of 8, Maya moves from bucket 4 to bucket 12 while Jordan stays in bucket 4, so their collision goes away.

A resize copies every entry, so the insert that triggers it is slow. Because the table doubles each time, though, resizes get rarer as it grows, and the average cost per insert stays constant.

%%true-false
- When a hash table doubles its number of buckets, every entry can stay at the index it had before.
- false

# Hash tables in Python

Python's `dict` and `set` are hash tables. A dict maps each key to a value, and a set stores keys with no values. Both use hashing for `in`, so on average a membership check takes about the same time with 30 items or 30 million. The same check on a list compares items one by one.

```python
roster = ["Maya Chen", "Jordan Lee", "Priya Patel"]
enrolled = set(roster)

print("Priya Patel" in roster)    # True, after comparing names one by one
print("Priya Patel" in enrolled)  # True, after hashing the name once

grades = {"Maya Chen": "A", "Jordan Lee": "B+"}
grades["Priya Patel"] = "A-"
print(grades["Jordan Lee"])                      # B+
print(grades.get("Sam Rivera", "no grade yet"))  # no grade yet
```

If you check membership inside a loop, such as finding which of 2,000 applicants are already club members, turn the member list into a set first. Each check then takes one hash instead of a scan through the whole list.

## Keys must be hashable

A key's hash can't change while it's in the table. If it did, the table would look for the key in the wrong bucket. That's why Python only accepts **hashable** objects as dict keys and set items.

- Immutable built-in types are hashable: `str`, `int`, `float`, `bool`, `frozenset`, and a `tuple` whose items are all hashable.
- Mutable containers aren't: `list`, `dict` and `set`.

```python
titles = {("CS", 3200): "Database Design"}
print(titles[("CS", 3200)])  # Database Design

titles[["CS", 3200]] = "Database Design"  # TypeError (unhashable type: 'list')
```

Objects of your own classes are hashable by default, but each one is only equal to itself. If you define `__eq__` so that two objects with the same data are equal, Python makes the class unhashable unless you also define `__hash__`. A frozen dataclass defines both for you:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Course:
    subject: str
    number: int

titles = {Course("CS", 3200): "Database Design"}
print(titles[Course("CS", 3200)])  # Database Design
```

%important Objects that are equal must have equal hashes. Otherwise a dict can't find a key when you look it up with an equal copy.

## Average versus worst case

On average, lookups, inserts and deletes take constant time, written O(1), as long as the hash function spreads keys well and the load factor stays bounded. In the worst case, every key lands in the same bucket, the table behaves like a list, and each operation takes O(n) time.

That worst case can happen by accident, with a poor hash function, or on purpose: an attacker who can predict your hashes can send a web server thousands of keys that all collide. To make that hard, Python mixes a random value into string hashes each time it starts, so `hash("Maya")` gives a different number in each run. Compare hashes within one run of a program, and never save them to a file or database.

%%multiple-choice
- Which of these can be a key in a Python dict?
- A list of course numbers
- A tuple of a subject and a course number <
- A set of student names
- A dict of grades
