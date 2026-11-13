# Deck layouts

An outline is a JSON file: `{ "title": "...", "slides": [ ... ] }`. Each slide
names a `layout` and fills its fields. Every slide also accepts `notes`
(speaker notes). The builder checks the outline first and stops with a clear
message on an unknown layout, a missing field or a missing label.

Every layout has the shared chrome: the blue bracket line top left, the
ODYSSEY wordmark bottom left, the blue line along the bottom and the slide
number bottom right.

**Images** are file paths. A relative path is read from the outline's folder. If
the file is missing, the slide gets a grey box with the `imageAlt` text in it,
so a draft still builds. Every screenshot needs a `label`: `"Figma design"` or
`"Built"`.

A feature takes two slides: `feature-what`, then `feature-steps`.

## title

First slide. Use once, at the start.

Fields: `title`, `subtitle`, `presenters` (list of names), `date`.

```json
{
  "layout": "title",
  "title": "Odyssey Update",
  "subtitle": "Progress report",
  "presenters": ["Presenter 1", "Presenter 2"]
}
```

## agenda

Numbered list of what the meeting covers. Client updates only, slide 2.

Fields: `items` (1 to 8 strings), `title` (default "Agenda").

```json
{ "layout": "agenda", "items": ["Review progress", "Design questions"] }
```

## section

A divider between parts of a deck.

Fields: `title`, `subtitle`, `number` (for example `"01"`).

```json
{ "layout": "section", "number": "01", "title": "Content Supply Chain" }
```

## timeline

Where the project is and what comes next. 2 to 5 dated steps, drawn on a bar.

Fields: `title`, `steps` (each: `date`, `label`, `items` as a list of short
strings). Only add dates the team confirmed.

```json
{
  "layout": "timeline",
  "title": "Timeline",
  "steps": [
    { "date": "Today", "label": "Where we are", "items": ["Item"] },
    { "date": "Date A", "label": "Next", "items": ["Item"] }
  ]
}
```

## pillars

The approach in two or three pillars, with an optional grey callout bar.

Fields: `title`, `subtitle`, `pillars` (2 to 3, each: `label`, `name`, `line`),
`footer` (`label`, `text`).

```json
{
  "layout": "pillars",
  "title": "How will we achieve this?",
  "pillars": [
    { "label": "Pillar 1", "name": "First", "line": "What it does" },
    { "label": "Pillar 2", "name": "Second", "line": "What it does" }
  ]
}
```

## feature-what

The first slide of a feature: what it is, who uses it, why it matters and what
is still open.

Fields: `title`, `what` (one or two sentences), `users` (`learner`, `creator`,
`reviewer`, each optional), `why` (what changed and why it matters), `goals`
(short tags tying it to the project goals), `openQuestions` (list), `image`
or `imageAlt`, `imageLabel` (required when there is an image), `tag` (pitch
only: `{ "pillar": "Pillar 1", "index": 2, "count": 3 }`).

```json
{
  "layout": "feature-what",
  "title": "Reviewer Checklist",
  "what": "A checklist the reviewer works through.",
  "users": { "reviewer": "Ticks each item." },
  "why": "Reviews finish faster.",
  "goals": ["Faster reviews"],
  "openQuestions": ["Should it block publishing?"]
}
```

## feature-steps

The second slide of a feature: how it works. 2 to 4 steps, each a screenshot
beside one short line.

Fields: `title`, `steps` (each: `line`, `image` or `imageAlt`, `label`), `label`
(a default for all steps), `tag` (as above). The steps' labels are required.

```json
{
  "layout": "feature-steps",
  "title": "Reviewer Checklist",
  "steps": [
    {
      "line": "Open a draft in review.",
      "image": "shots/open.png",
      "label": "Built"
    },
    {
      "line": "Tick each item.",
      "image": "shots/tick.png",
      "label": "Figma design"
    }
  ]
}
```

## screenshot

One large image with a caption.

Fields: `title`, `image` or `imageAlt`, `caption`, `label` (required).

```json
{
  "layout": "screenshot",
  "title": "Group Page",
  "image": "shots/group.png",
  "caption": "The group page after the redirect.",
  "label": "Figma design"
}
```

## design-questions

Questions for the client. Plain numbered list, or up to 4 columns when
questions carry an image.

Fields: `questions` (1 to 4; a string, or `{ text, image, imageAlt, label }`),
`title` (default "Design Questions").

```json
{ "layout": "design-questions", "questions": ["Which layout works better?"] }
```

## bullets

A plain list. Pitch problem and goals slides, stretch goals.

Fields: `title`, `bullets` (strings, or `{ text, sub: [strings] }`).

```json
{
  "layout": "bullets",
  "title": "Our goals",
  "bullets": ["Goal one", { "text": "Goal two", "sub": ["Detail"] }]
}
```

## recap

Two to four cards that sum up the pitch.

Fields: `title` (default "Recap"), `items` (each: `heading`, `text`).

```json
{
  "layout": "recap",
  "items": [
    { "heading": "The problem", "text": "One sentence." },
    { "heading": "The plan", "text": "One sentence." }
  ]
}
```

## questions

The "Questions?" slide.

Fields: `title` (default "Questions?").

```json
{ "layout": "questions" }
```

## thank-you

Closing slide of a pitch.

Fields: `title` (default "Thank you"), `subtitle`.

```json
{ "layout": "thank-you", "subtitle": "Contact line" }
```

## appendix

With only a `title`, a divider. With an image or bullets, a backup slide marked
"Appendix".

Fields: `title`, `image` or `imageAlt`, `label` (required with an image),
`caption`, `bullets`.

```json
{ "layout": "appendix", "title": "Appendix" }
```
