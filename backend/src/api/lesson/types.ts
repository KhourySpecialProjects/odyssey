import schema from './content-types/lesson/schema.json';

export type LessonBlocksVersion = (typeof schema.attributes.blocksVersion.enum)[number];

export interface Lesson {
  id: number;
  name: string;
  slug: string;
  blocks: unknown[] | null;
  blocksV2: unknown | null;
  blocksVersion: LessonBlocksVersion;
}
