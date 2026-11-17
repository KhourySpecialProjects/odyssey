import {
  authorByline,
  formatName,
  matchesDropletSearch,
} from "@/lib/author-names";

const jane = {
  firstName: "Jane",
  lastName: "Doe",
  email: "doe.j@northeastern.edu",
};
const john = {
  firstName: "John",
  lastName: "Smith",
  email: "smith.j@northeastern.edu",
};
const ann = {
  firstName: "Ann",
  lastName: "Lee",
  email: "lee.a@northeastern.edu",
};

describe("formatName", () => {
  it.each([
    ["first and last name", jane, "Jane Doe"],
    // ODY-526: "Dr. Odysseus null"
    [
      "no last name",
      { ...jane, firstName: "Dr. Odysseus", lastName: null },
      "Dr. Odysseus",
    ],
    ["no first name", { ...jane, firstName: "" }, "Doe"],
    [
      "no name at all",
      { firstName: null, lastName: " ", email: jane.email },
      "doe.j",
    ],
    ["nothing to go on", { firstName: null, lastName: null }, ""],
  ])("%s", (_case, user, expected) => {
    expect(formatName(user)).toBe(expected);
  });
});

describe("authorByline", () => {
  it.each([
    ["one author", [jane], "Jane Doe"],
    ["two authors", [jane, john], "Jane Doe and John Smith"],
    ["three or more", [jane, john, ann], "Jane Doe + 2 more"],
    [
      "skips an author with nothing to show",
      [{ firstName: null, lastName: null }, john],
      "John Smith",
    ],
    ["no authors", [], null],
    ["authors not loaded", undefined, null],
  ])("%s", (_case, authors, expected) => {
    expect(authorByline(authors)).toBe(expected);
  });
});

describe("matchesDropletSearch", () => {
  const droplet = {
    name: "Building a Profile Generator",
    authorized_users: [jane, john],
  };

  it.each([
    ["the droplet's name", "profile", true],
    ["an author's full name, any case", "jane doe", true],
    ["part of an author's name", "smith", true],
    ["an empty search", "  ", true],
    ["neither", "frank anderson", false],
  ])("matches %s", (_case, query, expected) => {
    expect(matchesDropletSearch(droplet, query)).toBe(expected);
  });

  it("matches on the name alone when authors aren't loaded", () => {
    expect(matchesDropletSearch({ name: "Profile" }, "jane")).toBe(false);
  });
});
