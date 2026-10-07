---
name: React State and Props
description: Pass data into React components with props, remember changes with state, and share state between components.
overview: React apps are built from components that receive data through props and remember data in state. This droplet builds pieces of a course planner to show how data flows down to components and how changes flow back up.
funFact: React was created by Jordan Walke, a software engineer at Facebook, and the company released it as open source in 2013.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: intermediate
tags: web-development, javascript
objectives:
- Write function components that receive data through props
- Store values that change with the useState hook
- Update arrays and objects in state without mutating them
- Lift shared state up to a common parent and update it with callbacks
---

# Components and props

A React app is built from **components**: JavaScript functions that return a description of part of the page. You write that description in JSX, which looks like HTML but sits inside your JavaScript.

```javascript
function CourseCard({ code, title, seatsLeft }) {
  return (
    <div className="course-card">
      <h3>{code}: {title}</h3>
      <p>{seatsLeft} seats left</p>
    </div>
  );
}
```

## Reading JSX

- Curly braces insert a JavaScript value into the markup, as in `{title}`.
- Use `className` instead of `class`, because `class` is a reserved word in JavaScript.
- JSX needs a single element at the top, so wrap siblings in a parent element such as a `div`.
- Component names start with a capital letter. That's how React tells your `CourseCard` apart from built-in elements like `div`.

## Passing props

Props are how a parent component passes data to a child, like arguments to a function. You write them like HTML attributes:

```javascript
function Schedule() {
  return (
    <div>
      <CourseCard code="CS 3200" title="Database Design" seatsLeft={12} />
      <CourseCard code="CS 3500" title="Object-Oriented Design" seatsLeft={0} />
    </div>
  );
}
```

String values go in quotes. Anything else, like a number, an array or a function, goes in curly braces. React gathers the props into one object and passes it to the component, and `{ code, title, seatsLeft }` in `CourseCard` destructures that object into three variables.

%definition A prop is a value a parent component passes to a child. The child reads it like a function argument and never changes it.

## Props are read-only

A component must never change its own props. If a `CourseCard` needs to show something different, its parent passes it a different value. Data that changes while the page is open, such as what a student types or clicks, belongs in state instead.

## Rendering a list

To show a component for each item in an array, use `map`. Give each one a `key` prop that's unique among its siblings, so React can tell the items apart when the list changes.

```javascript
const courses = [
  { code: "CS 3200", title: "Database Design", seatsLeft: 12 },
  { code: "CS 3500", title: "Object-Oriented Design", seatsLeft: 0 },
];

function CourseCatalog() {
  return (
    <div>
      {courses.map((course) => (
        <CourseCard key={course.code} {...course} />
      ))}
    </div>
  );
}
```

`{...course}` passes every field of the object as a prop with the same name.

%warning Use a stable ID from your data as the key, like a course code. Using the array index can mix up items when the list is reordered.

%%multiple-choice
- A CourseCard needs to show a different title. How should that happen?
- The CourseCard assigns a new value to its title prop
- Its parent passes it a different title <
- The CourseCard edits the title text on the page directly
- It can't happen, because props never change

# Remembering values with state

React calls your component function again each time the component renders. A regular variable inside it starts over on each render, and changing one doesn't tell React to update the screen. **State** fixes both problems.

```javascript
import { useState } from "react";

function LikeButton() {
  const [likes, setLikes] = useState(0);

  return (
    <button onClick={() => setLikes(likes + 1)}>
      Like ({likes})
    </button>
  );
}
```

`useState(0)` creates a piece of state that starts at 0. It returns an array with two items, which you unpack with array destructuring: the current value, `likes`, and a function that changes it, `setLikes`.

## What happens on a click

1. React renders `LikeButton`, and `likes` is 0.
2. You click the button, and the click handler calls `setLikes(1)`.
3. React renders `LikeButton` again. This time `useState` returns 1, so the button shows Like (1).

Every `LikeButton` on the page keeps its own state, so liking one club post doesn't change the count on another.

%definition State is data a component remembers between renders. Calling its setter function updates the value and tells React to render the component again.

## The rules of hooks

`useState` is a **hook**, a special React function whose name starts with `use`. Call hooks only at the top level of a component, never inside a condition, a loop or a nested function. React matches each piece of state to its `useState` call by the order of the calls, so that order has to be the same on every render.

## Don't change state in place

When state holds an array or an object, never modify it directly. React compares the old and new values to decide whether to render again. If you change the existing array and pass it back, React sees the same array and skips the update.

```javascript
// Wrong: changes the array React already has
saved.push(code);
setSaved(saved);
```

```javascript
// Right: a new array with the old items plus the new one
setSaved([...saved, code]);
```

Objects work the same way. To change one field, copy the rest with the spread syntax, as in `setStudent({ ...student, major: "Data Science" })`.

## Updating from the previous value

When the new value depends on the old one, you can pass the setter a function instead, as in `setLikes((current) => current + 1)`. React calls it with the latest value, which matters when several updates happen at once.

%%true-false
- Changing a regular variable inside a component makes React show the new value on the screen.
- false

# Sharing state between components

Sometimes two components need the same data. Say a course planner has a `CourseList` with a button for each course and a `PlanSummary` that lists the courses you've added. They're siblings, and one component can't read another's state.

The fix is to **lift the state up**: move it to the closest parent the two share, then pass it down.

- The parent passes the data down as a prop.
- The parent also passes down a function that the child calls to ask for a change. By convention, these callback props have names that start with `on`, like `onAdd`.

```javascript
import { useState } from "react";

function Planner() {
  const [planned, setPlanned] = useState([]);

  function addCourse(code) {
    if (!planned.includes(code)) {
      setPlanned([...planned, code]);
    }
  }

  return (
    <div>
      <CourseList onAdd={addCourse} />
      <PlanSummary planned={planned} />
    </div>
  );
}
```

`CourseList` calls `onAdd` when a button is clicked, and `PlanSummary` shows whatever it receives:

```javascript
const courses = [
  { code: "CS 3000", title: "Algorithms and Data" },
  { code: "CS 3200", title: "Database Design" },
  { code: "CS 3500", title: "Object-Oriented Design" },
];

function CourseList({ onAdd }) {
  return (
    <ul>
      {courses.map((course) => (
        <li key={course.code}>
          <button onClick={() => onAdd(course.code)}>
            Add {course.code}: {course.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

```javascript
function PlanSummary({ planned }) {
  if (planned.length === 0) {
    return <p>No courses planned yet.</p>;
  }
  return <p>Planned: {planned.join(", ")}</p>;
}
```

## How the data flows

1. `Planner` owns the `planned` array.
2. It passes `planned` down to `PlanSummary`, which only displays it.
3. It passes its `addCourse` function down to `CourseList` as the `onAdd` prop.
4. When you click a button, `CourseList` calls `onAdd` with that course's code, which runs `addCourse` back in `Planner`.
5. `addCourse` updates the state, React renders `Planner` again, and both children get the new values.

%important Data flows down through props, and changes flow up through callbacks. A child asks its parent for a change and never changes the parent's state itself.

## Where state should live

Keep each piece of state in the lowest component that needs it. If only `LikeButton` uses the like count, the state stays there. Once a second component needs the same data, lift it to their closest common parent. With one copy of each piece of data in one place, your components can never disagree about it.

The [React documentation](https://react.dev/) walks through this pattern, which it calls lifting state up, with examples you can edit and run.

%%open-ended
- Two sibling components need the same changing data, and one of them also needs to update it. Where should the state live, and how does that child update it?
- In their closest common parent. The parent passes the data down as a prop and passes down a callback function that the child calls to ask for the update.
