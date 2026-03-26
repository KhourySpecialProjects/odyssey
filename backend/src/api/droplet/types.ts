import schema from './content-types/droplet/schema.json';
import { PopulatedUser } from '../../lib/types';

export type DropletStatus = (typeof schema.attributes.status.enum)[number];
export type DropletType = (typeof schema.attributes.type.enum)[number];
export type DropletFocusArea = (typeof schema.attributes.focusArea.enum)[number];

export interface PopulatedLesson {
  id: number;
  name: string;
}

export interface PopulatedTag {
  id: number;
  name: string;
}

export interface DropletWithRelations {
  id: number;
  name: string;
  slug: string;
  status: DropletStatus;
  type: DropletType;
  focusArea: DropletFocusArea;
  description: string | null;
  lessons: PopulatedLesson[];
  authorized_users: PopulatedUser[];
  tags: PopulatedTag[];
}
