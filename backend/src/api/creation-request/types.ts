import { PopulatedUser } from '../../lib/types';

export interface CreationRequestWithUser {
  id: number;
  motivation: string | null;
  dropletIdea: string | null;
  user: PopulatedUser | null;
}
