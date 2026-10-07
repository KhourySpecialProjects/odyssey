---
name: Getting Around the Command Line
description: Move between folders, manage files and search text from the terminal.
overview: The terminal is where you run code, use Git and work on remote servers. This droplet covers the commands for finding your way around, managing files, and combining small tools to get real work done.
funFact: The name grep comes from g/re/p, a command in the early Unix text editor ed that meant globally search for a regular expression and print the matching lines.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: beginner
tags: command-line
objectives:
- Move between folders with pwd, ls and cd using relative and absolute paths
- Create, copy, move and delete files and folders
- Search files with grep and connect commands with pipes
- Save a command's output to a file with redirection
---

# Finding your way around

The terminal lets you control your computer by typing commands instead of clicking. You'll use it to run programs, use Git, and work on remote servers that have no desktop at all.

On a Mac, open the Terminal app. On Linux, open your system's terminal. On Windows, install WSL, Microsoft's Windows Subsystem for Linux, to get a Linux terminal. The program that reads your commands is called the **shell**. Macs use zsh by default and most Linux systems use bash, but every command in this droplet works in both.

## Where am I?

Your shell is always in one folder, called the working directory. `pwd` (print working directory) shows which one, and `ls` lists what's inside it.

```bash
pwd
ls
ls -l
ls -a
```

On a Mac, `pwd` prints something like `/Users/priya`. On Linux, it's more like `/home/priya`. `ls -l` adds details such as sizes and dates, and `ls -a` also shows hidden files, whose names start with a dot, like `.gitignore`.

%definition The working directory is the folder your shell is in right now. Commands look for files there unless you give a full path.

## Moving between folders

`cd` (change directory) moves you to another folder. Say your coursework lives in a `courses` folder inside your home folder:

```bash
cd courses
cd cs3200/hw2
cd ..
cd ~/courses/cs2500
cd
```

That moves you into `courses`, then two levels down into `hw2`, back up one level to `cs3200`, over to `cs2500` from wherever you are, and finally back home. `cd` on its own always takes you home.

## Absolute and relative paths

A path is the address of a file or folder. An **absolute path** starts at the root of the file system, written `/`, so it works from anywhere. A **relative path**, like `cs3200/hw2`, starts from your working directory. You'll see these shortcuts in paths all the time:

| Shortcut | Meaning |
|---|---|
| ~ | Your home folder |
| . | The folder you're in |
| .. | The folder one level up |

%caution Names with spaces need quotes, as in cd "Group Project". Without them, the shell treats Group and Project as two separate names. Many developers use names like group-project to avoid the problem.

%%multiple-choice
- You're in /Users/priya/courses/cs3200. Which command takes you to /Users/priya/courses?
- cd ~
- cd .. <
- cd /courses
- cd .

# Working with files and folders

## Creating files and folders

`mkdir` makes a folder, and `touch` creates an empty file. Here's the start of a website for a student club:

```bash
mkdir club-site
cd club-site
mkdir -p images/events
touch index.html style.css
ls
```

`mkdir -p` creates every missing folder along the path, so `images` and `images/events` appear in one step. Without `-p`, `mkdir` stops with an error when the parent folder doesn't exist yet. If you `touch` a file that already exists, it leaves the contents alone and just updates the file's timestamps.

## Copying, moving and renaming

`cp` copies and `mv` moves. Both take the source first and the destination second.

```bash
cp index.html events.html
mv events.html calendar.html
mkdir drafts
mv calendar.html drafts/
cp -R images images-backup
```

- `cp index.html events.html` makes a copy under a new name.
- `mv` to a new name renames a file. In the shell, renaming is just moving.
- `mv` to a folder moves the file into that folder.
- `cp -R` copies a folder and everything inside it.

%caution cp and mv silently replace a file that already has the destination name. Add -i, as in cp -i index.html home.html, to be asked first.

## Deleting

`rm` deletes files. To delete a folder and everything in it, add `-r`. The `-i` option asks you to confirm each file first.

```bash
rm drafts/calendar.html
rm -r images-backup
rm -i style.css
```

%warning rm deletes files immediately. They don't go to the Trash and there's no undo, so read the command again before you press Enter.

Wildcards make this even more important. The `*` wildcard matches any characters, so `rm *.html` deletes every HTML file in the folder. Run `ls *.html` first to see exactly what it matches.

## Reading files

`cat` prints a whole file at once, which is fine for something short like a README. For longer files, `less` shows one screen at a time.

```bash
cat README.md
less syllabus.txt
```

In `less`, press Space to go down a page, `b` to go back up, `/` followed by a word to search, and `q` to quit.

%%true-false
- Files you delete with rm go to the Trash, so you can restore them later.
- false

# Searching and combining commands

## Searching with grep

`grep` prints every line of a file that contains the text you give it. Say you're a TA with this file, `grades.csv`:

```text
name,course,grade
Priya Patel,CS 3200,A
Marcus Lee,CS 2500,B+
Sofia Garcia,CS 3200,A-
Ethan Nguyen,CS 3500,B
Hannah Kim,CS 3200,B+
```

```bash
grep "CS 3200" grades.csv
grep -i "patel" grades.csv
grep -c "CS 3200" grades.csv
grep -rn "TODO" src
```

The first command prints the three CS 3200 rows. The quotes keep `CS 3200` together as one search term. `-i` ignores the difference between upper and lower case, and `-c` counts the matching lines instead of printing them. `-r` searches every file in a folder, including subfolders, and `-n` adds line numbers, which is handy for finding leftover TODO comments before you submit.

## Connecting commands with pipes

The pipe, a vertical bar character, sends the output of one command into the next command as its input. That lets you combine small tools that each do one job well.

```bash
grep "CS 3200" grades.csv | sort
grep "CS 3200" grades.csv | wc -l
ls -l | less
```

The first line prints the CS 3200 rows in alphabetical order. The second counts them, because `wc -l` counts lines. The third lets you scroll through a long folder listing.

## Saving output to a file

`>` sends a command's output into a file instead of to the screen, replacing anything already in that file. `>>` adds to the end of the file instead.

```bash
grep "CS 3200" grades.csv > cs3200.csv
echo "Leo Rossi,CS 3200,A" >> cs3200.csv
cat cs3200.csv
```

`echo` prints the text you give it, so the second line adds a row for Leo. Now `cs3200.csv` holds four rows.

%warning Never redirect output into the file a command is reading, as in sort grades.csv > grades.csv. The shell empties the file before sort starts, so you lose everything in it.

## Typing faster

- **Tab completion.** Type the first few letters of a file or folder name and press Tab, and the shell fills in the rest. If several names match, type another letter or two and press Tab again.
- **History.** Press the Up arrow to bring back your previous commands, and run `history` to list recent ones.
- **Search.** Press Ctrl+R and start typing to find an earlier command that matches.
- **Help.** Most commands have a manual page. Run `man grep` to read it, and press `q` to quit.

%%open-ended
- What's the difference between > and >> when you send a command's output to a file?
- A single > replaces everything in the file with the new output, while >> adds the output to the end of the file.
