import schema from './content-types/access-request/schema.json';

export type AccessRequestAffiliation = (typeof schema.attributes.affiliation.enum)[number];
export type AccessRequestCollege = (typeof schema.attributes.college.enum)[number];

export interface AccessRequest {
  id: number;
  givenName: string;
  familyName: string;
  email: string;
  affiliation: AccessRequestAffiliation;
  college: AccessRequestCollege;
}

export const AFFILIATION_LABELS: Record<AccessRequestAffiliation, string> = {
  undergraduateStudent: 'Undergraduate Student',
  graduateStudent: 'Graduate Student',
  faculty: 'Faculty',
  staff: 'Staff',
  other: 'Other',
};
