---
disable-model-invocation: true
---

# Make a Product Film Prompt

Turn a few answers into a ready-to-run prompt for a product film: a release
film, a feature explainer or a redesign reveal, in 16:9, 9:16 or both.

## Notes: $ARGUMENTS

The notes are free text. They may be empty.

## Steps

### 1. Read the template

Read `.claude/templates/VIDEO_PROMPT_TEMPLATE.md`. Its `<inputs>` block lists
every field. Everything below the block stays as it is.

### 2. Take what the notes already say

Go through the notes and fill every input they answer. Do not ask again for
anything they give. If a note is vague, keep the words the person used.

The eight inputs a film needs:

1. PRODUCT_NAME and WHAT_IT_IS
2. VIDEO_COVERS (the kind, then the features or screens)
3. STYLE
4. VISUAL_VIBE
5. MUSIC_VIBE
6. INSPIRATION
7. ASPECT_RATIO
8. DURATION

### 3. Ask for what is missing

Use AskUserQuestion for each of the eight that is still empty. Ask them
together, in one call where you can. Offer sensible options, and let the
person write their own.

- ASPECT_RATIO: 16:9, 9:16, both.
- DURATION: 30 s, 45 s, 60 s.
- VIDEO_COVERS kind: release film, feature explainer, redesign reveal. Then
  ask which features or screens, unless the notes name them.
- STYLE, VISUAL_VIBE, MUSIC_VIBE, INSPIRATION: offer "agent decides" and two
  or three short examples from the template.

Also ask for these two, with a default the person can accept:

- OUTPUT_FOLDER: a new folder on this laptop, outside the repo. Default
  `~/Documents/Odyssey Videos/<slug>/`, where `<slug>` is a short name for
  the film.
- DO_NOT_TOUCH: default "frontend/, backend/, .env files; no commits or
  pushes".

Do not ask about the optional fields (CURRENT_APP, SCREEN_SOURCES,
DATA_AND_PEOPLE, BRAND, CAPTIONS, CENTRAL_MESSAGE, END_CARD_LABEL,
SOUND_AVOID). Fill them from the notes if given. Otherwise:

- CURRENT_APP: `frontend/ (Next.js 15, Tailwind 3.4)`.
- SCREEN_SOURCES: "unknown", unless the notes name a branch, prototype or
  Figma link.
- BRAND: "extract from the codebase".
- Every other optional field: "agent decides".

### 4. Show the inputs

Show the filled `<inputs>` block and ask for an OK. Fix anything the person
changes. Do not go on until they say yes.

### 5. Write the prompt

Create the output folder. Write the whole template to
`<OUTPUT_FOLDER>/PROMPT.md`, with the filled `<inputs>` block in place of the
empty one. Change nothing else in it.

Never write inside `frontend/`, `backend/` or `terraform/`. If the output
folder is inside the repo, stop and ask for another.

### 6. Tell the person what happens next

Say, in plain sentences:

- The prompt is at `<OUTPUT_FOLDER>/PROMPT.md`.
- The film renders on this laptop. It needs Node, Playwright's Chromium and
  ffmpeg. Long renders take a while (a 60 s film is 3,600 frames per
  master).
- The prompt tells the agent to finish only when the film exists and has
  passed its checks.

Then offer to start the work in this session. If they say yes, follow
`PROMPT.md` as the brief. Do not commit or push.
