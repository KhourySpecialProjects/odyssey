---
name: Designing REST APIs
description: Name your resources, pick the right methods and status codes, and return JSON that clients can rely on.
overview: A REST API lets other programs read and change your app's data over HTTP. This droplet covers how to name resources, which methods and status codes to use, and how to shape requests and responses so clients can depend on them.
funFact: The term REST, short for representational state transfer, comes from Roy Fielding's 2000 doctoral dissertation at the University of California, Irvine.
authors: contentcreator2
type: knowledge
focusArea: technical
difficulty: intermediate
tags: web-development
objectives:
- Name resources with clear, predictable URLs
- Choose the right method and status code for each request
- Design consistent JSON bodies, errors and pagination
- Version an API without breaking its clients
---

# Naming resources and URLs

A REST API organizes your app's data as **resources**: the things it stores, like students, courses and enrollments. Each resource has its own URL, and clients use HTTP methods to read or change it.

Good URLs are predictable. Someone who has seen `/students/42` should be able to guess the URL for course 7 without opening your docs.

%definition A resource is a piece of data your API exposes at its own URL, such as one student or the list of all courses.

## Use nouns, not verbs

The URL names the thing. The HTTP method, covered in the next lesson, says what to do with it. That's why the URL doesn't need verbs like get or create.

| Avoid | Prefer |
|---|---|
| GET /getStudent?id=42 | GET /students/42 |
| POST /createStudent | POST /students |
| POST /deleteStudent?id=42 | DELETE /students/42 |

## Collections and single items

Use a plural noun for a collection, and add an ID to get one item from it:

```text
GET /students       every student
GET /students/42    the student with ID 42
GET /courses        every course
GET /courses/7      the course with ID 7
```

Use lowercase letters, and separate words with hyphens, as in `/office-hours`.

## Nesting related resources

When one resource belongs to another, nest it under its parent. `/students/42/enrollments` reads as "the enrollments of student 42", and `/courses/7/enrollments` lists everyone enrolled in course 7.

Keep nesting shallow. A path like `/students/42/enrollments/318/course` ties clients to one route through your data, when they could go straight to `/courses/7`. One level of nesting is usually enough.

## Filtering with query parameters

The path identifies a resource. The query string, after the `?`, filters, sorts or searches a collection:

```text
GET /courses?credits=4
GET /students?search=patel
GET /students?sort=gpa&order=desc
```

Avoid making a new path for every filter, like `/students/sorted-by-gpa`. Query parameters combine freely, so one collection URL covers every filter.

%%multiple-choice
- Which URL best follows these conventions for listing the enrollments of student 42?
- /getEnrollments?student=42
- /students/42/enrollments <
- /student/42/enrollment-list
- /enrollments/list/student/42

# Choosing methods and status codes

Every request pairs a method with a URL. The method says what the client wants to do, and the status code in the response says what happened.

## The methods you'll use most

| Method | What it does | Example |
|---|---|---|
| GET | Reads a resource without changing it | GET /students/42 |
| POST | Creates a new resource in a collection | POST /students/42/enrollments |
| PUT | Replaces a resource with the one you send | PUT /students/42 |
| PATCH | Changes only the fields you send | PATCH /students/42 |
| DELETE | Removes a resource | DELETE /students/42/enrollments/318 |

PUT and PATCH are easy to mix up. PUT replaces the whole student, so you send every field. PATCH updates part of it, so you send only what changed:

```bash
curl -i -X PATCH http://localhost:8000/students/42 \
  -H "Content-Type: application/json" \
  -d '{"major": "Data Science"}'
```

Here `-X` sets the method, `-H` adds a header, `-d` sends the request body, and `-i` shows the status line and headers along with the response body.

Methods also make promises. GET is **safe**: it shouldn't change any data, so clients and caches can repeat it freely. PUT and DELETE are **idempotent**: sending the same request twice has the same effect as sending it once. POST is neither, so two identical POSTs can create two enrollments.

## Status codes

The first digit of a status code gives its category: 2xx means success, 3xx means a redirect, 4xx means the client sent something wrong, and 5xx means the server failed. These are the codes you'll use most:

| Code | Name | Use it when |
|---|---|---|
| 200 | OK | The request worked and the response has a body |
| 201 | Created | A POST created a new resource |
| 204 | No Content | The request worked and there's nothing to send back, often after a DELETE |
| 400 | Bad Request | The body is malformed or a field is invalid |
| 401 | Unauthorized | The client isn't logged in, or its token is missing or expired |
| 403 | Forbidden | The client is logged in but isn't allowed to do this |
| 404 | Not Found | Nothing exists at that URL |
| 409 | Conflict | The request clashes with current data, like enrolling a student twice |
| 500 | Internal Server Error | Something broke on the server |

%important 401 means the server doesn't know who you are. 403 means it knows who you are, and the answer is still no.

When a POST creates something, send 201 and a `Location` header that points to the new resource:

```bash
curl -i http://localhost:8000/students/42/enrollments \
  -H "Content-Type: application/json" \
  -d '{"course_id": 7, "semester": "Spring 2027"}'
```

There's no `-X` this time, because sending a body with `-d` makes curl use POST. Here's the response, trimmed to the lines that matter:

```text
HTTP/1.1 201 Created
Location: /students/42/enrollments/318
Content-Type: application/json

{"id": 318, "student_id": 42, "course_id": 7, "semester": "Spring 2027", "grade": null}
```

%warning Don't return 200 OK with an error message in the body. Clients check the status code first, so the error looks like a success.

MDN's [HTTP documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP) covers every method and status code in detail.

%%true-false
- If a logged-in student requests another student's grades and isn't allowed to see them, the right status code is 401 Unauthorized.
- false

# Designing requests and responses

Client code is written against the exact shape of your JSON. When every response follows the same patterns, that code stays simple.

## JSON bodies

Send and return JSON with a `Content-Type: application/json` header, and keep the shape predictable:

- Pick one style for field names, such as `snake_case`, and use it everywhere.
- Use real JSON types: numbers for numbers, `true` or `false` for yes or no, and `null` when a value is missing.
- Write dates and times as ISO 8601 strings, like `"2026-10-07T14:30:00Z"`.
- After a create or update, return the whole resource, so the client doesn't need a second request.

Here's student 42 after the PATCH from the last lesson:

```json
{
  "id": 42,
  "name": "Maya Patel",
  "major": "Data Science",
  "gpa": 3.7,
  "credits": 64,
  "updated_at": "2026-10-07T14:30:00Z"
}
```

## Pagination

A collection can hold thousands of items. Return them one page at a time, and tell the client where the next page is. Here's page 2, with three students per page to keep the example short:

```bash
curl "http://localhost:8000/students?page=2&per_page=3"
```

```json
{
  "data": [
    {"id": 4, "name": "Jordan Lee", "major": "Computer Science"},
    {"id": 5, "name": "Sofia Garcia", "major": "Data Science"},
    {"id": 6, "name": "Wei Zhang", "major": "Cybersecurity"}
  ],
  "page": 2,
  "per_page": 3,
  "total": 240,
  "next": "/students?page=3&per_page=3"
}
```

Set a maximum page size too, so one request can't ask for every row at once.

%caution Put URLs that contain ? or & in quotes when you use curl. Otherwise your shell tries to interpret those characters itself.

## Errors

Give every error the same shape, so clients can handle all of them with one piece of code. Send the right status code with a body like this one, which goes with a 409 Conflict when a course is full:

```json
{
  "error": {
    "code": "course_full",
    "message": "CS 3200 has no open seats for Spring 2027.",
    "details": {"course_id": 7, "semester": "Spring 2027"}
  }
}
```

The `code` is for programs: it stays fixed, so clients can check for it. The `message` is for people, and you can reword it any time.

%warning Never send stack traces or database errors to clients. They reveal how your server works. Log them on the server instead.

## Versioning

Once other people's code depends on your API, some changes will break it. Adding an endpoint or a field is usually safe. Renaming a field, removing one, or changing its type isn't.

When you need a breaking change, release a new version and keep the old one running while clients move over. The simplest way is to put the version in the path:

```text
GET /v1/students/42
GET /v2/students/42
```

%important Treat every published field as a promise. Add new fields freely, but rename or remove one only in a new version.

%%open-ended
- Why should every error response from your API use the same JSON shape?
- So clients can handle every error with one piece of code, checking a stable error code instead of writing special cases for each endpoint.
