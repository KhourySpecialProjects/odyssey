<inputs>
Fill in every field, replacing the text in brackets, and delete the examples.
Write "agent decides" to let the agent choose, or "unknown" to have it find
out. Everything below this section stays as it is.

The brief (the eight things a film needs)

- PRODUCT_NAME: [e.g. Odyssey]
- WHAT_IT_IS: [one sentence on what the product does and for whom]
- VIDEO_COVERS: [the kind of film, then what it covers. The kind is one of
  "release film" (what just shipped), "feature explainer" (how one feature
  works) or "redesign reveal" (today's product against a proposed look), or
  another kind you describe. Then the features or screens, most important
  first, e.g. "release film: the review flow, inline comments, the new
  Explore filters"]
- STYLE: [how the film is made and told, e.g. "motion graphics from real
  interface code, no voiceover, short captions"; or "agent decides"]
- VISUAL_VIBE: [the look and feel, e.g. "calm, light, precise, lots of room";
  or "agent decides"]
- MUSIC_VIBE: [the music's style and feel, e.g. "a warm nylon-string guitar
  song in 12/8 with a whistle melody"; or "agent decides"]
- INSPIRATION: [companies whose product films set the bar, e.g. "Linear,
  Apple, Stripe, Vercel"; or "agent decides". A quality bar, never a template]
- ASPECT_RATIO: [16:9, 9:16 or both]
- DURATION: [in seconds, e.g. 30, 45 or 60]

Where things are

- CURRENT_APP: [path and stack of today's app, e.g. "frontend/ (Next.js 15,
  Tailwind 3.4)"; or "unknown"]
- SCREEN_SOURCES: [where the screens the film shows come from: the running
  app, a coded prototype, a branch, Figma frames or images, with paths or
  links; or "unknown"]
- OUTPUT_FOLDER: [a new folder for everything the agent makes, e.g.
  "~/Documents/Odyssey Videos/review-release/"]
- DO_NOT_TOUCH: [paths and actions that are off limits, e.g. "frontend/,
  backend/, .env files; no commits or pushes"]

Content, look and sound details (all optional)

- DATA_AND_PEOPLE: [the synthetic data and invented personas to use, e.g.
  "the prototype's seeded data; personas Dana (admin) and Jordan (student)";
  or "agent decides"]
- BRAND: [logo file, title colour, typeface; or "extract from the codebase"]
- CAPTIONS: [the on-screen lines in order; or "agent decides"]
- CENTRAL_MESSAGE: [the line the film ends on, e.g. "Same Odyssey. A cleaner
  experience."; or "agent decides"]
- END_CARD_LABEL: [the status line under the logo, e.g. "A proposed UI/UX
  redesign" or "Release 2026.11"; or "agent decides"]
- SOUND_AVOID: [sounds you do not want, e.g. "bird calls, constant ambience"]

</inputs>

<using_the_inputs>
Wherever {{FIELD}} appears below, use that field's value from the inputs.
Check every input against the codebase before relying on it. If an input is
wrong, missing or "unknown", find the answer yourself. Where a field says
"agent decides", decide. Record both in DECISIONS.md.

Read {{VIDEO_COVERS}} first. Its kind picks the accuracy rules and the story
below. {{ASPECT_RATIO}} picks the technical, verification and deliverables
sections. Where a section has a variant for each, follow only the variants
that apply.
</using_the_inputs>

<goal>
Create a {{DURATION}}-second film for {{PRODUCT_NAME}} of the kind and content
given in {{VIDEO_COVERS}}, in {{ASPECT_RATIO}}, with its soundtrack, rendered
programmatically from real interface code and verified. The style is
{{STYLE}}.

The product: {{WHAT_IT_IS}}

What the film says depends on its kind:

- A release film shows what has really shipped. The audience should leave
  knowing what they can now do.
- A feature explainer shows one feature working. The audience should leave
  understanding how it works and why it helps.
- A redesign reveal is not a new product launch. It is a visual evolution of
  the existing product. {{PRODUCT_NAME}} keeps its features, workflows and
  identity; what changes is how the experience looks, feels and flows. The
  audience should leave thinking: "It already did all of this. Now it looks
  and feels much better."

If {{CENTRAL_MESSAGE}} is given, the film ends on it.

The deliverable is a finished, playable video file with sound. A storyboard,
mockup, HTML preview or plan on its own is not the deliverable.
</goal>

<role>
Act as a small product-film studio: creative director, product designer,
motion designer, frontend engineer, sound designer and render engineer. The
production quality to aim for is that of {{INSPIRATION}}. Use them as a
quality bar, not as templates: take their restraint, pacing and polish, never
their layouts, copy or music. The interface is the star; nothing decorative
may compete with it.
</role>

<ground_rules>
Work only in {{OUTPUT_FOLDER}}. Do not touch {{DO_NOT_TOUCH}}. Do not commit,
push or create branches unless the inputs allow it. Never modify the current
app or the sources of the screens: read them, capture them, rebuild them in
your folder.
</ground_rules>

<discovery>
Before designing anything:

1. Inspect {{CURRENT_APP}}: its pages, navigation (labels, order, the active
   state), workflows, components and design system (colours, type scale,
   spacing, radii, icons). Note exact class strings and tokens.
2. Study {{SCREEN_SOURCES}}: every screen and state the film may use, and the
   reason for each change if any are proposed.
3. For each feature or screen in {{VIDEO_COVERS}}, find where it lives and
   what state it is in:
   - a release film: confirm with git that the change is in
     `origin/production` (for example `git branch -r --contains <sha>`), and
     find which release it belongs to;
   - a feature explainer: find the real flow, step by step, and where each
     step is on screen;
   - a redesign reveal: compare today with the proposal and rank the most
     visible improvements. Find anything in the proposal that adds a
     capability rather than refines one, and plan to leave it out.
4. Check the git history for related work that is already shipped, or in
   review but not shipped.
5. Choose the screens and states to show, starting from what
   {{VIDEO_COVERS}} and {{SCREEN_SOURCES}} name.
6. Classify everything that will appear on screen as Shipped, Proposed or
   Made for the video (windows, camera, captions, chips, cursor, music).

Record all of it in DECISIONS.md.
</discovery>

<accuracy>
Every item on screen is Shipped, Proposed or Made for the video. Never
present anything proposed as shipped. By kind:

- Release film:
  - show only what is really on production, confirmed with git as above, and
    label each feature with its release (a release name or number from the
    repository's tags or release notes, never an invented one);
  - if something is merged but not yet on production, leave it out;
  - the end card shows {{END_CARD_LABEL}}.
- Feature explainer:
  - show the feature as it really works. If it exists only as a design,
    label Figma frames as designs on screen ("Design"), and rebuild them
    from the frames, measured against them;
  - the end card shows {{END_CARD_LABEL}}.
- Redesign reveal:
  - same features, refined. Remove anything the proposal adds as a new
    capability from the proposed screens when you capture them, before any
    frame is drawn. Do not just hide them in the video;
  - rename nothing the proposal does not rename. Where it renames a label,
    show the proposal's label and record why;
  - every before-and-after shot carries a "Today" / "Proposed" chip, and the
    end card shows {{END_CARD_LABEL}} under the logo.

For every kind:

- No fake features, metrics, real people, e-mails, customer data or student
  data, and no live numbers. No fictional pages, release dates or feature
  announcements. If a date or a name is not confirmed in the repository or
  the inputs, it does not appear.
- Real UI is captured from the running app or rebuilt from code, never
  screenshotted and then faked. Rebuild screens from real code so they can
  morph and stay sharp in close-up:
  - copy each element's classes or styles from the component that renders it;
  - compile the CSS with the app's own build configuration;
  - take icons from the icon packages the app really uses;
  - redraw charts the way the app's chart library lays them out;
  - keep today's quirks, even unflattering ones. Do not quietly fix today.
- Put each rebuild beside a live screenshot in design/before_after.html, and
  compare them by eye.
- Screens from a coded prototype: capture its own rendered DOM and CSS in
  headless Chromium, driving each state you need (menus open, filters
  applied, buttons pressed; on a phone, taps on a touch screen where
  `(hover: none)` and `(pointer: coarse)` match). Diff each captured state
  against the prototype's own screenshot. Most should differ in 0.00% of
  pixels; explain every exception.
- Screens from Figma frames or images: rebuild them in HTML and CSS from the
  frames, measure the rebuild against them, and record each interpretation.
- If a source does not cover a screen you need, interpret it in the product's
  own visual language and label that as an interpretation.
- One dataset throughout: {{DATA_AND_PEOPLE}}. When a film compares two
  versions, use the same data on both, so only the design differs.
- Do not show a screen as "today" if it is broken or about to be replaced by
  a fix that is in review. Show it only where the film is honest about it,
  and record why.

</accuracy>

<visual_direction>
{{STYLE}}, {{VISUAL_VIBE}} and {{INSPIRATION}} drive the look. Default to
"Studio canvas", unless another direction clearly scores better:

- each screen is a floating window on one calm canvas a step below the app's
  own neutral surfaces: a desktop window at the app's main desktop size (1440
  × 900 unless the app says otherwise) for 16:9, a frameless phone viewport
  for 9:16;
- the camera travels between windows, and overview shots show several at
  once;
- the interface is the only saturated thing in frame;
- captions sit on the canvas, never on the product: the brand's title colour
  and typeface ({{BRAND}}), uppercase, tracked about 0.075 em, about 46 px at
  1920 × 1080 and about 60 px at 1080 × 1920;
- chips ("Today" / "Proposed", a release name, "Design") are small pills near
  the window. A chip never shares the screen with a two-line caption;
- windows have a soft, restrained shadow.

Build design/directions.html comparing four presentations of the same 9
seconds, rendered from the same timeline: A Studio canvas, B a dark canvas
(or, on a phone, a device frame), C full-bleed screens and D annotated
blueprint. Bend each to {{VISUAL_VIBE}}. Score them on:

- the interface as the hero;
- room for captions;
- travelling between screens;
- honesty (for a reveal, does it look like a rebrand?);
- restraint.

Choose one and record why.

Phones: a frameless viewport is what the app specifies. A device bezel adds
hardware and suggests a native app when the product runs in the phone's
browser, so prefer frameless, with a corner radius of about 36 px, small
enough that nothing the app draws at its edges is cut.

Banned:

- neon, glows, 3D blobs, particles or heavy gradients;
- camera spins;
- fake dashboards, fake features or fake metrics;
- a new brand palette;
- text overlays beyond the captions.

</visual_direction>

<story>
Pick the structure for the kind in {{VIDEO_COVERS}}. The times below are
examples for a 60-second film. For {{DURATION}}, scale every scene and snap
each scene start to a bar line of the music (at 120 BPM a bar is 2 s). Give a
short film fewer beats rather than shorter ones; every beat needs room to be
read.

Release film

- Hook (about 10% of the film): the most recognisable screen, or the line a
  user would say about the release. The camera barely drifts.
- One beat per shipped feature, most important first, sharing the middle of
  the film. Each beat has two parts: what it is (a caption and the screen)
  and how it works (a real interaction on that screen, for example a button
  pressed, a filter applied, a comment sent). Give a feature as long as it
  needs, and no more than about 12 seconds. Cut features rather than rush
  them.
- Everything together (about 15%): pull back to a montage of the shipped
  screens under one unchanging header, one page about every 0.9 s, ending on
  a wall of all of them. This is the visual climax.
- End card (about 10%): the real logo with {{END_CARD_LABEL}}, the release
  name. If {{CENTRAL_MESSAGE}} is given, its words come first.

Feature explainer

- The problem (about 15%): the situation without the feature, shown on a real
  screen. One caption.
- The steps of how it works (about 55%): one beat per step, in the order a
  user does them. Each step is a real interaction, with the cursor (or the
  fingertip on a phone), one caption naming it, and the camera still under
  the caption.
- The result (about 20%): the finished state, pulled back so the whole screen
  reads, with one caption on what the user gained.
- End card (about 10%): the real logo with {{END_CARD_LABEL}}. If
  {{CENTRAL_MESSAGE}} is given, its words come first.

Redesign reveal: six scenes

S1, The {{PRODUCT_NAME}} you know (0–6)

- Today's most recognisable screen, in one window, the camera barely
  drifting.
- The first caption from about 1.1 to 5.1.
- The "Today" chip from about 5.5.

S2, Now, more refined (6–16)

- 6.4–9.9: the first and biggest Magic Move, today → proposed, of that same
  screen.
  - Global chrome moves first (header, navigation), then titles and toolbars,
    then the content in a wave (about 0.13 s apart).
  - Inside repeated items (cards, rows) there are three beats: the clutter
    clears, the shape changes, then the details settle.
- The chip switches to "Proposed" mid-morph.
- The caption from about 10.9 to 14.1.

S3, One design language (16–28)

- Travel to the part of today's app whose visual language the redesign
  spreads, and morph it to its proposed version (about 17.6–19.7). Choose it
  from {{SCREEN_SOURCES}}.
- One or two clicks follow its components onto other screens, each a morph.
- About 25.5: pull back to a family of about six proposed screens in a grid.
- The caption from about 25.7 to 27.7.
- If there is no such part, show the shared system across screens instead.

S4, The details matter (28–42)

- Two or three close-ups of the strongest details, each given room. For
  example:
  - one component rewound to today and played forward;
  - one real interaction from the proposal (a filter, a menu, a form);
  - one considered detail (an undo, a confirmation, a status pill).
- A caption after each (about 31.7, 36.7 and 41.0), 1.4 to 2 s long, with the
  camera still.

S5, Everything works together (42–52)

- Pull back, then travel to the main window.
- A montage of proposed pages under one unchanging header, one page every
  0.9 s, each sliding in over 0.45 s.
- A slow push.
- About 51.3: the wall of all proposed screens. This is the visual climax.

S6, Same {{PRODUCT_NAME}} (52–60)

- Back to the S1 composition, now proposed.
- A compare divider travels in to the middle (today left, proposed right),
  holds, and travels back out.
- The two parts of {{CENTRAL_MESSAGE}}, staggered by 0.95 s, from about 55.6
  to 58.0.
- About 58.2–59.0: the end card, the real logo with {{END_CARD_LABEL}}.

Captions: {{CAPTIONS}}. Where that says "agent decides", write them yourself
in the voice of the kind. The reveal's defaults, in order:

1. THE {{PRODUCT_NAME}} YOU KNOW.
2. NOW, MORE REFINED.
3. ONE COHESIVE EXPERIENCE.
4. LESS CLUTTER.
5. MORE CLARITY.
6. EVERY DETAIL, CONSIDERED.
7. The two parts of the central message.

Copy rules, for every kind: at most two lines on screen, at most eight words
a line, and no more than four words on the longest line on a phone. Nothing
says "app" or "download" if the product runs in the browser. Never give a
release date or a version that is not confirmed.

- A redesign reveal never says "new", "all-new", "rebuilt", "reimagined" or
  "from the ground up". It is a refinement.
- A release film may say "new" for features that are shipped. It never gives
  an unconfirmed date.
- A feature explainer names what the user does ("Pick a droplet", "Send the
  comment"), not what the product claims.
  </story>

<motion>

- Magic Move morphs real elements (for reveals and any before-and-after;
  other films can use plain page changes and the same curves). Lay out both
  screens and match their parts.
  - Boxes (headers, cards, buttons, inputs, tables) are drawn by two proxy
    boxes, each with its own screen's fill, border, radius and shadow. The
    proxies tween position and size and cross-fade, while the real elements
    keep their place with their paint turned off.
  - Leaves (text, icons, pills, charts) translate and scale toward their
    partner and cross-fade.
  - Identical parts swap unseen at the midpoint.
  - Text that is the same but restyled overlaps, so it never blinks out.
  - Unmatched parts ride with their nearest box and fade.
  - A matched button's box fades with its own label, so no frame shows an
    empty outline. Fields whose text differs keep their outline continuous
    and swap text in sequence, so two texts never overlap.
  - Never fade an unmatched container's opacity: matched parts inside it
    would fade too. Draw its paint with a proxy instead.
  - Charts keep their size and swap around their moving cards, rather than
    stretching across each other.
  - Two different marks of one thing (an old and a new logo, two avatars)
    swap in a short window mid-flight. Never double or half-fade them.
  - A group of items that merge into one (several filter buttons into one
    Filters button) fade before the new one arrives, so they never pile up.
  - Order moves that would cross: step charts down and clear first, then move
    cards bottom row first. Counts swap in place, so "7" never crosses "6"
    and reads as "8".
- Custom cubic-bézier curves, with no overshoot and no bounce:
  - settle (0.22, 0.68, 0.12, 1): parts landing;
  - glide (0.55, 0, 0.15, 1): reframes;
  - travel (0.62, 0, 0.2, 1): flights between windows;
  - enter (0.16, 0.72, 0.18, 1): arrivals;
  - exit (0.5, 0, 0.75, 0.4): departures.
  - Sheets and drawers on a phone slide with (0.2, 0.75, 0.15, 1), with
    their backdrop.
- Camera:
  - zoom interpolates in log space;
  - long flights arc, easing back mid-way and then in;
  - while a caption or something to read is on screen, the camera holds, or
    drifts less than 2%.
- Microinteractions: only ones that really exist in the product or, for a
  reveal, in the proposal, such as a navigation indicator gliding, a menu
  opening, a list reflowing or an undo.
- Input marker:
  - desktop: the cursor is a plain arrow with a 0.45 s ring on each press;
  - phone: a fingertip, a 40 px translucent disc with a white rim (in phone
    pixels) that appears just before each tap, presses in, and leaves a
    spreading ring.
- Keep body-size UI text at 12 px or more on screen, outside the overview
  shots. On a phone in the vertical film, a whole-phone shot gives about 25
  px for 14 px UI text.
- Overview shots (a family of six, a wall of nine) are about structure, not
  reading. Keep them short.
- A page swap that moves a page must move it by a relative offset, not by a
  transform on the page container: a transform re-anchors its `position:
fixed` children (a lesson's bottom bar would jump).

</motion>

<sound>
The music leads. The soundtrack supports the picture and never competes with
it. Its style is {{MUSIC_VIBE}}. If that says "agent decides", write a
restrained, warm, music-led score with a light rhythmic pulse and one melody
instrument, not generic corporate music.

Lessons from earlier films, which apply unless the inputs say otherwise. The
owner loved the warm guitar song and hated the loud surf and the gull calls:

- Ambience (the sound of a place: surf, a city, nature) is at most a quiet
  bookend. Keep it at least 10 LU under the music, at the open and the close
  only. Constant ambience and an effect on every move had "too much going
  on". In the coastal score the surf is 11 LU under the music in S1, 14 in
  S6, and absent in between.
- No animal or novelty sounds. Gull and bird calls were "annoying and
  distracting", and "no longer complemented the video".
- Do not muffle or filter the music for effect (the underwater scene was
  cut). When a scene needs to step back, thin the arrangement.
- Sound serves the picture. If a sound does not match something on screen,
  it goes.
- Also avoid {{SOUND_AVOID}}.

Structure:

- Choose a tempo whose bar fits the scenes. At 120 BPM a bar is 2 s, so the
  scenes of a 60-second film start on bar lines. For another {{DURATION}},
  choose the bar count first, then the scenes.
- Map one chord progression onto the scenes.
- A recognisable motif of three to five notes plays at the open and returns,
  harmonised, near the end (in a reveal, during the S6 compare).
- The melody enters under the first caption after the open, then again in the
  build, and again in the montage.
- The build and the montage grow with percussion. The close-up scenes thin so
  the interface sounds sit on top. The montage swells into the wall, and the
  end resolves on the logo.
- A level arc lifts the sparser scenes. Keep the scenes' short-term loudness
  within about 6 to 7 LU of each other, the loudness range at about 7 LU or
  less, and no momentary holes. Without ambience filling the quiet scenes,
  the music's contrasts show: a held chord and a little more level in the
  sparse scenes fixed a 1.5 s hole that fell to -30 LUFS momentary.
- Interface sounds come from one cue list in timeline.js, tuned to the key
  and matched to what happens on screen:
  - clicks and ticks (on a phone, taps: rounder and softer than a mouse
    click);
  - menus opening (on a phone, sheets and the drawer: air rising as they
    open, falling as they close);
  - parts settling;
  - items landing (a short pentatonic run);
  - camera travels (a soft gust, never a whoosh);
  - page changes;
  - the compare divider;
  - confirmations such as a toast or an undo (a two-note chime).
- The interface sounds sit at least 11 LU under the music in every scene.
- The music can be built from physical-modelling and simple synthesis alone:
  plucked strings (Karplus–Strong), marimba, steel pan, frame drum, shaker, a
  breathy whistle, brass, and surf from seeded noise. Whatever the style, it
  is generated sample by sample (see the technical section).

Mastering:

- A seeded hall impulse, convolved with ffmpeg afir (double precision, no
  auto-gain).
- A gentle glue compressor.
- A peak limiter 13 dB above the measured loudness. Step it down 0.5 dB at a
  time if the true peak would stop loudnorm from staying linear (plucked
  notes overshoot by about 1 dB).
- A two-pass linear loudnorm to −16 LUFS integrated and −2.0 dBTP, so the AAC
  in the file stays at or under −1.5 dBTP.

There is no voiceover by default. If you add one, keep it minimal, duck the
music under it, burn captions into the video and write a captions.srt. The
film must work with the sound off.
</sound>

<technical>

- HTML, CSS and JavaScript, rendered in headless Chromium (Playwright) and
  encoded with ffmpeg.
- source/timeline.js holds every time value: scenes, captions, chips, layout,
  window stages, camera, cursor, compare, end card, music timings and sound
  cues. source/animation.js and source/audio.js only read it.
- A deterministic seek(t) renders the exact state for any time.
  - No clocks, no Math.random.
  - Every CSS transition and animation is forced off.
  - Each frame resets everything the previous one touched.
  - Hover, focus and active states come from [data-hover], [data-focus] and
    [data-active] twins that your CSS build adds to every such rule.
  - Proxies, indicators and the compare divider are built once, at start-up.
- One virtual browser. Each screen is a window at the viewport it is shown
  at: the app's desktop size for 16:9, 390 × 844 for 9:16. Define that
  viewport in one place, and make the capture, the CSS build and the fidelity
  check all read it.
  - Scope each stylesheet to its screens (for a reveal, one scope for today,
    one for the proposal).
  - Resolve every @media query for that viewport, and turn vw / vh into
    pixels, so the frame size never switches the UI to another layout. For
    the phone that includes light theme, reduced motion, `hover: none` and
    `pointer: coarse`.
  - Serve fonts and every asset locally; the render never touches the
    network.
  - Rebuild only the branches the viewport renders. Branches the app hides
    below its breakpoints take no space and are left out.
- No compositor layers inside the stage, or complete renders will not be
  byte-identical (the first full renders of the phone film differed in 135 of
  3,600 frames, all during camera moves, and the desktop film's in 114). Chromium promotes
  sideways-scrolling rows, sticky headers and will-change elements to layers
  that rasterise on their own schedule. Nothing scrolls in the film, so
  inside the stage:
  - scroll containers become plain clips (overflow: hidden), recording their
    scroll offsets when capturing and restoring them once at start-up;
  - sticky elements become position: relative with inset: auto;
  - will-change: auto on everything.
- Launch Chromium with its deterministic-rendering flags:
  --run-all-compositor-stages-before-draw, --disable-checker-imaging,
  --disable-threaded-animation, --disable-threaded-scrolling,
  --disable-image-animation-resync,
  --disable-new-content-rendering-timeout, --disable-partial-raster,
  --disable-gpu-rasterization, --force-color-profile=srgb and
  --font-render-hinting=none. Take screenshots with caret: "initial".
- Render with several browser processes (six worked), each taking a fixed
  contiguous slice of the timeline, in order, in a fresh headless Chromium.
  Each frame is seek(n / 60) followed by a PNG.
- Encode at 60 fps ({{DURATION}} × 60 frames).
  - Video: libx264 High, level 4.2, CRF 16, preset slow, tune animation,
    yuv420p, converted with BT.709 coefficients (Lanczos) and tagged BT.709
    (`scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int`,
    then `format=yuv420p` and `setparams` for bt709), -g 120, +faststart.
  - Audio: AAC 256 kb/s, 48 kHz, stereo.
- The soundtrack is a plain-JavaScript, sample-by-sample synth with seeded
  noise, running in the browser or Node. Do not use Web Audio or
  OfflineAudioContext, which are not bit-reproducible.
  - SOUNDTRACK.render() returns a stereo dry mix, a hall send and the hall
    impulse.
  - render({ stems: true }) also returns each bus alone (music, ambience,
    interface) for measuring the balance.
- One command, node tools/export.js, rebuilds everything: CSS, icons, audio,
  video, storyboard and verification. A flag re-captures the sources first.
- Tools found to be needed: a capture script for the sources, an icon build,
  a CSS build (Tailwind with the app's own config, scoped and frozen to the
  viewport), a fidelity check, a render script, an audio master script, a
  remux script (another soundtrack under a rendered picture, the video
  stream copied as is), a contact-sheet script, a balance script and a
  verify script. Find the browser through an environment variable
  (`CHROMIUM_PATH`) as well as the Playwright cache, because the cache path
  is machine-specific.

Per aspect ratio

- 16:9: a 1920 × 1080 frame, with desktop windows at 1440 × 900. 3,600 frames
  for 60 s.
- 9:16: a 1080 × 1920 frame, with phones as the 390 × 844 viewport on one
  canvas, in a 3 × 3 grid 72 px apart; only the camera moves.
  - A whole-phone shot is about 1.8× (y 320–1840 in the frame), so 14 px UI
    text is about 25 px on screen. Close-ups are 2.6–2.8× (37–39 px). A
    family of six is about 0.76× and a wall of nine about 0.64×.
  - Captions are in the band above the phone. Close-ups get a band of the
    same canvas over the phone's top edge.
  - Capture the app as a touch screen, driving each state with taps. A modal
    <dialog> captured from the app (a sheet, a drawer) is kept as a plain
    open dialog, and its backdrop is drawn with the app's own overlay colour.
  - Real phone screenshots of today's app give the by-eye comparison.
- Both: make two masters that share one timeline and one score, so they are
  the same film.
  - The reveal-mobile film did this with a single source and a `?format=16x9`
    switch. Every screen, morph, touch and time stayed the vertical film's;
    only the camera and the overlay changed. The vertical film re-rendered
    byte-identically with the second format's code in place.
  - For a phone product, keep the phone phone-sized in the 16:9 master: the
    390 × 844 viewport at about 1.04× (880 px tall), so UI text is about 15
    px on a 1920 px frame. Centre the phone for morphs, sheets, montages and
    wipes. While a caption is up, glide the phone right and set the caption
    left-aligned beside it, like a keynote slide. Close-ups (about 2×) stay
    right, beside their chip and then their caption. Do not keep the phone
    right all the time: it leaves most of the frame empty between captions.
    Line up the family and the wall in one row, so they read as panoramas.
    A caption may need two lines to fit beside a wide close-up; the words
    stay the same.
  - For a desktop product, recompose the desktop windows for 9:16 with the
    same timeline and score; the desktop reveal's vertical cut did this by
    reframing the screens for a vertical feed.
  - Render one picture per format, and put any alternative soundtrack under
    it by remux, so each pair of files carries a byte-identical video
    stream.

</technical>

<pitfalls_already_found>

- A Playwright screenshot with the default caret: "hide" writes style="" onto
  inputs. Use caret: "initial".
- Styles on SVG <use> symbols cannot be scoped under a class. Keep those rules
  global.
- Without the deterministic flags, mid-transform text rasterises differently
  depending on what was drawn before.
- Compositor layers in the stage (scrolling rows, sticky headers,
  will-change) make complete renders differ during camera moves, and the
  usual checks miss it when no sampled time falls in a camera move. Check
  with a complete render and a layer check, and confirm the layer check
  fails with the fix reverted.
- A captured modal <dialog> loses its ::backdrop. Draw one yourself.
- Scroll offsets are not in outerHTML. Record them when capturing, and restore
  them after layout (a chart that opens scrolled to the reader's position, a
  tab strip).
- A transform on a page container re-anchors its position: fixed children.
  Move the page another way.
- If the true peak is too close to the loudness, loudnorm silently falls back
  to dynamic mode. Check that the second pass reports "linear".
- When measuring short-term loudness from ffmpeg's ebur128 log, silent frames
  print "nan". Count every frame, or the scene averages come out wrong.
- A captured prototype can differ from its own screenshot by things that are
  not markup: checkbox states, scroll offsets, an animated detail (a footer
  boat), a focus ring after a tap. Record each, restore the state, and
  explain every difference left.
- Charts in a narrow viewport drop x-axis labels that would collide (for
  Recharts, interval="preserveStartEnd"). Redraw the chart that way.
- Mid-morph frames can overlap text for about 0.2 s (card titles, a logo
  swap). Review them on a frame sequence, and fix the ones that read as a
  mistake at speed.
- The checks that passed the first time did so because none of the sampled
  times fell in a camera move. Sample through holds, morphs and camera moves.

</pitfalls_already_found>

<verification>
Run each check, and report only what was actually run. Write the results to
verify/report.md. Run each check for every master you make.

- The file:
  - H.264 High, yuv420p, at the master's size (1920 × 1080 for 16:9, 1080 ×
    1920 for 9:16);
  - 60/1 fps, with the frame count and duration the timeline expects;
  - BT.709 matrix, primaries and transfer;
  - AAC 48 kHz stereo, with audio and video lengths that match;
  - ffmpeg decodes it with 0 errors.
- Loudness of the file's decoded audio: −16 ±1 LUFS, true peak ≤ −1.5 dBTP.
  The master WAV: −16 ±0.5 LUFS, ≤ −2.0 dBTP, normalised linearly.
- Sync. Cross-correlate the decoded AAC with the master WAV around every
  click or tap cue: the offset must be ≤ 2 ms.
- Determinism:
  - seek(t) gives an identical document digest at about 14 times, whether
    reached after a reload or forward, reversed or scrambled with frames
    rendered in between;
  - two fresh browsers render those frames byte-identically;
  - two complete renders match on every frame;
  - no element in the stage has its own compositor layer (CDP LayerTree,
    every 2.5 s, through holds, morphs and camera moves);
  - measure raster history: a frame rendered alone vs mid-sequence.
- The synth renders bit-identical samples twice.
- Balance, from the stems, per scene: any ambience is at least 10 LU under
  the music wherever it plays, and the interface at least 11 LU under it.
  Confirm on a spectrogram that nothing you were asked to avoid is there.
- Legibility: the on-screen size of body UI text and of the captions, per
  shot, overview shots excluded.
- Fidelity: the captured or rebuilt screens against their sources' own
  screenshots or frames, and any rebuild against live screenshots.
- Status: every item on screen is marked Shipped, Proposed or Made for the
  video in design/before_after.html. For a release film, each Shipped feature
  is confirmed to be in `origin/production`; record the command and the
  result.
- Both aspect ratios: each pair of files carries a byte-identical video
  stream, where one picture has more than one soundtrack.
- Review frames at one per second and at every transition. Watch it without
  sound. Inspect the audio on its own (spectrogram, waveform, short-term
  loudness curve).
- Open the design pages in Chromium at desktop width and at 390 px: no broken
  images and no horizontal scroll.
- Under "Not done", state plainly that nobody listened to the soundtrack or
  watched the film on a device, unless someone did.

</verification>

<deliverables>
In {{OUTPUT_FOLDER}}:

- The film, per {{ASPECT_RATIO}}:
  - 16:9: out/master_16x9.mp4;
  - 9:16: out/master_9x16.mp4;
  - both: both files, from one timeline and one score.
    No other aspect ratios are needed.
- storyboard/contact.png: the major frames of every scene, rendered by
  seek(t) (one per master).
- design/directions.html: the four directions and the choice.
- design/before_after.html: each item on screen, with its status marked
  Shipped, Proposed or Made for the video, beside its live screenshot or
  source.
- source/: index.html, styles.css, animation.js, timeline.js, audio.js and
  the screens.
- tools/: capture, CSS and icon build, render, audio master, verify and
  export.
- DECISIONS.md: what was found, the inputs as confirmed or corrected, the
  status of everything on screen, what is left out and why, and the
  direction, motion, copy, sound and technical decisions.
- README.md: how to reproduce, the dependencies and their versions, the
  export commands, the checks actually performed, and the known limitations.
- verify/: the report, sample frames and the audio plots.

</deliverables>

<autonomy>
You have full creative authority over composition, motion, pacing, typography
animation, sound and camera, within this brief. You have no authority to
invent {{PRODUCT_NAME}} features or misrepresent what is shipped. Make
reasonable decisions yourself and record them in DECISIONS.md. Do not stop
for approval once the inputs are confirmed. The task is complete only when
the masters in {{OUTPUT_FOLDER}} exist and have passed the verification
above.
</autonomy>
