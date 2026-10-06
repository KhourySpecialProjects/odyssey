// Demo world content: the droplets, playlists and voyage. Short, real lessons
// for now; the Block Gallery and the larger catalog come in later pieces.
'use strict';

const { randomUUID } = require('crypto');

// BlockNote v2 builders, matching what the editor and the Markdown importer save
const text = (value, styles = {}) => ({ type: 'text', text: value, styles });
const block = (type, props, content) => ({
  id: randomUUID(),
  type,
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', ...props },
  content,
  children: [],
});
const heading = (value, level = 2) => block('heading', { level, isToggleable: false }, [text(value)]);
const paragraph = (value) => block('paragraph', {}, [text(value)]);
const bullet = (value) => block('bulletListItem', {}, [text(value)]);

/** A lesson as BlockNote blocks: intro paragraph, key ideas, closing paragraph. */
function lessonBlocks({ intro, points, outro }) {
  return [
    paragraph(intro),
    heading('Key ideas'),
    ...points.map(bullet),
    ...(outro ? [paragraph(outro)] : []),
  ];
}

const resources = (...pairs) => pairs.map(([label, url]) => ({ label, url }));

/**
 * Droplets in every state the app supports. `key` is only used inside the
 * seed to wire relations; authors refer to persona keys in people.js.
 */
const droplets = [
  {
    key: 'intro',
    name: 'Introduction to Odyssey',
    authors: ['admin1'],
    status: 'published',
    type: 'knowledge',
    focusArea: 'personal',
    difficulty: 'beginner',
    tags: ['odyssey'],
    description: 'A quick tour of how droplets, playlists, voyages and groups fit together.',
    learningObjectives: ['Find and enroll in a droplet', 'Track your progress', 'Join a group'],
    lessons: [
      {
        name: 'What is a droplet?',
        intro: 'A droplet is a short, focused course made of a few lessons you can finish in one sitting.',
        points: [
          'Enroll to save your progress',
          'Lessons unlock in order as you view them',
          'Rate a droplet when you finish it',
        ],
      },
      {
        name: 'Playlists, voyages and groups',
        intro: 'Droplets can be bundled into playlists, arranged into voyages, and assigned to groups.',
        points: [
          'Playlists collect related droplets',
          'Voyages are guided paths with required and optional steps',
          'Groups are classes or clubs with due dates',
        ],
      },
    ],
  },
  {
    key: 'sql-basics',
    name: 'SQL Basics: SELECT and WHERE',
    authors: ['contentcreator1'],
    status: 'published',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'beginner',
    tags: ['sql', 'databases'],
    description: 'Write your first queries to read and filter data from a table.',
    overview: '<p>Start querying real data in minutes. No database experience needed.</p>',
    learningObjectives: ['Read rows with SELECT', 'Filter rows with WHERE', 'Sort results with ORDER BY'],
    funFact: 'SQL was first called SEQUEL, short for Structured English Query Language.',
    nextSteps: resources(['PostgreSQL SELECT docs', 'https://www.postgresql.org/docs/current/sql-select.html']),
    lessons: [
      {
        name: 'Your first SELECT',
        intro: 'Every query starts with SELECT, which lists the columns you want, and FROM, which names the table.',
        points: ['SELECT name, email FROM students', 'SELECT * returns every column', 'Column names are not case sensitive'],
      },
      {
        name: 'Filtering with WHERE',
        intro: 'WHERE keeps only the rows that match a condition.',
        points: ["WHERE major = 'CS'", 'Combine conditions with AND and OR', 'Use IS NULL to find missing values'],
      },
      {
        name: 'Sorting with ORDER BY',
        intro: 'ORDER BY sorts the result. Add DESC for largest first.',
        points: ['ORDER BY last_name', 'ORDER BY gpa DESC', 'LIMIT 10 returns only the first ten rows'],
        outro: 'You can now read, filter and sort any table.',
      },
    ],
  },
  {
    key: 'sql-joins',
    name: 'Joining Tables in SQL',
    authors: ['contentcreator1'],
    status: 'published',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'intermediate',
    tags: ['sql', 'databases'],
    prerequisites: ['sql-basics'],
    description: 'Combine rows from related tables with INNER and LEFT JOIN.',
    learningObjectives: ['Explain what a join does', 'Write INNER and LEFT joins', 'Avoid duplicate rows'],
    funFact: 'A join with no condition pairs every row with every other row, which is called a Cartesian product.',
    lessons: [
      {
        name: 'Why join?',
        intro: 'Related data lives in separate tables. A join puts it back together using a shared column.',
        points: ['Students and enrollments share student_id', 'The shared column is usually a foreign key', 'Joins happen in the FROM clause'],
      },
      {
        name: 'INNER and LEFT JOIN',
        intro: 'An INNER JOIN keeps only matching rows. A LEFT JOIN keeps every row from the left table.',
        points: ['INNER JOIN drops students with no enrollments', 'LEFT JOIN keeps them with NULLs', 'Always name the join condition with ON'],
      },
    ],
  },
  {
    key: 'db-design',
    name: 'Database Design and Normalization',
    authors: ['contentcreator1'],
    status: 'published',
    type: 'knowledge',
    focusArea: 'technical',
    difficulty: 'intermediate',
    tags: ['databases'],
    description: 'Design tables that avoid duplicate data and update anomalies.',
    learningObjectives: ['Identify entities and relationships', 'Apply first, second and third normal form'],
    lessons: [
      {
        name: 'Entities and relationships',
        intro: 'Good designs start by naming the things you store and how they relate.',
        points: ['An entity becomes a table', 'One-to-many uses a foreign key', 'Many-to-many needs a join table'],
      },
      {
        name: 'Normal forms',
        intro: 'Normalization removes repeated data so each fact is stored once.',
        points: ['1NF: one value per cell', '2NF: no partial dependencies', '3NF: no transitive dependencies'],
      },
    ],
  },
  {
    key: 'query-tips',
    name: 'Query Optimization Tips',
    authors: ['contentcreator1'],
    status: 'published',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'advanced',
    tags: ['sql', 'databases'],
    description: 'Make slow queries fast by reading query plans and adding the right indexes.',
    learningObjectives: ['Read an EXPLAIN plan', 'Choose an index'],
    lessons: [
      {
        name: 'Reading EXPLAIN',
        intro: 'EXPLAIN shows how the database plans to run your query.',
        points: ['Seq Scan reads the whole table', 'Index Scan jumps straight to matching rows', 'Look at the estimated row counts'],
      },
    ],
  },
  {
    key: 'html-css',
    name: 'HTML and CSS Foundations',
    authors: ['contentcreator2'],
    status: 'published',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'beginner',
    tags: ['web-development'],
    description: 'Build and style a simple web page from scratch.',
    learningObjectives: ['Structure a page with HTML', 'Style it with CSS', 'Make it readable on phones'],
    funFact: 'The first website, made in 1991, is still online at info.cern.ch.',
    lessons: [
      {
        name: 'Page structure',
        intro: 'HTML describes what each part of a page is: headings, paragraphs, links and images.',
        points: ['Use one h1 per page', 'Use semantic tags like nav and main', 'Every image needs alt text'],
      },
      {
        name: 'Styling with CSS',
        intro: 'CSS controls how the page looks, from colors to layout.',
        points: ['Selectors pick elements to style', 'Flexbox lays out rows and columns', 'Media queries adapt to screen size'],
      },
    ],
  },
  {
    key: 'js-browser',
    name: 'JavaScript in the Browser',
    authors: ['contentcreator2', 'contentcreator1'],
    status: 'published',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'intermediate',
    tags: ['web-development', 'javascript'],
    prerequisites: ['html-css'],
    description: 'Make pages interactive by responding to clicks and changing the page.',
    learningObjectives: ['Select elements', 'Handle events', 'Fetch data from an API'],
    lessons: [
      {
        name: 'The DOM',
        intro: 'The DOM is the browser’s live model of the page, and JavaScript can change it.',
        points: ['document.querySelector finds an element', 'textContent changes its text', 'classList toggles styles'],
      },
      {
        name: 'Events and fetch',
        intro: 'Listen for user actions and load data without reloading the page.',
        points: ['addEventListener("click", handler)', 'fetch returns a Promise', 'Use await to read the response'],
      },
    ],
  },
  {
    key: 'resume',
    name: 'Writing an Effective Resume',
    authors: ['contentcreator2'],
    status: 'published',
    type: 'knowledge',
    focusArea: 'professional',
    difficulty: 'beginner',
    tags: ['career'],
    description: 'Turn your projects and coursework into a resume recruiters read.',
    learningObjectives: ['Structure a one-page resume', 'Write impact-focused bullets'],
    lessons: [
      {
        name: 'Structure',
        intro: 'Recruiters skim. Put the most relevant experience first and keep it to one page.',
        points: ['Education, experience, projects, skills', 'Consistent dates and formatting', 'Save as PDF'],
      },
      {
        name: 'Bullets that show impact',
        intro: 'Start each bullet with a verb and end with a result.',
        points: ['Built, led, reduced, improved', 'Add numbers where you can', 'Cut anything that does not help'],
      },
    ],
  },
  // Not published yet: still being written
  {
    key: 'indexes-draft',
    name: 'Indexes and Query Performance',
    authors: ['contentcreator1'],
    status: 'draft',
    type: 'knowledge',
    focusArea: 'technical',
    difficulty: 'advanced',
    tags: ['databases'],
    description: 'Draft: how B-tree indexes work and when they help.',
    learningObjectives: ['Explain how a B-tree index works'],
    lessons: [
      {
        name: 'What an index is',
        intro: 'An index is a sorted copy of one or more columns that points back to the rows.',
        points: ['Like the index at the back of a book', 'Speeds up reads, slows down writes'],
      },
    ],
  },
  // Submitted for review: appears in the editor's /review queue
  {
    key: 'transactions-review',
    name: 'Transactions and ACID',
    authors: ['contentcreator1'],
    status: 'draft',
    inReview: true,
    type: 'knowledge',
    focusArea: 'technical',
    difficulty: 'intermediate',
    tags: ['databases'],
    description: 'Keep data correct when many users write at once.',
    learningObjectives: ['Explain atomicity, consistency, isolation and durability', 'Use BEGIN and COMMIT'],
    lessons: [
      {
        name: 'What a transaction is',
        intro: 'A transaction groups several changes so they all happen or none do.',
        points: ['BEGIN starts a transaction', 'COMMIT saves it', 'ROLLBACK undoes it'],
      },
      {
        name: 'ACID',
        intro: 'ACID is the set of guarantees a transaction gives you.',
        points: ['Atomic: all or nothing', 'Consistent: rules stay true', 'Isolated and durable'],
      },
    ],
  },
  // Sent back by the editor with requested changes
  {
    key: 'procedures-changes',
    name: 'Stored Procedures',
    authors: ['contentcreator2'],
    status: 'draft',
    inReview: false,
    afterReview: 'Please add a worked example that calls the procedure, and explain when a view would be simpler.',
    type: 'skill',
    focusArea: 'technical',
    difficulty: 'advanced',
    tags: ['sql'],
    description: 'Package reusable SQL logic inside the database.',
    learningObjectives: ['Write a stored procedure'],
    lessons: [
      {
        name: 'Creating a procedure',
        intro: 'CREATE PROCEDURE saves a block of SQL under a name you can call later.',
        points: ['Procedures can take parameters', 'Call them with CALL'],
      },
    ],
  },
  // Published but taken down from listings
  {
    key: 'hidden',
    name: 'Legacy: MySQL Setup Guide',
    authors: ['contentcreator1'],
    status: 'published',
    isHidden: true,
    type: 'knowledge',
    focusArea: 'technical',
    difficulty: 'beginner',
    tags: ['databases'],
    description: 'Old setup steps kept for reference. Hidden from Explore.',
    learningObjectives: ['Install MySQL locally'],
    lessons: [
      {
        name: 'Installing MySQL',
        intro: 'These steps are out of date and kept only for old course links.',
        points: ['Download the installer', 'Run the setup wizard'],
      },
    ],
  },
];

/**
 * An [EDIT] copy of a published droplet, the way duplicateDroplet makes one,
 * submitted for review so the editor sees "Publish changes".
 */
const editCopy = {
  of: 'sql-basics',
  inReview: true,
  changedLesson: 0,
  addedText: 'Tip: list only the columns you need instead of SELECT * to keep results small.',
};

const playlists = [
  {
    key: 'sql-fundamentals',
    name: 'SQL Fundamentals',
    authors: ['contentcreator1'],
    isPublic: true,
    duration: 'medium',
    description: 'Everything you need to start querying databases.',
    droplets: ['sql-basics', 'sql-joins', 'db-design'],
  },
  {
    key: 'web-starter',
    name: 'Web Development Starter',
    authors: ['contentcreator2'],
    isPublic: true,
    duration: 'short',
    description: 'Build your first interactive web page.',
    droplets: ['html-css', 'js-browser'],
  },
  {
    key: 'career-prep',
    name: 'Career Prep',
    authors: ['contentcreator2'],
    isPublic: false,
    duration: 'short',
    description: 'Private playlist for co-op preparation.',
    droplets: ['resume'],
  },
  {
    key: 'old-course-pack',
    name: 'Old Course Pack',
    authors: ['contentcreator1'],
    isPublic: true,
    isArchived: true,
    duration: 'long',
    description: 'Archived materials from a previous semester.',
    droplets: ['hidden'],
  },
];

/**
 * A published voyage with a main path and branches, covering playlist and
 * droplet nodes and all three claim states.
 */
const voyage = {
  name: 'Become a Data Engineer',
  slug: 'become-a-data-engineer',
  description: 'A guided path from your first query to designing databases and pipelines.',
  authors: ['faculty1'],
  main: [
    { label: 'SQL Fundamentals', playlist: 'sql-fundamentals' },
    { label: 'Database Design', droplet: 'db-design' },
    {
      label: 'Data Pipelines with Python',
      claim: 'unclaimed',
      creationRequest: {
        by: 'student3',
        motivation: 'I built a small ETL pipeline for my co-op and want to teach it.',
        dropletIdea: 'Extract, transform and load data with Python and pandas.',
      },
    },
    { label: 'NoSQL Databases', claim: 'claimed', claimedBy: 'contentcreator2' },
  ],
  branches: [
    { parent: 0, label: 'Joining Tables in SQL', droplet: 'sql-joins', branchType: 'required' },
    {
      parent: 1,
      label: 'Query Optimization Tips',
      droplet: 'query-tips',
      branchType: 'optional',
      claim: 'authored',
      claimedBy: 'contentcreator1',
    },
  ],
};

/** A voyage still being built (only its authors and admins can see it). */
const draftVoyage = {
  name: 'Frontend Engineering Path',
  slug: 'frontend-engineering-path',
  description: 'Draft path for aspiring frontend engineers.',
  authors: ['faculty1'],
  main: [
    { label: 'Web Development Starter', playlist: 'web-starter' },
    { label: 'JavaScript in the Browser', droplet: 'js-browser' },
  ],
};

module.exports = { droplets, editCopy, playlists, voyage, draftVoyage, lessonBlocks, paragraph };
