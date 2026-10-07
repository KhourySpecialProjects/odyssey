// Demo people. Persona accounts are named for their role (admin1,
// contentcreator1, student1, ...). Emails use a reserved domain that can't
// exist in production.
'use strict';

const DOMAIN = 'demo.odyssey.test';

// Exact titles the app checks for (frontend/lib/globals.ts)
const ROLES = {
  admin: 'System Admin',
  creator: 'Content Creator',
  editor: 'Content Editor',
  faculty: 'Faculty',
  user: 'User',
};

/** The accounts someone can log in as. Everyone also has the User role, like real accounts. */
const personas = [
  { key: 'admin1', firstName: 'Admin', lastName: '1', role: ROLES.admin, bio: 'Runs the platform: approvals, roles and announcements.' },
  { key: 'contentcreator1', firstName: 'Content Creator', lastName: '1', role: ROLES.creator, bio: 'Writes the databases, SQL, Python and algorithms droplets.' },
  { key: 'contentcreator2', firstName: 'Content Creator', lastName: '2', role: ROLES.creator, bio: 'Writes the web development, career and study skills droplets.' },
  { key: 'contenteditor1', firstName: 'Content Editor', lastName: '1', role: ROLES.editor, bio: 'Reviews submitted droplets before they go live.' },
  { key: 'faculty1', firstName: 'Faculty', lastName: '1', role: ROLES.faculty, bio: 'Teaches CS 3200: Database Design and runs its group.' },
  { key: 'student1', firstName: 'Student', lastName: '1', role: null, bio: 'Keeps up with every due date.' },
  { key: 'student2', firstName: 'Student', lastName: '2', role: null, bio: 'A little behind this semester.' },
  { key: 'student3', firstName: 'Student', lastName: '3', role: null, bio: 'Wants to become a content creator.' },
];

/** Background students (student4 to student45) who make groups and progress look real. */
const BACKGROUND_STUDENTS = { from: 4, to: 45 };

/** How far each persona student gets, from 0 (nothing) to 1 (everything). */
const PERSONA_DILIGENCE = { student1: 0.95, student2: 0.2, student3: 0.5 };

function allPeople() {
  const students = [];
  for (let n = BACKGROUND_STUDENTS.from; n <= BACKGROUND_STUDENTS.to; n++) {
    students.push({ key: `student${n}`, firstName: 'Student', lastName: String(n), role: null });
  }
  return [...personas, ...students].map((person) => ({
    ...person,
    email: `${person.key}@${DOMAIN}`,
    roles: [ROLES.user, ...(person.role ? [person.role] : [])],
    isPersona: personas.includes(person),
  }));
}

module.exports = { DOMAIN, ROLES, allPeople, PERSONA_DILIGENCE };
