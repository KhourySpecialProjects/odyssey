---
name: Summarizing Data with GROUP BY
description: Turn rows into counts, totals and averages for each group with GROUP BY and HAVING.
overview: Aggregate functions turn many rows into one number, and GROUP BY gives you one of those numbers for each group. This droplet covers the five core aggregates, how they treat NULL, the grouping rule, and filtering groups with HAVING.
funFact: In PostgreSQL, writing GROUP BY ROLLUP (major) instead of GROUP BY major adds a grand total row to the results of the same query.
authors: contentcreator1
type: skill
focusArea: technical
difficulty: intermediate
tags: sql, databases
objectives:
- Summarize a table with COUNT, SUM, AVG, MIN and MAX
- Predict how aggregate functions treat NULL values
- Group rows with GROUP BY and follow the grouping rule
- Filter groups with HAVING and rows with WHERE
---

# Aggregate functions

An aggregate function combines many rows into one value. These five cover most of what you'll need:

- `COUNT` counts rows or values.
- `SUM` adds values up.
- `AVG` averages them.
- `MIN` and `MAX` find the smallest and largest.

The examples in this droplet use the `students` table from the CS 3200 database. Here's a small version of it. Diego is in his first semester and doesn't have a GPA yet.

| id | name | major | gpa | credits |
|---|---|---|---|---|
| 1 | Maya Chen | Computer Science | 3.80 | 64 |
| 2 | Jordan Lee | Data Science | 3.20 | 48 |
| 3 | Priya Patel | Computer Science | 3.50 | 96 |
| 4 | Sam Rivera | Cybersecurity | 3.90 | 32 |
| 5 | Ava Johnson | Data Science | 3.60 | 80 |
| 6 | Diego Torres | Computer Science | NULL | 0 |
| 7 | Noah Kim | Computer Science | 3.80 | 72 |

```sql
SELECT COUNT(*) AS num_students,
       ROUND(AVG(gpa), 2) AS avg_gpa,
       MIN(gpa) AS lowest_gpa,
       MAX(gpa) AS highest_gpa,
       SUM(credits) AS total_credits
FROM students;
```

| num_students | avg_gpa | lowest_gpa | highest_gpa | total_credits |
|---|---|---|---|---|
| 7 | 3.63 | 3.20 | 3.90 | 392 |

The whole table collapses into a single row. On its own, `AVG(gpa)` returns 3.6333333333333333, so `ROUND` keeps two decimal places. Here `gpa` is a `numeric` column. PostgreSQL's two-argument `ROUND` doesn't accept `double precision`, so for a column of that type you'd write `ROUND(AVG(gpa)::numeric, 2)`.

## How aggregates treat NULL

`COUNT(*)` counts rows. `COUNT(gpa)` counts only the rows where `gpa` isn't NULL:

```sql
SELECT COUNT(*) AS num_students,
       COUNT(gpa) AS with_gpa
FROM students;
```

This returns 7 and 6, because Diego's GPA is NULL. `SUM`, `AVG`, `MIN` and `MAX` skip NULLs the same way, so the average above is 21.80 divided by 6 students, not 7. That's usually what you want, but check that it is: counting Diego as a zero would pull the average down to 3.11.

The same rule makes `COUNT` handy for spotting missing values. In `enrollments`, `grade` is NULL for courses still in progress, so comparing two counts shows how many are unfinished:

```sql
SELECT COUNT(*) AS enrollments,
       COUNT(grade) AS graded,
       COUNT(DISTINCT student_id) AS num_students
FROM enrollments;
```

In the sample data, that's 41 enrollments from 7 students, and 26 of them are graded. `COUNT(DISTINCT student_id)` counts each student once, however many courses they take.

%caution SUM, AVG, MIN and MAX return NULL, not 0, when there are no rows to aggregate. Write COALESCE(SUM(credits), 0) when you need a zero.

%%true-false
- COUNT(grade) counts every row in enrollments, including rows where grade is NULL.
- false

# Grouping rows with GROUP BY

One number for the whole table is a start, but usually you want one per major, per course or per semester. `GROUP BY` splits the rows into groups that share a value, then runs each aggregate once per group.

```sql
SELECT major,
       COUNT(*) AS num_students,
       ROUND(AVG(gpa), 2) AS avg_gpa
FROM students
GROUP BY major
ORDER BY num_students DESC;
```

| major | num_students | avg_gpa |
|---|---|---|
| Computer Science | 4 | 3.70 |
| Data Science | 2 | 3.40 |
| Cybersecurity | 1 | 3.90 |

Each output row is one group. The Computer Science group holds four rows, for Maya, Priya, Diego and Noah, so its count is 4. Its average covers only the three of them with a GPA.

## The grouping rule

Every column in the SELECT list has to be either listed in GROUP BY or wrapped in an aggregate function. Here's what happens when you break the rule:

```sql
SELECT major, name, COUNT(*)
FROM students
GROUP BY major;
```

```text
ERROR:  column "students.name" must appear in the GROUP BY clause or be used in an aggregate function
```

The Computer Science group has four names, and PostgreSQL won't guess which one you want. You can fix it in two ways:

- Aggregate the column. `STRING_AGG(name, ', ' ORDER BY name)` lists every name in the group, and `MIN(name)` picks the first one alphabetically.
- Add the column to GROUP BY. That changes the groups, though: grouping by major and name gives one group per student.

%important Every column in SELECT must appear in GROUP BY or inside an aggregate function.

## Grouping across a join

GROUP BY works the same way on joined tables. This query counts the students in each course:

```sql
SELECT c.title, COUNT(e.student_id) AS enrolled
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title
ORDER BY enrolled DESC;
```

- The LEFT JOIN keeps courses that have no enrollments.
- Grouping by `c.id` as well as `c.title` keeps two courses with the same title apart.
- Counting `e.student_id` matters. A course with no enrollments still gets one row from the LEFT JOIN, with NULL in every enrollment column. `COUNT(e.student_id)` skips that NULL and reports 0, but `COUNT(*)` counts the row and reports 1. In the sample data, nobody has taken Cryptography yet, so it correctly shows 0.

%warning With a LEFT JOIN, count a column from the right-hand table. Counting rows reports 1 for a course that has no enrollments.

%%open-ended
- Why does PostgreSQL reject SELECT major, name, COUNT(gpa) FROM students GROUP BY major?
- Each major's group contains several names, so there's no single name to show. The name column has to be listed in GROUP BY or wrapped in an aggregate function.

# Filtering groups with HAVING

`WHERE` filters rows before they're grouped. `HAVING` filters groups after the aggregates are computed, so it's where conditions on aggregates go. This query keeps only the majors whose average GPA is above 3.5:

```sql
SELECT major, ROUND(AVG(gpa), 2) AS avg_gpa
FROM students
GROUP BY major
HAVING AVG(gpa) > 3.5
ORDER BY avg_gpa DESC;
```

| major | avg_gpa |
|---|---|
| Cybersecurity | 3.90 |
| Computer Science | 3.70 |

Data Science, at 3.40, is filtered out. You couldn't write this condition in WHERE, because WHERE looks at one row at a time, before any averages exist. PostgreSQL stops you with `aggregate functions are not allowed in WHERE`.

## Using WHERE and HAVING together

Many queries need both. This one counts the students in each major who have at least 32 credits, then keeps the majors with at least two of them:

```sql
SELECT major, COUNT(*) AS num_students
FROM students
WHERE credits >= 32
GROUP BY major
HAVING COUNT(*) >= 2;
```

WHERE runs first and removes Diego, the only student with fewer than 32 credits. GROUP BY then forms three groups: Computer Science with 3 students, Data Science with 2 and Cybersecurity with 1. Last, HAVING drops Cybersecurity. The result has two rows, Computer Science with 3 and Data Science with 2. Without the WHERE clause, Computer Science would count 4.

## The order SQL follows

SQL behaves as if it runs the clauses of a query in this order:

1. FROM and JOIN collect the rows.
2. WHERE filters rows.
3. GROUP BY forms groups.
4. HAVING filters groups.
5. SELECT computes the output columns.
6. ORDER BY sorts the result.

This order explains two rules that trip people up. Aggregates can't go in WHERE, because the groups don't exist yet at that step. And in PostgreSQL, a SELECT alias like `avg_gpa` works in ORDER BY but not in WHERE or HAVING, since the alias isn't defined until SELECT runs. That's why the average GPA query above repeats `AVG(gpa)` in its HAVING clause instead of using `avg_gpa`.

%important Put conditions on individual rows in WHERE and conditions on aggregates in HAVING.

%%multiple-choice
- You want only the majors whose average GPA is above 3.5. Where does the condition AVG(gpa) > 3.5 go?
- In the WHERE clause
- In the HAVING clause <
- In the GROUP BY clause
- In the ORDER BY clause
