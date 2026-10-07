// The Block Gallery droplet: one lesson per block family, so every lesson
// block the app supports appears at least once, saved exactly the way the
// editor saves it. Rules that matter (see the comments by each builder):
// - Inline styles are only bold, italic and code. Any other style key stops
//   the editor from opening the lesson, including the schema's latex style
//   (the latex block takes its name, so the editor has no latex mark).
// - Inline math is plain text between dollar signs, which is what authors
//   type in the editor.
// - Every block gets its own UUID, including nested children.
// - Prop types are strict: true/false answers are booleans, the notebook's
//   editable is the string "true", sandbox flags are booleans.
// - Any other dollar sign in text is read as math too, so prose avoids them.
// frontend/testing/lib/demo-seed-coverage.test.ts checks the gallery has every
// block and callout type, and follows the block type, id and style rules.
'use strict';

const { randomUUID } = require('crypto');

const DEFAULTS = { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' };

// Inline content
const t = (text, styles = {}) => ({ type: 'text', text, styles });
const bold = (text) => t(text, { bold: true });
const italic = (text) => t(text, { italic: true });
const code = (text) => t(text, { code: true });
const math = (tex) => t(`$${tex}$`);
const link = (href, label) => ({ type: 'link', href, content: [t(label)] });
const inline = (parts) => parts.map((part) => (typeof part === 'string' ? t(part) : part));

// Blocks. Blocks without inline content leave `content` out.
const block = (type, props, content, children = []) => ({
  id: randomUUID(),
  type,
  props,
  ...(content === undefined ? {} : { content }),
  children,
});
const heading = (level, text) => block('heading', { ...DEFAULTS, level, isToggleable: false }, [t(text)]);
const paragraph = (...parts) => block('paragraph', { ...DEFAULTS }, inline(parts));
const bullet = (text, children = []) => block('bulletListItem', { ...DEFAULTS }, [t(text)], children);
const numbered = (text) => block('numberedListItem', { ...DEFAULTS }, [t(text)]);
const divider = () => block('divider', {});
// calloutType must be one of the 7 types, or the editor crashes
const callout = (calloutType, ...parts) => block('callout', { calloutType }, inline(parts));
// The renderer defaults displayMode to false, so it's always set
const latex = (content, displayMode = true) => block('latex', { content, displayMode });
const image = (url, caption) => block('image', { url, caption });
const video = (url) =>
  block('video', { textAlignment: 'left', backgroundColor: 'default', name: '', url, caption: '', showPreview: true });
const codeBlock = (language, source, { editable, runnable }) =>
  block('code-block', { language, code: source, editable, runnable });
const notebook = (source, testCode = '') =>
  block('notebook-code', { code: source, language: 'python', editable: 'true', testCode });
const sandpack = (template, files, lockedFiles = []) =>
  block('sandpack-block', {
    template,
    files: JSON.stringify(files),
    showPreview: true,
    editable: true,
    description: '',
    lockedFiles: JSON.stringify(lockedFiles),
  });
const slideBreak = (nextSlideLayout = 'default') => block('slide-break', { nextSlideLayout });
const columnBreak = () => block('column-break', {});
const trueFalse = (question, correctAnswer) =>
  block('quiz-true-false', { ...DEFAULTS, question: `<p>${question}</p>`, correctAnswer });
const multipleChoice = (question, options) =>
  block('quiz-multiple-choice', {
    ...DEFAULTS,
    question: `<p>${question}</p>`,
    options: JSON.stringify(
      options.map(([text, isCorrect], index) => ({ id: String(index + 1), text: `<p>${text}</p>`, isCorrect }))
    ),
  });
const openEnded = (question, answer) =>
  block('quiz-open-ended', { ...DEFAULTS, question: `<p>${question}</p>`, correctAnswer: `<p>${answer}</p>` });

/** A table whose first row is the header. `colors` maps "row,col" to a cell color name. */
function table(rows, colors = {}) {
  const cell = (text, rowIndex, colIndex) => ({
    type: 'tableCell',
    props: {
      backgroundColor: rowIndex === 0 ? 'blue' : colors[`${rowIndex},${colIndex}`] ?? 'default',
      textColor: 'default',
      textAlignment: 'left',
      colspan: 1,
      rowspan: 1,
    },
    content: [rowIndex === 0 ? bold(text) : t(text)],
  });
  return block(
    'table',
    { textColor: 'default' },
    {
      type: 'tableContent',
      columnWidths: rows[0].map(() => null),
      rows: rows.map((cells, rowIndex) => ({ cells: cells.map((text, colIndex) => cell(text, rowIndex, colIndex)) })),
    }
  );
}

const SQL_VIDEO_ID = 'HXV3zeQKqGY'; // freeCodeCamp: SQL Tutorial - Full Database Course for Beginners

const textLesson = [
  heading(1, 'Writing lessons'),
  paragraph('Lessons are built from blocks. This lesson shows the text blocks almost every lesson uses.'),
  heading(2, 'Inline styles'),
  paragraph(bold('Bold'), ', ', italic('italic'), ' and ', code('inline code'), ' can be mixed in one sentence.'),
  heading(3, 'Links'),
  paragraph('Point to outside resources, like the ', link('https://www.postgresql.org/docs/', 'PostgreSQL documentation'), '.'),
  heading(2, 'Lists'),
  bullet('Bullet lists', [bullet('can nest'), bullet('as deep as you need')]),
  bullet('suit ideas with no order'),
  numbered('Numbered lists'),
  numbered('count steps'),
  numbered('in order'),
  heading(2, 'Tables'),
  paragraph('The first row is always the header. Cells can have background colors.'),
  table(
    [
      ['Clause', 'What it does', 'Required?'],
      ['SELECT', 'Chooses the columns', 'Yes'],
      ['FROM', 'Names the table', 'Yes'],
      ['WHERE', 'Filters the rows', 'No'],
      ['ORDER BY', 'Sorts the result', 'No'],
    ],
    { '1,2': 'green', '2,2': 'green', '3,2': 'yellow', '4,2': 'yellow' }
  ),
  divider(),
  paragraph('A divider, like the line above, separates sections.'),
];

const calloutLesson = [
  paragraph('Callouts pull attention to one idea. There are seven kinds.'),
  callout('default', 'A plain callout for a side note.'),
  callout('definition', bold('Primary key: '), 'a column that uniquely identifies each row in a table.'),
  callout('important', 'Back up a database before running an UPDATE without a WHERE clause.'),
  callout('warning', code('DELETE FROM students'), ' removes every row in the table.'),
  callout('caution', 'Indexes speed up reads but slow down writes. Add them where queries need them.'),
  callout('question', 'When would you choose a LEFT JOIN over an INNER JOIN?'),
  // No links here: callouts show a link's text but drop the link itself
  callout('more-information', 'The queries chapter of the PostgreSQL docs covers every kind of JOIN.'),
];

const quizLesson = [
  paragraph(
    'Multiple choice and true/false quizzes must be answered correctly before the ',
    bold('Next'),
    ' button unlocks. Open-ended answers are checked word for word, ignoring case.'
  ),
  trueFalse('SELECT * returns every column of a table.', true),
  multipleChoice('Which clause filters rows?', [
    ['SELECT', false],
    ['WHERE', true],
    ['ORDER BY', false],
    ['LIMIT', false],
  ]),
  multipleChoice('Which of these are aggregate functions? Pick all that apply.', [
    ['COUNT', true],
    ['AVG', true],
    ['WHERE', false],
    ['MAX', true],
  ]),
  openEnded('Which two words sort the results of a query?', 'ORDER BY'),
];

const mediaLesson = [
  heading(2, 'Math'),
  paragraph('Write math inline, like ', math('a^2 + b^2 = c^2'), ', or as a centered block:'),
  latex('\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i'),
  paragraph('That formula is what SQL computes for ', code('AVG(gpa)'), '.'),
  heading(2, 'Images'),
  image('/demo/images/er-diagram.svg', 'Students take courses through enrollments'),
  paragraph('Images can be diagrams, screenshots or photos.'),
  heading(2, 'Video'),
  video(`https://www.youtube.com/watch?v=${SQL_VIDEO_ID}`),
  paragraph('Videos embed from YouTube or Vimeo.'),
];

const codeLesson = [
  paragraph('Code blocks can be read-only, editable or runnable. Python runs right in the browser.'),
  heading(2, 'Runnable Python'),
  codeBlock(
    'python',
    'grades = [3.2, 3.8, 3.5, 2.9]\naverage = sum(grades) / len(grades)\nprint(f"Average GPA: {average:.2f}")',
    { editable: true, runnable: true }
  ),
  heading(2, 'Other languages'),
  paragraph(
    'Other languages run on a code server (Piston or Judge0). In the demo, start it with npm run demo:piston first.'
  ),
  codeBlock(
    'javascript',
    'const scores = [88, 92, 79];\nconst best = Math.max(...scores);\nconsole.log("Best score:", best);',
    { editable: true, runnable: true }
  ),
  heading(2, 'Read-only snippets'),
  codeBlock('plaintext', "SELECT name, gpa\nFROM students\nWHERE major = 'CS'\nORDER BY gpa DESC;", {
    editable: false,
    runnable: false,
  }),
];

const notebookLesson = [
  paragraph(
    'Notebook cells run Python with pandas and can read the datasets attached to the droplet. This droplet has ',
    code('students.csv'),
    '. Run Tests checks your answer.'
  ),
  notebook(
    'import pandas as pd\n\nstudents = pd.read_csv("students.csv")\ncs = students[students["major"] == "CS"]\nprint(cs[["name", "gpa"]].sort_values("gpa", ascending=False))',
    'assert len(cs) == 6, "Expected the 6 CS students"'
  ),
  paragraph('Notebooks can also draw charts:'),
  notebook(
    'import matplotlib.pyplot as plt\nimport pandas as pd\n\nstudents = pd.read_csv("students.csv")\nstudents.groupby("major")["gpa"].mean().plot(kind="bar")\nplt.title("Average GPA by major")\nplt.show()'
  ),
];

const sandboxLesson = [
  paragraph('Sandboxes run real web code with a live preview. Edit the code and the preview updates.'),
  heading(2, 'HTML, CSS and JavaScript'),
  sandpack(
    'vanilla',
    {
      '/index.html':
        '<!DOCTYPE html>\n<html>\n  <head>\n    <link rel="stylesheet" href="/styles.css" />\n  </head>\n  <body>\n    <h1>Enrolled students</h1>\n    <ul id="list"></ul>\n    <script src="/index.js"></script>\n  </body>\n</html>\n',
      '/index.js':
        'const students = ["Student 1", "Student 2", "Student 3"];\nconst list = document.getElementById("list");\nfor (const name of students) {\n  const item = document.createElement("li");\n  item.textContent = name;\n  list.appendChild(item);\n}\n',
      '/styles.css': 'body {\n  font-family: sans-serif;\n  padding: 1rem;\n}\nli {\n  color: #2d7597;\n}\n',
    },
    ['/index.html']
  ),
  heading(2, 'React'),
  sandpack('react', {
    '/App.js':
      'import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Enroll a student ({count} so far)\n    </button>\n  );\n}\n',
    '/index.js':
      'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);\n',
  }),
  heading(2, 'React with TypeScript'),
  sandpack('react-ts', {
    '/App.tsx':
      'type Student = { name: string; gpa: number };\n\nconst students: Student[] = [\n  { name: "Student 1", gpa: 3.8 },\n  { name: "Student 2", gpa: 3.4 },\n];\n\nexport default function App() {\n  return (\n    <ul>\n      {students.map((s) => (\n        <li key={s.name}>\n          {s.name}: {s.gpa.toFixed(2)}\n        </li>\n      ))}\n    </ul>\n  );\n}\n',
    '/index.tsx':
      'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);\n',
  }),
];

// Slides come from top-level slide breaks; each break's layout applies to the slide after it
const slidesLesson = [
  paragraph('This lesson doubles as a slide deck. Use the droplet’s ', bold('Present'), ' button to see it as slides.'),
  slideBreak('default'),
  heading(2, 'What is a database?'),
  bullet('An organized collection of data'),
  bullet('Stored in tables of rows and columns'),
  bullet('Queried with SQL'),
  slideBreak('two-columns'),
  heading(2, 'Spreadsheets vs databases'),
  paragraph(bold('Spreadsheets')),
  bullet('Great for one person'),
  bullet('Formulas live in cells'),
  columnBreak(),
  paragraph(bold('Databases')),
  bullet('Built for many users at once'),
  bullet('Rules keep the data consistent'),
  slideBreak('default'),
  heading(2, 'Recap'),
  numbered('Tables hold rows and columns'),
  numbered('SQL reads and changes them'),
  numbered('Keys connect related tables'),
];

// The classic (v1) format: a Strapi dynamic zone. Only it has the expandable block.
const classicLesson = [
  {
    __component: 'droplets.generic',
    content:
      '<h2>Classic lessons</h2><p>Older lessons use the original block format. They still render, and this one shows the <strong>expandable</strong> block, which only exists in the classic format.</p><pre><code class="language-sql">SELECT COUNT(*) FROM students;</code></pre>',
  },
  {
    __component: 'droplets.callout',
    type: 'info',
    color: 'bg-sky-100',
    iconEnabled: true,
    content: [{ type: 'paragraph', children: [{ type: 'text', text: 'An info callout in the classic format.' }] }],
  },
  {
    __component: 'droplets.callout',
    type: 'warning',
    color: 'bg-red-300',
    iconEnabled: true,
    content: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Careful: ', bold: true },
          { type: 'text', text: 'a warning callout in the classic format.' },
        ],
      },
    ],
  },
  {
    __component: 'droplets.expandable',
    title: 'Show the answer',
    content: '<p><code>SELECT COUNT(*) FROM students;</code> counts every row in the table.</p>',
  },
  { __component: 'droplets.video', url: `https://www.youtube.com/embed/${SQL_VIDEO_ID}` },
  {
    __component: 'droplets.quiz',
    questions: [
      {
        content: '<p>Which keyword starts most queries?</p>',
        answerOptions: [
          { content: 'SELECT', isCorrect: true },
          { content: 'WHERE', isCorrect: false },
        ],
      },
    ],
  },
  {
    __component: 'droplets.open-ended-quiz',
    questions: [{ content: '<p>What does SQL stand for?</p>', correctAnswer: 'Structured Query Language' }],
  },
];

const blockGallery = {
  key: 'block-gallery',
  name: 'SQL Basics: A Tour of Every Lesson Block',
  authors: ['contentcreator1'],
  status: 'published',
  presentationEnabled: true,
  type: 'knowledge',
  focusArea: 'technical',
  difficulty: 'beginner',
  tags: ['odyssey', 'sql'],
  description: 'Every kind of lesson block in one droplet, with SQL examples: text, callouts, quizzes, math, media, code, notebooks, sandboxes and slides.',
  learningObjectives: ['See every lesson block in action', 'Try quizzes, code and notebooks'],
  datasets: [{ name: 'students.csv', format: 'csv', file: 'demo/datasets/students.csv' }],
  lessons: [
    { name: 'Text and structure', blocksV2: textLesson },
    { name: 'Callouts', blocksV2: calloutLesson },
    { name: 'Quizzes', blocksV2: quizLesson },
    { name: 'Math and media', blocksV2: mediaLesson },
    { name: 'Code blocks', blocksV2: codeLesson },
    { name: 'Notebooks and datasets', blocksV2: notebookLesson },
    { name: 'Live sandboxes', blocksV2: sandboxLesson },
    { name: 'Slides', blocksV2: slidesLesson },
    { name: 'Classic lesson format', blocks: classicLesson },
  ],
};

module.exports = { blockGallery };
