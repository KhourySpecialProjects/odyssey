# Demo catalog

Realistic droplets for the demo's Explore page, one Markdown file each. They
go through the app's own Markdown importer
(`frontend/lib/blocknote/markdown-to-blocknote.ts`), the same code behind
"Import Markdown" when you add a lesson, so the demo also shows what imported
lessons look like.

The seed can't run the frontend's TypeScript, so it reads the converted
`../catalog.json` instead. After you add or edit a droplet, rebuild it:

```bash
npm run demo:catalog    # converts every catalog/*.md into catalog.json
npm run demo:db:reset   # then reseed to see the change
npm run demo:seed
```

`frontend/testing/lib/demo-catalog.test.ts` fails if `catalog.json` is out of
date or a file breaks the rules below, and the seed coverage test fails if a
lesson wouldn't open in the editor. To check files while you write:

```bash
node backend/scripts/demo-seed/catalog/lint.mjs backend/scripts/demo-seed/catalog/*.md
```

## A droplet file

The file name is the droplet's key (`git-basics.md` is `git-basics`).
`git-basics.md` is a good example to copy.

```
---
name: Git for Your First Team Project
description: One sentence for the droplet's card, at most 120 characters.
overview: One or two sentences for the droplet's page.
funFact: One true, checkable sentence about the topic.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: beginner
tags: git
objectives:
- 3 or 4 short objectives that start with a verb
---

# First lesson title

...
```

- `authors` are content creator persona keys, comma separated.
- `type`, `focusArea` and `difficulty` take the values the droplet schema
  allows (knowledge or skill; personal, professional or technical; beginner,
  intermediate or advanced).
- `tags` are slugs from `TAGS` in `../content.js`. Add a new tag there first.
- Front matter is plain text: no Markdown, `$`, `|`, `<` or `>`.

Every droplet is published. A student enrolls in it from Explore like any
other; `world.js` adds background students browsing the catalog.

## Markdown the importer understands

The importer supports much less than normal Markdown:

- `# Title` starts a new lesson, so use it only for lesson titles. Inside a
  lesson, use `##` and `###`.
- **Every line is its own paragraph.** Don't hard-wrap.
- Bullets with `- `, nested by indenting 2 spaces. Numbered lists with `1. `,
  flat only.
- `**bold**`, `*italic*`, `` `code` `` and `[links](https://...)`. Nothing
  else: the editor can't open a lesson with strikethrough (`~~`) or underline.
- Code blocks fenced with a language: `python`, `javascript`, `typescript`,
  `bash`, `json`, `sql`, `html`, `css` or `text`.
- Callouts on one line: `%definition Text`, with `definition`, `important`,
  `warning`, `caution`, `question`, `more-information` or `default`. Callout
  text shows as plain text.
- Tables with a header row and a `|---|---|` separator. No empty cells, and
  no formatting in cells.
- Math: `$...$` inline, or `$$...$$` on its own line.

Outside code blocks, `|` belongs only in tables (two lines in a row with a
`|` become a table), `*` only in bold and italic (write `` `SELECT *` ``),
and `$` only in pairs for math (write "20 dollars").

## Quizzes

End each lesson with one quiz. Students have to answer multiple choice and
true/false quizzes correctly to move on, so keep them fair. Quiz text is
plain, and a blank line must follow each quiz.

```
%%multiple-choice
- The question?
- A wrong option
- The right option <
- Another wrong option

%%true-false
- A statement that is true or false.
- false

%%open-ended
- A question to answer in a sentence or two?
- A model answer.
```

## Reviewing a droplet

The demo is shown to faculty, so read every droplet before it goes in:

- Facts, numbers and the fun fact are correct.
- Code runs as written and does what the text says.
- Quizzes have one clearly right answer that the lesson teaches.
- No invented Northeastern policies, dates or offices.
