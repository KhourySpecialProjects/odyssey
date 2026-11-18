import type { Criterion, DropletSnapshot } from "@/lib/ai-review/types";

export const mockCriteria: Criterion[] = [
  {
    id: 1,
    name: "Tone",
    lessonDescription: "Is the lesson engaging?",
    overallDescription: "Is the voice consistent?",
  },
  {
    id: 2,
    name: "Scaffolding",
    lessonDescription: "Could a learner follow it?",
    overallDescription: "Does difficulty climb steadily?",
  },
];

export const mockSnapshot: DropletSnapshot = {
  snapshotVersion: 1,
  takenAt: "2026-10-28T12:00:00.000Z",
  source: { strapiUrl: "http://localhost:1337", dropletId: 7 },
  droplet: {
    id: 7,
    name: "Intro to Git",
    slug: "intro-to-git",
    description: "Version control from zero.",
    type: "skill",
    focusArea: "technical",
    difficulty: "beginner",
    learningObjectives: ["Make a commit", "Undo a change"],
    overview: "<p>You will learn <strong>Git</strong>.</p>",
    prerequisites: [
      {
        name: "Command line basics",
        description: "Using a terminal",
        learningObjectives: ["Run a command"],
      },
    ],
  },
  lessons: [
    {
      id: 11,
      name: "What is Git?",
      blocksVersion: "v1",
      blocks: [
        {
          __component: "droplets.generic",
          content: "<h2>Why</h2><p>Git keeps <em>history</em>.</p>",
        },
        { __component: "droplets.video", url: "https://youtu.be/x" },
      ],
    },
    {
      id: 12,
      name: "Your first commit",
      blocksVersion: "v1",
      blocks: [
        {
          __component: "droplets.quiz",
          questions: [
            {
              id: 1,
              content: "<p>What saves a change?</p>",
              answerOptions: [
                { id: 1, content: "git commit", isCorrect: true },
                { id: 2, content: "git push", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ],
};
