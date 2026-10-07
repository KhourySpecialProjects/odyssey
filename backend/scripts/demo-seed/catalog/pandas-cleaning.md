---
name: Cleaning Data with pandas
description: Load a messy CSV, fix missing values, duplicates and wrong types, then summarize it by group.
overview: Real data sets often arrive with blank cells, repeated rows and numbers stored as text. This droplet walks through cleaning a small student roster with pandas, from loading the file to answering questions with groupby.
funFact: The name pandas comes from panel data, an econometrics term for data sets that track the same individuals over time, and it's also a play on the phrase Python data analysis.
authors: contentcreator1
type: skill
focusArea: technical
difficulty: intermediate
tags: python, data-science
objectives:
- Load a CSV into a DataFrame and check its size, columns and types
- Find and handle missing values, wrongly typed columns and duplicate rows
- Summarize data by group with groupby, sort_values and value_counts
---

# Loading a CSV into a DataFrame

pandas is a Python library for working with tables of data. Its main object is the **DataFrame**: a table with named columns and a label for each row, called the index. Install it with `python -m pip install pandas`.

Here's the file this droplet uses, `students.csv`. It has the problems real files have: a missing GPA, a missing major, a credits value of TBD, and one row that appears twice. To follow along, save it in the folder you run your code from.

```text
id,name,major,gpa,credits
1,Priya Patel,Data Science,3.8,16
2,Marcus Lee,Computer Science,3.2,18
3,Sofia Garcia,Cybersecurity,3.9,16
4,Ethan Nguyen,Computer Science,,12
5,Amara Okafor,Data Science,3.5,TBD
6,Liam Chen,,3.0,16
7,Hana Kim,Computer Science,3.6,17
2,Marcus Lee,Computer Science,3.2,18
8,Diego Ramirez,Cybersecurity,3.5,16
9,Grace Liu,Data Science,3.5,14
10,Omar Haddad,Computer Science,3.4,16
```

## Loading and looking

By convention, pandas is imported as `pd`. `read_csv()` reads the file into a DataFrame, using the first line as column names.

```python
import pandas as pd

df = pd.read_csv("students.csv")
print(df.shape)  # (11, 5)
print(df.head())
```

```text
   id          name             major  gpa credits
0   1   Priya Patel      Data Science  3.8      16
1   2    Marcus Lee  Computer Science  3.2      18
2   3  Sofia Garcia     Cybersecurity  3.9      16
3   4  Ethan Nguyen  Computer Science  NaN      12
4   5  Amara Okafor      Data Science  3.5     TBD
```

`shape` gives the number of rows and columns. `head()` shows the first five rows, or as many as you ask for, like `head(10)`. The numbers down the left side are the index. Ethan's empty GPA shows up as `NaN`, which is how pandas marks a missing value.

%warning shape is an attribute, not a method, so write df.shape with no parentheses. Writing df.shape() raises a TypeError.

## Checking column types

Every column has a single type, called its dtype. Check the dtypes before you do any math.

```python
print(df.dtypes)
```

```text
id           int64
name           str
major          str
gpa        float64
credits        str
dtype: object
```

In pandas 2 and earlier, text columns show up as `object` instead of `str`.

Two things stand out. `gpa` is `float64` even though one cell is empty, because pandas reads an empty cell as `NaN` and a float column can hold it. A column of whole numbers with an empty cell becomes `float64` for the same reason. But `credits` is text, because one value, TBD, isn't a number, so pandas reads the whole column as text. Until you fix that, asking for the column's mean raises a `TypeError`.

For a fuller first look, `df.info()` prints each column's dtype together with how many values in it aren't missing.

%%multiple-choice
- After read_csv, a credits column has a text dtype instead of int64. What is the most likely cause?
- The file has too many rows for a number column
- At least one value in the column isn't a number <
- One of the cells in the column is empty
- The column name is written in lowercase

# Missing values and duplicates

Most cleaning comes down to three questions: what's missing, what has the wrong type, and what's there twice. Answer them before you calculate anything, or your averages will be quietly wrong. The examples continue with the `df` you loaded from `students.csv` in the last lesson.

## Finding missing values

`isna()` gives a True or False for every cell, and `.sum()` counts the True values in each column.

```python
print(df.isna().sum())
```

```text
id         0
name       0
major      1
gpa        1
credits    0
dtype: int64
```

That's one missing major and one missing GPA. The TBD in credits doesn't count, because to pandas it's just text.

## Fixing column types

`pd.to_numeric()` converts a column to numbers. With `errors="coerce"`, any value it can't convert becomes `NaN` instead of raising an error.

```python
df["credits"] = pd.to_numeric(df["credits"], errors="coerce")
print(df["credits"].dtype)         # float64
print(df["credits"].isna().sum())  # 1
```

The column is `float64` rather than `int64` because `NaN` is a float. When you know which placeholder a file uses, you can also catch it while loading, with `pd.read_csv("students.csv", na_values=["TBD"])`.

## Filling or dropping

There's no single right way to handle a missing value. Decide column by column, based on what a missing value means there.

```python
df["major"] = df["major"].fillna("Undeclared")
with_gpa = df.dropna(subset=["gpa"])
print(len(df), len(with_gpa))  # 11 10
```

- `fillna()` replaces missing values. A missing major can reasonably become "Undeclared".
- `dropna()` removes rows with missing values. `subset=["gpa"]` only looks at the GPA column, so a missing major alone won't drop a row.
- Often you need neither. `mean()`, `sum()` and most other summaries skip `NaN` by default.

Assign the result back to the column, as above. Many older tutorials write `df["major"].fillna("Undeclared", inplace=True)` instead, but in pandas 3 that leaves `df` unchanged.

%warning Don't fill a missing GPA with 0. pandas treats the 0 as a real GPA, so it drags down every average it's part of.

## Removing duplicates

`duplicated()` flags each row that exactly matches an earlier row, and `drop_duplicates()` removes those rows, keeping the first copy.

```python
print(df.duplicated().sum())  # 1
df = df.drop_duplicates()
print(df.shape)  # (10, 5)
```

If the same student can appear twice with different values, say an updated GPA, compare only the column that identifies them: `df.drop_duplicates(subset=["id"], keep="last")` keeps the last copy of each id.

%%true-false
- By default, drop_duplicates() removes every copy of a repeated row, including the first one.
- false

# Grouping and summarizing

With the data clean, you can start answering questions. How many students are in each major? Which major has the highest average GPA? The examples below start from the cleaned roster.

```python
import pandas as pd

df = pd.read_csv("students.csv", na_values=["TBD"])
df["major"] = df["major"].fillna("Undeclared")
df = df.drop_duplicates()
```

## Counting values

`value_counts()` counts how often each value appears in a column, most common first.

```python
print(df["major"].value_counts())
```

```text
major
Computer Science    4
Data Science        3
Cybersecurity       2
Undeclared          1
Name: count, dtype: int64
```

## Grouping with groupby

`groupby()` puts rows that share a value into groups, so you can summarize each group separately. Name the column to group by, then the column to summarize, then the calculation.

```python
print(df.groupby("major")["gpa"].mean())
```

```text
major
Computer Science    3.4
Cybersecurity       3.7
Data Science        3.6
Undeclared          3.0
Name: gpa, dtype: float64
```

%definition groupby follows a pattern called split-apply-combine. It splits the rows into groups, applies a calculation to each group, and combines the results into one table.

To get several summaries at once, pass a list of calculation names to `agg()`.

```python
summary = df.groupby("major")["gpa"].agg(["mean", "count"])
print(summary)
```

```text
                  mean  count
major
Computer Science   3.4      3
Cybersecurity      3.7      2
Data Science       3.6      3
Undeclared         3.0      1
```

Look closely at Computer Science: `value_counts()` found 4 students, but `count` says 3. That's because `count` only counts values that aren't missing, and Ethan has no GPA. For the number of rows in each group, use `df.groupby("major").size()`.

## Sorting

`sort_values()` sorts by a column, smallest first. Pass `ascending=False` to put the largest first.

```python
print(summary.sort_values("mean", ascending=False))
```

```text
                  mean  count
major
Cybersecurity      3.7      2
Data Science       3.6      3
Computer Science   3.4      3
Undeclared         3.0      1
```

It works the same way on the full roster: `df.sort_values("gpa", ascending=False).head(3)` gives the three students with the highest GPAs, Sofia, Priya and Hana. Rows with a missing value in the sort column, like Ethan's, go to the end.

%caution A groupby result uses the grouped column as its index, so major is no longer an ordinary column. Call reset_index() on the result when you need it back as one.

The [pandas documentation](https://pandas.pydata.org/docs/) has a user guide with a full chapter on groupby, including how to group by more than one column.

%%open-ended
- The summary shows a count of 3 for Computer Science, but value_counts shows 4 Computer Science students. Why are they different?
- count only counts students who have a GPA, and one Computer Science student's GPA is missing, while value_counts counts every row.
