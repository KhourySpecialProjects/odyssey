// Builds the demo world in dependency order: roles and people, tags,
// droplets and lessons, playlists, voyages, groups and due dates, progress,
// social activity, then the admin backlog. Writes data the same way the app
// does (see each step), so every page renders it.
'use strict';

const people = require('./people');
const content = require('./content');

const UID = {
  role: 'api::authorized-user-role.authorized-user-role',
  user: 'api::authorized-user.authorized-user',
  tag: 'api::tag.tag',
  droplet: 'api::droplet.droplet',
  lesson: 'api::lesson.lesson',
  playlist: 'api::playlist.playlist',
  voyage: 'api::voyage.voyage',
  node: 'api::voyage-node.voyage-node',
  group: 'api::group.group',
  dueDate: 'api::due-date.due-date',
  enrollment: 'api::enrollment.enrollment',
  voyageEnrollment: 'api::voyage-enrollment.voyage-enrollment',
  nodeCompletion: 'api::voyage-node-completion.voyage-node-completion',
  note: 'api::note.note',
  highlight: 'api::highlight.highlight',
  friendship: 'api::friendship.friendship',
  announcement: 'api::announcement.announcement',
  creationRequest: 'api::creation-request.creation-request',
  accessRequest: 'api::access-request.access-request',
  report: 'api::report.report',
  gallery: 'api::gallery.gallery',
};

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const students = (from, to) => range(from, to).map((n) => `student${n}`);

/** Deterministic pseudo-random numbers, so every seed builds the same world. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** The hash the lesson renderer uses for BlockNote block ids (frontend convert-blocks.ts). */
function blockNoteIdToNumber(blockId) {
  let hash = 0;
  for (let i = 0; i < blockId.length; i++) {
    hash = (hash << 5) - hash + blockId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const TAGS = [
  ['odyssey', 'Odyssey'],
  ['sql', 'SQL'],
  ['databases', 'Databases'],
  ['web-development', 'Web Development'],
  ['javascript', 'JavaScript'],
  ['career', 'Career'],
];

/** Groups, with due dates as days from today (negative means already past). */
const GROUPS = [
  {
    key: 'cs3200',
    groupName: 'CS 3200: Database Design',
    slug: 'cs-3200-database-design-32001',
    description: 'Fall 2026 section. Work through the SQL droplets before each due date.',
    semester: 'Fall 2026',
    creator: 'faculty1',
    admins: ['faculty1'],
    managers: ['contentcreator1'],
    members: ['student1', 'student2', 'student3', ...students(4, 35)],
    droplets: ['sql-basics', 'sql-joins', 'db-design'],
    playlists: ['sql-fundamentals'],
    voyages: ['data-engineer'],
    dueDates: { 'sql-basics': -7, 'sql-joins': 3, 'db-design': 21 },
    playlistDueDates: { 'sql-fundamentals': 14 },
  },
  {
    key: 'webclub',
    groupName: 'Web Dev Club',
    slug: 'web-dev-club-48213',
    description: 'Open to everyone. A playlist-only group for building websites together.',
    semester: 'Open Membership',
    creator: 'contentcreator2',
    admins: ['contentcreator2'],
    managers: [],
    members: ['student1', ...students(36, 45)],
    droplets: [],
    playlists: ['web-starter'],
    voyages: [],
    dueDates: {},
    playlistDueDates: {},
  },
  {
    key: 'cs3200-spring',
    groupName: 'CS 3200: Spring 2026',
    slug: 'cs-3200-spring-2026-11820',
    description: 'Last semester’s section, archived.',
    semester: 'Spring 2026',
    isArchived: true,
    creator: 'faculty1',
    admins: ['faculty1'],
    managers: [],
    members: students(4, 12),
    droplets: ['sql-basics'],
    playlists: [],
    voyages: [],
    dueDates: { 'sql-basics': -120 },
    playlistDueDates: {},
    finished: true,
  },
];

/** Background students whose progress the feed and friends list rely on. */
const DILIGENCE_OVERRIDES = { student4: 0.9, student5: 0.7 };

/** Enrollments outside any group (people browsing Explore on their own). */
const SOLO_ENROLLMENTS = [
  { student: 'student1', droplet: 'intro', level: 1 },
  { student: 'student1', droplet: 'resume', level: 0.5 },
  { student: 'student3', droplet: 'intro', level: 1 },
  { student: 'student3', droplet: 'html-css', level: 0.5 },
];

const FRIENDSHIPS = [
  ['student1', 'student2'],
  ['student1', 'student4'],
  ['student1', 'student5'],
  ['student2', 'student3'],
];
const PENDING_REQUESTS = [
  ['student6', 'student1'], // student1 has a request to accept
  ['student1', 'student7'], // student1 is waiting on student7
];
const BLOCKED = [['student1', 'student8']];

async function seedWorld(db) {
  const random = seededRandom(3200);
  const counts = {};
  const add = (label, n = 1) => (counts[label] = (counts[label] ?? 0) + n);

  // Roles: nothing in the app creates these; production made them by hand
  const roleIds = {};
  for (const title of Object.values(people.ROLES)) {
    roleIds[title] = (await db.create(UID.role, { title })).id;
  }

  // People. firstTime:false skips the onboarding popup; the app matches emails exactly.
  const users = {};
  for (const person of people.allPeople()) {
    const created = await db.create(UID.user, {
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      bio: person.bio ?? null,
      isEnabled: true,
      firstTime: false,
      isPublic: person.isPersona,
      roles: person.roles.map((title) => roleIds[title]),
    });
    users[person.key] = { ...person, id: created.id };
  }
  add('people (8 personas + background students)', Object.keys(users).length);
  const userId = (key) => users[key].id;
  const fullName = (key) => `${users[key].firstName} ${users[key].lastName}`;

  const tagIds = {};
  for (const [slug, name] of TAGS) tagIds[slug] = (await db.create(UID.tag, { name, slug })).id;

  // Droplets and lessons, like createDroplet + addLesson. The lifecycles
  // replace the placeholder slugs with ones generated from the names.
  const droplets = {};
  async function createDroplet(key, spec, extra = {}) {
    const created = await db.create(UID.droplet, {
      name: spec.name,
      slug: 'seed',
      type: spec.type,
      focusArea: spec.focusArea,
      difficulty: spec.difficulty,
      status: spec.status,
      isHidden: spec.isHidden ?? false,
      inReview: spec.inReview ?? false,
      afterReview: spec.afterReview ?? null,
      description: spec.description ?? null,
      overview: spec.overview ?? null,
      funFact: spec.funFact ?? null,
      learningObjectives: spec.learningObjectives.map((objective) => ({ objective })),
      nextSteps: spec.nextSteps ?? [],
      tags: (spec.tags ?? []).map((tag) => tagIds[tag]),
      authorized_users: spec.authors.map(userId),
      ...extra,
    });
    const lessons = [];
    for (const [orderIndex, lesson] of spec.lessons.entries()) {
      const blocksV2 = lesson.blocksV2 ?? content.lessonBlocks(lesson);
      const createdLesson = await db.create(UID.lesson, {
        name: lesson.name,
        slug: 'seed',
        blocks: [],
        blocksV2,
        blocksVersion: 'v2',
        type: 'general',
        orderIndex,
        droplets: [created.id],
        ...(lesson.originalLessonId ? { originalLessonId: lesson.originalLessonId } : {}),
      });
      lessons.push({ id: createdLesson.id, blocksV2 });
    }
    droplets[key] = { id: created.id, slug: created.slug, name: created.name, spec, lessons };
    add('droplets');
    add('lessons', lessons.length);
    return droplets[key];
  }

  for (const spec of content.droplets) await createDroplet(spec.key, spec);
  for (const spec of content.droplets) {
    if (spec.prerequisites) {
      await db.update(UID.droplet, droplets[spec.key].id, {
        prerequisites: spec.prerequisites.map((key) => droplets[key].id),
      });
    }
  }

  // An [EDIT] copy like duplicateDroplet makes: status draft, originalDropletId,
  // lessons cloned with originalLessonId, one lesson changed.
  {
    const { of, inReview, changedLesson, addedText } = content.editCopy;
    const original = droplets[of];
    await createDroplet(
      `${of}-edit`,
      {
        ...original.spec,
        name: `[EDIT] ${original.spec.name}`,
        status: 'draft',
        inReview,
        lessons: original.lessons.map((lesson, index) => ({
          name: original.spec.lessons[index].name,
          originalLessonId: lesson.id,
          blocksV2:
            index === changedLesson ? [...lesson.blocksV2, content.paragraph(addedText)] : lesson.blocksV2,
        })),
      },
      { originalDropletId: original.id }
    );
  }

  // Playlists, like createPlaylist. Enrolled users are added with the groups below.
  const playlists = {};
  for (const spec of content.playlists) {
    const created = await db.create(UID.playlist, {
      name: spec.name,
      slug: 'seed',
      description: spec.description,
      isPublic: spec.isPublic,
      isArchived: spec.isArchived ?? false,
      duration: spec.duration,
      authors: spec.authors.map(userId),
      droplets: spec.droplets.map((key) => droplets[key].id),
    });
    playlists[spec.key] = { id: created.id, name: spec.name, dropletKeys: spec.droplets };
    add('playlists');
  }

  // Voyages, like createVoyageWithNodes, plus claimed nodes like claimNodeForUser
  const voyages = {};
  async function createVoyage(key, spec, status) {
    const created = await db.create(UID.voyage, {
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
      status,
      isSequential: false,
      isArchived: false,
      authors: spec.authors.map(userId),
    });
    const nodes = [];
    async function createNode(node, { parentIndex, ...placement }) {
      const data = { voyage: created.id, label: node.label, ...placement };
      if (node.playlist) {
        Object.assign(data, { nodeType: 'playlist', playlist: playlists[node.playlist].id });
      } else if (node.droplet) {
        Object.assign(data, { nodeType: 'droplet', droplet: droplets[node.droplet].id });
        if (node.claim) Object.assign(data, { claimStatus: node.claim, claimedBy: userId(node.claimedBy) });
      } else if (node.claim === 'claimed') {
        const claimDroplet = await createDroplet(`claim-${node.label}`, {
          name: `${node.label} — ${spec.name}`,
          authors: [node.claimedBy],
          status: 'draft',
          isHidden: true,
          type: 'knowledge',
          focusArea: 'technical',
          difficulty: 'beginner',
          learningObjectives: ['TBD'],
          lessons: [
            {
              name: 'Getting started',
              intro: 'Work in progress: an overview of document and key-value databases.',
              points: ['When to choose NoSQL', 'Trade-offs versus SQL'],
            },
          ],
        });
        Object.assign(data, {
          nodeType: 'droplet',
          droplet: claimDroplet.id,
          claimedBy: userId(node.claimedBy),
          claimStatus: 'claimed',
        });
      } else {
        Object.assign(data, { nodeType: 'droplet', claimStatus: 'unclaimed' });
      }
      const createdNode = await db.create(UID.node, data);
      nodes.push({ ...node, ...placement, parentIndex, id: createdNode.id, nodeType: data.nodeType });
      return createdNode;
    }
    for (const [orderIndex, node] of spec.main.entries()) {
      await createNode(node, { isMainPath: true, branchType: 'required', orderIndex });
    }
    const mainNodes = [...nodes];
    for (const node of spec.branches ?? []) {
      const siblings = nodes.filter((n) => !n.isMainPath && n.parentIndex === node.parent).length;
      await createNode(node, {
        isMainPath: false,
        branchType: node.branchType,
        orderIndex: siblings,
        parentNode: mainNodes[node.parent].id,
        parentIndex: node.parent,
      });
    }
    voyages[key] = { id: created.id, name: spec.name, nodes };
    add('voyages');
    add('voyage nodes', nodes.length);
  }
  await createVoyage('data-engineer', content.voyage, 'published');
  await createVoyage('frontend-path', content.draftVoyage, 'draft');

  // Groups, like createGroup, and per-member due dates (the due-date collection is what the UI reads)
  const groups = {};
  for (const spec of GROUPS) {
    const created = await db.create(UID.group, {
      groupName: spec.groupName,
      slug: spec.slug,
      description: spec.description,
      semester: spec.semester,
      isArchived: spec.isArchived ?? false,
      creator: userId(spec.creator),
      admins: spec.admins.map(userId),
      managers: spec.managers.map(userId),
      members: spec.members.map(userId),
      droplets: spec.droplets.map((key) => droplets[key].id),
      playlists: spec.playlists.map((key) => playlists[key].id),
      voyages: spec.voyages.map((key) => voyages[key].id),
    });
    groups[spec.key] = { id: created.id, spec };
    add('groups');
    for (const member of spec.members) {
      for (const [key, days] of Object.entries(spec.dueDates)) {
        await db.create(UID.dueDate, {
          dueDate: daysFromNow(days),
          authorized_user: userId(member),
          droplet: droplets[key].id,
          group: created.id,
        });
        add('due dates');
      }
      for (const [key, days] of Object.entries(spec.playlistDueDates)) {
        await db.create(UID.dueDate, {
          dueDate: daysFromNow(days),
          authorized_user: userId(member),
          playlist: playlists[key].id,
          group: created.id,
        });
        add('due dates');
      }
    }
  }

  // Progress. Each student gets a diligence (0-1); for the n-th droplet in a
  // group they view round(level * lessons) lessons, level = clamp(diligence*k - n).
  const diligence = {};
  const diligenceOf = (key) =>
    (diligence[key] ??= people.PERSONA_DILIGENCE[key] ?? DILIGENCE_OVERRIDES[key] ?? random());
  const enrollments = new Map(); // `${student}|${droplet}` -> enrollment
  async function enroll(student, dropletKey, level) {
    const mapKey = `${student}|${dropletKey}`;
    if (enrollments.has(mapKey)) return enrollments.get(mapKey);
    const { lessons } = droplets[dropletKey];
    const viewedCount = Math.round(Math.max(0, Math.min(1, level)) * lessons.length);
    const isComplete = lessons.length > 0 && viewedCount === lessons.length;
    const rating = isComplete && random() < 0.8 ? 3 + Math.floor(random() * 3) : null;
    const created = await db.create(UID.enrollment, {
      authorizedUser: userId(student),
      droplet: droplets[dropletKey].id,
      viewedLessons: lessons.slice(0, viewedCount).map((lesson) => lesson.id),
      isComplete,
      completionDate: isComplete ? daysFromNow(-(1 + Math.floor(random() * 20))) : null,
      rating,
      isFirstTime: false,
      isArchived: false,
    });
    const enrollment = { id: created.id, isComplete, rating, viewedCount };
    enrollments.set(mapKey, enrollment);
    add('droplet enrollments');
    return enrollment;
  }

  const playlistMembers = {};
  for (const { spec } of Object.values(groups)) {
    const sequence = [
      ...new Set([...spec.droplets, ...spec.playlists.flatMap((key) => playlists[key].dropletKeys)]),
    ];
    for (const member of spec.members) {
      for (const [index, dropletKey] of sequence.entries()) {
        const level = spec.finished ? 1 : diligenceOf(member) * sequence.length - index;
        await enroll(member, dropletKey, level);
      }
      for (const key of spec.playlists) (playlistMembers[key] ??= new Set()).add(member);
    }
  }
  for (const { student, droplet, level } of SOLO_ENROLLMENTS) await enroll(student, droplet, level);

  // Enrolled playlist users (enrollUsers connects authorized-user.playlists)
  for (const [key, members] of Object.entries(playlistMembers)) {
    await db.update(UID.playlist, playlists[key].id, { authorized_users: [...members].map(userId) });
  }

  // averageRating: the app shows stars only once a droplet has 5+ ratings
  for (const [key, droplet] of Object.entries(droplets)) {
    const ratings = [...enrollments.entries()]
      .filter(([mapKey, enrollment]) => mapKey.endsWith(`|${key}`) && enrollment.rating)
      .map(([, enrollment]) => enrollment.rating);
    if (ratings.length >= 5) {
      const average = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      await db.update(UID.droplet, droplet.id, { averageRating: average });
    }
  }

  // Voyage progress for group members, matching computeCompletionPercentage:
  // required nodes that can be completed (playlists, published droplets).
  for (const { spec } of Object.values(groups)) {
    for (const voyageKey of spec.voyages) {
      const voyage = voyages[voyageKey];
      const published = (node) => node.droplet && droplets[node.droplet].spec.status === 'published';
      const countable = voyage.nodes.filter(
        (node) => node.branchType !== 'optional' && (node.nodeType === 'playlist' || published(node))
      );
      for (const member of spec.members) {
        const completeFor = (dropletKey) => enrollments.get(`${member}|${dropletKey}`)?.isComplete;
        const done = voyage.nodes.filter((node) =>
          node.nodeType === 'playlist'
            ? playlists[node.playlist].dropletKeys.every(completeFor)
            : published(node) && completeFor(node.droplet)
        );
        const percentage = Math.round(
          (done.filter((node) => countable.includes(node)).length / countable.length) * 100
        );
        const voyageEnrollment = await db.create(UID.voyageEnrollment, {
          authorizedUser: userId(member),
          voyage: voyage.id,
          enrolledAt: daysFromNow(-30),
          completionPercentage: percentage,
        });
        add('voyage enrollments');
        for (const node of done) {
          await db.create(UID.nodeCompletion, {
            voyageNode: node.id,
            voyageEnrollment: voyageEnrollment.id,
            authorizedUser: userId(member),
            completedAt: daysFromNow(-(1 + Math.floor(random() * 10))),
          });
          add('voyage step completions');
        }
      }
    }
  }

  // A highlight with a note, and a plain note, for student1 in SQL Basics.
  // blockId is the renderer's hash of the paragraph's BlockNote id.
  {
    const sqlBasics = droplets['sql-basics'];
    const enrollment = enrollments.get('student1|sql-basics');
    const [firstLesson, , lastLesson] = sqlBasics.lessons;
    const intro = firstLesson.blocksV2[0];
    const introText = intro.content[0].text;
    const start = introText.indexOf('SELECT');
    const highlight = await db.create(UID.highlight, {
      text: 'SELECT',
      color: '#fff300',
      position: { start, end: start + 'SELECT'.length },
      lesson: firstLesson.id,
      authorized_user: userId('student1'),
      blockId: blockNoteIdToNumber(intro.id),
    });
    await db.create(UID.note, {
      content: 'SELECT picks the columns, FROM picks the table.',
      lesson: firstLesson.id,
      enrollment: enrollment.id,
      positionY: 120,
      highlight: highlight.id,
    });
    await db.create(UID.note, {
      content: 'Remember LIMIT when testing queries on big tables.',
      lesson: lastLesson.id,
      enrollment: enrollment.id,
      positionY: 240,
    });
    add('highlights');
    add('notes', 2);
  }

  // Friends: friendships, pending requests (sent_requests is the owner side), a block
  for (const pair of FRIENDSHIPS) {
    await db.create(UID.friendship, { authorized_users: pair.map(userId) });
    add('friendships');
  }
  const sent = {};
  for (const [from, to] of PENDING_REQUESTS) (sent[from] ??= []).push(to);
  for (const [from, list] of Object.entries(sent)) {
    await db.update(UID.user, userId(from), { sent_requests: list.map(userId) });
  }
  for (const [blocker, blocked] of BLOCKED) {
    await db.update(UID.user, userId(blocker), { blocked: [userId(blocked)] });
  }

  // Feed announcements, one of each type, worded like feed.ts writes them
  {
    const sqlBasics = droplets['sql-basics'];
    const friendDone = await db.create(UID.announcement, {
      type: 'friend',
      authorized_user: userId('student4'),
      droplet: sqlBasics.id,
      content: `${fullName('student4')} has completed ${sqlBasics.name}.`,
      firstCreated: daysFromNow(-2),
    });
    await db.update(UID.announcement, friendDone.id, { kudosGiven: [userId('student1')] });
    const announcements = [
      {
        type: 'kudos',
        authorized_user: userId('student1'),
        droplet: sqlBasics.id,
        content: `${fullName('student1')} has given you kudos for completing ${sqlBasics.name}`,
        firstCreated: daysFromNow(-1),
      },
      {
        type: 'friend',
        authorized_user: userId('student5'),
        droplet: droplets['sql-joins'].id,
        content: `${fullName('student5')} has completed ${droplets['sql-joins'].name}.`,
        firstCreated: daysFromNow(-3),
        readAt: daysFromNow(-2),
      },
      {
        type: 'playlist',
        playlist: playlists['sql-fundamentals'].id,
        content: `${playlists['sql-fundamentals'].name} has been updated. Click to view this playlist!`,
        firstCreated: daysFromNow(-4),
      },
      {
        type: 'group',
        group: groups.cs3200.id,
        content: `${groups.cs3200.spec.groupName} has been updated. Click to view this group!`,
        firstCreated: daysFromNow(-1),
      },
      {
        type: 'droplet',
        droplet: droplets['sql-joins'].id,
        content: `${droplets['sql-joins'].name} has been updated. Click to view this droplet!`,
        firstCreated: daysFromNow(-5),
      },
      {
        type: 'system',
        content: 'Welcome to the Odyssey demo! Everyone and everything here is made up, so explore freely.',
        firstCreated: daysFromNow(-10),
      },
      {
        type: 'system',
        authorized_user: userId('student2'),
        content: `${sqlBasics.name} was due 7 days ago. You can still finish it.`,
        firstCreated: daysFromNow(-1),
      },
    ];
    for (const announcement of announcements) await db.create(UID.announcement, announcement);
    add('announcements', announcements.length + 1);
  }

  // Admin backlog: a creation request on the unclaimed voyage step, access requests, bug reports
  {
    const unclaimed = voyages['data-engineer'].nodes.find((node) => node.claim === 'unclaimed');
    const request = unclaimed.creationRequest;
    await db.create(UID.creationRequest, {
      motivation: request.motivation,
      dropletIdea: request.dropletIdea,
      user: userId(request.by),
      voyageNode: unclaimed.id,
    });
    add('creation requests');

    const accessRequests = [
      ['Applicant', 'One', 'undergraduateStudent', 'KCCS'],
      ['Applicant', 'Two', 'graduateStudent', 'COE'],
      ['Applicant', 'Three', 'faculty', 'COS'],
    ];
    for (const [index, [givenName, familyName, affiliation, college]] of accessRequests.entries()) {
      await db.create(UID.accessRequest, {
        givenName,
        familyName,
        email: `applicant${index + 1}@${people.DOMAIN}`,
        affiliation,
        college,
      });
      add('access requests');
    }

    const reports = [
      ['student2', `/d/${droplets['sql-joins'].slug}`, 'The LEFT JOIN example in lesson 2 cuts off on my phone screen.'],
      ['student7', '/explore', 'Filtering by the Career tag shows no results even though Career droplets exist.'],
    ];
    for (const [index, [student, path, description]] of reports.entries()) {
      await db.create(UID.report, {
        fullName: fullName(student),
        email: users[student].email,
        path,
        description,
        type: 'bug',
        time: daysFromNow(-(index + 1)),
      });
      add('bug reports');
    }
  }

  // /features page gallery. Placeholder images until real screenshots exist.
  await db.create(UID.gallery, {
    title: 'Odyssey Features',
    slug: 'features',
    subtitle: 'Bite-sized learning, built for Khoury students',
    items: [
      { title: 'Droplets', description: 'Short courses you can finish in one sitting.', image_urls: ['/logo.svg'] },
      { title: 'Voyages', description: 'Guided paths with required and optional steps.', image_urls: ['/logo.svg'] },
      { title: 'Groups', description: 'Classes and clubs with due dates and progress.', image_urls: ['/logo.svg'] },
    ],
  });

  return counts;
}

module.exports = { seedWorld };
