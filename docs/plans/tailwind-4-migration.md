# Tailwind CSS 4 migration plan (Dependabot #1376)

Status: plan only, for the team to decide. No app code has changed.
Measured on 2026-11-17 against `origin/develop` and Dependabot head `44be50fc`.

## Summary

- **Why #1376 fails:** Tailwind 4 moved its PostCSS plugin into a separate package. Our
  `frontend/postcss.config.js` still loads `tailwindcss` directly, so `next build` stops on
  `app/globals.css` with: "It looks like you're trying to use `tailwindcss` directly as a
  PostCSS plugin. The PostCSS plugin has moved to a separate package…". A version bump alone
  can never pass: the config, CSS entry point and some class names have to change with it.
- **How big:** the official upgrade tool changes 195 frontend files (+569 / −556 lines, lockfile
  excluded). About 427 changed lines are required renames (mostly `rounded` → `rounded-sm`,
  93 × `outline-none` → `outline-hidden`); about 100 are optional syntax modernisation.
  After the tool, a scratch build needed 4 more manual fixes before `next build` passed, and
  11 Jest suites (16 tests) fail because they assert old class names.
- **Plugins:** `@tailwindcss/forms` and `@tailwindcss/typography` support v4. `tailwindcss-animate`
  still works through the compatibility layer but is unmaintained; swap it for `tw-animate-css`.
  `tailwind-merge` must go from 2.x to 3.x in the same PR as the switch.
- **Recommendation:** migrate later, not now. Close #1376, add a Dependabot ignore rule for
  `tailwindcss` and `tailwind-merge` majors, and schedule the work as its own ticket in a quiet
  window between UI waves. The migration splits into 6 PRs (2 prep PRs on v3,
  1 switch PR, 3 clean-up PRs), each under 1,000 lines, and needs a screenshot baseline first.

## 1. Why the build fails today

The `frontend-build` job (check run 134105959341) fails in `next build`:

```
./app/globals.css
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS
plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need
to install `@tailwindcss/postcss` and update your PostCSS configuration.
```

The same error repeats for every CSS file PostCSS touches: `custom-blocknote.css`, BlockNote's
`inter.css` and `style.css`, and `driver.js/dist/driver.css`. Lint, prettier and all tests pass on
the Dependabot branch, because nothing else loads Tailwind.

Fixing only `postcss.config.js` is not enough. In the scratch run, the build next failed on:

1. `@tailwind base/components/utilities` must become `@import "tailwindcss"` plus
   `@config "../tailwind.config.ts"` (v4 does not read the JS config automatically).
2. `safelist` no longer exists in the v4 `Config` type (type error) and regex safelists are
   ignored. Replace it with `@source inline("{bg,text,border}-{emerald,amber,red}-{400,500,700,800,900}")`.
3. `darkMode: ["class"]` is a type error in v4; it must be `darkMode: "class"`.
4. The upgrade tool rewrote two non-class strings: a Button `variant="outline"` in
   `components/notebook/data-table/data-table-toolbar.tsx` and `dropdownVariants = "outline"` in
   `components/ui/tiptap/toolbar/tools/callout-type-tool.tsx` became `"outline-solid"`.

With those four fixes the scratch build passed and the generated CSS still contained our custom
colours (`hsl(var(--primary) / <alpha-value>)` works), `xs:`, `light:`, `dark:`, `prose`,
`animate-in` and the large `text-5xl`+ sizes.

## 2. What v4 changes for this codebase

**Configuration.** v4 is configured in CSS: `@theme` for tokens, `@custom-variant` for `dark`
and `light`, `@utility` for custom utilities, `@plugin` for plugins, `@source` for content.
JS config still works through `@config` as a compatibility layer, which is what the upgrade tool
falls back to here ("could not be automatically migrated", probably because of the inline
`light` plugin and regex safelist). The `content` array is replaced by automatic source
detection. CLAUDE.md's rule "NEVER use `@theme`, CSS-first config" must be rewritten in the
switch PR.

**Plugins.**

- `@tailwindcss/forms` 0.5.11 and `@tailwindcss/typography` (0.5.20 in open PR #1379) declare
  v4 peer support and load with `@plugin`. Typography is used 64 times in 20 files.
- `tailwindcss-animate` 1.0.7 is a v3 JS plugin. It works through `@config` (the build emitted
  `.animate-in`), but the shadcn ecosystem has moved to `tw-animate-css`, a CSS-only drop-in with
  the same class names. We use its classes (`animate-in`, `fade-in-0`, `zoom-in-95`,
  `slide-in-from-*`) about 119 times in 30 files, mostly in `components/ui/` Radix wrappers.
- The inline `light:` variant plugin becomes `@custom-variant light (&:is(.light *));`.

**Renamed utilities** (counted in source, excluding tests):

| v3 class                       | v4 class             | Uses / files                         |
| ------------------------------ | -------------------- | ------------------------------------ |
| `rounded`                      | `rounded-sm`         | 302 / 96 (253 rewritten by the tool) |
| `rounded-sm`                   | `rounded-xs`         | 18 / 13                              |
| `shadow-sm`                    | `shadow-xs`          | 21 / 18                              |
| `shadow`                       | `shadow-sm`          | 13 / 11                              |
| `blur-sm`, `backdrop-blur-sm`  | `*-xs`               | 5 / 4                                |
| `outline-none`                 | `outline-hidden`     | 91 / 64                              |
| `outline` (bare)               | `outline-solid`      | 9 / 8                                |
| `flex-shrink-*`, `flex-grow-*` | `shrink-*`, `grow-*` | 44 / 32 (removed in v4)              |
| `bg-opacity-*`                 | `bg-black/50` style  | 7 / 2 (removed in v4)                |

The `bg-opacity-*` row matters most: the upgrade tool did **not** rewrite it. Three modal overlays
in `components/feed/feed-block.tsx` and one in `components/draft/metadata/content-action-button.tsx`
would turn solid grey/black. Fix them by hand.

**Changed defaults.**

- Default border colour becomes `currentColor` (was gray-200). There are 561 bare `border` uses in
  252 files. The tool adds a compatibility `@layer base` rule that restores gray-200; keep it.
- Default `ring` width becomes 1px (was 3px) and its colour `currentColor` (was blue-500). We have no
  bare `ring`, and only one string uses a ring width without a ring colour, so this is low risk.
- `!important` moves from prefix (`!rounded-[20px]`) to suffix (`rounded-[20px]!`). The prefix still
  works but is deprecated; 3 uses.
- `space-x/y-*` and `divide-*` now use `:not(:last-child)` margins instead of sibling margins:
  269 `space-*` uses in 163 files. Layouts with hidden or conditionally rendered children can shift.
- `hover:` only applies on devices that support hover (`@media (hover: hover)`). Touch devices stop
  getting sticky hover styles, which is mostly an improvement; 882 `hover:` uses.
- Variants stack left to right, so `first:*:pt-0` style stacks read in the opposite order. The tool
  rewrote our few arbitrary-selector variants (cmdk group headings, `[&>*:not(:first-child)]`).
- `.container` no longer reads `center`/`padding`/`screens` from config; it needs an
  `@utility container` block. In the scratch build it gained max-widths at every breakpoint instead of only
  1400px. One use.

**Preflight.** Placeholder text uses the current text colour at 50% instead of gray-400 (69 files
render inputs, 31 set `placeholder:text-*` explicitly). Buttons get `cursor: default` instead of
`pointer` (131 files render `<button>`; only 61 `cursor-pointer` uses). `hidden` attributes win over
display utilities. Dialog margins reset.

**Browser floor.** v4 needs Safari 16.4+, Chrome 111+ and Firefox 128+ (cascade layers,
`@property`, `color-mix()`, `oklch()`). Older browsers get broken colours, not a fallback. Check
PostHog browser stats before switching; anything on iOS 16.3 or older would be affected.

**`cn()` and tailwind-merge.** `lib/utils.ts` uses plain `twMerge` 2.6. Tested in scratch, 2.x
does not dedupe v4 syntax: `cn("rounded-[20px]!", "rounded-md")` keeps both, and
`wrap-break-word` vs `break-all` keeps both. tailwind-merge 3.x supports only Tailwind 4, so it
moves in the same PR as the switch.

**Upgrade tool bug.** `npx @tailwindcss/upgrade@4.3.5` crashes on our config with "Cannot find
module 'tailwindcss/plugin'" during template migration. Re-running it on the half-migrated tree
silently skips the scale renames (`rounded`, `shadow`, `outline-none`). Workaround: temporarily
replace `import plugin from "tailwindcss/plugin"` with `const plugin = (handler) => ({ handler })`,
run the tool once, then restore the import. The tool also does not touch `frontend/tests/`.

## 3. Size

Full tool run (with the workaround), lockfile excluded: 195 files, +569 / −556 lines.

- 427 added lines carry required renames; 100 are optional modernisation (`bg-[var(--x)]` →
  `bg-(--x)`, `z-[102]` → `z-102`, `min-w-[8rem]` → `min-w-32`, `break-words` → `wrap-break-word`).
  The old forms still work in v4, so we can skip these.
- Config files: `package.json` (tailwindcss 4.3.5, add `@tailwindcss/postcss`, drop
  `autoprefixer`), `postcss.config.js`, `app/globals.css` (+~40 lines), `tailwind.config.ts`.
- Tests: 11 suites / 16 tests assert old names (`toHaveClass("rounded")`, `z-\[9999\]`):
  `nav-links`, `notes-summary`, `separator`, `add-user`, `comment-thread`, `content-action-button`,
  `draft-layout-shell`, `learning-objective`, `code-tool`, `droplet-name-input`,
  `droplet-description-input`. All other 520 suites passed under v4.

## 4. Migration path

The trick that keeps every PR small and reviewable: the scale renames can land **on v3 first** if
the v3 config temporarily adopts v4's scale values. Each prep PR should be visually identical.

**PR 1: v3 prep A, radius (about 560 lines).** In `tailwind.config.ts` set `borderRadius` to the v4
scale (`xs: 0.125rem`, `sm: 0.25rem`). In one commit rename `rounded-sm` → `rounded-xs`, then
`rounded` → `rounded-sm` (including `rounded-t`, `rounded-l` and friends). Update the tests that
assert `rounded`. Verifies: build, Jest, and zero screenshot diffs.

**PR 2: v3 prep B, everything else that is version-neutral (about 350 lines).** Same approach for
`boxShadow` (`xs`, `sm`) and `blur` (`xs`, `sm`). Add small v3 plugin utilities `outline-hidden`
(v3's `outline-none` behaviour) and `outline-solid`, then rename. Rename `flex-shrink/grow` →
`shrink/grow` (valid in v3). Replace the 4 `bg-opacity-*` overlays with slash opacity. Add explicit
`cursor-pointer` to the base button component if the team wants to keep pointer cursors.
Verifies: build, Jest, zero screenshot diffs.

**PR 3: the switch (about 150 lines plus lockfile).** Bump `tailwindcss` to 4.x, add
`@tailwindcss/postcss`, drop `autoprefixer` (v4 includes it), bump `tailwind-merge` to 3.x.
Update `postcss.config.js`, `globals.css` (`@import "tailwindcss"`, `@config`, `@source inline`,
border-colour compat block), and `tailwind.config.ts` (drop `safelist`, `darkMode: "class"`,
remove the temporary scale overrides). Rewrite the Tailwind lines in CLAUDE.md and
`docs/agent/frontend-architecture.md`. Verifies: CI green, screenshot diffs reviewed one by one
(expected only from placeholder colour, button cursor, `space-*` and `container`), browser floor
agreed. This is the PR #1376 should have been; reopen Dependabot only after it lands.

**PR 4: CSS-first config (about 200 lines).** Move theme tokens into `@theme`, `dark`/`light` into
`@custom-variant`, `container` into `@utility`, plugins into `@plugin`; delete
`tailwind.config.ts` and the `@config` line. Verifies: generated CSS has the same utilities
(diff `.next/static/css` before and after), zero screenshot diffs.

**PR 5: replace `tailwindcss-animate` with `tw-animate-css` (about 20 lines).** `npm i
tw-animate-css`, `@import "tw-animate-css"`, remove the plugin. Verifies: dialogs, dropdowns,
popovers, tooltips, accordions and toasts still animate in and out.

**PR 6 (optional): modernise syntax (about 200 lines).** Run the tool's modernisation output
(`bg-(--x)`, `!` suffix, bare values). Pure style; can be skipped or done gradually.

## 5. Risks and test plan

Main risks, highest first:

1. Silent visual drift, because v4 compiles happily with wrong-looking output (overlays,
   placeholder colours, `space-*` gaps, focus outlines). Only screenshots catch it.
2. Users on old Safari/iOS losing colours entirely.
3. `cn()` merging behaving differently if tailwind-merge 3 lags Tailwind 4.
4. Conflicts with in-flight UI branches: PR 1 and PR 2 touch about 190 files. Land them in a quiet
   window and ask open branches to rebase right after.

**Screenshot baseline (before PR 1).** Add a small Playwright spec using `toHaveScreenshot()` that
visits key pages in light and dark mode at 375px and 1440px, run against a local production build
with fixed seed data. Commit the baseline on v3. Every PR above must show zero diffs except the ones
PR 3 expects. The existing `e2e/` role folders and `fixtures.ts` give the logged-in states.

**Pages to check on dev** (light and dark, phone and desktop):

- Public: `/`, `/about`, `/features`, `/explore`, `/auth/login`, `/unauthorized`.
- Learner: `/dashboard`, `/feed` (the modal overlays), `/d/[slug]`, `/d/[slug]/[lessonSlug]`
  (prose, highlights, Mentor panel), `/d/[slug]/present`, `/v/[slug]`, `/p/[slug]`,
  `/activity/*`, `/settings`, `/settings/notes`, `/prof/[username]`.
- Creator: `/new/droplet`, `/draft/d/[slug]` and its lesson editor (BlockNote, TipTap toolbar,
  code tool, callouts), `/draft/d/[slug]/scan` and the review panel, `/my-content`.
- Faculty and admin: `/g/dashboard`, `/g/management`, `/admin/users` (data table, page-size
  buttons), `/admin/scorecard-prompts`.
- Interactions: open every Radix dialog, dropdown, popover, tooltip and select once; tab through
  a form to check focus rings and outlines; check inputs' placeholder colour.

## 6. Recommendation

**Migrate later, not now.** v3.4 is stable (the last 3.x release is 3.4.19, December 2025; we
lock 3.4.17), nothing we need is v4-only, and the visible risk is real while the payoff (faster
builds, CSS-first config) is moderate. v3 will stop getting fixes eventually, so don't defer
past the next quiet period. The migration waits on: (a) a quiet window with few open UI branches,
so the rename PRs don't fight them; (b) a screenshot baseline; (c) a check that PostHog shows no
meaningful traffic below Safari 16.4 / Chrome 111; (d) a Linear ticket with an owner. Budget about
two developer-days for PRs 1 to 3 and one more for PRs 4 and 5.

**Meanwhile:** close #1376 with a link to this plan, and add to the `/frontend` entry in
`.github/dependabot.yml`:

```yaml
ignore:
  - dependency-name: "tailwindcss"
    update-types: ["version-update:semver-major"]
  - dependency-name: "tailwind-merge"
    update-types: ["version-update:semver-major"]
```

Patch and minor 3.4.x updates keep flowing. Open PR #1379 (typography 0.5.20) is compatible with
both versions and can merge independently. Remove the ignore rule in PR 3.
