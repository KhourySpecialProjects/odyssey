---
name: Promises and async/await
description: Write JavaScript that waits for network requests and timers without freezing the page.
overview: Network requests and timers take time, and JavaScript doesn't stop to wait for them. This droplet explains the event loop in plain terms, then shows how promises and async/await keep asynchronous code readable and correct.
funFact: Promises became part of the JavaScript language in ECMAScript 2015, and the async and await keywords followed two years later in ECMAScript 2017.
authors: contentcreator2
type: skill
focusArea: technical
difficulty: advanced
tags: javascript
objectives:
- Explain how the event loop runs callbacks after slow work finishes
- Chain promises with then and catch, and combine them with Promise.all
- Write async functions that handle errors with try and catch
- Avoid common mistakes such as a forgotten await or needlessly sequential requests
---

# Why JavaScript doesn't wait

JavaScript runs your code on a single thread, which means it does one thing at a time. A network request can take hundreds of milliseconds. If JavaScript stopped and waited for it, nothing else could happen in the meantime: clicks wouldn't respond and the page couldn't update.

So JavaScript doesn't wait. It hands slow work like timers and network requests to the browser, or to Node.js on a server, and moves on to the next line. When the work finishes, a function you provided, called a callback, is queued to run.

%definition A callback is a function you pass to other code so it can call it later, for example when a timer fires or a request finishes.

## The event loop in plain terms

- JavaScript runs the current piece of code from start to finish without interruption.
- Meanwhile, the browser handles timers and network requests in the background.
- When one of them finishes, its callback joins a queue.
- Whenever JavaScript has nothing left to run, the event loop takes the next callback from the queue and runs it.

```javascript
console.log("Submitting your assignment");

setTimeout(() => {
  console.log("Autograder finished");
}, 2000);

console.log("You can keep working");
```

This prints the first and last messages right away, then "Autograder finished" two seconds later. `setTimeout` only schedules its callback, so the line after it runs immediately.

## A timer's delay is a minimum

A callback can't run until the code that's already running finishes. If something keeps JavaScript busy, every callback has to wait, even a timer set to 0 milliseconds.

```javascript
const start = Date.now();

setTimeout(() => {
  console.log(`Timer ran after ${Date.now() - start} ms`);
}, 100);

while (Date.now() - start < 1000) {
  // Busy for a full second, so nothing else can run
}
```

This prints a number close to 1000, not 100. Long-running code delays clicks in the same way, which is what makes a page feel frozen.

%important JavaScript never interrupts running code to run a callback. Callbacks wait until the current code has finished.

## Callbacks get messy

Before promises, you handled every asynchronous result with callbacks. When each step depends on the one before, the callbacks nest inside each other:

```javascript
setTimeout(() => {
  console.log("Uploaded your files");
  setTimeout(() => {
    console.log("Ran the tests");
    setTimeout(() => {
      console.log("Posted your grade");
    }, 1000);
  }, 1000);
}, 1000);
```

Each step pushes the code further to the right, and real code also needs error handling at every level. Promises fix both problems.

%%multiple-choice
- In what order does this code print its letters? console.log("A"); setTimeout(() => console.log("B"), 0); console.log("C");
- A, B, C
- A, C, B <
- B, A, C
- C, A, B

# Working with promises

A **promise** is an object that stands for a result that isn't ready yet. It starts out pending. When the work finishes, it settles, either fulfilled with a value or rejected with an error, and it never changes after that.

`fetch` returns a promise for the server's response. You attach a callback with `then` to run when the promise is fulfilled, and one with `catch` to run if it's rejected:

```javascript
fetch("/api/courses")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
  })
  .then((courses) => {
    console.log(`Loaded ${courses.length} courses`);
  })
  .catch((error) => {
    console.error("Couldn't load courses:", error.message);
  });
```

## How chaining works

Each `then` returns a new promise, so you can chain them. Whatever a callback returns is passed to the next `then`. If it returns a promise, as `response.json()` does, the chain waits for that promise to settle first. If any step throws an error or returns a rejected promise, the chain skips ahead to the nearest `catch`.

%warning A fetch promise rejects only when the request can't be made at all, for example when you're offline. A 404 or 500 response still fulfills, so check response.ok yourself.

## Waiting for several promises

`Promise.all` takes an array of promises and returns a single promise. Once every promise has fulfilled, it fulfills with an array of all the results, in the same order as the input. If any promise rejects, `Promise.all` rejects right away with that error.

```javascript
function getJSON(url) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
    return response.json();
  });
}

Promise.all([getJSON("/api/students/42"), getJSON("/api/students/42/grades")])
  .then(([student, grades]) => {
    console.log(`${student.name} has ${grades.length} grades`);
  })
  .catch((error) => console.error(error.message));
```

Both requests start right away and run at the same time, so the total wait is as long as the slower request, not both added together. If you want every result even when some requests fail, use `Promise.allSettled` instead.

## When promise callbacks run

Promise callbacks go into a separate queue, called the microtask queue. JavaScript empties it as soon as the current code finishes, before it moves on to timers and other events.

```javascript
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("done");
```

This prints done, then promise, then timer. The [MDN Web Docs](https://developer.mozilla.org/) have a reference page for every promise method.

%%true-false
- A promise returned by fetch rejects when the server responds with a 404 status.
- false

# Writing async functions

An `async` function always returns a promise. Inside one, `await` pauses the function until a promise settles, then gives you its value, so asynchronous code reads from top to bottom like ordinary code. Here's `getJSON` from the last lesson, rewritten:

```javascript
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}
```

%important await pauses only the async function it's in. The rest of your page keeps running, and the function picks up where it left off when the promise settles.

## Handling errors with try and catch

When an awaited promise rejects, `await` throws its error, so you handle it with an ordinary `try` and `catch`:

```javascript
async function showGrades(studentId) {
  try {
    const grades = await getJSON(`/api/students/${studentId}/grades`);
    console.log(`Loaded ${grades.length} grades`);
  } catch (error) {
    console.error("Couldn't load grades:", error.message);
  }
}
```

## Running awaits in parallel

Two awaits in a row run one after the other. Here, the request for grades doesn't start until the request for the student has finished:

```javascript
async function loadProfile(studentId) {
  const student = await getJSON(`/api/students/${studentId}`);
  const grades = await getJSON(`/api/students/${studentId}/grades`);
  return { student, grades };
}
```

When requests don't depend on each other, start them together and await `Promise.all`. The total time is then the slowest request, not the sum of both:

```javascript
async function loadProfile(studentId) {
  const [student, grades] = await Promise.all([
    getJSON(`/api/students/${studentId}`),
    getJSON(`/api/students/${studentId}/grades`),
  ]);
  return { student, grades };
}
```

Keep separate awaits for steps that need the previous result, like looking up a student before loading their advisor's details.

## Common mistakes

**Forgetting await.** Without it, you get a promise instead of the data:

```javascript
async function countGrades(studentId) {
  const grades = getJSON(`/api/students/${studentId}/grades`); // Missing await
  console.log(grades.length); // undefined, because grades is a promise
}
```

If that request fails, a `try` and `catch` around it won't see the error either.

**Awaiting inside forEach.** `forEach` doesn't wait for async callbacks, so the code after it runs before they finish. To send reminders one at a time, use a `for...of` loop instead:

```javascript
async function remindAll(studentIds) {
  for (const id of studentIds) {
    await fetch(`/api/students/${id}/reminders`, { method: "POST" });
  }
}
```

To send them all at once, pass `Promise.all` an array made with `map`.

**Using await outside an async function.** That's a syntax error, except at the top level of a JavaScript module.

%%open-ended
- Inside an async function, a teammate writes const grades = getJSON(url) and then finds that grades.length is undefined. What went wrong, and how do you fix it?
- They forgot await, so grades holds a promise instead of the data. Writing const grades = await getJSON(url) fixes it.
