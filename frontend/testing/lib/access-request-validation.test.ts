import { accessRequestSchema } from "@/lib/validations/access-request";

const valid = {
  givenName: "Ada",
  familyName: "Lovelace",
  email: "ada@northeastern.edu",
  affiliation: "faculty",
  college: "BV",
};

const messages = (input: object) =>
  accessRequestSchema.safeParse(input).error?.issues.map((i) => i.message);

describe("accessRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(accessRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["affiliation", "Select your affiliation"],
    ["college", "Select your college"],
  ])("asks to select a missing %s", (field, message) => {
    expect(messages({ ...valid, [field]: undefined })).toEqual([message]);
  });
});
