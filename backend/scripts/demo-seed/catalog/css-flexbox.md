---
name: Layouts with CSS Flexbox
description: Line up navigation bars, center content and build rows of cards with a few lines of CSS.
overview: Flexbox is the part of CSS for arranging items in a row or a column. This droplet builds pieces of a club website, from a navigation bar to a row of event cards that wraps on small screens.
funFact: Early drafts of the flexbox standard set the display property to box, and later to flexbox, before the final version settled on flex.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: beginner
tags: web-development
objectives:
- Arrange items in a row or a column with display flex and flex-direction
- Align and space items along the main axis and the cross axis
- Let items grow, shrink and wrap with flex and flex-wrap
- Build a row of cards that adapts to the screen width
---

# Rows and columns

Flexbox is a CSS layout mode for arranging items along a line, either a row or a column. It's the usual tool for navigation bars, toolbars, centered content and rows of cards.

## Turning on flexbox

Set `display: flex` on a parent element. The parent becomes a **flex container**, and its direct children become **flex items**.

Here's the navigation for a club website. Without flexbox, the list items stack on top of each other with bullets.

```html
<nav>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/events">Events</a></li>
    <li><a href="/members">Members</a></li>
    <li><a href="/join">Join</a></li>
  </ul>
</nav>
```

```css
.nav-links {
  display: flex;
  list-style: none;
  padding: 0;
}
```

Now the four links sit side by side in a row. `list-style: none` and `padding: 0` remove the bullets and the list's default indent.

%definition A flex container is any element with display: flex. Only its direct children become flex items. Elements nested deeper aren't affected unless their own parent is a flex container too.

%caution A common mistake is putting display: flex on the items you want to line up. Put it on their parent instead. Here that's the ul, not the nav or the li elements.

## The main axis and the cross axis

Flexbox places items along a line called the **main axis**. The **cross axis** runs at a right angle to it. The `flex-direction` property sets which way the main axis runs:

| flex-direction | Main axis | Cross axis |
|---|---|---|
| row (the default) | Left to right | Top to bottom |
| column | Top to bottom | Left to right |

There are also `row-reverse` and `column-reverse`, which run the main axis the opposite way, so the items appear in reverse order.

On a narrow phone screen, a column often works better for navigation. A media query switches the direction below a certain width:

```css
@media (max-width: 600px) {
  .nav-links {
    flex-direction: column;
  }
}
```

The axes matter because every alignment property in flexbox works along one of them. When you switch from a row to a column, the axes swap with it.

%%multiple-choice
- In a flex container with flex-direction set to column, which way does the main axis run?
- Left to right
- Top to bottom <
- Right to left
- It depends on how many items there are

# Aligning and spacing items

Two properties do most of the alignment work. `justify-content` works along the main axis, and `align-items` works along the cross axis.

## Along the main axis

`justify-content` decides where the items sit along the main axis and what happens to the leftover space.

| Value | What it does |
|---|---|
| flex-start | Packs items at the start, which is what you get by default |
| center | Packs items in the middle |
| flex-end | Packs items at the end |
| space-between | Puts the first and last items at the edges, with equal space between all the items |
| space-around | Gives each item equal space on both sides |
| space-evenly | Makes every gap equal, including the gaps at the edges |

## Along the cross axis

`align-items` positions items along the cross axis, which is vertical in a row.

- `stretch` makes every item as tall as the row. This is what you get by default.
- `center` centers the items.
- `flex-start` and `flex-end` move them to the top or the bottom.
- `baseline` lines up the first line of text in each item.

## Space between items

`gap` adds space between items, but not before the first item or after the last one. That's usually what you want, and it's simpler than adding margins to every item.

Here's a header with the club's name on the left and its links on the right:

```html
<header class="site-header">
  <a class="logo" href="/">Board Game Club</a>
  <nav>
    <ul class="nav-links">
      <li><a href="/events">Events</a></li>
      <li><a href="/members">Members</a></li>
      <li><a href="/join">Join</a></li>
    </ul>
  </nav>
</header>
```

```css
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 24px;
  list-style: none;
  padding: 0;
}
```

The header has two flex items, the logo and the `nav`. `space-between` pushes them to opposite ends, and `align-items: center` centers them vertically, so they line up even when the logo is taller. The list is a flex container too, and `gap` spaces out its links.

## Centering in both directions

To center a welcome message inside a banner, center it on both axes:

```css
.welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
```

The container has to be taller than its content, or there's no room to center vertically. That's what `min-height` is for.

%important justify-content works on the main axis and align-items on the cross axis. Change flex-direction to column and they swap, so justify-content becomes the vertical one.

%%true-false
- In a flex container with flex-direction set to row, align-items: center centers the items vertically.
- true

# Flexible sizes and wrapping

By default, a flex item is as wide as its content, and it shrinks if the row runs out of room. The `flex` property lets items grow to fill the space instead.

## Growing to fill space

Here are three event cards for the club's homepage:

```html
<section class="event-list">
  <article class="event-card">
    <h3>Game night</h3>
    <p>Fridays from 7 to 10 pm.</p>
  </article>
  <article class="event-card">
    <h3>Strategy tournament</h3>
    <p>A bracket for every skill level.</p>
  </article>
  <article class="event-card">
    <h3>Learn to play</h3>
    <p>New members welcome, no experience needed.</p>
  </article>
</section>
```

```css
.event-list {
  display: flex;
  gap: 16px;
}

.event-card {
  flex: 1;
}
```

With `flex: 1` on every card, the cards split the row's width equally, even when one has more text than the others. Give one card `flex: 2` and it gets twice the width of each of the others.

%definition The flex property is shorthand for three values. flex-grow sets how much of the extra space an item takes, flex-shrink how much it gives up when space runs short, and flex-basis is the size it starts from.

## Wrapping onto new lines

Flex items stay on one line by default. On a phone, that squeezes all three cards into one cramped row. `flex-wrap: wrap` lets items move onto a new line when they run out of room.

```css
.event-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.event-card {
  flex: 1 1 250px;
}
```

`flex: 1 1 250px` means each card starts at 250 pixels wide, grows to fill any extra space, and shrinks if it has to. On a laptop, all three cards fit on one line and stretch to fill it. On a phone, each card gets a line of its own. In between, two cards share the first line and the third takes the line below. You get all of this without a media query.

Because `align-items` stretches items by default, cards on the same line also match the height of the tallest one.

%caution If the last line has fewer cards, they stretch wider than the cards above them. When every card has to be the same width, CSS Grid is the better tool.

The [MDN Web Docs](https://developer.mozilla.org/) have a reference page for every flexbox property, with live examples you can edit.

%%open-ended
- Your club's event cards get squeezed into one cramped row on a phone. What do you add to the container, and what does it do?
- Add flex-wrap: wrap to the container. Cards that don't fit move onto a new line, so each card keeps a usable width.
