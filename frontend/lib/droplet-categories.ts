// Copy shared by the About page and the new droplet form's info popovers.
export interface DropletCategory {
  name: string;
  description: string;
}

export const DROPLET_TYPES: DropletCategory[] = [
  {
    name: "Knowledge",
    description:
      "A Knowledge Droplet provides a comprehensive overview of a specific topic. While completing it, students will evaluate their grasp on the material by responding to check-in questions throughout.",
  },
  {
    name: "Skill",
    description:
      "A Skill Droplet applies student knowledge through guided examples for use in some application. Students will reinforce their understanding through hands-on exposure via guided walkthroughs and DIY activities.",
  },
];

export const DROPLET_FOCUS_AREAS: DropletCategory[] = [
  {
    name: "Personal",
    description:
      "Personal impact Droplets introduce topics related to the Khoury College and Northeastern student experience, as well as tips for constructing mental fortitude. Real student experiences may be included.",
  },
  {
    name: "Professional",
    description:
      "Professional impact Droplets advance critical thinking skills used in the workforce along with business best practices.",
  },
  {
    name: "Technical",
    description:
      "Technical impact Droplets leverage technology as a driver for innovation through exposure to recent advances, hands-on development, and fundamental industry knowledge.",
  },
];
