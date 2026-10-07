---
name: Git for Your First Team Project
description: Commit, branch and merge without losing anyone's work.
overview: Git is how a team shares one codebase without overwriting each other's work. This droplet covers the commands you'll use every day on a group project, and what to do when two people change the same line.
funFact: Linus Torvalds, who created Linux, also wrote the first version of Git in 2005 to manage the Linux kernel's code.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: beginner
tags: git
objectives:
- Save your work in small, clearly described commits
- Build a feature on its own branch and share it
- Resolve a simple merge conflict
---

# Saving your work with commits

Git keeps a history of your project. Each saved point in that history is a **commit**: a snapshot of every file, plus a message that says what changed.

On a team project you usually start by copying the shared repository to your laptop. That copy is called a clone.

```bash
git clone https://github.com/your-team/project.git
cd project
```

%definition A repository is a project folder that Git tracks, including its full history of commits.

## The everyday loop

Most of your Git use is the same three steps, over and over:

1. Change some files in your editor.
2. Stage the changes you want to save with `git add`.
3. Save them as a commit with `git commit`.

```bash
git status
git add src/search.py
git commit -m "Add search by student name"
```

`git status` is the command to run whenever you're unsure what's going on. It lists the files you've changed, which ones are staged, and which branch you're on.

## Writing good commit messages

Your teammates will read your messages when they look through the history, so make each one count.

- Start with a short summary of what the commit does, like `Fix crash when the roster is empty`.
- Keep each commit to one change. Fixing a bug and renaming a file are two commits.
- Commit often. Small commits are easier to review and easier to undo.

Run `git log --oneline` to see recent commits, one per line.

%%multiple-choice
- Which command shows the files you've changed but not committed yet?
- git log
- git status <
- git clone
- git commit

# Working on a branch

A branch is a separate line of work. You make your changes on a branch so the main branch stays working while your feature is half finished.

```bash
git switch -c search-page
```

This creates a branch called `search-page` and moves you onto it. Commits you make now go on `search-page`, not on `main`.

## Sharing your branch

When you're ready for feedback, push the branch to the shared repository and open a pull request on GitHub. A pull request asks your teammates to review your branch before it's merged into `main`.

```bash
git push -u origin search-page
```

You only need `-u origin search-page` the first time. After that, `git push` is enough.

%important Never commit passwords or API keys. Anyone who can see the repository can read them, even after you delete the file in a later commit.

## Staying up to date

While you work, your teammates merge their own branches into `main`. Bring their changes into your branch every day or so, so the differences never get too large.

```bash
git switch main
git pull
git switch search-page
git merge main
```

- Keep branches small and short-lived, ideally a few days of work.
- Name a branch after what it does, like `fix-login-redirect`.
- Delete a branch after it's merged, so the branch list stays readable.

%%true-false
- Commits you make on a feature branch change the main branch right away.
- false

# Fixing a merge conflict

Git merges most changes on its own. A conflict happens when two branches change the same lines of the same file, and Git can't tell which version you want.

When that happens, Git stops the merge and marks the conflicting lines in the file:

```python
<<<<<<< HEAD
greeting = "Welcome back"
=======
greeting = "Hello again"
>>>>>>> main
```

The part above the `=======` line is your branch's version. The part below it is the version you're merging in.

## Resolving it

1. Open each file that `git status` lists as conflicted.
2. Decide what the code should be. Keep one side, or combine both.
3. Delete the three marker lines.
4. Stage the file with `git add` and finish with `git commit`.

%warning Run the code before you commit the merge. A file can be free of markers and still be broken.

## Avoiding conflicts

You can't avoid every conflict, but you can make them rare and small:

- Pull from `main` often, so your branch never drifts far.
- Keep commits small and focused on one change.
- Tell your team when you're about to change a file everyone uses, like a shared config file.

%%open-ended
- After you edit a conflicted file, what do you still need to do to finish the merge?
- Remove the conflict markers, stage the file with git add, then commit the merge.
