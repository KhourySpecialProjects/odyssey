---
name: Accessibility Basics for the Web
description: Build web pages that work for people using screen readers, keyboards or screen magnifiers.
overview: An accessible website works for everyone, including people who use screen readers, keyboards or screen magnifiers. This droplet covers who you're building for, the HTML habits that do most of the work, and quick ways to check your own pages.
funFact: Developers often shorten accessibility to a11y, because there are 11 letters between its first letter, a, and its last letter, y.
authors: contentcreator2
type: knowledge
focusArea: technical
difficulty: beginner
tags: web-development, accessibility
objectives:
- Describe how people with different disabilities use the web
- Choose semantic HTML elements instead of generic ones with click handlers
- Write labels for form fields and alt text for images
- Check a page with a keyboard test, a contrast checker and browser audits
---

# Who accessibility is for

Web accessibility means people with disabilities can perceive, understand, navigate and use your site. Some disabilities are permanent and some are temporary, like a broken wrist. Situations can limit people too, like glare on a phone screen. Accessible design works better in all of these cases, and usually for everyone else too.

## How people use the web

- **Screen reader users.** Many people who are blind or have low vision use a screen reader. Common ones include VoiceOver on Apple devices, NVDA and JAWS on Windows, and TalkBack on Android.
- **Keyboard users.** People who can't use a mouse, for example because of a motor disability, move through a page with Tab and Shift+Tab and operate controls with Enter, Space and the arrow keys. Others use devices that work like a keyboard, such as switches.
- **People with low vision.** Many zoom in or use a screen magnifier, and strong contrast between text and its background helps them read.
- **People who are colorblind.** Some can't tell certain colors apart, such as red and green, so color can't be the only way a page shows information.
- **People who are deaf or hard of hearing.** They need captions for videos and transcripts for audio.
- **People with cognitive or learning disabilities.** Clear language, consistent navigation and forms that explain their errors help them, and everyone else as well.

%definition A screen reader is software that reads a page aloud or sends it to a braille display. It relies on your HTML to know what each part of the page is.

## WCAG, the standard

The Web Content Accessibility Guidelines, or WCAG, are the most widely used standard for web accessibility. They're published by the W3C, an international organization that develops web standards, and they're built on four principles:

| Principle | What it means | Example |
|---|---|---|
| Perceivable | People can perceive the content in at least one way | Images have text alternatives |
| Operable | People can use every control | Every button works from the keyboard |
| Understandable | Content and controls are clear and predictable | Form errors explain how to fix them |
| Robust | Content works with browsers and assistive technology | Standard HTML elements are used correctly |

Each guideline has testable success criteria at three levels: A, AA and AAA. Level AA is the usual target for websites and apps. The W3C's [Web Accessibility Initiative](https://www.w3.org/WAI/) publishes WCAG along with plain-language introductions and tutorials.

%important Accessible design helps more people than you'd expect. Captions help in a noisy dining hall, and strong contrast helps on a phone in bright sun.

%%open-ended
- Give an example of someone without a permanent disability who benefits from an accessible website, and explain how.
- A student watching a lecture video in a noisy room benefits from captions, and someone with a broken arm benefits from a site that works fully with a keyboard.

# Semantic HTML first

Semantic HTML means using the element that matches what something is: a `button` for a button, a `nav` for navigation, an `h2` for a section heading. Browsers pass that meaning on to assistive technology, so choosing the right element often makes a page accessible with no extra work.

## Buttons, not clickable divs

```html
<!-- Can't be reached with Tab, isn't announced as a button, ignores Enter and Space -->
<div class="button" onclick="saveDraft()">Save draft</div>

<!-- Reachable with Tab, announced as a button, works with Enter and Space -->
<button type="button" onclick="saveDraft()">Save draft</button>
```

Both can look the same once they're styled, but only the `button` works for everyone. You could patch the `div` with extra attributes and keyboard handling, but you'd be rebuilding what `button` gives you for free. The same goes for links: use an `a` element with an `href` for anything that takes you to another page.

%important Use a native HTML element whenever one exists. ARIA attributes can add accessibility information to other elements, but the W3C advises using them only when no native element does the job.

## Headings in order

Screen reader users often jump from heading to heading to get an overview of a page, the way sighted users skim. Give each page one `h1` that says what it is, use `h2` for its main sections and `h3` inside those, and avoid skipping levels. Choose a heading level for its place in the outline, not for its size. You can change the size with CSS.

## Labels on form fields

Every form field needs a label that says what to enter. Connect the two by giving the `label` a `for` attribute that matches the field's `id`:

```html
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="email">

<label for="grad-year">Graduation year</label>
<input id="grad-year" name="grad-year" type="number">
```

A screen reader reads the label when the field gets focus. Clicking the label also moves the cursor into the field, which gives everyone a bigger target.

%caution Placeholder text isn't a label. It disappears as soon as someone starts typing, and it's often too faint to read.

## Alt text for images

The `alt` attribute describes an image for people who can't see it. Say what the image shows that matters on the page, and leave out phrases like "image of", since screen readers already announce that it's an image. If an image is purely decorative, give it an empty `alt=""` so screen readers skip it.

```html
<img src="officers.jpg" alt="The five club officers holding the hackathon trophy">
<img src="divider.png" alt="">
```

Without any `alt` attribute at all, some screen readers read out the file name instead.

%%true-false
- A div with a click handler works just as well as a button element for someone using only a keyboard.
- false

# Checking your work

You don't need special software to find the most common problems. Three quick checks catch a lot of them.

## A keyboard-only test

Put your mouse aside and use the page with only the keyboard:

1. Press Tab repeatedly, starting from the top of the page. At every step, you should be able to see which element has focus.
2. Check that focus moves in a sensible order that matches the layout.
3. Make sure you can reach every link, button and form field, and use each one with Enter or Space.
4. Open each menu or dialog, then make sure you can close it and move on without getting stuck.

If Tab skips over links on a Mac, turn on keyboard navigation in System Settings, and in Safari's own settings if you test in Safari.

%warning Never remove the focus outline with outline: none unless you replace it with another clear style. Without it, keyboard users can't tell where they are on the page.

## Color contrast

Text needs enough contrast with its background for people with low vision to read it, and for everyone reading on a dim screen or in sunlight. Contrast is measured as a ratio, from 1:1 for two identical colors up to 21:1 for black on white. WCAG level AA sets these minimums:

| Text | Minimum contrast ratio |
|---|---|
| Normal text | 4.5:1 |
| Large text, at least 18 point or 14 point bold | 3:1 |

In CSS terms, 18 point is 24px and 14 point is about 18.7px. For example, the gray `#767676` on white has a ratio of about 4.5:1, just enough for normal text, while the lighter `#999999` is only about 2.8:1.

You don't need to calculate ratios yourself. In Chrome's DevTools, inspect some text and click its color in the Styles pane to see its contrast ratio. Firefox's Accessibility Inspector checks contrast too.

Contrast isn't the only rule about color. Don't use color alone to carry meaning: a form field that turns red when there's an error also needs an error message in words.

## Automated audits

Browsers have built-in audit tools. In Chrome, open DevTools, select the Lighthouse panel, choose the Accessibility category and run the report. It flags problems like missing alt text, missing labels and low contrast. Firefox's Accessibility Inspector can check a page for similar issues.

%important Automated tools find only some problems. They can't tell whether your alt text makes sense or whether the focus order is logical, so always do the keyboard test too.

%%multiple-choice
- Under WCAG level AA, what's the minimum contrast ratio for normal-sized body text?
- 3:1
- 4.5:1 <
- 7:1
- 21:1
