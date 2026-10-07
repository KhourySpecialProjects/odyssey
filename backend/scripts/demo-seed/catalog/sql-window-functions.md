---
name: SQL Window Functions
description: Rank, compare and total rows without collapsing them, using OVER and PARTITION BY.
overview: Window functions calculate across related rows while keeping every row in the result. This droplet covers PARTITION BY, the three ranking functions, running totals, and comparing rows with their neighbors using LAG and LEAD.
funFact: PostgreSQL added window functions in version 8.4, released in 2009, the same release that introduced WITH queries.
authors: contentcreator1
type: skill
focusArea: technical
difficulty: advanced
tags: sql, databases
objectives:
- Explain how a window function differs from GROUP BY
- Rank rows within groups using ROW_NUMBER, RANK and DENSE_RANK
- Compute running totals with an ordered window
- Compare each row with its neighbors using LAG and LEAD
---

# What a window function does

GROUP BY collapses each group into one row. That's right for a summary, but it throws away the individual rows. A **window function** also calculates across a set of rows, but it keeps every row and adds its result as a new column.

The examples use the `students` table from the CS 3200 database, with seven students. Diego is in his first semester and doesn't have a GPA yet. Compare these two queries:

```sql
SELECT major, ROUND(AVG(gpa), 2) AS major_avg
FROM students
GROUP BY major;
```

That returns three rows, one per major. Here's the window version:

```sql
SELECT name, major, gpa,
       ROUND(AVG(gpa) OVER (PARTITION BY major), 2) AS major_avg
FROM students
ORDER BY major, name;
```

| name | major | gpa | major_avg |
|---|---|---|---|
| Diego Torres | Computer Science | NULL | 3.70 |
| Maya Chen | Computer Science | 3.80 | 3.70 |
| Noah Kim | Computer Science | 3.80 | 3.70 |
| Priya Patel | Computer Science | 3.50 | 3.70 |
| Sam Rivera | Cybersecurity | 3.90 | 3.90 |
| Ava Johnson | Data Science | 3.60 | 3.40 |
| Jordan Lee | Data Science | 3.20 | 3.40 |

All seven students are still there, and each row carries its major's average. Diego has no GPA, but his row still gets the Computer Science average of 3.70.

%definition A window is the set of rows a window function looks at when it computes the value for the current row.

## Reading the OVER clause

- `OVER` is what makes a function a window function. Familiar aggregates like `AVG`, `SUM`, `COUNT`, `MIN` and `MAX` all work with it.
- `PARTITION BY major` splits the rows into partitions, one per major, and the function runs separately in each. Partitions are like groups, except the rows don't collapse.
- Empty parentheses make the window the whole result. `COUNT(*) OVER ()` puts the total number of rows on every row.

Because the result sits next to the row's own values, you can do math with it. `gpa - AVG(gpa) OVER (PARTITION BY major)` shows how far each student is above or below their major's average: Maya is 0.10 above, and Priya is 0.20 below.

## When window functions run

Window functions are computed after WHERE, GROUP BY and HAVING, when SELECT builds the output. That means you can't filter on one in WHERE. PostgreSQL rejects it:

```text
ERROR:  window functions are not allowed in WHERE
```

To filter on a window result, compute it in a subquery or a WITH query first, then filter in the outer query. The next lesson does exactly that.

%%multiple-choice
- The students table has 7 rows. How many rows does SELECT name, AVG(gpa) OVER (PARTITION BY major) FROM students return?
- 3, one for each major
- 7, one for each student <
- 1, for the whole table
- None, because it's an error to select name without grouping by it

# Ranking rows

Put ORDER BY inside OVER and you can number the rows in that order. Three functions do this, and they differ only in how they handle ties:

```sql
SELECT name, gpa,
       ROW_NUMBER() OVER (ORDER BY gpa DESC, name) AS row_number,
       RANK() OVER (ORDER BY gpa DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY gpa DESC) AS dense_rank
FROM students
WHERE gpa IS NOT NULL
ORDER BY gpa DESC, name;
```

| name | gpa | row_number | rank | dense_rank |
|---|---|---|---|---|
| Sam Rivera | 3.90 | 1 | 1 | 1 |
| Maya Chen | 3.80 | 2 | 2 | 2 |
| Noah Kim | 3.80 | 3 | 2 | 2 |
| Ava Johnson | 3.60 | 4 | 4 | 3 |
| Priya Patel | 3.50 | 5 | 5 | 4 |
| Jordan Lee | 3.20 | 6 | 6 | 5 |

- `ROW_NUMBER` gives every row a different number, even when values tie. Which tied row comes first is arbitrary unless you add a tiebreaker, which is why this query also orders by `name`.
- `RANK` gives tied rows the same rank, then skips ahead. Maya and Noah share 2nd place, so Ava is 4th.
- `DENSE_RANK` gives tied rows the same rank without skipping, so Ava is 3rd.

## The top student in each major

Add PARTITION BY and the numbering restarts in each partition. To keep only the top rows, rank them in a WITH query, then filter in the outer query:

```sql
WITH ranked AS (
  SELECT name, major, gpa,
         RANK() OVER (PARTITION BY major ORDER BY gpa DESC) AS major_rank
  FROM students
  WHERE gpa IS NOT NULL
)
SELECT major, name, gpa
FROM ranked
WHERE major_rank = 1
ORDER BY major, name;
```

| major | name | gpa |
|---|---|---|
| Computer Science | Maya Chen | 3.80 |
| Computer Science | Noah Kim | 3.80 |
| Cybersecurity | Sam Rivera | 3.90 |
| Data Science | Ava Johnson | 3.60 |

Maya and Noah tie, so `RANK` keeps both. Pick the function that matches what you want for ties: `RANK` and `DENSE_RANK` keep everyone who tied, while `ROW_NUMBER` with a tiebreaker returns exactly one student per major. For the top three in each major, keep the rows where `major_rank` is 3 or less.

`ROW_NUMBER` is also a common way to keep exactly one row per group, such as each student's most recent enrollment: partition by student, order newest first, and keep row 1.

PostgreSQL has a few more ranking functions. `NTILE(4)` splits the ordered rows into four groups as close to equal in size as possible, which gives you quartiles, though it can put tied rows in different groups. `PERCENT_RANK()` gives each row's relative rank as a number from 0 to 1. The [PostgreSQL documentation](https://www.postgresql.org/docs/) lists every window function.

%warning In PostgreSQL, NULL sorts as if it were larger than every other value, so ORDER BY gpa DESC puts students with no GPA first and ranks them 1st. Filter them out with WHERE gpa IS NOT NULL, or write ORDER BY gpa DESC NULLS LAST.

%%multiple-choice
- Four students have GPAs of 3.9, 3.8, 3.8 and 3.5. Ranked from highest GPA to lowest, what does RANK give the student with 3.5?
- 2
- 3
- 4 <
- It depends on the students' names

# Running totals and neighbors

## Running totals

Adding ORDER BY inside OVER changes what an aggregate sees. Without it, `SUM` adds up the whole partition. With it, `SUM` adds up the rows from the start of the partition through the current row, which gives you a running total.

Running totals usually follow time, so the window has to be ordered by something that sorts in time order. Suppose `semester` in `enrollments` holds the year and month each term starts, like `'2025-09'` for fall 2025 and `'2026-01'` for spring 2026. This query adds up each student's credits per semester, then keeps a running total:

```sql
WITH term_credits AS (
  SELECT e.student_id, e.semester, SUM(c.credits) AS credits
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  GROUP BY e.student_id, e.semester
)
SELECT s.name, t.semester, t.credits,
       SUM(t.credits) OVER (PARTITION BY t.student_id ORDER BY t.semester) AS credits_so_far
FROM term_credits t
JOIN students s ON s.id = t.student_id
ORDER BY s.name, t.semester;
```

Here are Maya's rows from the result:

| name | semester | credits | credits_so_far |
|---|---|---|---|
| Maya Chen | 2024-09 | 12 | 12 |
| Maya Chen | 2025-09 | 16 | 28 |
| Maya Chen | 2026-01 | 12 | 40 |

PARTITION BY restarts the total for each student, and ORDER BY semester decides which rows count as "so far".

%caution Text sorts alphabetically, so names like Fall 2025 and Spring 2025 would put fall first, even though spring comes first in the year. Order a window by a date or another value that sorts in time order.

## Looking back and ahead with LAG and LEAD

`LAG(credits)` returns `credits` from the previous row in the window's order, and `LEAD(credits)` returns it from the next row. On a partition's first row there's nothing to look back at, so `LAG` returns NULL. Both also take an offset and a default, so `LAG(credits, 1, 0)` returns 0 on the first row instead of NULL.

When several functions share a window, you can name it once in a `WINDOW` clause. This query compares each semester's load with the one before and after it:

```sql
WITH term_credits AS (
  SELECT e.student_id, e.semester, SUM(c.credits) AS credits
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  GROUP BY e.student_id, e.semester
)
SELECT s.name, t.semester, t.credits,
       LAG(t.credits) OVER w AS last_term,
       LEAD(t.credits) OVER w AS next_term,
       t.credits - LAG(t.credits) OVER w AS change
FROM term_credits t
JOIN students s ON s.id = t.student_id
WINDOW w AS (PARTITION BY t.student_id ORDER BY t.semester)
ORDER BY s.name, t.semester;
```

Here are Maya's rows, without the name column:

| semester | credits | last_term | next_term | change |
|---|---|---|---|---|
| 2024-09 | 12 | NULL | 16 | NULL |
| 2025-09 | 16 | 12 | 12 | 4 |
| 2026-01 | 12 | 16 | NULL | -4 |

Look at fall 2025. Maya was on co-op in spring 2025 and took no courses, so she has no row for that semester. `LAG` compared fall 2025 with fall 2024, because it looks at the previous row, not the previous semester on the calendar.

%caution With ORDER BY, a running total also includes any rows that tie with the current row. If a student had several rows per semester, each would show the total through the end of that semester. To add one row at a time, write ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW after ORDER BY, and add a tiebreaker column so the order is predictable.

%%true-false
- LAG(credits) always returns the credits from the calendar semester just before the current row's semester.
- false
