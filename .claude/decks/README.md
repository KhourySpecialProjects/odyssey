# Odyssey deck kit

Builds Odyssey slide decks (pitch decks and client-meeting updates) as `.pptx`
files, which the team imports into Google Slides. The kit lives in the repo.
The decks it makes live on your laptop, never in the repo. Run it with the
`/deck` command, or by hand as below.

It keeps the look of the team's existing decks (white slides, navy titles, the
blue bracket and bottom lines, the ODYSSEY wordmark, slide numbers) and tidies
margins, title sizes and spacing so every layout uses the same grid.

## Build

```bash
cd .claude/decks
npm ci
node build-deck.mjs <outline.json> <out.pptx>
```

Try it on the examples:

```bash
node build-deck.mjs examples/client-update.json ~/Documents/Odyssey\ Decks/test.pptx
node build-deck.mjs examples/pitch.json ~/Documents/Odyssey\ Decks/test-pitch.pptx
```

Write decks outside the repo. The default folder is
`~/Documents/Odyssey Decks/<YYYY-MM-DD>-<kind>-<slug>/`.
The outline format and every layout are in `layouts.md`. If an image file is
missing, the slide gets a grey box with the expected content written in it.

## Import into Google Slides

1. Upload the `.pptx` to Google Drive.
2. Right-click it, then Open with, then Google Slides. Or, in a Google Slides
   deck, use File, then Import slides.
3. Skim every slide. Fix anything that moved.

## Files

- `build-deck.mjs`: the builder.
- `theme.json`: colours, fonts, sizes, margins and the grid.
- `layouts.md`: the layouts, with fields and examples.
- `examples/`: placeholder outlines for a client update and a pitch.
- `assets/logo.png`: the wordmark, copied from `frontend/public/logo.png`.
- `assets/sail.png`: the pale sailboat on the title slide, cropped from the
  team's Odyssey V3 Pitch deck at 300 dpi.

## Fonts

The decks use Roboto (titles and text) and Play (small tags and numbers).
Lexend, Roboto Condensed and Arial appear in the originals. All of these are
Google Fonts except Arial, so they survive the Google Slides import. Fonts are
only names in the file. If a font is not installed on the machine that opens
the file, it falls back to another one. Google Slides has them all.

## Limitations

- The pillar columns and the timeline are drawn from simple shapes, not the
  original artwork.
- Text boxes do not shrink on their own. The builder shortens long text a little
  but keep lines short.
- Slide numbers are set as slide-number fields. Check them after the import.
- Layouts are fixed. A slide that needs something new should use `bullets` or
  `screenshot`, or the kit needs a new layout.
- Previewing: LibreOffice and Keynote are not required. macOS Quick Look shows
  the first slide only. Import into Google Slides to see all of them.
